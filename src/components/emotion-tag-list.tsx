import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { getEmotion } from '@/constants/emotions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeStyles } from '@/styles/make-styles';
import type { Tag } from '@/types/diary';

type Props = {
  emotions: string[];
  tags: Tag[];
  /** 목록 카드용 작은 크기 */
  small?: boolean;
};

/** 고른 감정 단어와 태그를 보여주기만 하는 칩 줄 (상세 화면·목록 카드) */
export function EmotionTagList({ emotions, tags, small }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  if (emotions.length === 0 && tags.length === 0) return null;
  return (
    <View style={[styles.row, small && styles.rowSmall]}>
      {emotions.map((id) => {
        const e = getEmotion(id);
        if (!e) return null;
        return (
          <Chip
            key={id}
            label={e.label}
            selected
            small={small}
            color={e.tone === 'positive' ? theme.mood[5] : theme.mood[1]}
          />
        );
      })}
      {tags.map((t) => (
        <Chip key={`t${t.id}`} label={`#${t.name}`} small={small} />
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rowSmall: { gap: Spacing.xs, marginTop: 2 },
}));
