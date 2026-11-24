# 하루 일기 (haru-diary)

React Native(Expo) + TypeScript로 만든 무료 다이어리 앱입니다.
서버 없이 모든 일기를 **기기 안 SQLite DB**에 저장합니다.

## 기능

- 일기 작성·수정·삭제 (날짜, 기분 5단계, 제목, 내용, **사진 최대 10장**)
- **일기 종류 3가지: 하루 일기 / 주간 회고 / 월간 회고**
  - 주간·월간 회고 상세 화면에는 그 기간에 쓴 하루 일기가 함께 모여 보인다
- 일기 목록 + 제목/내용 검색 + 종류 필터(전체/하루/주간/월간)
- 월간 캘린더 (날짜별 기분 이모지 표시, 날짜 눌러서 그날 일기·그 주/그 달 회고 보기·쓰기)
- **카메라**: 앞/뒤 전환, 플래시, 3×3 격자, 셀프 타이머(3·10초), 줌, 셀카 좌우 반전
- **사진 필터 편집** (카메라로 찍은 사진·앨범 사진 모두)
  - 필터 14종(따뜻함·필름·빈티지·크림·청량·노을·몽환·흑백·누아르 등) + 강도 조절
  - 밝기·대비·채도·색온도 조정, 비네팅, 필름 카메라 날짜 도장
  - 사진을 누르고 있으면 원본과 비교
- 앱 잠금 (Face ID / 지문 / 기기 암호)
- 기분 통계
- 라이트/다크 모드 자동 적용

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 언어 | TypeScript |
| 프레임워크 | Expo SDK 58 (React Native 0.88, React 19) |
| 화면 이동 | Expo Router (파일 기반 라우팅) + Native Tabs |
| 로컬 DB | expo-sqlite |
| 사진 | expo-image-picker, expo-file-system, expo-image, expo-image-manipulator |
| 카메라 | expo-camera |
| 필터(GPU 그래픽) | @shopify/react-native-skia |
| 잠금 | expo-local-authentication |

## 실행 방법

> **Node.js 22.13 이상**이 필요합니다(Expo SDK 58 요구사항). `node -v`로 확인하세요.

```bash
npm install
npx expo start
```

- 폰에 **Expo Go** 앱을 설치하고, 터미널에 뜨는 QR 코드를 찍으면 바로 실행됩니다.
- 수정한 코드는 저장하면 폰에 바로 반영됩니다(Fast Refresh).

### Expo Go에서 안 되는 것

- **iOS Face ID는 Expo Go에서 지원되지 않습니다.** Face ID까지 테스트하려면 개발 빌드가 필요합니다.
  ```bash
  npx expo run:ios                  # Mac + Xcode 필요
  # 또는
  npx eas-cli@latest build --profile development --platform ios
  ```
- 나머지 기능(작성·목록·캘린더·사진·카메라·필터·SQLite)은 Expo Go에서 모두 확인할 수 있습니다.
  (expo-camera, Skia, expo-image-manipulator는 Expo Go에 들어 있다.)
- **카메라는 시뮬레이터에서 동작하지 않습니다.** 실제 폰에서 확인하세요.

## 폴더 구조

