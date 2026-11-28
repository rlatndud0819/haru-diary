import Constants from 'expo-constants';
import { Directory, File, FileMode, type FileHandle, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  type BackupPhotoRow,
  type BackupTables,
  getAllPhotoUris,
  readAllForBackup,
  replaceAllFromBackup,
} from '@/db/backup-repository';
import { DATABASE_VERSION } from '@/db/migrations';
import { withRelockSuspended } from '@/services/lock-control';
import { getPhotoDirectory, isStoredPhoto } from '@/services/photo-storage';
import { todayKey } from '@/utils/date';

/**
 * 백업·복원.
 * 서버도 계정도 없이, 일기와 사진을 "파일 하나"로 만들어 사용자가 원하는 곳(iCloud Drive, 파일 앱, 카카오톡 나에게 보내기 등)에 저장한다.
 * 새 폰에서는 그 파일을 골라 그대로 되살린다. iOS ↔ Android 사이에서도 같은 파일을 쓴다.
 *
 * 백업 파일(.harubak) 구조 — 사진을 base64 글자로 바꾸지 않고 원본 바이트 그대로 이어 붙여서 크기와 메모리를 아낀다.
 *   [0..8)    "HARUBAK1"            : 하루 일기 백업 파일인지 확인하는 표시(매직 넘버)
 *   [8..20)   "000000012345"        : 뒤따르는 목록(JSON)의 바이트 수, 12자리 숫자
 *   [20..)    목록 JSON              : 일기·태그 등 DB 행 + 사진 파일 이름과 크기
 *   그 뒤      사진 바이트             : 목록에 적힌 순서대로 이어 붙임
 * (Spring으로 치면 multipart 요청 본문처럼 "머리말 + 데이터 조각들"을 한 파일에 담는 방식)
 */

const MAGIC = 'HARUBAK1';
const LENGTH_DIGITS = 12;
const HEADER_SIZE = MAGIC.length + LENGTH_DIGITS;
const FORMAT = 'haru-diary-backup';
const FORMAT_VERSION = 1;
/** 사진을 한 번에 다 읽지 않고 1MB씩 나눠 옮긴다 (사진이 많아도 메모리를 적게 쓴다) */
const CHUNK = 1024 * 1024;
/** 파일 이름으로 쓸 수 있는 글자만 허용 (백업 파일이 조작돼도 다른 폴더에 쓰지 못하게) */
const SAFE_NAME = /^[A-Za-z0-9._-]{1,128}$/;

export type BackupManifest = {
  format: typeof FORMAT;
  formatVersion: number;
  /** 백업을 만든 앱의 DB 스키마 버전 (migrations.ts의 DATABASE_VERSION) */
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  photoFiles: { file: string; size: number }[];
  tables: BackupTables;
};

export type BackupSummary = {
  createdAt: string;
  entries: number;
  photos: number;
};

const workDir = new Directory(Paths.cache, 'backup');

function resetDir(dir: Directory): void {
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
}

function summarize(m: BackupManifest): BackupSummary {
  return { createdAt: m.createdAt, entries: m.tables.entries.length, photos: m.photoFiles.length };
}

/** source 파일 내용을 out 핸들의 현재 위치에 1MB씩 이어 쓴다. */
async function appendFile(out: FileHandle, source: File): Promise<void> {
  const input = source.open(FileMode.ReadOnly);
  try {
    for (;;) {
      const chunk = await input.readBytes(CHUNK);
      if (chunk.length === 0) break;
      await out.writeBytes(chunk);
    }
  } finally {
    input.close();
  }
}

/* ───────────────────────── 내보내기 ───────────────────────── */

export type CreatedBackup = { file: File; summary: BackupSummary; missingPhotos: number };

