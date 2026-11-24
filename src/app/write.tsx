import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { MoodPicker } from '@/components/mood-picker';
import { PhotoListEditor } from '@/components/photo-list-editor';
import { ArrowNav } from '@/components/ui/arrow-nav';
import { Button } from '@/components/ui/button';
import { HeaderTextButton } from '@/components/ui/header-text-button';
import { SectionLabel } from '@/components/ui/section-label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { LoadingView } from '@/components/ui/state-view';
import { TextField } from '@/components/ui/text-field';
import { DEFAULT_MOOD } from '@/constants/moods';
import { getPeriod, PERIODS } from '@/constants/periods';
import { Spacing } from '@/constants/theme';
import { createEntry, getEntryById, updateEntry } from '@/db/diary-repository';
import { takePendingPhotos } from '@/services/photo-inbox';
import { deletePhoto, isStoredPhoto, pickPhotos, savePhotoToAppStorage } from '@/services/photo-storage';
import { CommonStyles } from '@/styles/common';
import { type DiaryPeriod, MAX_PHOTOS, type MoodLevel } from '@/types/diary';
import { formatPeriod, periodStart, shiftPeriod, todayKey } from '@/utils/date';

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.period, label: p.label }));

/**
 * 일기 작성·수정 화면 (모달).
 *
 * 하나의 화면을 여러 용도로 쓴다.
 * - /write                    → 새 하루 일기 (오늘)
 * - /write?date=...           → 새 하루 일기 (캘린더에서 고른 날짜)
 * - /write?period=week&date=… → 새 주간/월간 회고
 * - /write?id=3               → 3번 일기 수정 (기존 값을 불러와 채움)
 *
 * 입력값은 각각 useState로 관리하고, 저장 버튼을 누르면 DB에 반영한다.
 */
