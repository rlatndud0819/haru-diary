import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { getMood } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';
import { toDateKey, todayKey, WEEKDAYS } from '@/utils/date';

/**
 * 기분 색 칸의 진하기. 0.4면 날짜 숫자와의 대비가 라이트 9:1, 다크 6:1 이상으로 넉넉하다.
 * (범례도 같은 값을 써야 해서 밖으로 꺼내 둔다)
 */
export const CALENDAR_MOOD_ALPHA = 0.4;

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
 *
 * 기분 표시: 칸 배경을 기분 색으로 연하게 칠한다. 이모지를 얹지 않아서 날짜 숫자가 가려지지 않는다.
 * - 고른 날짜: 진한 테두리
 * - 오늘: 굵은 밑줄 숫자 (색이 아니라 모양으로 구분해서, 어떤 기분 색 위에서도 보인다)
 */
export function CalendarGrid({ year, month, moodsByDate, selectedKey, onSelect }: Props) {
  const styles = useStyles();
  const theme = useTheme();
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
            const day = Number(key.slice(8));
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityLabel={`${month + 1}월 ${day}일${key === today ? ', 오늘' : ''}${mood ? `, 기분 ${getMood(mood).label}` : ''}`}
                accessibilityState={{ selected: key === selectedKey }}
                style={[
                  styles.cell,
                  styles.dayCell,
                  // 기분 색은 날짜마다 달라서 배열 스타일로 덧붙인다 (색 값은 테마에서 온다)
                  mood && { backgroundColor: withAlpha(theme.mood[mood], CALENDAR_MOOD_ALPHA) },
                  key === selectedKey && styles.selected,
                ]}>
                {/* 일요일 빨간 숫자는 기분 색 위에서 대비가 모자라서(4.5:1 미만), 색이 칠해진 칸은 기본 글자색으로 쓴다 */}
                <AppText
                  variant="caption"
                  tone={di === 0 && !mood ? 'danger' : 'primary'}
                  style={[styles.dayText, key === today && styles.todayText]}>
                  {day}
                </AppText>
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
  cell: { flex: 1, aspectRatio: 1, margin: 2 },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    // 고른 날짜 테두리가 생겨도 칸 크기가 흔들리지 않도록 투명 테두리를 미리 둔다
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: { borderColor: theme.text },
  dayText: { fontSize: 15 },
  todayText: { fontWeight: '800', textDecorationLine: 'underline' },
}));
