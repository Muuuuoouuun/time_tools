# 교실 타이머 (Classroom Timer) — Production Web App

**Date:** 2026-07-14
**Status:** Approved (design)
**Source prototype:** `reference/교실타이머.dc.html` (imported from claude.ai/design project `d4887e3b…`, "브라우저 미니 타이머 앱")
**Deploy target:** `classin.cloud/timetools` (standalone static site, deployed by the user)

## 1. Goal

Port the 교실 타이머 prototype into a production-quality, 100% client-side static web app. Faithful feature and visual parity with the prototype, hardened for real classroom use (persistence, correct timekeeping, offline-capable, deploy-ready at a subpath). No backend.

## 2. Non-Goals (explicitly out of scope)

- PWA install / service worker offline caching beyond "static assets load once"
- Keyboard shortcuts
- Fullscreen "수업 모드"
- Any new tool beyond the five in the prototype
- User accounts, sync, or any server component

## 3. Stack & Architecture

- **Vite + TypeScript**, framework-free. Build output is a static `dist/`.
- **Base path:** `base: '/timetools/'` in `vite.config.ts` so every emitted asset URL is prefixed correctly for the subpath.
- **Rendering — build-once + targeted-update:**
  - Each view builds its DOM once (on first mount / tool switch).
  - A single `setInterval` tick (100ms) updates only *dynamic* values: header clock, hero ring `stroke-dashoffset`, card mono displays, progress-bar widths, status colors/labels, nav running-count badge, stopwatch/pomodoro/exam countdowns.
  - **User inputs are never rewritten on tick** (timer name, 교시 name/start/end, volume slider). They update only in response to user `change`/`input` events. This preserves focus and caret position — the main reason not to full-`innerHTML`-replace.
  - Structural changes (add/remove timer, add/remove 교시, switch tool, open/close settings, edit-mode toggle) rebuild the affected subtree.

### Module boundaries

| Module | Responsibility | Depends on |
|---|---|---|
| `src/state.ts` | Typed `AppState`, pure logic (timer toggle/reset/+1min/preset/add/remove, stopwatch, `examCalc`, pomodoro `advance`/`adjust`, formatters `fmtClock`/`pad`/`parseHM`/`hm`), and localStorage `hydrate()` / `persist()` | nothing |
| `src/audio.ts` | Web Audio synthesis of `chime/bell/digital/marimba/soft`, custom uploaded audio, and the completion ring loop (repeat every 1.7s, auto-stop after 30s) | `state` (volume/sound reads) |
| `src/views/sidebar.ts` | Nav + brand + collapse/expand + theme & settings buttons | `state`, `icons` |
| `src/views/header.ts` | Tool title/sub, exam status pill, live clock | `state` |
| `src/views/timer.ts` | Hero focused timer + preset row + sound select + card grid + add button | `state`, `audio` |
| `src/views/stopwatch.ts` | Big time, lap/start/reset, lap list | `state` |
| `src/views/clock.ts` | Big clock, date/weekday, world clocks, 12/24h toggle | `state` |
| `src/views/exam.ts` | Period list (view/edit), current/next detection, countdown, 수능 preset | `state` |
| `src/views/pomodoro.ts` | Ring, phase chips, round dots, controls, focus/break steppers | `state`, `audio` |
| `src/views/settings.ts` | Sound chips, volume, preview, custom upload, flash toggle | `state`, `audio` |
| `src/icons.ts` | Shared inline SVG icon builders | nothing |
| `src/main.ts` | Mount shell, wire events, own the 100ms tick, dispatch view `update()` | all views |
| `src/styles.css` | CSS custom properties (dark default + `[data-theme="light"]`), fonts, keyframes | — |

State updates flow one way: an event handler mutates `AppState` via a `setState`-like helper that (a) persists, (b) marks which subtrees need a structural rebuild, (c) leaves the tick to refresh dynamic values. Keep the `setState` batching simple; correctness over cleverness.

## 4. Feature Parity Checklist (must match prototype)

**Timer (타이머)**
- Multiple named timers; each has its own `accent` color and `sound`.
- Focused "hero": name input, 270px circular progress ring, mono display, status label (준비/진행 중/완료·알람), reset / play-pause / +1분, preset chips (1/3/5/10/25/45분, active state highlights), 알림음 select.
- Card grid (`repeat(auto-fill,minmax(230px,1fr))`): dot+name input+delete, mono display, mini progress bar, start-pause / reset. Clicking a card focuses it (sets hero). Focused card is highlighted; done card shows danger border/color.
- "타이머 추가" dashed card → appends `{ name: (n+1)+'모둠', total:300 }` with cycling accent.
- Cannot delete the last remaining timer.
- Nav badge shows count of running timers.
- On completion: `done=true`, remaining=0, ring alarm starts (per-timer sound, repeats 1.7s up to 30s), optional screen flash overlay.

