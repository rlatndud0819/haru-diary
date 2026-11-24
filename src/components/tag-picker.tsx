import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';
import type { Tag } from '@/types/diary';

type Props = {
  /** 고를 수 있는 전체 태그 */
  tags: Tag[];
  /** 고른 태그 id 목록 */
  value: number[];
  onChange: (next: number[]) => void;
  /** 새 태그 만들기. 만든 태그를 돌려준다 (실패하면 null) */
  onCreate: (name: string) => Promise<Tag | null>;
  /** 태그 삭제 (길게 누르기) */
  onDelete: (tag: Tag) => Promise<void>;
};

/**
 * 이유 태그 고르기 (여러 개).
 * - 누르기: 선택/해제
 * - 길게 누르기: 태그 삭제
 * - "＋ 추가": 새 태그 입력칸이 열린다
 */
export function TagPicker({ tags, value, onChange, onCreate, onDelete }: Props) {
  const styles = useStyles();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  async function submit() {
    const created = await onCreate(name);
    if (created) {
      if (!value.includes(created.id)) onChange([...value, created.id]); // 만들면 바로 선택
      setName('');
      setAdding(false);
    }
  }

  function confirmDelete(tag: Tag) {
    Alert.alert(`'${tag.name}' 태그 삭제`, '이 태그를 붙였던 일기에서도 빠져요. 일기 자체는 지워지지 않아요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(tag) },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {tags.map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            selected={value.includes(t.id)}
            onPress={() => toggle(t.id)}
            onLongPress={() => confirmDelete(t)}
            accessibilityLabel={`태그 ${t.name}`}
          />
        ))}
        {!adding ? <Chip label="＋ 추가" onPress={() => setAdding(true)} accessibilityLabel="태그 추가" /> : null}
      </View>
      {adding ? (
        <View style={[CommonStyles.row, styles.addRow]}>
          <View style={CommonStyles.flex1}>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="새 태그 (예: 산책)"
              maxLength={10}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </View>
          <Button label="추가" onPress={submit} disabled={!name.trim()} />
          <Button
            label="취소"
            variant="outline"
            onPress={() => {
              setAdding(false);
              setName('');
            }}
          />
        </View>
      ) : null}
      <AppText variant="caption" tone="secondary" style={styles.hint}>
        태그를 길게 누르면 삭제할 수 있어요.
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  addRow: { gap: Spacing.sm },
  hint: { fontWeight: '400' },
}));
