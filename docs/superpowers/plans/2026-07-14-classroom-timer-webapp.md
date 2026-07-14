# 교실 타이머 Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-quality, 100% client-side static web app port of the 교실 타이머 prototype, deployable at `classin.cloud/timetools`.

**Architecture:** Vite + TypeScript, framework-free. A typed `AppState` + pure logic module drives a set of view modules that each `build()` their DOM once and expose an `update()` that a single 100ms tick calls to refresh only dynamic values (inputs are never rewritten on tick, so focus is preserved). State persists to localStorage.

**Tech Stack:** Vite, TypeScript, Vitest (logic tests), @fontsource (self-hosted Sora + JetBrains Mono), Web Audio API.

**Source of truth:** `reference/교실타이머.dc.html` — the approved prototype. It is a React-class component (`DCLogic`). Every view's markup and every logic branch is ported from there. Cite line ranges when porting. Do **not** invent behavior not in the prototype (except the §5 hardening items in the spec).

**Spec:** `docs/superpowers/specs/2026-07-14-classroom-timer-webapp-design.md`.

---

## File Structure

```
index.html                     # shell: #app root, <title>, favicon, meta
vite.config.ts                 # base:'/timetools/', build opts
tsconfig.json
package.json
src/
  main.ts                      # mount shell, wire global chrome, own the 100ms tick
  state.ts                     # AppState type, pure logic, formatters, hydrate/persist
  audio.ts                     # Web Audio synthesis + custom audio + ring loop
  icons.ts                     # inline SVG icon builders (nav + controls)
  styles.css                   # CSS vars (dark default + [data-theme=light]), fonts, keyframes
  dom.ts                       # tiny el() helper for building nodes
  views/
    sidebar.ts
    header.ts
    timer.ts
    stopwatch.ts
    clock.ts
    exam.ts
    pomodoro.ts
    settings.ts
  state.test.ts                # vitest: formatters, timers, examCalc, pomodoro, offsets, persistence
DEPLOY.md
```

**View module contract** (every `views/*.ts` exports this shape):
```ts
export interface View {
  build(root: HTMLElement, ctx: Ctx): void;   // create DOM once
  update(ctx: Ctx): void;                      // refresh dynamic values only (called each tick + after setState)
  rebuild?(ctx: Ctx): void;                    // full subtree rebuild after structural change (add/remove/edit-mode)
}
```
where `Ctx` gives access to `state`, `setState`, `audio`, and formatters.

---

## Task 0: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/styles.css`, `src/dom.ts`

- [ ] **Step 1: Init Vite + TS + Vitest**

```bash
cd /Users/clmagi/Desktop/Projects/time_tools
npm init -y
npm i -D vite typescript vitest @fontsource/sora @fontsource-variable/jetbrains-mono jsdom
```
(@fontsource packages ship woff2 + css we import locally — no Google CDN.)

- [ ] **Step 2: `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/timetools/',
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0 },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 3: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "noUnusedLocals": true, "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"], "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: `index.html`**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>교실 타이머</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='7' fill='%23e0a34e'/%3E%3C/svg%3E" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: `src/styles.css`** — port the prototype `<style>` block (reference lines ~15–40): CSS reset, `:root` dark vars, `[data-theme="light"]` vars, `.mono`, scrollbar `.sc`, keyframes `glowpulse`/`flashkf`/`dotpulse`. Add at top:

```css
@import '@fontsource/sora/300.css';
@import '@fontsource/sora/400.css';
@import '@fontsource/sora/500.css';
@import '@fontsource/sora/600.css';
@import '@fontsource/sora/700.css';
@import '@fontsource-variable/jetbrains-mono';
```
Set `body{font-family:'Sora',system-ui,sans-serif}` and `.mono{font-family:'JetBrains Mono Variable',monospace}`.

- [ ] **Step 6: `src/dom.ts`** — minimal element builder used everywhere:

```ts
type Attrs = Record<string, string | number | boolean | ((e: Event) => void)>;
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Attrs = {}, children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') n.setAttribute('style', String(v));
    else if (k === 'class') n.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false) n.setAttribute(k, String(v));
  }
  for (const c of children) n.append(c);
  return n;
}
export function svg(inner: string, attrs: Record<string, string> = {}): SVGElement {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries(attrs)) wrap.setAttribute(k, v);
  wrap.innerHTML = inner;
  return wrap;
}
```

- [ ] **Step 7: `src/main.ts` placeholder** — mount an empty themed shell to prove the pipeline:

```ts
import './styles.css';
const app = document.getElementById('app')!;
app.innerHTML = '<div style="position:fixed;inset:0;background:var(--bg);color:var(--text)">boot ok</div>';
```

- [ ] **Step 8: Verify dev server**

Run: `npm run dev` (add `"dev":"vite","build":"vite build","preview":"vite preview","test":"vitest run"` to package.json scripts first).
Expected: page shows "boot ok" on the dark background at the printed localhost URL.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite+TS project with self-hosted fonts"
```

