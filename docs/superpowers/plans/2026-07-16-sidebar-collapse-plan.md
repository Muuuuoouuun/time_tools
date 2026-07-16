# 사이드바 반응형 완전 접기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데스크톱에서 사이드바를 완전히 숨길 수 있게(0px) 하고, 모바일에서도 사이드바를 열고 닫을 수 있는 오버레이 드로어를 추가한다. 곁다리로 발견된 접힘 상태 하단 버튼 아이콘 소실 버그도 같이 고친다.

**Architecture:** `AppState.navCollapsed`(boolean)를 3단계 `navState: 'expanded'|'rail'|'hidden'`로 교체하고, 세션 전용 `navMobileOpen`(boolean)을 신규 추가한다. 데스크톱은 지금처럼 `aside`가 레이아웃 폭(216/70/0px)을 차지하고, 모바일은 `aside`가 폭을 차지하지 않는 대신 `position:fixed` 배경+패널 오버레이를 그 안에 렌더링한다(설정 드로어와 동일 패턴). 사이드바가 완전히 사라졌을 때 다시 여는 플로팅 버튼은 `aside`의 `overflow:hidden`에 잘리지 않도록 앱 셸(`main.ts`) 레벨에서 관리한다.

**Tech Stack:** TypeScript + Vite, 프레임워크 없음, Vitest, 순수 DOM(`el`/`svg` 헬퍼).

**설계 문서:** [docs/superpowers/specs/2026-07-16-sidebar-collapse-design.md](../specs/2026-07-16-sidebar-collapse-design.md)

---

## Task 1: 상태 모델 — `navState` / `navMobileOpen` + 순수 헬퍼

**Files:**
- Modify: `src/state.ts`
- Test: `src/state.test.ts`

- [ ] **Step 1: `state.test.ts`에 실패하는 테스트 작성**

`src/state.test.ts`의 import 블록(1~11번째 줄)을 다음으로 교체:

```ts
import { describe, it, expect } from 'vitest';
import {
  pad, fmtClock, parseHM, parseClock, hm, fmtSW,
  toggleTimer, resetTimer, plusMin, setPreset, addTimer, removeTimer, remOf,
  swElapsed, swToggle, swReset, swLap,
  examCalc, addPeriod, removePeriod, updPeriod,
  advancePomo, adjustPomo, pomoToggle, pomoReset,
  zoneOffsetLabel,
  serialize, hydrate, initialState,
  nextNavState, navShellHidden,
  type Timer, type Pomo, type Sw, type Period,
} from './state';
```

파일 맨 끝(264번째 줄, 마지막 `});` 다음)에 추가:

```ts

describe('nav shell state', () => {
  it('nextNavState cycles expanded -> rail -> hidden -> expanded', () => {
    expect(nextNavState('expanded')).toBe('rail');
    expect(nextNavState('rail')).toBe('hidden');
    expect(nextNavState('hidden')).toBe('expanded');
  });
  it('navShellHidden is true on desktop only when fully hidden', () => {
    expect(navShellHidden({ narrow: false, navMobileOpen: false, navState: 'expanded' })).toBe(false);
    expect(navShellHidden({ narrow: false, navMobileOpen: false, navState: 'rail' })).toBe(false);
    expect(navShellHidden({ narrow: false, navMobileOpen: true, navState: 'hidden' })).toBe(true);
  });
  it('navShellHidden is true on mobile only when the drawer is closed', () => {
    expect(navShellHidden({ narrow: true, navMobileOpen: false, navState: 'expanded' })).toBe(true);
    expect(navShellHidden({ narrow: true, navMobileOpen: true, navState: 'expanded' })).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/state.test.ts`
Expected: FAIL — `nextNavState`/`navShellHidden`가 `../state`에 없다는 에러 (또는 타입 에러)

- [ ] **Step 3: `state.ts`에 타입/필드/헬퍼 추가**

`src/state.ts`의 `AppState` 인터페이스에서 (현재 54번째 줄 부근):

```ts
  navCollapsed: boolean;
  narrow: boolean;
```

를 다음으로 교체:

```ts
  navState: NavState;
  navMobileOpen: boolean;
  narrow: boolean;
```

`export type Tool = ...` 바로 아래(현재 9번째 줄 부근)에 타입 추가:

```ts
export type Tool = 'timer' | 'stopwatch' | 'clock' | 'exam' | 'pomo';
export type ClockFormat = '24' | '12';
export type NavState = 'expanded' | 'rail' | 'hidden';
```

`// Persistence` 섹션 헤더(현재 401번째 줄 부근) 바로 앞에 새 섹션 추가:

```ts
// ---------------------------------------------------------------------------
// Sidebar responsive state
// ---------------------------------------------------------------------------

/** Cycles the desktop sidebar through expanded -> rail -> hidden -> expanded. */
export function nextNavState(s: NavState): NavState {
  return s === 'expanded' ? 'rail' : s === 'rail' ? 'hidden' : 'expanded';
}

/** Whether the shell's floating "open sidebar" button should show. */
export function navShellHidden(s: Pick<AppState, 'narrow' | 'navMobileOpen' | 'navState'>): boolean {
  return s.narrow ? !s.navMobileOpen : s.navState === 'hidden';
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
```

`initialState()`의 첫 줄(현재 409번째 줄):

```ts
    tool: 'timer', theme: 'dark', settingsOpen: false, navCollapsed: false, narrow: false,
```

를:

```ts
    tool: 'timer', theme: 'dark', settingsOpen: false, navState: 'expanded', navMobileOpen: false, narrow: false,
```

로 교체.

`PERSIST_KEYS`(현재 429~432번째 줄)에서 `'navCollapsed'`를 `'navState'`로 교체 (`navMobileOpen`은 `narrow`처럼 세션 전용이라 목록에 넣지 않음):

```ts
const PERSIST_KEYS: (keyof AppState)[] = [
  'tool', 'theme', 'navState', 'volume', 'sound', 'flash', 'clockFormat',
  'nextId', 'nextPid', 'focusId', 'customName', 'customData', 'timers', 'periods', 'pomo',
];
```

`hydrate()`(현재 468번째 줄)에서:

```ts
  const s: AppState = { ...base, ...parsed, settingsOpen: false, examEdit: false, narrow: false, sw: swReset() };
```

를:

```ts
  const s: AppState = { ...base, ...parsed, settingsOpen: false, examEdit: false, narrow: false, navMobileOpen: false, sw: swReset() };
```

로 교체.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/state.test.ts`
Expected: PASS (전체 기존 테스트 포함 모두 통과)

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (다음 태스크에서 `sidebar.ts`/`main.ts`를 고치기 전까지는 그 두 파일에서 `navCollapsed` 관련 타입 에러가 나는 게 정상 — Task 4, 6에서 해소됨. 여기서는 `state.ts`/`state.test.ts` 관련 에러만 없으면 됨)

- [ ] **Step 6: 커밋**

```bash
git add src/state.ts src/state.test.ts
git commit -m "feat: add 3-state sidebar nav model (expanded/rail/hidden) + mobile drawer flag"
```

---

## Task 2: 아이콘 — 햄버거(`iconMenu`) 추가

**Files:**
- Modify: `src/icons.ts`

- [ ] **Step 1: 아이콘 추가**

`src/icons.ts`의 `iconChevronRight` 정의(현재 33번째 줄) 바로 다음에 추가:

```ts
export const iconMenu = (size = 15) => stroke('<path d="M2.5 5h11M2.5 8h11M2.5 11h11"/>', size);
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: Task 1에서 옮겨온 `sidebar.ts`/`main.ts`의 `navCollapsed` 관련 에러만 남아있음 (이 두 파일은 Task 4/6에서 고침). `icons.ts` 자체에서 발생하는 새 에러는 없어야 함.

- [ ] **Step 3: 커밋**

```bash
git add src/icons.ts
git commit -m "feat: add hamburger menu icon"
```

---

## Task 3: 모바일 드로어 슬라이드인 애니메이션

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: 키프레임 추가**

