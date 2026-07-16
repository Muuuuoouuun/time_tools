# 사이드바 반응형 완전 접기 — 설계

## 배경

현재 좌측 사이드바([sidebar.ts](../../../src/views/sidebar.ts))는 2가지 폭만 지원한다.

- 데스크톱(≥760px): `navCollapsed` 불리언으로 216px(펼침) ↔ 70px(아이콘 레일) 토글
- 모바일(<760px, `narrow=true`): 항상 70px 아이콘 레일로 강제 고정. 사용자가 접거나 펼 수 있는 버튼 자체가 없음

요청: 데스크톱에서도 사이드바를 완전히 숨길 수 있게 하고(0px), 모바일도 토글 가능하게 반응형을 정리한다.

## 상태 모델

[state.ts](../../../src/state.ts)의 `AppState`를 다음과 같이 바꾼다.

```ts
export type NavState = 'expanded' | 'rail' | 'hidden';

interface AppState {
  navState: NavState;      // 기존 navCollapsed(boolean) 대체 — 계속 localStorage에 저장
  navMobileOpen: boolean;  // 신규, 세션 전용 (narrow와 동일하게 저장 안 함, 매 로드 시 false)
  // ... 기존 필드
}
```

- `navState`: `PERSIST_KEYS`에서 `navCollapsed` 자리를 대체. 기본값 `'expanded'`.
- `navMobileOpen`: `hydrate()`에서 `narrow`와 나란히 항상 `false`로 리셋. 리사이즈로 데스크톱 폭이 되면(`narrow: true → false` 전이) 함께 `false`로 리셋해 모바일 드로어가 열린 채로 남지 않게 한다.
- 기존에 저장된 `navCollapsed` 값은 새 `PERSIST_KEYS`에 없으므로 다음 저장 시 자연스럽게 사라진다(별도 마이그레이션 불필요).

pure 헬퍼 (state.ts에 추가, 테스트 대상):

```ts
export function nextNavState(s: NavState): NavState {
  return s === 'expanded' ? 'rail' : s === 'rail' ? 'hidden' : 'expanded';
}

// 셸의 플로팅 "열기" 버튼을 보여줄지 여부 — main.ts와 header.ts가 공유
export function navShellHidden(s: Pick<AppState, 'narrow' | 'navMobileOpen' | 'navState'>): boolean {
  return s.narrow ? !s.navMobileOpen : s.navState === 'hidden';
}
```

## 데스크톱 동작 (≥760px)

사이드바는 지금처럼 실제 레이아웃 폭을 차지하는 요소로 남고, 폭은 `navState`에 따라 216 / 70 / 0px로 애니메이션(`transition:width .18s ease`, 기존 그대로).

한 번의 클릭으로 다음 상태로 순환한다: **펼침 → 레일 → 완전 숨김 → 펼침 → …**

- 펼침 상태: brand 영역의 기존 "접기" 버튼(`iconChevronLeft`) 그대로 유지 → `nextNavState` 호출 (펼침→레일)
- 레일 상태: 기존 "펼치기" 버튼(`iconChevronRight`, 현재 rail 상단에 중앙 정렬) 자리를 용도 변경 — 아이콘을 `iconChevronLeft`로, 툴팁을 "숨기기"로 바꾸고 → `nextNavState` 호출 (레일→완전 숨김)
- 완전 숨김 상태: `aside` 폭 0, 내부 렌더링 없음(`clear`만). 대신 셸 레벨 플로팅 버튼이 나타나 클릭 시 **직접 `navState: 'expanded'`로 복귀** (레일을 거치지 않음 — 순환과 별개의 "전체 복귀" 동작)

## 모바일 동작 (<760px)

가장 크게 바뀌는 부분. 지금은 토글 자체가 없고 항상 70px 레일이었지만, 이제:

- 기본 상태(`navMobileOpen: false`): 사이드바가 레이아웃 폭을 차지하지 않음(본문 전체 폭 사용). 셸 플로팅 버튼이 햄버거 역할.
- 열림(`navMobileOpen: true`): [settings.ts](../../../src/views/settings.ts)의 드로어 패턴을 그대로 재사용 — `aside` 내부에 두 자식을 렌더링
  - 배경(backdrop): `position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px)` — 클릭 시 `navMobileOpen:false`
  - 패널: 216px 폭, 펼침 상태와 동일한 내용(브랜드/네비/풋터), `onclick: e.stopPropagation()`으로 배경 클릭과 분리
  - 열릴 때만 슬라이드인: `styles.css`의 기존 `flashkf` 같은 `@keyframes` 패턴을 재사용해 `translateX(-100%) → none` 애니메이션을 패널에 적용(진입 시 1회 재생). 닫을 때는 즉시 사라짐(별도 exit 애니메이션 없음 — DOM이 매 렌더마다 새로 만들어지는 현재 구조상 exit 트랜지션은 복잡도 대비 이득이 적음)
  - 닫힘 트리거: 배경 클릭, 네비 항목 클릭(도구 전환 시 `navMobileOpen:false`도 함께 patch)

## 플로팅 "열기" 버튼

- 신규 아이콘 `iconMenu`(햄버거, 가로 3줄)를 [icons.ts](../../../src/icons.ts)에 기존 `stroke()` 패턴으로 추가
- 소속: `sidebar.ts`가 아니라 **셸 레벨**([main.ts](../../../src/main.ts))에서 관리 — `aside`가 `overflow:hidden`이라 그 안에 `position:fixed` 버튼을 두면 폭이 줄어들 때 잘릴 위험이 있음. `flashEl`처럼 `rootEl`의 형제로 둔다.
- 표시 조건: `navShellHidden(state)`
- 위치: 화면 좌상단 고정(`position:absolute` — `rootEl`이 이미 `position:fixed;inset:0`이라 사실상 뷰포트 기준), 헤더 타이틀과 같은 높이. 제안 값: `left:14px;top:18px`, 32×32px, `border-radius:9px` (기존 사이드바 풋터 버튼과 톤 맞춤)
- 헤더 겹침 방지: `header.ts`가 `navShellHidden(state)`를 함께 계산해서, 참이면 헤더의 좌측 패딩을 `30px`에서 `74px`로 늘려 타이틀이 버튼을 피해 오른쪽으로 밀리게 한다 (이미 `s.narrow`를 보고 자체 레이아웃을 바꾸는 기존 패턴과 동일한 결)

## 영향받는 파일

| 파일 | 변경 |
|---|---|
| [state.ts](../../../src/state.ts) | `navCollapsed→navState` 타입 교체, `navMobileOpen` 추가, `nextNavState`/`navShellHidden` 헬퍼, `PERSIST_KEYS`/`initialState`/`hydrate` 갱신 |
| [state.test.ts](../../../src/state.test.ts) | `nextNavState`, `navShellHidden` 테스트 추가 |
| [icons.ts](../../../src/icons.ts) | `iconMenu` 추가 |
| [sidebar.ts](../../../src/views/sidebar.ts) | 3단계 폭 렌더링, 레일 버튼 용도 변경, 모바일 오버레이(backdrop+패널) 렌더링 |
| [header.ts](../../../src/views/header.ts) | `navShellHidden`일 때 좌측 패딩 보정 |
| [main.ts](../../../src/main.ts) | 플로팅 버튼 엘리먼트 생성/표시 로직, `setState`의 sidebar rebuild 트리거 조건에 `navState`/`navMobileOpen` 추가, 리사이즈 시 데스크톱 전환되면 `navMobileOpen` 리셋 |
| [styles.css](../../../src/styles.css) | 모바일 패널 슬라이드인 `@keyframes` 추가 |

## 테스트

- `state.test.ts`: `nextNavState`가 세 상태를 올바른 순서로 순환하는지, `navShellHidden`이 narrow/데스크톱 각 조합에서 올바른 불리언을 내는지
- 브라우저 수동 확인(계획 실행 단계에서): 데스크톱 3단계 순환 클릭, 완전 숨김 상태에서 플로팅 버튼으로 복귀, 리사이즈로 모바일 전환, 모바일 햄버거→오버레이 열림→배경 클릭/항목 선택으로 닫힘, 라이트/다크 테마 모두

## 범위 밖

- 키보드 단축키(Esc로 드로어 닫기 등)는 요청에 없어 다루지 않음
- 모바일 드로어의 닫힘 애니메이션(즉시 사라짐으로 충분)