---

## Task 1: State model, formatters, pure logic, persistence (`state.ts`) — TDD

This is the heart. Port all logic from the prototype `<script>` (reference lines 264–530). All functions are pure or operate on a passed state object so they are unit-testable.

**Files:**
- Create: `src/state.ts`, `src/state.test.ts`

- [ ] **Step 1: Define types + initial state** in `src/state.ts`

```ts
export type Tool = 'timer' | 'stopwatch' | 'clock' | 'exam' | 'pomo';
export interface Timer { id:number; name:string; total:number; remaining:number; running:boolean; endAt:number|null; done:boolean; sound:string; accent:string; }
export interface Period { id:number; name:string; start:string; end:string; }
export interface Pomo { focusMin:number; breakMin:number; cycles:number; phase:'focus'|'break'; round:number; running:boolean; endAt:number|null; remaining:number; done:boolean; }
export interface Sw { running:boolean; startedAt:number; acc:number; laps:number[]; }
export interface AppState {
  tool:Tool; theme:'dark'|'light'; settingsOpen:boolean; navCollapsed:boolean; narrow:boolean;
  volume:number; sound:string; flash:boolean; examEdit:boolean; clockFormat:'24'|'12';
  nextId:number; nextPid:number; focusId:number; customName:string|null; customData:string|null;
  timers:Timer[]; sw:Sw; periods:Period[]; pomo:Pomo;
}
export const ACCENTS = ['#e0a34e','#6ea8e0','#6fcf9a','#e08a9a','#b79ae0'];
export function initialState(): AppState { /* port `state = {...}` from reference lines 265–282, add clockFormat:'24', customData:null */ }
```

- [ ] **Step 2: Write failing tests for formatters** in `src/state.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { pad, fmtClock, parseHM, hm } from './state';
describe('formatters', () => {
  it('pads', () => expect(pad(3)).toBe('03'));
  it('fmtClock under an hour', () => expect(fmtClock(65)).toBe('01:05'));
  it('fmtClock over an hour', () => expect(fmtClock(3661)).toBe('1:01:01'));
  it('fmtClock clamps negatives', () => expect(fmtClock(-5)).toBe('00:00'));
  it('parseHM', () => expect(parseHM('09:30')).toBe(9*3600+30*60));
  it('parseHM bad input', () => expect(parseHM('')).toBe(0));
  it('hm wraps day', () => expect(hm(9*3600+5*60)).toBe('09:05'));
});
```

- [ ] **Step 3: Run — expect FAIL** `npm test` → fails (functions not exported).

- [ ] **Step 4: Implement formatters** — port `pad`, `fmtClock`, `parseHM`, `hm` verbatim from reference lines 311–314 as exported functions.

- [ ] **Step 5: Run — expect PASS** `npm test`.

- [ ] **Step 6: Failing tests for timer logic** — timer functions are pure `(timer, now) => timer`. Add to test file:

```ts
import { toggleTimer, resetTimer, plusMin, setPreset } from './state';
const base = ():Timer => ({id:1,name:'t',total:300,remaining:300,running:false,endAt:null,done:false,sound:'chime',accent:'#e0a34e'});
describe('timer logic', () => {
  it('start sets endAt and running', () => { const t=toggleTimer(base(),1000); expect(t.running).toBe(true); expect(t.endAt).toBe(1000+300000); });
  it('pause captures remaining', () => { let t=toggleTimer(base(),1000); t=toggleTimer(t,1000+60000); expect(t.running).toBe(false); expect(Math.round(t.remaining)).toBe(240); });
  it('restart after done resets to total', () => { const d={...base(),done:true,remaining:0}; const t=toggleTimer(d,5000); expect(t.done).toBe(false); expect(t.running).toBe(true); expect(t.remaining).toBe(300); });
  it('reset restores total', () => { const t=resetTimer({...base(),running:true,remaining:10,done:true}); expect(t).toMatchObject({running:false,done:false,remaining:300,endAt:null}); });
  it('plusMin while running extends endAt', () => { const r={...base(),running:true,endAt:1000}; expect(plusMin(r,0).endAt).toBe(1000+60000); });
  it('plusMin while idle grows total', () => { const t=plusMin(base(),0); expect(t.total).toBe(360); expect(t.remaining).toBe(360); });
  it('setPreset sets total+remaining, clears state', () => { const t=setPreset(base(),600); expect(t).toMatchObject({total:600,remaining:600,running:false,done:false,endAt:null}); });
});
```