export default function WriteScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string; period?: DiaryPeriod }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null;

  const db = useSQLiteContext();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<DiaryPeriod>(params.period ?? 'day');
  // entryDate는 항상 "기간의 시작일"로 맞춰 둔다 (주간 = 일요일, 월간 = 1일)
  const [entryDate, setEntryDate] = useState(periodStart(params.period ?? 'day', params.date ?? todayKey()));
  const [mood, setMood] = useState<MoodLevel>(DEFAULT_MOOD);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  /** 수정 시작 시점의 사진들. 저장할 때 빠진 사진 파일을 지우기 위해 기억해 둔다. */
  const [originalPhotoUris, setOriginalPhotoUris] = useState<string[]>([]);

  // 수정 모드면 기존 일기를 불러와 입력칸을 채운다.
  useEffect(() => {
    takePendingPhotos(); // 이전에 남아 있던 결과가 섞이지 않도록 비우고 시작
    if (editId === null) return;
    getEntryById(db, editId).then((entry) => {
      if (entry) {
        setPeriod(entry.period);
        setEntryDate(entry.entryDate);
        setMood(entry.mood);
        setTitle(entry.title);
        setContent(entry.content);
        setPhotoUris(entry.photoUris);
        setOriginalPhotoUris(entry.photoUris);
      }
      setLoading(false);
    });
  }, [db, editId]);

  // 카메라·필터 화면에서 돌아오면, 그 화면이 넣어 둔 사진을 꺼내 반영한다. (services/photo-inbox.ts 참고)
  useFocusEffect(
    useCallback(() => {
      const results = takePendingPhotos();
      if (results.length === 0) return;
      setPhotoUris((prev) => {
        const next = [...prev];
        for (const r of results) {
          if (r.replaceIndex !== undefined && r.replaceIndex < next.length) next[r.replaceIndex] = r.uri;
          else if (next.length < MAX_PHOTOS) next.push(r.uri);
        }
        return next;
      });
    }, [])
  );

  function handleChangePeriod(next: DiaryPeriod) {
    setPeriod(next);
    setEntryDate(periodStart(next, entryDate));
  }

  async function handlePickFromAlbum() {
    const uris = await pickPhotos(MAX_PHOTOS - photoUris.length);
    if (uris.length) setPhotoUris((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
  }

  function handleEditPhoto(index: number) {
    router.push({ pathname: '/photo-filter', params: { uri: photoUris[index], replaceIndex: String(index) } });
  }

  function handleRemovePhoto(index: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) {
      Alert.alert('내용을 입력해 주세요', '제목이나 내용 중 하나는 있어야 저장할 수 있어요.');
      return;
    }
    setSaving(true);
    /** 이번 저장에서 새로 복사한 사진들. DB 저장이 실패하면 지워서 고아 파일이 남지 않게 한다. */
    const copied: string[] = [];
    try {
      // 새로 고르거나 필터를 적용한 사진(임시 경로)만 앱 저장소로 복사한다. 기존 사진은 그대로 둔다.
      const finalUris: string[] = [];
      for (const uri of photoUris) {
        if (isStoredPhoto(uri)) {
          finalUris.push(uri);
        } else {
          const saved = await savePhotoToAppStorage(uri);
          copied.push(saved);
          finalUris.push(saved);
        }
      }

      const input = { period, entryDate, mood, title: title.trim(), content: content.trim(), photoUris: finalUris };

      if (isEdit) {
        await updateEntry(db, editId, input);
        // 빠지거나 필터로 교체된 예전 사진 파일 삭제
        for (const old of originalPhotoUris) {
          if (!finalUris.includes(old)) deletePhoto(old);
        }
      } else {
        await createEntry(db, input);
      }
      router.back();
    } catch (e) {
      console.error(e);
      // Spring의 @Transactional 롤백처럼 DB와 파일을 묶어 주진 않으므로, 실패 시 파일은 직접 정리한다.
      copied.forEach(deletePhoto);
      Alert.alert('저장 실패', '일기를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;

  const info = getPeriod(period);
  // 다음 기간의 시작일이 오늘보다 뒤면 미래이므로 막는다 ('YYYY-MM-DD'는 문자열 비교로 날짜 비교가 된다)
  const nextDisabled = shiftPeriod(period, entryDate, 1) > todayKey();

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? '일기 수정' : '일기 쓰기',
          headerLeft: () => <HeaderTextButton label="취소" onPress={() => router.back()} />,
          headerRight: () => <HeaderTextButton label="저장" onPress={handleSave} disabled={saving} emphasized />,
        }}
      />
      <KeyboardAvoidingView style={CommonStyles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={CommonStyles.stackScrollContent} keyboardShouldPersistTaps="handled">
          {/* 일기 종류: 하루 / 주간 / 월간 */}
          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={handleChangePeriod} />

          {/* 날짜(기간): 좌우 화살표로 하루·한 주·한 달씩 이동 (미래는 막음) */}
          <ArrowNav
            label={formatPeriod(period, entryDate)}
            onPrev={() => setEntryDate(shiftPeriod(period, entryDate, -1))}
            onNext={() => setEntryDate(shiftPeriod(period, entryDate, 1))}
            prevLabel={info.prevLabel}
            nextLabel={info.nextLabel}
            nextDisabled={nextDisabled}
          />

          <SectionLabel>{info.moodLabel}</SectionLabel>
          <MoodPicker value={mood} onChange={setMood} />

          <SectionLabel>제목</SectionLabel>
          <TextField value={title} onChangeText={setTitle} placeholder={info.titlePlaceholder} maxLength={60} />

          <SectionLabel>내용</SectionLabel>
          <TextField value={content} onChangeText={setContent} placeholder={info.contentPlaceholder} multiline />

          <SectionLabel>사진</SectionLabel>
          <PhotoListEditor
            uris={photoUris}
            max={MAX_PHOTOS}
            onPickFromAlbum={handlePickFromAlbum}
            onOpenCamera={() => router.push('/camera')}
            onEdit={handleEditPhoto}
            onRemove={handleRemovePhoto}
          />

          <Button
            label={saving ? '저장 중…' : '저장하기'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  saveButton: { marginTop: Spacing.xl },
});