**Stopwatch (스톱워치)**
- `mm:ss` + `.cs` (centiseconds), status (대기/측정 중/일시정지), lap / start-pause / reset.
- Lap list newest-first: lap number, split (+delta), total.

**Clock (시계)**
- Big `HH:MM` + colored `SS`, date `M월 D일`, weekday `요일`.
- World clocks: 뉴욕/런던/파리/도쿄 with **computed** offset labels vs local time (fix vs prototype's static strings) and live time via `Intl.DateTimeFormat` with the zone.
- 12/24h toggle (persisted).

**교시 스케줄 (Exam / period schedule)**
- Periods `{name, start, end}`. `examCalc(nowSec)` determines state: `active` (in a period) / `wait` (before first) / `break` (between) / `done` (after last), plus title, remaining seconds, progress, and remain label.
- Header status pill reflects current state.
- View mode: rows with dot (current/done/upcoming), name, time range, duration; header card shows big remaining countdown + progress bar (except `done`).
- Edit mode: per-row name text + start/end `time` inputs + delete; "교시 추가" (auto-continues from last end +10min, 50min block); "완료" returns to view.
- "수능 시간표 불러오기" loads the fixed 수능 preset (국어/수학/영어/한국사/탐구 with official-style times).

**뽀모도로 (Pomodoro)**
- focus/break phases, `focusMin` (default 25) / `breakMin` (5) / `cycles` (4), round counter.
- 270px ring, phase chips (집중/휴식), round dots, reset / play-pause / skip.
- Focus/break steppers: focus ±5 (clamp 1..90), break ±1 (clamp 1..90). Adjusting the *current* phase's minutes while paused updates remaining.
- On phase end: play default sound, advance phase (focus→break, break→focus with round increment / cycle wrap), continue running.

**Global**
- Theme toggle dark ⇄ light (persisted), `--glow` etc. per theme.
- Sidebar collapse toggle; auto-collapse when `window.innerWidth < 760`. Collapsed shows icons only; footer stacks.
- Settings drawer (right slide-over): 기본 알림음 chips (5 built-in + 내 사운드 when uploaded), 볼륨 slider + % + 미리듣기, 커스텀 사운드 업로드, 화면 깜빡임 toggle.
- Screen flash overlay animates when `flash && (any timer done || pomo done)`.

## 5. Production Hardening (in scope, beyond prototype)

1. **Persistence (localStorage, key `timetools:v1`):** theme, `navCollapsed`, timers (incl. running state reconstructed via `endAt`), periods, pomodoro settings, default `sound`, `volume`, `flash`, `clockFormat`. On hydrate, running timers/pomodoro recompute `remaining` from the stored `endAt` vs now (and fire completion if already elapsed). Custom sound persisted as a data URL only if ≤ ~1 MB; otherwise session-only and the selection falls back to `chime` on reload.
2. **Correct world-clock offsets:** compute each zone's current UTC offset relative to the user's local offset and render e.g. `−14시간` / `동일` accurately, DST-aware.
3. **Clock 12/24h** promoted from a build prop to a persisted user toggle in the clock view.
4. **Timekeeping robustness:** all countdowns are `endAt`-timestamp based, so backgrounded tabs stay accurate; the tick reconciles on refocus. `visibilitychange` triggers an immediate reconcile so a returning teacher sees the correct time instantly.
5. **Deploy-ready shell:** `<title>교실 타이머</title>`, favicon (accent dot), viewport/meta, `/timetools/` base.
6. **Self-hosted fonts:** Sora + JetBrains Mono bundled locally (via `@fontsource` or vendored woff2) instead of the Google Fonts CDN link, so the app renders correctly on classroom networks that block CDNs and works offline.
7. **Light QA pass** across all five tools, both themes, and the narrow (<760px) layout before hand-off.

## 6. Deployment

- `npm run build` → `dist/` (all assets under `/timetools/`).
- `DEPLOY.md` covering: the base-path assumption, an nginx `location /timetools/ { … try_files }` example, static-host (Pages/Netlify/etc.) notes, and cache-header guidance (hashed assets long-cache, `index.html` no-cache).
- If the subpath ever changes, it's the single `base` line in `vite.config.ts` (+ rebuild).

## 7. Risks & Mitigations

- **Focus loss on tick** → inputs excluded from tick updates (see §3). 
- **AudioContext autoplay policy** → `AudioContext` is created/resumed on the first user gesture; alarms that fire while backgrounded rely on it already being unlocked.
- **Custom sound size** → capped for persistence; documented fallback.
- **Ring/interval leaks** → all intervals/timeouts tracked and cleared on reset/unmount.

## 8. Acceptance

- Every item in §4 works and visually matches the prototype in both themes.
- §5 hardening items verified (reload keeps state; world offsets correct; countdowns accurate after backgrounding).
- `npm run build` produces a `dist/` that runs correctly when served under a `/timetools/` path.