```
src/
├── app/                      # 화면(라우트). 파일 하나 = 화면 하나
│   ├── _layout.tsx           # 루트 레이아웃: 테마 → DB → 잠금 → Stack
│   ├── (tabs)/               # 하단 탭 묶음 (괄호 폴더는 URL에 안 나타남)
│   │   ├── _layout.tsx       # 탭 정의 (일기 / 캘린더 / 설정)
│   │   ├── index.tsx         # 일기 목록 + 검색
│   │   ├── calendar.tsx      # 캘린더
│   │   └── settings.tsx      # 잠금 설정 + 기분 통계
│   ├── entry/[id].tsx        # 일기 상세 (/entry/3 → id = 3). 주간/월간이면 기간 내 하루 일기도 표시
│   ├── write.tsx             # 작성·수정 모달 (/write, /write?id=3, /write?period=week&date=2026-11-22)
│   ├── camera.tsx            # 카메라 (찍으면 photo-filter로 교체 이동)
│   └── photo-filter.tsx      # 필터·조정·효과 편집 → 결과를 photo-inbox로 작성 화면에 전달
│
├── db/                       # 데이터 계층 — SQL은 전부 여기에만
│   ├── migrations.ts         # 테이블 생성·스키마 버전 관리
│   ├── diary-repository.ts   # 일기 CRUD, 검색, 통계
│   └── settings-repository.ts# 설정 key-value 저장
│
├── services/                 # 기기 기능 래퍼
│   ├── photo-storage.ts      # 사진 여러 장 선택, 편집용 정리(회전·축소), 앱 폴더로 복사, 삭제
│   ├── photo-inbox.ts        # 카메라·필터 화면 → 작성 화면으로 사진을 넘겨주는 작은 큐
│   ├── biometric.ts          # Face ID / 지문 인증
│   └── lock-control.ts       # 사진 고르는 동안 재잠금 일시 중지
│
├── components/               # 화면 조각
│   ├── ui/                   # ★ 범용 UI 부품 (도메인 몰라도 되는 것, 다른 앱에도 재사용 가능)
│   │   ├── app-text.tsx      #   텍스트: variant(크기) + tone(색 역할)
│   │   ├── button.tsx        #   버튼: filled / outline / danger
│   │   ├── card.tsx          #   카드 (onPress 주면 누를 수 있음)
│   │   ├── text-field.tsx    #   입력칸 (multiline 지원)
│   │   ├── section-label.tsx #   작은 섹션 제목
│   │   ├── arrow-nav.tsx     #   ‹ 라벨 › 이동 막대 (월 이동·날짜 이동)
│   │   ├── header-text-button.tsx # 헤더의 "취소"/"저장"
│   │   ├── photo.tsx         #   사진 (full / tile / thumb)
│   │   ├── segmented-control.tsx # [하루|주간|월간] 같은 선택 탭 (제네릭)
│   │   ├── slider.tsx        #   가로 슬라이더 (필터 강도·조정·줌)
│   │   └── state-view.tsx    #   LoadingView, MessageView
│   ├── lock-gate.tsx         # 앱 잠금 화면 / 백그라운드 복귀 시 재잠금
│   ├── screen.tsx            # 탭 화면 공통 틀 (SafeArea + 큰 제목)
│   ├── diary-card.tsx        # 목록의 일기 카드
│   ├── mood-picker.tsx       # 기분 5단계 선택
│   ├── photo-list-editor.tsx # 작성 화면의 사진 칸 (가로 목록 + 앨범/카메라 버튼)
│   ├── filtered-photo.tsx    # Skia로 필터 적용한 사진 그리기 (미리보기·저장 공용)
│   └── calendar-grid.tsx     # 월간 달력 그리드
│
├── styles/                   # ★ 스타일 공통 모듈
│   ├── make-styles.ts        # 테마 색을 쓰는 스타일시트 만들기 (makeStyles)
│   ├── common.ts             # 색 없는 공통 레이아웃 (flex1, row, center ...)
│   └── color.ts              # withAlpha(색, 투명도)
│
├── types/diary.ts            # DiaryEntry 등 타입 정의
├── constants/                # 디자인 토큰(theme.ts), 기분(moods.ts), 일기 종류 문구(periods.ts), 필터 정의(filters.ts)
├── hooks/                    # useTheme, useColorScheme
└── utils/
    ├── date.ts               # 'YYYY-MM-DD' 날짜 유틸 + 기간(주·월) 계산
    └── color-matrix.ts       # 필터의 정체: 색 변환 행렬 계산 (밝기·대비·채도·세피아 ...)
```

## DB 스키마

현재 스키마 버전: **2** (`PRAGMA user_version`)

```sql
CREATE TABLE entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date  TEXT    NOT NULL,      -- 'YYYY-MM-DD' (주간 = 그 주 일요일, 월간 = 그 달 1일)
  mood        INTEGER NOT NULL,      -- 1(최악) ~ 5(최고)
  title       TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  photo_uri   TEXT,                  -- v1 사진 컬럼. v2부터 안 씀 (entry_photos로 옮김)
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  period      TEXT    NOT NULL DEFAULT 'day'   -- v2: 'day' | 'week' | 'month'
);
CREATE INDEX idx_entries_date ON entries (entry_date);
CREATE INDEX idx_entries_period_date ON entries (period, entry_date);  -- v2: 캘린더·회고 조회용

-- v2: 일기 1건 : 사진 N장
CREATE TABLE entry_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id    INTEGER NOT NULL REFERENCES entries (id),
  uri         TEXT    NOT NULL,      -- 앱 문서 폴더(photos/)에 복사한 사진 경로
  sort_order  INTEGER NOT NULL DEFAULT 0   -- 0번이 대표 사진(목록 썸네일)
);
CREATE INDEX idx_entry_photos_entry ON entry_photos (entry_id, sort_order);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY NOT NULL,   -- 예: 'lock_enabled'
  value TEXT NOT NULL
);
```

## 스타일(CSS) 규칙

