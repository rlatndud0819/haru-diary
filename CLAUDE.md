@AGENTS.md

# 프로젝트 메모 (하루 일기)

- 서버 없는 로컬 저장 다이어리 앱. 데이터는 expo-sqlite(`diary.db`)에만 저장한다.
- SQL은 `src/db/` 안에만 둔다. 화면(`src/app/`)에서 SQL을 직접 쓰지 않는다.
- 스키마를 바꿀 때는 `src/db/migrations.ts`의 `DATABASE_VERSION`을 올리고 새 마이그레이션 블록을 추가한다. 기존 블록은 수정하지 않는다.
- 날짜는 'YYYY-MM-DD' 문자열(dateKey)로 다룬다. `src/utils/date.ts` 함수를 사용한다.
- 색상은 `useTheme()`로 가져온다. 하드코딩 색상을 새로 만들지 않는다.
- 스타일: 토큰은 `src/constants/theme.ts`, 테마 색이 들어가는 스타일은 `makeStyles()`(`src/styles/`), 공통 UI는 `src/components/ui/`(AppText, Button, Card, TextField 등)를 재사용한다. 인라인 색 스타일을 새로 만들지 않는다.
- 사용자는 백엔드(Java/Spring, JSP) 개발자이고 React Native는 처음이다. 코드를 설명할 때는 한국어로, 필요하면 Spring 개념과 비교해서 설명한다.
- 작업 후에는 `npx tsc --noEmit`과 `npx expo lint`를 실행한다.
