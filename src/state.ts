// ---------------------------------------------------------------------------
// State model + pure logic + persistence for 교실 타이머.
// All logic is ported from the approved prototype (reference/교실타이머.dc.html)
// and kept pure (operates on passed values, returns new values) so it is testable
// and framework-free. Ring/audio side effects live in audio.ts and are invoked at
// the call sites in the views — never here.
// ---------------------------------------------------------------------------

export type Tool = 'timer' | 'stopwatch' | 'clock' | 'exam' | 'pomo';
export type ClockFormat = '24' | '12';

export interface Timer {
  id: number;
  name: string;
  total: number;      // seconds
  remaining: number;  // seconds
  running: boolean;
  endAt: number | null; // epoch ms when it will hit 0 (only while running)
  done: boolean;
  sound: string;
  accent: string;
}

export interface Period {
  id: number;
  name: string;
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
}

export interface Pomo {
  focusMin: number;
  breakMin: number;
  cycles: number;
  phase: 'focus' | 'break';
  round: number;
  running: boolean;
  endAt: number | null;
  remaining: number; // seconds
  done: boolean;
}

export interface Sw {
  running: boolean;
  startedAt: number; // epoch ms
  acc: number;       // accumulated ms across pauses
  laps: number[];    // total elapsed ms at each lap
}

export interface AppState {
  tool: Tool;
  theme: 'dark' | 'light';
  settingsOpen: boolean;
  navCollapsed: boolean;
  narrow: boolean;
  volume: number;   // 0..100
  sound: string;    // default alarm sound id
  flash: boolean;
  examEdit: boolean;
  clockFormat: ClockFormat;
  nextId: number;
  nextPid: number;
  focusId: number;
  customName: string | null;
  customData: string | null; // data: URL of an uploaded sound (persisted if small)
  timers: Timer[];
  sw: Sw;
  periods: Period[];
  pomo: Pomo;
}

export const ACCENTS = ['#e0a34e', '#6ea8e0', '#6fcf9a', '#e08a9a', '#b79ae0'];

export interface SoundDef { id: string; label: string; }
export const BUILTIN_SOUNDS: SoundDef[] = [
  { id: 'chime', label: '차임' },
  { id: 'bell', label: '벨' },
  { id: 'digital', label: '디지털' },
  { id: 'marimba', label: '마림바' },
  { id: 'soft', label: '자연음' },
];

/** Selectable sounds, including the uploaded custom one when present. */
export function soundOptions(customName: string | null): SoundDef[] {
  return customName ? [...BUILTIN_SOUNDS, { id: 'custom', label: '내 사운드' }] : BUILTIN_SOUNDS;
}

export interface Zone { city: string; tz: string; }
export const WORLD_ZONES: Zone[] = [
  { city: '뉴욕', tz: 'America/New_York' },
  { city: '런던', tz: 'Europe/London' },
  { city: '파리', tz: 'Europe/Paris' },
  { city: '도쿄', tz: 'Asia/Tokyo' },
];

