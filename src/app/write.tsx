import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MoodPicker } from '@/components/mood-picker';
import { ArrowNav } from '@/components/ui/arrow-nav';
import { Button } from '@/components/ui/button';
import { HeaderTextButton } from '@/components/ui/header-text-button';
import { Photo } from '@/components/ui/photo';
import { SectionLabel } from '@/components/ui/section-label';
import { LoadingView } from '@/components/ui/state-view';
import { TextField } from '@/components/ui/text-field';
import { DEFAULT_MOOD } from '@/constants/moods';
import { Spacing } from '@/constants/theme';
import { createEntry, getEntryById, updateEntry } from '@/db/diary-repository';
import { deletePhoto, isStoredPhoto, pickPhoto, savePhotoToAppStorage } from '@/services/photo-storage';
import { CommonStyles } from '@/styles/common';
import type { MoodLevel } from '@/types/diary';
import { addDays, formatKoreanDate, todayKey } from '@/utils/date';

/**
 * 일기 작성·수정 화면 (모달).
 *
 * 하나의 화면을 두 용도로 쓴다.
 * - /write            → 새 일기 (오늘 날짜)
 * - /write?date=...   → 새 일기 (캘린더에서 고른 날짜)
 * - /write?id=3       → 3번 일기 수정 (기존 값을 불러와 채움)
 *
 * 입력값(날짜·기분·제목·내용·사진)은 각각 useState로 관리하고, 저장 버튼을 누르면 DB에 반영한다.
 */
export default function WriteScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null;

  const db = useSQLiteContext();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [entryDate, setEntryDate] = useState(params.date ?? todayKey());
  const [mood, setMood] = useState<MoodLevel>(DEFAULT_MOOD);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  /** 수정 시작 시점의 사진. 저장할 때 사진이 바뀌었으면 예전 파일을 지우기 위해 기억해 둔다. */
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);

  // 수정 모드면 기존 일기를 불러와 입력칸을 채운다.
  useEffect(() => {
    if (editId === null) return;
    getEntryById(db, editId).then((entry) => {
      if (entry) {
        setEntryDate(entry.entryDate);
        setMood(entry.mood);
        setTitle(entry.title);
        setContent(entry.content);
        setPhotoUri(entry.photoUri);
        setOriginalPhotoUri(entry.photoUri);
      }
      setLoading(false);
    });
  }, [db, editId]);

  async function handlePickPhoto() {
    const uri = await pickPhoto();
    if (uri) setPhotoUri(uri);
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) {
      Alert.alert('내용을 입력해 주세요', '제목이나 내용 중 하나는 있어야 저장할 수 있어요.');
      return;
    }
    setSaving(true);
    /** 이번 저장에서 새로 복사한 사진. DB 저장이 실패하면 지워서 고아 파일이 남지 않게 한다. */
    let copiedPhoto: string | null = null;
    try {
      // 새로 고른 사진(임시 경로)만 앱 저장소로 복사한다. 기존 사진이면 그대로 둔다.
      let finalPhoto = photoUri;
      if (photoUri && !isStoredPhoto(photoUri)) {
        finalPhoto = await savePhotoToAppStorage(photoUri);
        copiedPhoto = finalPhoto;
      }

      const input = { entryDate, mood, title: title.trim(), content: content.trim(), photoUri: finalPhoto };

      if (isEdit) {
        await updateEntry(db, editId, input);
        // 사진을 바꾸거나 뺐으면 예전 사진 파일 삭제
        if (originalPhotoUri && originalPhotoUri !== finalPhoto) {
          deletePhoto(originalPhotoUri);
        }
      } else {
        await createEntry(db, input);
      }
      router.back();
    } catch (e) {
      console.error(e);
      // Spring의 @Transactional 롤백처럼 DB와 파일을 묶어 주진 않으므로, 실패 시 파일은 직접 정리한다.
      deletePhoto(copiedPhoto);
      Alert.alert('저장 실패', '일기를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;

  const isFuture = entryDate >= todayKey(); // 문자열 비교로 날짜 비교 가능 ('YYYY-MM-DD' 형식 덕분)

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
          {/* 날짜: 좌우 화살표로 하루씩 이동 (미래 날짜는 막음) */}
          <ArrowNav
            label={formatKoreanDate(entryDate)}
            onPrev={() => setEntryDate(addDays(entryDate, -1))}
            onNext={() => setEntryDate(addDays(entryDate, 1))}
            prevLabel="전날"
            nextLabel="다음날"
            nextDisabled={isFuture}
          />

          <SectionLabel>오늘의 기분</SectionLabel>
          <MoodPicker value={mood} onChange={setMood} />

          <SectionLabel>제목</SectionLabel>
          <TextField value={title} onChangeText={setTitle} placeholder="오늘을 한 줄로 표현하면?" maxLength={60} />

          <SectionLabel>내용</SectionLabel>
          <TextField
            value={content}
            onChangeText={setContent}
            placeholder="오늘 있었던 일, 느낀 점을 자유롭게 적어 보세요."
            multiline
          />

          <SectionLabel>사진</SectionLabel>
          {photoUri ? (
            <View style={styles.photoBlock}>
              <Photo uri={photoUri} />
              <View style={[CommonStyles.row, styles.photoActions]}>
                <Button label="사진 바꾸기" variant="outline" onPress={handlePickPhoto} style={CommonStyles.flex1} />
                <Button label="사진 빼기" variant="danger" onPress={() => setPhotoUri(null)} style={CommonStyles.flex1} />
              </View>
            </View>
          ) : (
            <Button label="＋ 사진 추가" variant="outline" onPress={handlePickPhoto} />
          )}

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
  photoBlock: { gap: Spacing.sm },
  photoActions: { gap: Spacing.sm },
  saveButton: { marginTop: Spacing.xl },
});