React Native에는 CSS 파일이 없고, 자바스크립트 객체로 스타일을 씁니다. 이 프로젝트는 아래 3단계로 나눠 관리합니다.

| 단계 | 위치 | 웹으로 치면 |
|---|---|---|
| 1. 디자인 토큰 | `constants/theme.ts` (Colors, Spacing, Radius, Typography, Layout) | CSS 변수 `:root { --tint: ... }` |
| 2. 스타일 모듈 | `styles/` (makeStyles, CommonStyles, withAlpha) | CSS Modules + 유틸리티 클래스 |
| 3. UI 부품 | `components/ui/` (AppText, Button, Card ...) | 공통 JSP 태그 / 디자인 시스템 컴포넌트 |

지켜야 할 것
- 색·숫자를 직접 쓰지 말고 토큰을 쓴다. 색을 바꾸려면 `theme.ts` 한 곳만 고친다.
- 색이 들어가는 스타일은 `makeStyles((theme) => ({ ... }))`, 색 없는 스타일은 `StyleSheet.create` 또는 `CommonStyles`를 쓴다.
- 글자는 `<Text>` 대신 `<AppText variant tone>`, 버튼은 `<Button>`을 쓴다. (이모지만 `<Text>`로 크기 지정)
- 투명도는 `` `${color}33` `` 대신 `withAlpha(color, 0.2)`.

```tsx
const useStyles = makeStyles((theme) => ({
  box: { backgroundColor: theme.card, padding: Spacing.md },
}));

function Example() {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <AppText variant="title">제목</AppText>
      <AppText tone="secondary">설명</AppText>
    </View>
  );
}
```

## Spring 개발자를 위한 개념 대응표

| 이 프로젝트 | Spring / JSP에서 비슷한 것 |
|---|---|
| `src/db/*-repository.ts` | `@Repository` / DAO (SQL은 여기에만) |
| `src/db/migrations.ts` + `PRAGMA user_version` | Flyway / Liquibase 버전 마이그레이션 |
| `SQLiteProvider` + `useSQLiteContext()` | DataSource 빈 등록 + 주입(DI) |
| `src/app/` 파일 기반 라우트 | `@Controller` + `@RequestMapping` (파일 경로 = URL) |
| `entry/[id].tsx`, `useLocalSearchParams` | `@PathVariable` / `@RequestParam` |
| `_layout.tsx` | JSP 공통 레이아웃(Tiles/SiteMesh) + Filter 체인 |
| `LockGate` | 인증 `Filter` / Spring Security 필터 |
| `useState` | JSP의 Model 값. 바뀌면 화면이 자동으로 다시 그려짐 |
| `useFocusEffect` | 화면에 들어올 때마다 실행되는 조회 로직 (매 요청 시 Controller가 조회하는 것과 비슷) |
| `src/services/` | `@Service` (기기 기능 래핑) |
| `db.withTransactionAsync(...)` | `@Transactional` (일기 + 사진 저장을 한 트랜잭션으로) |
| `listEntries`의 조건 조립 | MyBatis 동적 SQL `<where><if>` |
| `services/photo-inbox.ts` | 팝업 창 → 부모 창으로 값 돌려주기 (작은 메모리 큐) |

## 코드 분석 추천 순서

1. `src/types/diary.ts` — 데이터 모양부터 파악
2. `src/db/migrations.ts` → `src/db/diary-repository.ts` — 백엔드 경험으로 가장 빨리 읽히는 부분
3. `src/app/_layout.tsx` — 앱이 어떤 순서로 감싸져 시작되는지
4. `src/app/(tabs)/index.tsx` — `useState` + `useFocusEffect`로 DB를 읽어 화면에 그리는 기본 패턴
5. `src/app/write.tsx` — 입력 상태 관리, 생성/수정 분기, 사진 저장 흐름
6. `src/components/lock-gate.tsx` — `AppState`로 앱 상태 변화를 감지하는 방법
7. `src/components/calendar-grid.tsx` — 라이브러리 없이 달력 계산하기
8. `src/constants/theme.ts` → `src/styles/make-styles.ts` → `src/components/ui/` — 스타일을 모듈로 나누는 방법
9. `src/utils/color-matrix.ts` → `src/constants/filters.ts` → `src/components/filtered-photo.tsx` → `src/app/photo-filter.tsx` — 필터가 숫자 20개짜리 행렬로 만들어지는 과정
10. `src/app/camera.tsx` — 권한 요청, 카메라 ref로 촬영, 타이머

## 검사 명령어

```bash
npx tsc --noEmit     # 타입 검사
npx expo lint        # 린트
npx expo-doctor      # 의존성·설정 점검
```