- [ ] **Step 7: Run — expect FAIL.**

- [ ] **Step 8: Implement timer logic** — extract the mutation bodies from `toggleTimer`/`resetTimer`/`plusMin`/`setPreset` (reference lines 342–353) into pure functions taking `(t, now)` and returning a new timer. Keep exact branch order (done → running → idle). Note: prototype's `toggleTimer` also stops the ring — the ring is handled by `audio.ts` at the call site, not in pure logic.

- [ ] **Step 9: Run — expect PASS.**

- [ ] **Step 10: Failing tests for examCalc**

```ts
import { examCalc } from './state';
const P = [ {id:1,name:'1교시',start:'09:00',end:'09:50'}, {id:2,name:'2교시',start:'10:00',end:'10:50'} ];
const S=(h:number,m:number)=>h*3600+m*60;
describe('examCalc', () => {
  it('active inside a period', () => { const r=examCalc(P,S(9,20)); expect(r.state).toBe('active'); expect(r.title).toBe('1교시'); expect(r.remain).toBe(30*60); });
  it('wait before first', () => { const r=examCalc(P,S(8,30)); expect(r.state).toBe('wait'); expect(r.remain).toBe(30*60); });
  it('break between', () => { const r=examCalc(P,S(9,55)); expect(r.state).toBe('break'); expect(r.sub).toContain('2교시'); });
  it('done after last', () => { const r=examCalc(P,S(11,0)); expect(r.state).toBe('done'); });
});
```

- [ ] **Step 11: Run FAIL → implement `examCalc(periods, nSec)`** ported from reference lines 374–385 (pure; takes periods + seconds) → run PASS.

- [ ] **Step 12: Failing tests for pomodoro advance/adjust**

```ts
import { advancePomo, adjustPomo } from './state';
const pb=():Pomo=>({focusMin:25,breakMin:5,cycles:4,phase:'focus',round:1,running:false,endAt:null,remaining:1500,done:false});
describe('pomodoro', () => {
  it('focus advances to break', () => { const p=advancePomo(pb(),1000); expect(p.phase).toBe('break'); expect(p.remaining).toBe(300); expect(p.running).toBe(true); });
  it('break advances to next focus round', () => { const p=advancePomo({...pb(),phase:'break',round:1},0); expect(p.phase).toBe('focus'); expect(p.round).toBe(2); });
  it('break wraps round at cycles', () => { const p=advancePomo({...pb(),phase:'break',round:4},0); expect(p.round).toBe(1); });
  it('adjust focus clamps and syncs remaining when idle', () => { const p=adjustPomo(pb(),'focusMin',5); expect(p.focusMin).toBe(30); expect(p.remaining).toBe(1800); });
  it('adjust clamps to 1..90', () => { expect(adjustPomo({...pb(),focusMin:90},'focusMin',5).focusMin).toBe(90); });
});
```

- [ ] **Step 13: Run FAIL → implement `advancePomo(P, now)` (lines 388–393) and `adjustPomo(P, key, delta)` (line 397, pure)** → run PASS.

- [ ] **Step 14: Failing test for world-clock offset (hardening §5.2)**

```ts
import { zoneOffsetLabel } from './state';
describe('world clock offset', () => {
  it('returns 동일 for same offset', () => expect(zoneOffsetLabel(0)).toBe('동일'));
  it('formats a negative diff', () => expect(zoneOffsetLabel(-14*60)).toBe('−14시간'));
  it('formats a positive diff', () => expect(zoneOffsetLabel(60)).toBe('+1시간'));
  it('formats half-hour diffs', () => expect(zoneOffsetLabel(-90)).toBe('−1시간 30분'));
});
```