// 수능 시간표 (from prototype loadSuneung).
export const SUNEUNG: Period[] = [
  { id: 201, name: '1교시 국어', start: '08:40', end: '10:00' },
  { id: 202, name: '2교시 수학', start: '10:30', end: '12:10' },
  { id: 203, name: '3교시 영어', start: '13:10', end: '14:20' },
  { id: 204, name: '4교시 한국사', start: '14:50', end: '15:20' },
  { id: 205, name: '4교시 탐구', start: '15:35', end: '16:37' },
];

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function fmtClock(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function parseHM(str: string): number {
  if (!str || str.indexOf(':') < 0) return 0;
  const [h, m] = str.split(':').map(Number);
  return h * 3600 + m * 60;
}

/** Parses a clock-style duration typed by the user into seconds.
 * Accepts "SS", "MM:SS" or "H:MM:SS"; a bare number is read as minutes. */
export function parseClock(str: string): number {
  const parts = str.trim().split(':').map(Number);
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return 0;
  const [a, b, c] = parts;
  const sec = parts.length === 1 ? a * 60 : parts.length === 2 ? a * 60 + b : a * 3600 + b * 60 + c;
  return Math.max(0, Math.min(99 * 3600, Math.round(sec)));
}

export function hm(sec: number): string {
  sec = ((sec % 86400) + 86400) % 86400;
  return pad(Math.floor(sec / 3600)) + ':' + pad(Math.floor((sec % 3600) / 60));
}

export function fmtSW(ms: number): { main: string; cs: string } {
  const t = Math.floor(ms / 1000);
  return { main: fmtClock(t), cs: pad(Math.floor((ms % 1000) / 10)) };
}

export function nowSec(d: Date): number {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

// ---------------------------------------------------------------------------
// Timer logic (pure)
// ---------------------------------------------------------------------------

export function remOf(t: Timer, now: number): number {
  return t.running ? Math.max(0, (t.endAt! - now) / 1000) : t.remaining;
}

export function toggleTimer(t: Timer, now: number): Timer {
  if (t.done) {
    return { ...t, done: false, remaining: t.total, endAt: now + t.total * 1000, running: true };
  }
  if (t.running) {
    return { ...t, remaining: Math.max(0, (t.endAt! - now) / 1000), running: false, endAt: null };
  }
  const remaining = t.remaining <= 0 ? t.total : t.remaining;
  return { ...t, remaining, endAt: now + remaining * 1000, running: true, done: false };
}

export function resetTimer(t: Timer): Timer {
  return { ...t, running: false, done: false, remaining: t.total, endAt: null };
}

export function plusMin(t: Timer, _now: number): Timer {
  if (t.running) return { ...t, endAt: t.endAt! + 60000 };
  const total = t.total + 60;
  const remaining = t.remaining <= 0 || t.done ? total : t.remaining + 60;
  return { ...t, total, remaining, done: false };
}

export function setPreset(t: Timer, sec: number): Timer {
  return { ...t, total: sec, remaining: sec, running: false, endAt: null, done: false };
}

export function mapTimer(timers: Timer[], id: number, fn: (t: Timer) => Timer): Timer[] {
  return timers.map((t) => (t.id === id ? fn(t) : t));
}

export function makeTimer(id: number, index: number, sound: string): Timer {
  return {
    id,
    name: index + 1 + '번 학생',
    total: 300,
    remaining: 300,
    running: false,
    endAt: null,
    done: false,
    sound,
    accent: ACCENTS[index % ACCENTS.length],
  };
}

/** Returns a state patch adding a timer, or nothing to merge if capped. */
export function addTimer(s: AppState): Pick<AppState, 'nextId' | 'focusId' | 'timers'> {
  const id = s.nextId;
  const n = s.timers.length;
  return { nextId: id + 1, focusId: id, timers: [...s.timers, makeTimer(id, n, s.sound)] };
}

/** Returns a state patch removing a timer, or null when it would remove the last one. */
export function removeTimer(s: AppState, id: number): Pick<AppState, 'timers' | 'focusId'> | null {
  if (s.timers.length <= 1) return null;
  const timers = s.timers.filter((t) => t.id !== id);
  const focusId = s.focusId === id ? timers[0].id : s.focusId;
  return { timers, focusId };
}

// ---------------------------------------------------------------------------
// Stopwatch logic (pure)
// ---------------------------------------------------------------------------

export function swElapsed(sw: Sw, now: number): number {
  return sw.running ? sw.acc + (now - sw.startedAt) : sw.acc;
}

export function swToggle(sw: Sw, now: number): Sw {
  return sw.running
    ? { ...sw, running: false, acc: sw.acc + (now - sw.startedAt) }
    : { ...sw, running: true, startedAt: now };
}

export function swReset(): Sw {
  return { running: false, startedAt: 0, acc: 0, laps: [] };
}

export function swLap(sw: Sw, now: number): Sw {
  const e = swElapsed(sw, now);
  if (e <= 0) return sw;
  return { ...sw, laps: [...sw.laps, e] };
}

// ---------------------------------------------------------------------------
// Exam / period logic (pure)
// ---------------------------------------------------------------------------

export type ExamState = 'active' | 'wait' | 'break' | 'done';
export interface ExamCalc {
  sorted: Period[];
  state: ExamState;
  title: string;
  sub: string;
  remain: number; // seconds
  prog: number;   // 0..1
  remainLabel: string;
}

export function examCalc(periods: Period[], nSec: number): ExamCalc {
  const sorted = [...periods].sort((a, b) => parseHM(a.start) - parseHM(b.start));
  let cur: Period | null = null;
  let next: Period | null = null;
  for (const p of sorted) {
    const st = parseHM(p.start);
    const en = parseHM(p.end);
    if (nSec >= st && nSec < en) { cur = p; break; }
  }
  for (const p of sorted) {
    if (parseHM(p.start) > nSec) { next = p; break; }
  }
  let state: ExamState;
  let title: string;
  let sub = '';
  let remain = 0;
  let prog = 0;
  let remainLabel = '';
  if (cur) {
    const st = parseHM(cur.start);
    const en = parseHM(cur.end);
    state = 'active'; title = cur.name; remain = en - nSec; prog = (nSec - st) / (en - st); remainLabel = '남음';
  } else if (sorted.length && nSec < parseHM(sorted[0].start)) {
    state = 'wait'; title = sorted[0].name; remain = parseHM(sorted[0].start) - nSec; remainLabel = '후 시작';
  } else if (next) {
    state = 'break'; title = '쉬는 시간'; sub = '다음: ' + next.name; remain = parseHM(next.start) - nSec; remainLabel = '후 시작';
  } else {
    state = 'done'; title = '모든 일정 종료'; sub = '오늘 예정된 교시가 끝났습니다';
  }
  return { sorted, state, title, sub, remain, prog, remainLabel };
}

export function updPeriod(periods: Period[], id: number, key: 'name' | 'start' | 'end', val: string): Period[] {
  return periods.map((p) => (p.id === id ? { ...p, [key]: val } : p));
}

export function addPeriod(periods: Period[], nextPid: number): { periods: Period[]; nextPid: number } {
  const last = periods[periods.length - 1];
  let start = '09:00';
  let end = '09:50';
  if (last) {
    const s = parseHM(last.end) + 600;
    start = hm(s);
    end = hm(s + 3000);
  }
  return { periods: [...periods, { id: nextPid, name: periods.length + 1 + '교시', start, end }], nextPid: nextPid + 1 };
}

export function removePeriod(periods: Period[], id: number): Period[] {
  return periods.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Pomodoro logic (pure)
// ---------------------------------------------------------------------------

export function advancePomo(P: Pomo, now: number): Pomo {
  let phase: 'focus' | 'break';
  let round = P.round;
  let dur: number;
  if (P.phase === 'focus') {
    phase = 'break'; dur = P.breakMin; round = P.round;
  } else {
    phase = 'focus'; round = P.round >= P.cycles ? 1 : P.round + 1; dur = P.focusMin;
  }
  return { ...P, phase, round, remaining: dur * 60, endAt: now + dur * 60000, running: true, done: false };
}

export function adjustPomo(P: Pomo, key: 'focusMin' | 'breakMin', delta: number): Pomo {
  const v = Math.max(1, Math.min(90, P[key] + delta));
  const np: Pomo = { ...P, [key]: v };
  if (!P.running && ((P.phase === 'focus' && key === 'focusMin') || (P.phase === 'break' && key === 'breakMin'))) {
    np.remaining = v * 60;
  }
  return np;
}

export function pomoToggle(P: Pomo, now: number): Pomo {
  if (P.running) {
    return { ...P, running: false, remaining: Math.max(0, (P.endAt! - now) / 1000), endAt: null };
  }
  let rem = P.remaining;
  if (rem <= 0) rem = (P.phase === 'focus' ? P.focusMin : P.breakMin) * 60;
  return { ...P, running: true, endAt: now + rem * 1000, done: false };
}

export function pomoReset(P: Pomo): Pomo {
  return { ...P, phase: 'focus', round: 1, running: false, endAt: null, remaining: P.focusMin * 60, done: false };
}

export function pomoRemaining(P: Pomo, now: number): number {
  return P.running ? Math.max(0, (P.endAt! - now) / 1000) : P.remaining;
}

// ---------------------------------------------------------------------------
// World-clock offsets (hardening §5.2 — prototype used static strings)
// ---------------------------------------------------------------------------

// Intl.DateTimeFormat construction is costly; cache one per zone (reused each tick).
const _offsetFmtCache = new Map<string, Intl.DateTimeFormat>();
function offsetFmt(tz: string): Intl.DateTimeFormat {
  let f = _offsetFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    _offsetFmtCache.set(tz, f);
  }
  return f;
}

/** UTC offset of a time zone at `date`, in minutes (e.g. KST => +540). */
export function tzOffsetMinutes(tz: string, date: Date): number {
  const map: Record<string, string> = {};
  for (const p of offsetFmt(tz).formatToParts(date)) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, hour, +map.minute, +map.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Zone offset relative to the viewer's local offset, in minutes. */
export function zoneDiffMinutes(tz: string, date: Date): number {
  const local = -date.getTimezoneOffset();
  return tzOffsetMinutes(tz, date) - local;
}

const MINUS = '−'; // − U+2212, matches the prototype's typography

export function zoneOffsetLabel(diffMin: number): string {
  if (diffMin === 0) return '동일';
  const sign = diffMin < 0 ? MINUS : '+';
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}분`;
  if (m === 0) return `${sign}${h}시간`;
  return `${sign}${h}시간 ${m}분`;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'timetools:v1';

export function initialState(): AppState {
  return {
    tool: 'timer', theme: 'dark', settingsOpen: false, navCollapsed: false, narrow: false,
    volume: 70, sound: 'chime', flash: true, examEdit: false, clockFormat: '24',
    nextId: 4, nextPid: 100, focusId: 1, customName: null, customData: null,
    timers: [
      { id: 1, name: '전체 집중', total: 1500, remaining: 1500, running: false, endAt: null, done: false, sound: 'chime', accent: '#e0a34e' },
      { id: 2, name: '1모둠 발표', total: 300, remaining: 300, running: false, endAt: null, done: false, sound: 'marimba', accent: '#6ea8e0' },
      { id: 3, name: '2모둠 토론', total: 600, remaining: 600, running: false, endAt: null, done: false, sound: 'bell', accent: '#6fcf9a' },
    ],
    sw: { running: false, startedAt: 0, acc: 0, laps: [] },
    periods: [
      { id: 11, name: '1교시', start: '09:00', end: '09:50' },
      { id: 12, name: '2교시', start: '10:00', end: '10:50' },
      { id: 13, name: '3교시', start: '11:00', end: '11:50' },
      { id: 14, name: '4교시', start: '13:00', end: '13:50' },
    ],
    pomo: { focusMin: 25, breakMin: 5, cycles: 4, phase: 'focus', round: 1, running: false, endAt: null, remaining: 1500, done: false },
  };
}

// Fields persisted to localStorage. Session-only: narrow, settingsOpen, examEdit, sw.
const PERSIST_KEYS: (keyof AppState)[] = [
  'tool', 'theme', 'navCollapsed', 'volume', 'sound', 'flash', 'clockFormat',
  'nextId', 'nextPid', 'focusId', 'customName', 'customData', 'timers', 'periods', 'pomo',
];

export function serialize(s: AppState): string {
  const out: Record<string, unknown> = {};
  for (const k of PERSIST_KEYS) out[k] = s[k];
  return JSON.stringify(out);
}

function reconcileTimer(t: Timer, now: number): Timer {
  if (!t.running || t.endAt == null) return t;
  // Elapsed while the app was closed: settle quietly (no surprise full-screen flash
  // or alarm on load — mirrors reconcilePomo). Restarting it recomputes from total.
  if (t.endAt <= now) return { ...t, running: false, done: false, remaining: 0, endAt: null };
  return { ...t, remaining: (t.endAt - now) / 1000 };
}

function reconcilePomo(P: Pomo, now: number): Pomo {
  if (!P.running || P.endAt == null) return P;
  // Elapsed while away: settle to a paused boundary (no surprise flash/ring on load).
  if (P.endAt <= now) return { ...P, running: false, endAt: null, remaining: 0, done: false };
  return { ...P, remaining: (P.endAt - now) / 1000 };
}

/**
 * Build an AppState from persisted JSON, reconciling running timers/pomodoro
 * against `now`. Malformed input falls back to the initial state.
 */
export function hydrate(json: string | null, now: number = Date.now()): AppState {
  const base = initialState();
  if (!json) return base;
  let parsed: Partial<AppState>;
  try {
    parsed = JSON.parse(json) as Partial<AppState>;
  } catch {
    return base;
  }
  const s: AppState = { ...base, ...parsed, settingsOpen: false, examEdit: false, narrow: false, sw: swReset() };
  if (!Array.isArray(s.timers) || s.timers.length === 0) s.timers = base.timers;
  if (!Array.isArray(s.periods)) s.periods = base.periods;
  s.timers = s.timers.map((t) => reconcileTimer(t, now));
  s.pomo = reconcilePomo({ ...base.pomo, ...s.pomo }, now);
  s.volume = Math.max(0, Math.min(100, Number(s.volume) || 0));
  // A custom sound without persisted data (uploaded file was too large to store, and
  // object URLs don't survive reload) is unavailable — clear the phantom selection.
  if (!s.customData) {
    s.customName = null;
    if (s.sound === 'custom') s.sound = 'chime';
  }
  return s;
}

export function loadKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveKey(str: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, str);
  } catch {
    /* private mode / quota — ignore, app still works in-session */
  }
}
