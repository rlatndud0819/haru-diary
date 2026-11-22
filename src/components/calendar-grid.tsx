import { Pressable, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { getMood } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';
import { toDateKey, todayKey, WEEKDAYS } from '@/utils/date';

type Props = {
  year: number;
  /** 0 = 1월 ... 11 = 12월 (JavaScript Date 규칙) */
  month: number;
  /** dateKey → 그날 기분. 일기가 있는 날만 들어 있다. */
  moodsByDate: Record<string, MoodLevel>;
  selectedKey: string | null;
  onSelect: (dateKey: string) => void;
};

/** 해당 월의 칸 목록을 주(7칸) 단위로 만든다. 빈칸은 null */
function buildWeeks(year: number, month: number): (string | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * 월간 달력. 외부 라이브러리 없이 직접 계산한다.
 * 1) 이번 달 1일이 무슨 요일인지 구해서 앞쪽을 빈칸으로 채우고
 * 2) 1일부터 말일까지 칸을 만든 뒤
 * 3) 7개씩 잘라 주(week) 단위 행으로 그린다.
 */
export function CalendarGrid({ year, month, moodsByDate, selectedKey, onSelect }: Props) {
  const styles = useStyles();
  const today = todayKey();
  const weeks = buildWeeks(year, month);

  return (
    <View>
      <View style={styles.row}>
        {WEEKDAYS.map((w, i) => (
          <AppText key={w} variant="caption" tone={i === 0 ? 'danger' : 'secondary'} style={styles.weekday}>
            {w}
          </AppText>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((key, di) => {
            if (!key) return <View key={di} style={styles.cell} />;

            const mood = moodsByDate[key];
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: key === selectedKey }}
                style={[
                  styles.cell,
                  styles.dayCell,
                  key === selectedKey && styles.selected,
                  key === today && styles.today,
                ]}>
                <AppText variant="caption" tone={di === 0 ? 'danger' : 'primary'} style={styles.dayText}>
                  {Number(key.slice(8))}
                </AppText>
                <Text style={styles.moodText}>{mood ? getMood(mood).emoji : ' '}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: Spacing.xs },
  cell: { flex: 1, aspectRatio: 0.85, margin: 2 },
  dayCell: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  selected: { backgroundColor: withAlpha(theme.tint, 0.2) },
  today: { borderColor: theme.tint, borderWidth: 1.5 },
  dayText: { fontSize: 14 },
  moodText: { fontSize: 18, marginTop: 2 },
}));