- [ ] **Step 15: Run FAIL → implement `zoneOffsetLabel(diffMinutes)`** (diffMinutes = zone offset − local offset, in minutes) plus a helper `zoneDiffMinutes(tz, date)` that computes a zone's offset vs local using `Intl.DateTimeFormat(..., {timeZone, timeZoneName:'shortOffset'})` or the two-format epoch technique. Use the unicode minus `−` (U+2212) to match the prototype. Run PASS.

- [ ] **Step 16: Failing test for persistence round-trip**

```ts
import { serialize, hydrate, initialState } from './state';
describe('persistence', () => {
  it('round-trips state', () => { const s=initialState(); s.theme='light'; s.volume=42; const back=hydrate(serialize(s), 0); expect(back.theme).toBe('light'); expect(back.volume).toBe(42); });
  it('reconstructs a running timer from endAt', () => {
    const s=initialState(); s.timers[0]={...s.timers[0],running:true,endAt:10000,remaining:300};
    const back=hydrate(serialize(s), 10000+120000); // 120s later
    expect(back.timers[0].running).toBe(true); expect(Math.round(back.timers[0].remaining)).toBe(180);
  });
  it('marks an already-elapsed running timer done on hydrate', () => {
    const s=initialState(); s.timers[0]={...s.timers[0],running:true,endAt:10000,remaining:300};
    const back=hydrate(serialize(s), 10000+400000);
    expect(back.timers[0].done).toBe(true); expect(back.timers[0].running).toBe(false); expect(back.timers[0].remaining).toBe(0);
  });
});
```

- [ ] **Step 17: Run FAIL → implement `serialize(state):string` and `hydrate(json, now=Date.now()):AppState`.** `serialize` JSON-stringifies a persisted subset (see spec §5.1: theme, navCollapsed, timers, periods, pomo, sound, volume, flash, clockFormat, customName, customData, nextId, nextPid, focusId). `hydrate` merges over `initialState()` (so new fields get defaults), then for each running timer and the pomo: if `endAt<=now` → set done/stopped/remaining 0 (timer) or advance/stop; else recompute `remaining=(endAt-now)/1000`. Guard against malformed JSON (return `initialState()`). Run PASS.

