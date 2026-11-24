/**
 * 감정 단어 목록.
 * 기분 5단계(얼마나 좋은지)만으로는 "왜, 어떻게" 좋았는지 알 수 없어서 단어로 더 자세히 고르게 한다.
 * DB(entry_emotions)에는 id만 저장하고, 화면에 보이는 이름은 여기서 찾는다.
 * → 이름을 바꿔도 예전 기록이 그대로 따라온다. (Java의 enum 과 같은 역할)
 *
 * 주의: id는 한 번 정하면 바꾸지 않는다. 새 감정은 목록 끝에 추가한다.
 */
export type EmotionTone = 'positive' | 'negative';

export type Emotion = { id: string; label: string; tone: EmotionTone };

export const EMOTIONS: readonly Emotion[] = [
  { id: 'happy', label: '행복', tone: 'positive' },
  { id: 'excited', label: '설렘', tone: 'positive' },
  { id: 'proud', label: '뿌듯함', tone: 'positive' },
  { id: 'grateful', label: '감사', tone: 'positive' },
  { id: 'calm', label: '편안함', tone: 'positive' },
  { id: 'fun', label: '즐거움', tone: 'positive' },
  { id: 'hopeful', label: '기대', tone: 'positive' },
  { id: 'relieved', label: '안도', tone: 'positive' },
  { id: 'tired', label: '피곤함', tone: 'negative' },
  { id: 'anxious', label: '불안', tone: 'negative' },
  { id: 'stressed', label: '스트레스', tone: 'negative' },
  { id: 'annoyed', label: '짜증', tone: 'negative' },
  { id: 'sad', label: '슬픔', tone: 'negative' },
  { id: 'lonely', label: '외로움', tone: 'negative' },
  { id: 'angry', label: '화남', tone: 'negative' },
  { id: 'bored', label: '무기력', tone: 'negative' },
];

export const EMOTION_GROUPS: readonly { tone: EmotionTone; label: string }[] = [
  { tone: 'positive', label: '좋은 감정' },
  { tone: 'negative', label: '힘든 감정' },
];

/** id → 감정. 목록에 없는 id(예: 나중에 지운 감정)는 null */
export function getEmotion(id: string): Emotion | null {
  return EMOTIONS.find((e) => e.id === id) ?? null;
}