/** 지금 데이터로 백업 파일을 만든다 (캐시 폴더). 공유는 shareBackup()으로 따로 한다. */
export async function createBackup(db: SQLiteDatabase): Promise<CreatedBackup> {
  const rows = await readAllForBackup(db);

  // 사진 행의 경로(uri)를 파일 이름으로 바꾼다. 파일이 사라진 사진은 건너뛴다.
  const photoFiles: BackupManifest['photoFiles'] = [];
  const sources: File[] = [];
  const nameByUri = new Map<string, string>();
  const usedNames = new Set<string>();
  const photos: BackupPhotoRow[] = [];
  let missingPhotos = 0;

  for (const row of rows.photos) {
    let name = nameByUri.get(row.uri);
    if (!name) {
      const file = new File(row.uri);
      if (!file.exists) {
        missingPhotos += 1;
        continue;
      }
      // 이름이 겹치거나 이상한 글자가 있으면 새 이름을 붙인다.
      name = SAFE_NAME.test(file.name) ? file.name : `photo-${photoFiles.length}.jpg`;
      while (usedNames.has(name)) name = `${photoFiles.length}-${name}`;
      usedNames.add(name);
      nameByUri.set(row.uri, name);
      photoFiles.push({ file: name, size: file.size });
      sources.push(file);
    }
    photos.push({ entry_id: row.entry_id, file: name, sort_order: row.sort_order });
  }

  const manifest: BackupManifest = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    schemaVersion: DATABASE_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    photoFiles,
    tables: { ...rows, photos },
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

  resetDir(workDir);
  const out = new File(workDir, `haru-diary-${todayKey()}.harubak`);
  out.create();
  const handle = out.open(FileMode.WriteOnly);
  try {
    await handle.writeBytes(new TextEncoder().encode(MAGIC + String(manifestBytes.length).padStart(LENGTH_DIGITS, '0')));
    await handle.writeBytes(manifestBytes);
    for (const source of sources) await appendFile(handle, source);
  } catch (e) {
    handle.close();
    out.delete();
    throw e;
  }
  handle.close();

  return { file: out, summary: summarize(manifest), missingPhotos };
}

/** 공유 시트를 띄운다. 사용자가 "파일에 저장"(iCloud Drive)이나 카카오톡 등을 고른다. */
export async function shareBackup(file: File): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 파일 공유를 사용할 수 없어요.');
  }
  await withRelockSuspended(() =>
    Sharing.shareAsync(file.uri, {
      mimeType: 'application/octet-stream',
      UTI: 'public.data',
      dialogTitle: '하루 일기 백업 저장',
    })
  );
}

/* ───────────────────────── 가져오기 ───────────────────────── */

export type PickedBackup = { file: File; manifest: BackupManifest; dataOffset: number; summary: BackupSummary };

/** 잘못된 백업 파일일 때 사용자에게 보여 줄 메시지를 담는 에러 */
export class BackupError extends Error {}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 목록 JSON이 우리가 만든 모양이 맞는지 확인한다 (화면이 깨지거나 DB에 이상한 값이 들어가지 않게). */
function validate(m: unknown): BackupManifest {
  const bad = () => new BackupError('백업 파일 내용이 올바르지 않아요.');
  if (!m || typeof m !== 'object') throw bad();
  const x = m as BackupManifest;
  if (x.format !== FORMAT) throw bad();
  if (x.formatVersion > FORMAT_VERSION || x.schemaVersion > DATABASE_VERSION) {
    throw new BackupError('더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.');
  }
  // 스키마를 바꾸면(DATABASE_VERSION 4 이상) 예전 버전 백업을 새 모양으로 바꾸는 코드를 여기에 추가한다.
  if (x.schemaVersion !== 3) throw bad();

  const t = x.tables;
  if (!t || ![t.entries, t.photos, t.emotions, t.tags, t.entryTags].every(Array.isArray)) throw bad();
  if (!Array.isArray(x.photoFiles)) throw bad();

  const fileNames = new Set<string>();
  for (const p of x.photoFiles) {
    if (typeof p?.file !== 'string' || !SAFE_NAME.test(p.file) || !isNum(p.size) || p.size < 0) throw bad();
    if (fileNames.has(p.file)) throw bad();
    fileNames.add(p.file);
  }
  const entryIds = new Set<number>();
  for (const e of t.entries) {
    if (!isNum(e?.id) || !isNum(e.mood) || e.mood < 1 || e.mood > 5) throw bad();
    if (!['day', 'week', 'month'].includes(e.period) || typeof e.entry_date !== 'string') throw bad();
    if (typeof e.title !== 'string' || typeof e.content !== 'string') throw bad();
    if (typeof e.created_at !== 'string' || typeof e.updated_at !== 'string') throw bad();
    entryIds.add(e.id);
  }
  const tagIds = new Set<number>();
  for (const tag of t.tags) {
    if (!isNum(tag?.id) || typeof tag.name !== 'string' || !isNum(tag.sort_order) || typeof tag.created_at !== 'string') {
      throw bad();
    }
    tagIds.add(tag.id);
  }
  for (const p of t.photos) {
    if (!entryIds.has(p?.entry_id) || !fileNames.has(p.file) || !isNum(p.sort_order)) throw bad();
  }
  for (const em of t.emotions) if (!entryIds.has(em?.entry_id) || typeof em.emotion !== 'string') throw bad();
  for (const et of t.entryTags) if (!entryIds.has(et?.entry_id) || !tagIds.has(et.tag_id)) throw bad();
  return x;
}