- [ ] **Step 18: Add `loadKey`/`saveKey` wrappers** (localStorage key `timetools:v1`, wrapped in try/catch for private-mode) and a `stopwatch` note: sw is session-only per prototype (don't persist `sw`). Commit:

```bash
git add -A && git commit -m "feat: state model, pure logic, and persistence with tests"
```

---

## Task 2: Audio engine (`audio.ts`)

**Files:** Create `src/audio.ts`. (Synthesis is verified by ear in QA; the ring scheduler is unit-tested with fake timers.)

- [ ] **Step 1: Port synthesis** — create `class Audio { constructor(getVolume:()=>number){} play(sound:string){} }` porting `ensureAC`/`play` (reference lines 318–336): the `P` oscillator table for chime/bell/digital/marimba/soft, gain envelopes, and the `custom` branch that plays `this.customAudio`. `ensureAC` lazily creates + resumes `AudioContext` (call it from the first user gesture in `main.ts`).

- [ ] **Step 2: Port ring loop** — `startRing(id, sound)` / `stopRing(id)` (lines 337–338): first `play`, then `setInterval(()=>play, 1700)`, auto-`stopRing` after 30000ms. Track intervals in a map; `stopAllRings()` clears everything.

- [ ] **Step 3: Custom audio** — `setCustom(dataUrlOrObjectUrl:string, name:string)` creates `new Audio(url)`; used by settings upload and by hydrate (data URL).

- [ ] **Step 4: Test ring scheduling with fake timers**

```ts
import { describe, it, expect, vi } from 'vitest';
// mock AudioContext minimally; assert startRing schedules repeats every 1700ms and stops by 30s
```
Implement a small test that spies on the internal `play` (inject a fake AC) and uses `vi.useFakeTimers()` to assert ~17 repeats then auto-stop. Run PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: web audio synthesis + ring loop"`

---

## Task 3: Shell, icons, tick loop, global chrome (`main.ts`, `icons.ts`)

**Files:** Create `src/icons.ts`; rewrite `src/main.ts`.

- [ ] **Step 1: `icons.ts`** — export functions returning SVG strings/nodes for nav icons (timer/stopwatch/clock/exam/pomo, reference lines 421–427) and control icons (play/pause/reset/plus/skip/lap/close/check/chevron/sun/moon/bell/upload/trash). One source for all inline SVGs.

- [ ] **Step 2: App scaffold in `main.ts`** — set up:
  - `let state = hydrate(loadKey(), Date.now());`
  - `function setState(patch, opts?)`: `Object.assign(state, patch)`, `saveKey(serialize(state))`, then either call the active view's `rebuild()` (structural) or rely on next tick's `update()`. Provide `setState` to views via `Ctx`.
  - Build the fixed shell: root flex container with `data-theme`, sidebar mount, main (header + scroll body), settings mount, flash overlay.
  - View registry `{ timer, stopwatch, clock, exam, pomo }`; switching tools calls `view.build()` into the body, sets `current`.
  - Resize listener sets `narrow` (<760) and reconciles sidebar (port lines 289–291).
  - `visibilitychange` → immediate reconcile + `update()` (spec §5.4).
  - First user gesture (pointerdown) → `audio.ensureAC()` unlock.
  - `setInterval(tick, 100)`: replicate prototype `tick` (lines 299–309) — timers that hit `endAt` become done + `audio.startRing`; pomo end → `audio.play(default)` + `advancePomo`; then call `header.update()`, `sidebar.update()` (badge), and `current.update()`.

- [ ] **Step 3: Wire theme toggle, sidebar collapse, settings open/close** through `setState` (ports lines 517, 521–523).

- [ ] **Step 4: Verify** `npm run dev` — shell renders dark, theme toggle flips to light and persists across reload, sidebar collapse works, resizing < 760 auto-collapses. (Views may still be stubs.)

- [ ] **Step 5: Commit** `git commit -am "feat: app shell, icons, tick loop, theme/sidebar/settings chrome"`

---

## Task 4: Timer view (`views/timer.ts`)

Port reference lines 74–176 (hero + grid) and the `hero`/`timers` binding builders (lines 460–480).

- [ ] **Step 1: `build()`** — construct hero (name input, ring SVG with track + progress circle `r=124`, mono display, status label, reset/toggle/plus buttons, preset row, sound select) and the card grid container + "타이머 추가" card. Preset chips `[1,3,5,10,25,45]`. Wire handlers to `setState` via the pure logic functions (`toggleTimer`, `resetTimer`, `plusMin`, `setPreset`, `setName`, `setSnd`) applied through a `updTimer(id, fn)` helper on state; toggle/reset also call `audio.startRing`/`audio.stopRing` appropriately (port lines 342–357). Focus-on-card-click sets `focusId`.
- [ ] **Step 2: `update()`** — refresh hero display/ring `stroke-dashoffset` (`circ=2π·124`, `dash=circ·(1-eff)`), colors, status; each card's mono display, bar width `pct`, colors, and button label/icon (시작/일시정지/다시). **Do not touch name `<input>` values.** Circle color: done→danger, running→accent, idle→muted (lines 462, 474–478).
- [ ] **Step 3: `rebuild()`** — re-render the grid after add/remove/focus change (structural). Keep hero + grid in sync.
- [ ] **Step 4: Verify in browser** — start/pause/reset/+1분, presets highlight, add/delete (can't delete last), card click focuses, run badge appears in nav, name edits don't drop focus mid-tick, completion triggers alarm + (if flash on) screen flash. Test with a 1분 preset run-to-completion.
- [ ] **Step 5: Commit** `git commit -am "feat: timer view"`

---

## Task 5: Stopwatch view (`views/stopwatch.ts`)

Port reference lines 179–201 and binding builder lines 483–485. Stopwatch state (`sw`) logic: `swElapsed/swToggle/swReset/swLap/fmtSW` (lines 360–364) — add these to `state.ts` as functions over `Sw` (pure where possible; `swElapsed` takes `(sw, now)`).

- [ ] **Step 1:** Add `swElapsed/swToggle/swReset/swLap/fmtSW` to `state.ts` (+ 2 quick vitest cases: elapsed accrues across pause; lap records total).
- [ ] **Step 2: `build()`** — big `mm:ss` + `.cs`, status label, lap/toggle/reset buttons, lap list container.
- [ ] **Step 3: `update()`** — refresh main + cs + status each tick.
- [ ] **Step 4: `rebuild()`** — re-render lap list on lap/reset (newest-first with split + total, line 484).
- [ ] **Step 5: Verify** — start/pause accuracy, laps compute split/total correctly, reset clears. Commit.

---

## Task 6: Clock view (`views/clock.ts`)

Port reference lines 204–216 and binding builder lines 487–489, plus the 12/24h toggle (hardening §5.3) and computed offsets (Task 1 `zoneOffsetLabel`).

- [ ] **Step 1: `build()`** — date/weekday line, big `HH:MM` + `SS`, world-clock grid (뉴욕/런던/파리/도쿄), and a small 12/24h toggle bound to `state.clockFormat` via `setState`.
- [ ] **Step 2: `update()`** — refresh main clock (respect `clockFormat`), seconds, and each world time via `Intl.DateTimeFormat('en-GB',{hour,minute,hour12:false,timeZone})`; offset labels via `zoneOffsetLabel(zoneDiffMinutes(tz, now))`.
- [ ] **Step 3: Verify** — time ticks, 12/24h toggle persists, world times reasonable, **offset labels correct** (e.g. 도쿄 shows +0/동일 relative to KST; New York shows −13/−14 depending on DST). Commit.

---

## Task 7: 교시 스케줄 view (`views/exam.ts`)

Port reference lines 219–239 (view + edit modes) and binding builder lines 437–457. `examCalc` already tested (Task 1). Period mutations `updPeriod/addPeriod/removePeriod/loadSuneung` (lines 367–373) → add to `state.ts` as functions over `periods`.

- [ ] **Step 1:** Add `addPeriod(periods, nextPid)`, `removePeriod`, `loadSuneung()` to `state.ts` (the 수능 preset list is lines 370–373 verbatim).
- [ ] **Step 2: `build()` view mode** — header card (state label, current clock, title, remaining countdown + progress unless done, or sub text), period rows (dot/name/range/dur), 편집 + 수능 불러오기 buttons.
- [ ] **Step 3: `build()`/`rebuild()` edit mode** — per-row name text input + start/end `time` inputs + delete; 교시 추가 + 완료 buttons. Toggling 편집 calls `rebuild()`.
- [ ] **Step 4: `update()`** — in view mode refresh state label/color, remaining countdown, progress bar, and per-row current/done/upcoming styling each tick. **Never rewrite edit-mode inputs on tick.**
- [ ] **Step 5: Header pill** — `header.update()` already reads `examCalc`; verify the pill shows current period + remaining (lines 441).
- [ ] **Step 6: Verify** — set a period to "now" and confirm active/countdown; edit times; add/remove; 수능 불러오기 loads preset; pill matches. Commit.

---

## Task 8: 뽀모도로 view (`views/pomodoro.ts`)

Port reference lines 242–239… (the `isPomo` block, lines ~ 242–260 region: chips, ring, dots, controls, steppers) and binding builder lines 491–501. Pomo logic `pomoToggle/pomoReset/pomoSkip/advancePomo/adjustPomo` — `advancePomo`/`adjustPomo` done in Task 1; add `pomoToggle(P, now)` and `pomoReset(P)` (lines 394–396) to `state.ts`.

- [ ] **Step 1:** Add `pomoToggle(P, now)` + `pomoReset(P)` to `state.ts` (+2 vitest cases: toggle from idle sets endAt from remaining; reset returns to focus/round1/remaining=focusMin·60).
- [ ] **Step 2: `build()`** — phase chips, 270px ring, round dots (`cycles`), reset/toggle/skip, focus/break stepper cards.
- [ ] **Step 3: `update()`** — ring dashoffset, display, phase label `집중 · r/cycles` or `휴식`, chip active states, dot fills, color (focus=accent, break=#6fcf9a). Stepper numbers.
- [ ] **Step 4: `rebuild()`** — after cycles/stepper changes if dot count changes.
- [ ] **Step 5: Verify** — run a short focus→break transition (temporarily set focusMin low), steppers clamp 1..90, skip advances, reset works, sound fires on phase end. Commit.

---

## Task 9: Settings drawer + flash overlay (`views/settings.ts`)

Port reference lines 244–259 (drawer) and binding builders lines 503–505, 524–527.

- [ ] **Step 1: `build()`** — right slide-over: 기본 알림음 chips (built-ins + 내 사운드 when `customName`), 볼륨 slider + `%` + 미리듣기, 커스텀 사운드 file input, 화면 깜빡임 toggle. Backdrop click closes; inner click stops propagation.
- [ ] **Step 2: Handlers** — sound chip select sets `state.sound` + `audio.play`; volume `input` sets `state.volume` (audio reads it live); 미리듣기 plays current; upload → read file as data URL (cap ~1MB per spec §5.1: if larger, keep object URL, set `customData=null` so it's session-only), `audio.setCustom`, set `customName`/`customData`, `sound='custom'`; flash toggle flips `state.flash`.
- [ ] **Step 3: `update()`** — reflect volume %/slider and active chip states after external changes (rebuild on open).
- [ ] **Step 4: Flash overlay** — in `main.ts`, the fixed overlay's visibility is set each tick from `flash && (timers.some(done) || pomo.done)` (line 505) using the `flashkf` keyframe.
- [ ] **Step 5: Verify** — pick sounds (each plays), volume affects loudness + persists, upload a small mp3 and confirm it plays + persists across reload (≤1MB), flash toggles the completion flash. Commit.

---

## Task 10: Persistence integration + reconcile polish

- [ ] **Step 1:** Confirm every `setState` persists (it does via Task 3). Manually verify reload keeps: theme, sidebar, tool, timers (running timer keeps counting down accurately), periods edits, pomo settings, sound/volume/flash, clockFormat, custom sound (if small).
- [ ] **Step 2:** Confirm `visibilitychange` reconcile — start a 2분 timer, background the tab ~30s, return: display jumps to correct remaining immediately.
- [ ] **Step 3:** Confirm a timer that elapses entirely while the tab was hidden shows done + rings on return (hydrate/tick both handle it).
- [ ] **Step 4: Commit** `git commit -am "feat: persistence + background reconcile verified"`

---

## Task 11: Build config, favicon, DEPLOY.md, production verification

- [ ] **Step 1:** Confirm `vite.config.ts` `base:'/timetools/'`. Run `npm run build`.
- [ ] **Step 2:** `npm run preview` and open the printed URL (served under `/timetools/`); click through all five tools to confirm assets/fonts load under the subpath (no 404s in console/network).
- [ ] **Step 3:** Write `DEPLOY.md`:
  - State the `/timetools/` base assumption and how to change it (single `base` line + rebuild).
  - nginx example:
    ```nginx
    location /timetools/ {
      alias /var/www/timetools/;         # contents of dist/
      try_files $uri $uri/ /timetools/index.html;
    }
    location ~* /timetools/assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    ```
  - Static host (Pages/Netlify) note: publish `dist/`, set base/subpath accordingly.
  - `index.html` should be served `no-cache`; hashed `assets/*` long-cache.
- [ ] **Step 4: Commit** `git commit -am "chore: production build config + DEPLOY.md"`

---

## Task 12: Full QA pass + fixes

- [ ] **Step 1:** Using the gstack `browse` or the in-app Browser, run the app and exercise every §4 feature in **dark** theme, then **light** theme, then a **<760px** narrow viewport (sidebar auto-collapses, header sub/pill hide).
- [ ] **Step 2:** Verify against the prototype visually (open `reference/교실타이머.dc.html` mentally / compare screenshots): spacing, colors, ring sizes, fonts.
- [ ] **Step 3:** Check console for errors/warnings; check for interval/timeout leaks (rings clear; only the one 100ms tick runs).
- [ ] **Step 4:** Fix any parity or bug findings; re-verify. Commit each fix.
- [ ] **Step 5: Final commit + summary** of what was built and how to deploy.

---

## Self-Review (author checklist — completed)

- **Spec coverage:** §4 features → Tasks 4–9; §5 hardening → persistence (Task 1/10), offsets (Task 1/6), 12/24h (Task 6), timekeeping/reconcile (Task 3/10), deploy shell + fonts (Task 0/11), QA (Task 12). All covered.
- **Type consistency:** `AppState`/`Timer`/`Period`/`Pomo`/`Sw` defined once in Task 1; view tasks consume the same names; logic fn names (`toggleTimer`, `resetTimer`, `plusMin`, `setPreset`, `examCalc`, `advancePomo`, `adjustPomo`, `pomoToggle`, `pomoReset`, `swElapsed`, `serialize`, `hydrate`, `zoneOffsetLabel`) used consistently across tasks.
- **Placeholders:** logic tasks carry real test + porting instructions with exact reference line ranges; view tasks are build-to-reference with concrete verification steps. No "TBD".
- **Ordering:** scaffold → logic (tested) → audio → shell → views → persistence → build/deploy → QA. Each task ends compilable/committable.
