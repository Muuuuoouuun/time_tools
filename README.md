# 교실 타이머 (Classroom Timer)

교실용 시간 도구 모음. 하나의 사이드바에서 5개 도구를 전환합니다.

- **타이머** — 그룹별 다중 카운트다운(개별 색·알림음), 원형 진행바, 프리셋(1/3/5/10/25/45분), +1분, 완료 알람 + 화면 깜빡임
- **스톱워치** — 1/100초, 랩(구간·누적) 기록
- **시계** — 현재 시각(12/24h), 날짜/요일, 세계 시각(자동 시차 계산, DST 반영)
- **교시 스케줄** — 교시 자동 전환/남은시간, 편집, 수능 시간표 프리셋
- **뽀모도로** — 집중/휴식 사이클, 라운드, 집중·휴식 시간 조절

다크/라이트 테마, 접이식 사이드바, 알림음 설정(합성음 5종 + 커스텀 업로드), 볼륨.

## 스택

- **Vite + TypeScript**, 프레임워크 없음 (런타임 의존성 0)
- 100% 클라이언트 사이드 정적 앱 (백엔드 없음)
- 상태는 `localStorage`에 저장, 소리는 Web Audio로 합성
- 폰트(Sora, JetBrains Mono)는 self-host

## 개발

```bash
npm install
npm run dev       # 개발 서버 (HMR)
npm test          # 로직 유닛 테스트 (vitest)
npm run build     # 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과 미리보기
```

배포는 [DEPLOY.md](DEPLOY.md) 참고 (`classin.cloud/timetools`).

## 구조

```
src/
  main.ts        # 앱 셸 · 상태(setState) · 100ms tick 루프 · 전역 이벤트
  state.ts       # 타입 · 순수 로직(타이머/스톱워치/교시/뽀모도로) · 지속성
  audio.ts       # Web Audio 합성음 · 알람 반복 · 커스텀 오디오
  view.ts        # View/Ctx 인터페이스
  icons.ts       # 인라인 SVG 아이콘
  labels.ts      # 도구 메타(제목·아이콘)
  dom.ts         # el()/svg() 빌더
  styles.css     # CSS 변수(라이트/다크) · 폰트
  views/         # sidebar · header · timer · stopwatch · clock · exam · pomodoro · settings
```

각 view는 DOM을 1회 build하고, tick마다 `update()`로 동적 값만 갱신합니다(입력 포커스 유지).
```