/** 백업 파일의 머리말과 목록만 읽는다 (사진은 아직 읽지 않음). */
function readManifest(file: File): { manifest: BackupManifest; dataOffset: number } {
  const notBackup = () => new BackupError('하루 일기 백업 파일(.harubak)이 아니에요.');
  const handle = file.open(FileMode.ReadOnly);
  try {
    const header = new TextDecoder().decode(handle.readBytesSync(HEADER_SIZE));
    if (header.length !== HEADER_SIZE || !header.startsWith(MAGIC)) throw notBackup();
    const length = Number(header.slice(MAGIC.length));
    if (!Number.isInteger(length) || length <= 0) throw notBackup();
    const bytes = handle.readBytesSync(length);
    if (bytes.length !== length) throw new BackupError('백업 파일이 중간에 잘려 있어요.');
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw notBackup();
    }
    const manifest = validate(parsed);
    const dataOffset = HEADER_SIZE + length;
    const expected = dataOffset + manifest.photoFiles.reduce((sum, p) => sum + p.size, 0);
    if ((handle.size ?? 0) < expected) throw new BackupError('백업 파일이 중간에 잘려 있어요.');
    return { manifest, dataOffset };
  } finally {
    handle.close();
  }
}

/** 파일 앱에서 백업 파일을 고르고 내용을 확인한다. 취소하면 null. */
export async function pickBackup(): Promise<PickedBackup | null> {
  const picked = await withRelockSuspended(() => File.pickFileAsync({ mimeTypes: '*/*' }));
  if (picked.canceled) return null;
  const { manifest, dataOffset } = readManifest(picked.result);
  return { file: picked.result, manifest, dataOffset, summary: summarize(manifest) };
}

/**
 * 고른 백업으로 지금 데이터를 모두 바꾼다.
 * 순서가 중요하다. 실패해도 지금 일기가 망가지지 않도록:
 * 1) 사진을 임시 폴더에 먼저 풀어 놓고 크기를 확인한다.
 * 2) 사진 폴더로 옮긴다 (원래 없던 파일만 기억해 둔다).
 * 3) DB를 한 트랜잭션으로 바꾼다. 실패하면 DB는 자동으로 되돌아가고, 2)에서 새로 넣은 사진만 지운다.
 * 4) 성공하면 이제 아무 일기도 쓰지 않는 옛 사진 파일을 지운다.
 */
export async function restoreBackup(db: SQLiteDatabase, picked: PickedBackup): Promise<BackupSummary> {
  const { manifest } = picked;
  const staging = new Directory(Paths.cache, 'restore');
  resetDir(staging);

  try {
    // 1) 사진 풀기
    const input = picked.file.open(FileMode.ReadOnly);
    try {
      input.offset = picked.dataOffset;
      for (const p of manifest.photoFiles) {
        const out = new File(staging, p.file);
        out.create();
        const handle = out.open(FileMode.WriteOnly);
        try {
          let left = p.size;
          while (left > 0) {
            const chunk = await input.readBytes(Math.min(CHUNK, left));
            if (chunk.length === 0) throw new BackupError('백업 파일이 중간에 잘려 있어요.');
            await handle.writeBytes(chunk);
            left -= chunk.length;
          }
        } finally {
          handle.close();
        }
      }
    } finally {
      input.close();
    }

    // 2) 사진 폴더로 옮기기
    const photoDir = getPhotoDirectory();
    const added: File[] = [];
    for (const p of manifest.photoFiles) {
      const dest = new File(photoDir, p.file);
      const existed = dest.exists;
      await new File(staging, p.file).move(dest, { overwrite: true });
      if (!existed) added.push(dest);
    }

    // 3) DB 바꾸기
    const oldUris = await getAllPhotoUris(db);
    try {
      await replaceAllFromBackup(db, manifest.tables, (name) => new File(photoDir, name).uri);
    } catch (e) {
      for (const f of added) if (f.exists) f.delete();
      throw e;
    }

    // 4) 안 쓰는 옛 사진 지우기 (앱 사진 폴더 안의 파일만)
    const keep = new Set(manifest.photoFiles.map((p) => new File(photoDir, p.file).uri));
    for (const uri of oldUris) {
      if (keep.has(uri) || !isStoredPhoto(uri)) continue;
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch (e) {
        console.warn('옛 사진 삭제 실패', e);
      }
    }
  } finally {
    if (staging.exists) staging.delete();
  }

  return summarize(manifest);
}