`src/styles.css`의 기존 keyframes 블록(현재 41~43번째 줄) 바로 다음에 추가:

```css
@keyframes navSlideIn { from{transform:translateX(-100%);opacity:.4} to{transform:none;opacity:1} }
```

- [ ] **Step 2: 커밋**

```bash
git add src/styles.css
git commit -m "feat: add slide-in keyframe for mobile nav drawer"
```

---

## Task 4: `sidebar.ts` — 3단계 데스크톱 + 모바일 오버레이 + 하단 아이콘 버그 수정

**Files:**
- Modify: `src/views/sidebar.ts` (전체 재작성)

이 태스크는 파일 하나를 통째로 새 구조로 바꾼다. 아래 전체 내용으로 `src/views/sidebar.ts`를 교체한다.

- [ ] **Step 1: 전체 파일 교체**

```ts
import { el, clear } from '../dom';
import { iconChevronLeft, iconSun, iconMoon, iconSettings, iconClose } from '../icons';
import { TOOL_ORDER, TOOL_TITLES, NAV_ICONS } from '../labels';
import { nextNavState } from '../state';
import type { Ctx, View } from '../view';
import type { Tool, NavState } from '../state';

interface NavRef { key: Tool; btn: HTMLButtonElement; badge: HTMLSpanElement; }

interface PanelOpts {
  expanded: boolean;
  collapsed: boolean;
  onCollapseClick?: () => void; // desktop: advance to the next nav state
  closeBtn?: () => void;        // mobile drawer: close button in the brand row
  onNavClick?: () => void;      // mobile drawer: close after picking a tool
}

const RAIL_WIDTH: Record<NavState, string> = { expanded: '216px', rail: '70px', hidden: '0px' };

export function createSidebar(): View {
  let root: HTMLElement;
  let navRefs: NavRef[] = [];
  let themeLabelEl: HTMLSpanElement | null = null;

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    navRefs = [];
    themeLabelEl = null;
    const s = ctx.state;

    if (s.narrow) {
      buildMobileDrawer(ctx);
      return;
    }

    const navState = s.navState;
    const expanded = navState === 'expanded';
    const collapsed = navState === 'rail';

    root.setAttribute('class', 'sc');
    root.setAttribute('style',
      `width:${RAIL_WIDTH[navState]};flex:none;background:var(--bg-2);border-right:1px solid var(--border);` +
      `display:flex;flex-direction:column;padding:22px 0;transition:width .18s ease;overflow:hidden`);
    clear(root);
    if (navState === 'hidden') return; // nothing fits at 0 width

    buildPanel(root, ctx, {
      expanded, collapsed,
      onCollapseClick: () => ctx.setState({ navState: nextNavState(navState) }),
    });
  }

  function buildMobileDrawer(ctx: Ctx): void {
    const s = ctx.state;
    root.removeAttribute('class');
    root.setAttribute('style', 'width:0;flex:none');
    clear(root);
    if (!s.navMobileOpen) return;

    const backdrop = el('div', {
      style: 'position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);z-index:45',
      onclick: () => ctx.setState({ navMobileOpen: false }),
    });
    const panel = el('div', {
      class: 'sc',
      style: 'position:fixed;left:0;top:0;bottom:0;width:216px;background:var(--bg-2);' +
        'border-right:1px solid var(--border);display:flex;flex-direction:column;padding:22px 0;' +
        'z-index:46;overflow-y:auto;animation:navSlideIn .18s ease',
      onclick: (e: Event) => e.stopPropagation(),
    });
    buildPanel(panel, ctx, {
      expanded: true, collapsed: false,
      closeBtn: () => ctx.setState({ navMobileOpen: false }),
      onNavClick: () => ctx.setState({ navMobileOpen: false }),
    });
    root.append(backdrop, panel);
  }

  function buildPanel(container: HTMLElement, ctx: Ctx, opts: PanelOpts): void {
    const s = ctx.state;
    const { expanded, collapsed } = opts;

    // ---- brand ----
    const brand = el('div', {
      style: `display:flex;align-items:center;gap:10px;justify-content:${collapsed ? 'center' : 'flex-start'};padding:${collapsed ? '0 0 20px' : '0 22px 26px'}`,
    });
    brand.append(el('span', { style: 'width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent);flex:none' }));
    if (expanded) {
      const title = el('span', { style: 'font-size:15px;font-weight:600;letter-spacing:-.01em;line-height:1.15;flex:1;white-space:nowrap' });
      title.innerHTML = '교실 타이머<br><span style="font-size:11px;font-weight:400;color:var(--faint)">Classroom Suite</span>';
      brand.append(title);
    }
    if (opts.closeBtn) {
      brand.append(el('button', {
        title: '닫기', class: 'h-text',
        style: 'width:26px;height:26px;border-radius:8px;background:transparent;border:none;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none',
        onclick: opts.closeBtn,
      }, [iconClose(15)]));
    } else if (opts.onCollapseClick && expanded) {
      brand.append(el('button', {
        title: '접기', class: 'h-text',
        style: 'width:26px;height:26px;border-radius:8px;background:transparent;border:none;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none',
        onclick: opts.onCollapseClick,
      }, [iconChevronLeft()]));
    }
    container.append(brand);

    // ---- collapse-further button (rail state only — steps rail -> hidden) ----
    if (opts.onCollapseClick && collapsed) {
      container.append(el('button', {
        title: '숨기기', class: 'h-text',
        style: 'margin:0 auto 12px;width:32px;height:32px;border-radius:9px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
        onclick: opts.onCollapseClick,
      }, [iconChevronLeft()]));
    }

    // ---- nav ----
    const nav = el('nav', { style: 'display:flex;flex-direction:column;gap:2px;padding:0 12px;flex:1' });
    for (const key of TOOL_ORDER) {
      const badge = el('span', {
        class: 'mono',
        style: 'margin-left:auto;font-size:11px;font-weight:600;color:var(--accent);background:var(--accent-soft);padding:2px 7px;border-radius:20px;display:none',
      });
      const children: (Node | string)[] = [el('span', { style: 'display:flex' }, [NAV_ICONS[key]()])];
      if (expanded) children.push(el('span', { style: 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, [TOOL_TITLES[key][0]]));
      children.push(badge);
      const btn = el('button', {
        title: TOOL_TITLES[key][0], class: 'h-surface',
        style: navBtnStyle(key === s.tool, collapsed),
        onclick: () => { ctx.setState({ tool: key }, { main: true }); opts.onNavClick?.(); },
      }, children);
      nav.append(btn);
      navRefs.push({ key, btn, badge });
    }
    container.append(nav);

    // ---- footer ----
    const foot = el('div', {
      style: `padding:14px 12px 0;border-top:1px solid var(--border);margin:8px 12px 0;display:flex;gap:8px;flex-direction:${collapsed ? 'column' : 'row'}`,
    });
    const isDark = s.theme === 'dark';
    themeLabelEl = expanded ? el('span', { style: 'white-space:nowrap' }, [isDark ? '라이트' : '다크']) : null;
    const themeChildren: (Node | string)[] = [el('span', { style: 'display:flex' }, [isDark ? iconSun() : iconMoon()])];
    if (themeLabelEl) themeChildren.push(themeLabelEl);
    foot.append(el('button', {
      title: '테마 전환', class: 'h-text-bd2',
      style: `flex:${collapsed ? 'none' : '1'};display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:11px;color:var(--muted);font-size:12px;font-weight:500;cursor:pointer`,
      onclick: () => ctx.setState({ theme: s.theme === 'dark' ? 'light' : 'dark' }),
    }, themeChildren));
    foot.append(el('button', {
      title: '알림 설정', class: 'h-text-bd2',
      style: `width:${collapsed ? 'auto' : '42px'};display:flex;align-items:center;justify-content:center;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:11px;color:var(--muted);cursor:pointer`,
      onclick: () => ctx.setState({ settingsOpen: !s.settingsOpen }),
    }, [el('span', { style: 'display:flex' }, [iconSettings()])]));
    container.append(foot);
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    const collapsed = !s.narrow && s.navState === 'rail';
    const runCount = s.timers.filter((t) => t.running).length;
    for (const ref of navRefs) {
      ref.btn.setAttribute('style', navBtnStyle(ref.key === s.tool, collapsed));
      const showBadge = ref.key === 'timer' && runCount > 0 && !collapsed;
      ref.badge.style.display = showBadge ? '' : 'none';
      if (showBadge) ref.badge.textContent = String(runCount);
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}

function navBtnStyle(active: boolean, collapsed: boolean): string {
  return `position:relative;display:flex;align-items:center;gap:12px;justify-content:${collapsed ? 'center' : 'flex-start'};` +
    `padding:${collapsed ? '11px 0' : '11px 14px'};border:none;background:${active ? 'var(--surface)' : 'transparent'};` +
    `border-radius:12px;color:${active ? 'var(--text)' : 'var(--muted)'};font-size:13.5px;font-weight:${active ? '600' : '400'};cursor:pointer;text-align:left`;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: `sidebar.ts` 관련 에러 없음 (아직 `main.ts`가 `navCollapsed`를 참조하고 있어 그쪽 에러는 남아있는 게 정상 — Task 6에서 해소)

- [ ] **Step 3: 커밋**

```bash
git add src/views/sidebar.ts
git commit -m "feat: 3-state desktop sidebar + mobile overlay drawer, fix collapsed footer icon bug"
```

---

## Task 5: `header.ts` — 플로팅 버튼과 겹치지 않게 좌측 패딩 보정

**Files:**
- Modify: `src/views/header.ts`

- [ ] **Step 1: import에 `navShellHidden` 추가**

`src/header.ts` 1~4번째 줄:

```ts
import { el } from '../dom';
import { TOOL_TITLES } from '../labels';
import { fmtClock, examCalc, nowSec, pad, type ExamState } from '../state';
import type { Ctx, View } from '../view';
```

를:

```ts
import { el } from '../dom';
import { TOOL_TITLES } from '../labels';
import { fmtClock, examCalc, nowSec, pad, navShellHidden, type ExamState } from '../state';
import type { Ctx, View } from '../view';
```

로 교체.

- [ ] **Step 2: `update()`에 패딩 보정 추가**

`update()` 함수(현재 55~60번째 줄):

```ts
  function update(ctx: Ctx): void {
    const s = ctx.state;
    const [title, sub] = TOOL_TITLES[s.tool];
    titleEl.textContent = title;
    subEl.textContent = sub;
    subEl.style.display = s.narrow ? 'none' : '';
```

를:

```ts
  function update(ctx: Ctx): void {
    const s = ctx.state;
    const [title, sub] = TOOL_TITLES[s.tool];
    titleEl.textContent = title;
    subEl.textContent = sub;
    subEl.style.display = s.narrow ? 'none' : '';
    root.style.paddingLeft = navShellHidden(s) ? '74px' : '30px';
```

로 교체 (플로팅 "열기" 버튼이 좌상단에 뜰 때만 헤더 타이틀을 오른쪽으로 밀어 겹치지 않게 함).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: `header.ts` 관련 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/views/header.ts
git commit -m "feat: shift header padding when the floating sidebar-reveal button is visible"
```

---

## Task 6: `main.ts` — 플로팅 열기 버튼 + 셸 배선

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: import에 아이콘/헬퍼 추가**

`src/main.ts` 1~17번째 줄의 import 블록:

```ts
import './styles.css';
import { el, clear } from './dom';
import { AudioEngine } from './audio';
import {
  hydrate, loadKey, saveKey, serialize, advancePomo,
  type AppState, type Tool,
} from './state';
import type { Ctx, RenderOpts, View } from './view';
import { createSidebar } from './views/sidebar';
import { createHeader } from './views/header';
import { createSettings } from './views/settings';
import { createTimerView } from './views/timer';
import { createStopwatchView } from './views/stopwatch';
import { createClockView } from './views/clock';
import { createExamView } from './views/exam';
import { createPomodoroView } from './views/pomodoro';
```

를:

```ts
import './styles.css';
import { el, clear } from './dom';
import { AudioEngine } from './audio';
import { iconMenu } from './icons';
import {
  hydrate, loadKey, saveKey, serialize, advancePomo, navShellHidden,
  type AppState, type Tool,
} from './state';
import type { Ctx, RenderOpts, View } from './view';
import { createSidebar } from './views/sidebar';
import { createHeader } from './views/header';
import { createSettings } from './views/settings';
import { createTimerView } from './views/timer';
import { createStopwatchView } from './views/stopwatch';
import { createClockView } from './views/clock';
import { createExamView } from './views/exam';
import { createPomodoroView } from './views/pomodoro';
```

로 교체.

- [ ] **Step 2: 필드 추가**

`private flashEl!: HTMLDivElement;`(현재 29번째 줄) 다음 줄에 추가:

```ts
  private revealBtn!: HTMLButtonElement;
```

- [ ] **Step 3: `buildShell()`에서 버튼 생성 + 배선**

`buildShell()`(현재 67~85번째 줄) 전체를:

```ts
  private buildShell(mount: HTMLElement): void {
    this.flashEl = el('div', { style: 'position:absolute;inset:0;background:var(--danger);pointer-events:none;z-index:60;display:none' });
    this.asideEl = el('aside');
    this.headerEl = el('header');
    this.bodyEl = el('div', { class: 'sc', style: 'flex:1;overflow-y:auto;padding:28px 30px 40px' });
    this.settingsHost = el('div');
    this.revealBtn = el('button', {
      title: '사이드바 열기', class: 'h-surface',
      style: 'position:absolute;left:14px;top:18px;width:32px;height:32px;border-radius:9px;' +
        'background:var(--surface);border:1px solid var(--border);color:var(--muted);' +
        'display:none;align-items:center;justify-content:center;cursor:pointer;z-index:40',
      onclick: () => this.onRevealClick(),
    }, [iconMenu()]);
    const mainEl = el('main', { style: 'flex:1;display:flex;flex-direction:column;min-width:0' }, [this.headerEl, this.bodyEl]);

    this.rootEl = el('div', {
      style: "position:fixed;inset:0;display:flex;background:var(--bg);color:var(--text);font-family:'Sora',system-ui,sans-serif;overflow:hidden",
    }, [this.flashEl, this.asideEl, mainEl, this.settingsHost, this.revealBtn]);
    this.rootEl.setAttribute('data-theme', this.state.theme);

    clear(mount);
    mount.append(this.rootEl);

    this.sidebar.build(this.asideEl, this.ctx());
    this.header.build(this.headerEl, this.ctx());
  }

  private onRevealClick(): void {
    if (this.state.narrow) this.setState({ navMobileOpen: true });
    else this.setState({ navState: 'expanded' });
  }
```

로 교체.

- [ ] **Step 4: `setState()`의 사이드바 리빌드 조건 갱신**

`setState()`(현재 97~121번째 줄) 전체를:

```ts
  setState(patch: Partial<AppState>, opts?: RenderOpts): void {
    const prevTool = this.state.tool;
    const prevNavState = this.state.navState;
    const prevMobileOpen = this.state.navMobileOpen;
    const prevNarrow = this.state.narrow;
    const prevSettings = this.state.settingsOpen;
    const prevTheme = this.state.theme;

    Object.assign(this.state, patch);
    saveKey(serialize(this.state));
    this.rootEl.setAttribute('data-theme', this.state.theme);

    if (this.state.tool !== prevTool) this.mountTool();
    else if (opts?.main) this.current.rebuild(this.ctx());

    // Theme swaps the sidebar's sun/moon icon + label; nav state/narrow/mobile-open change its layout.
    if (this.state.navState !== prevNavState || this.state.navMobileOpen !== prevMobileOpen ||
        this.state.narrow !== prevNarrow || this.state.theme !== prevTheme || opts?.sidebar) {
      this.sidebar.rebuild(this.ctx());
    }

    if (this.state.settingsOpen !== prevSettings) this.syncSettings();
    else if (opts?.settings && this.state.settingsOpen) this.settings.rebuild(this.ctx());

    this.renderDynamic();
  }
```

로 교체.

- [ ] **Step 5: `renderDynamic()`에서 플로팅 버튼 표시 갱신**

`renderDynamic()`(현재 123~132번째 줄) 시작 부분:

```ts
  private renderDynamic(): void {
    const ctx = this.ctx();
    this.header.update(ctx);
    this.sidebar.update(ctx);
    this.current.update(ctx);
```

를:

```ts
  private renderDynamic(): void {
    const ctx = this.ctx();
    this.header.update(ctx);
    this.sidebar.update(ctx);
    this.revealBtn.style.display = navShellHidden(this.state) ? 'flex' : 'none';
    this.current.update(ctx);
```

로 교체.

- [ ] **Step 6: 리사이즈 시 모바일→데스크톱 전환에서 드로어 상태 리셋**

`wireGlobals()`의 resize 리스너(현재 162~165번째 줄):

```ts
    window.addEventListener('resize', () => {
      const narrow = window.innerWidth < NARROW;
      if (narrow !== this.state.narrow) this.setState({ narrow });
    });
```

를:

```ts
    window.addEventListener('resize', () => {
      const narrow = window.innerWidth < NARROW;
      if (narrow !== this.state.narrow) {
        this.setState(narrow ? { narrow } : { narrow, navMobileOpen: false });
      }
    });
```

로 교체.

- [ ] **Step 7: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (전체 프로젝트)

- [ ] **Step 8: 전체 테스트 실행**

Run: `npx vitest run`
Expected: PASS (모든 기존 + 신규 테스트)

- [ ] **Step 9: 커밋**

```bash
git add src/main.ts
git commit -m "feat: floating sidebar-reveal button, rebuild-trigger + resize wiring for nav shell"
```

---

## Task 7: 브라우저 수동 QA

**Files:** 없음 (검증만)

Vite dev 서버를 띄우고(`npm run dev`), 아래 항목을 데스크톱 폭(예: 1280px)과 모바일 폭(예: 375px) 양쪽에서, 다크/라이트 테마 모두 확인한다.

- [ ] **Step 1: 데스크톱 3단계 순환**
  - 펼침 상태에서 brand의 "접기" 버튼 클릭 → 70px 레일로 전환, 애니메이션 확인
  - 레일 상태에서 상단 버튼("숨기기") 클릭 → 0px로 사라짐, 플로팅 버튼(☰)이 좌상단에 나타남
  - 플로팅 버튼 클릭 → 216px 펼침으로 즉시 복귀
  - 헤더 타이틀이 플로팅 버튼과 겹치지 않는지 확인

- [ ] **Step 2: 레일 상태에서 하단 버튼 아이콘**
  - 레일 상태로 접었을 때 테마 전환/알림 설정 버튼에 아이콘이 정상적으로 보이는지 확인 (버그 수정 검증)

- [ ] **Step 3: 새로고침 후 상태 유지**
  - 레일 또는 숨김 상태에서 새로고침 → 같은 상태 유지 확인 (localStorage 저장 확인)

- [ ] **Step 4: 모바일 폭으로 리사이즈**
  - 375px로 리사이즈 → 사이드바가 사라지고 본문이 전체 폭을 차지하는지, 좌상단 플로팅 버튼(☰)이 보이는지 확인
  - 플로팅 버튼 클릭 → 사이드바가 왼쪽에서 슬라이드인, 반투명 배경 확인
  - 배경(바깥) 클릭 → 드로어 닫힘
  - 다시 열고 도구(예: 스톱워치) 클릭 → 도구 전환되면서 드로어 자동으로 닫힘

- [ ] **Step 5: 데스크톱 ↔ 모바일 리사이즈 전환**
  - 모바일에서 드로어를 연 채로 창을 데스크톱 폭으로 늘림 → 정상적으로 데스크톱 사이드바(직전 `navState`)로 전환되고 이상한 잔상 없음

- [ ] **Step 6: 최종 빌드**

Run: `npm run build`
Expected: 에러 없이 빌드 성공 (`tsc --noEmit && vite build`)
