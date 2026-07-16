import { describe, it, expect } from 'vitest';
import {
  pad, fmtClock, parseHM, parseClock, hm, fmtSW,
  toggleTimer, resetTimer, plusMin, setPreset, addTimer, removeTimer, remOf,
  swElapsed, swToggle, swReset, swLap,
  examCalc, addPeriod, removePeriod, updPeriod,
  advancePomo, adjustPomo, pomoToggle, pomoReset,
  zoneOffsetLabel,
  serialize, hydrate, initialState,
  type Timer, type Pomo, type Sw, type Period,
} from './state';

describe('formatters', () => {
  it('pads', () => expect(pad(3)).toBe('03'));
  it('fmtClock under an hour', () => expect(fmtClock(65)).toBe('01:05'));
  it('fmtClock over an hour', () => expect(fmtClock(3661)).toBe('1:01:01'));
  it('fmtClock clamps negatives', () => expect(fmtClock(-5)).toBe('00:00'));
  it('parseHM', () => expect(parseHM('09:30')).toBe(9 * 3600 + 30 * 60));
  it('parseHM bad input', () => expect(parseHM('')).toBe(0));
  it('parseClock reads a bare number as minutes', () => expect(parseClock('7')).toBe(420));
  it('parseClock reads MM:SS', () => expect(parseClock('05:30')).toBe(330));
  it('parseClock reads H:MM:SS', () => expect(parseClock('1:02:03')).toBe(3723));
  it('parseClock rejects garbage', () => expect(parseClock('abc')).toBe(0));
  it('parseClock clamps negatives to 0', () => expect(parseClock('-5')).toBe(0));
  it('hm wraps day', () => expect(hm(9 * 3600 + 5 * 60)).toBe('09:05'));
  it('fmtSW splits ms', () => expect(fmtSW(65_430)).toEqual({ main: '01:05', cs: '43' }));
});

const base = (): Timer => ({ id: 1, name: 't', total: 300, remaining: 300, running: false, endAt: null, done: false, sound: 'chime', accent: '#e0a34e' });

describe('timer logic', () => {
  it('start sets endAt and running', () => {
    const t = toggleTimer(base(), 1000);
    expect(t.running).toBe(true);
    expect(t.endAt).toBe(1000 + 300000);
  });
  it('pause captures remaining', () => {
    let t = toggleTimer(base(), 1000);
    t = toggleTimer(t, 1000 + 60000);
    expect(t.running).toBe(false);
    expect(Math.round(t.remaining)).toBe(240);
  });
  it('restart after done resets to total', () => {
    const d = { ...base(), done: true, remaining: 0 };
    const t = toggleTimer(d, 5000);
    expect(t.done).toBe(false);
    expect(t.running).toBe(true);
    expect(t.remaining).toBe(300);
  });
  it('reset restores total', () => {
    const t = resetTimer({ ...base(), running: true, remaining: 10, done: true });
    expect(t).toMatchObject({ running: false, done: false, remaining: 300, endAt: null });
  });
  it('plusMin while running extends endAt', () => {
    const r = { ...base(), running: true, endAt: 1000 };
    expect(plusMin(r, 0).endAt).toBe(1000 + 60000);
  });
  it('plusMin while idle grows total', () => {
    const t = plusMin(base(), 0);
    expect(t.total).toBe(360);
    expect(t.remaining).toBe(360);
  });
  it('setPreset sets total+remaining, clears state', () => {
    const t = setPreset(base(), 600);
    expect(t).toMatchObject({ total: 600, remaining: 600, running: false, done: false, endAt: null });
  });
  it('remOf reads live remaining while running', () => {
    const r = { ...base(), running: true, endAt: 10_000 };
    expect(remOf(r, 4_000)).toBe(6);
  });
});

describe('timer collection', () => {
  it('addTimer appends with cycling name/accent and focuses it', () => {
    const s = initialState();
    const patch = addTimer(s);
    expect(patch.timers.length).toBe(4);
    expect(patch.focusId).toBe(s.nextId);
    expect(patch.timers[3].name).toBe('4번 학생');
  });
  it('removeTimer drops one and refocuses', () => {
    const s = initialState();
    s.focusId = 2;
    const patch = removeTimer(s, 2)!;
    expect(patch.timers.find((t) => t.id === 2)).toBeUndefined();
    expect(patch.focusId).toBe(patch.timers[0].id);
  });
  it('removeTimer refuses to remove the last timer', () => {
    const s = initialState();
    s.timers = [s.timers[0]];
    expect(removeTimer(s, s.timers[0].id)).toBeNull();
  });
});

describe('stopwatch', () => {
  const sw = (): Sw => swReset();
  it('elapsed accrues across pause', () => {
    let s = swToggle(sw(), 1000);        // start @1000
    s = swToggle(s, 1000 + 5000);        // pause @6000 -> acc 5000
    expect(swElapsed(s, 999999)).toBe(5000);
    s = swToggle(s, 10_000);             // resume @10000
    expect(swElapsed(s, 12_000)).toBe(7000);
  });
  it('lap records total elapsed', () => {
    let s = swToggle(sw(), 0);
    s = swLap(s, 3000);
    expect(s.laps).toEqual([3000]);
  });
  it('lap ignored at zero', () => {
    expect(swLap(sw(), 0).laps).toEqual([]);
  });
});

const P = (): Period[] => [
  { id: 1, name: '1교시', start: '09:00', end: '09:50' },
  { id: 2, name: '2교시', start: '10:00', end: '10:50' },
];
const S = (h: number, m: number) => h * 3600 + m * 60;

describe('examCalc', () => {
  it('active inside a period', () => {
    const r = examCalc(P(), S(9, 20));
    expect(r.state).toBe('active');
    expect(r.title).toBe('1교시');
    expect(r.remain).toBe(30 * 60);
  });
  it('wait before first', () => {
    const r = examCalc(P(), S(8, 30));
    expect(r.state).toBe('wait');
    expect(r.remain).toBe(30 * 60);
  });
  it('break between', () => {
    const r = examCalc(P(), S(9, 55));
    expect(r.state).toBe('break');
    expect(r.sub).toContain('2교시');
  });
  it('done after last', () => {
    const r = examCalc(P(), S(11, 0));
    expect(r.state).toBe('done');
  });
});

describe('period mutations', () => {
  it('addPeriod continues from last end', () => {
    const { periods, nextPid } = addPeriod(P(), 100);
    expect(periods.length).toBe(3);
    expect(periods[2].start).toBe('11:00'); // 10:50 + 10min
    expect(periods[2].end).toBe('11:50');   // + 50min
    expect(nextPid).toBe(101);
  });
  it('removePeriod filters', () => {
    expect(removePeriod(P(), 1).map((p) => p.id)).toEqual([2]);
  });
  it('updPeriod edits one field', () => {
    expect(updPeriod(P(), 1, 'name', 'X')[0].name).toBe('X');
  });
});

const pb = (): Pomo => ({ focusMin: 25, breakMin: 5, cycles: 4, phase: 'focus', round: 1, running: false, endAt: null, remaining: 1500, done: false });

describe('pomodoro', () => {
  it('focus advances to break', () => {
    const p = advancePomo(pb(), 1000);
    expect(p.phase).toBe('break');
    expect(p.remaining).toBe(300);
    expect(p.running).toBe(true);
  });
  it('break advances to next focus round', () => {
    const p = advancePomo({ ...pb(), phase: 'break', round: 1 }, 0);
    expect(p.phase).toBe('focus');
    expect(p.round).toBe(2);
  });
  it('break wraps round at cycles', () => {
    const p = advancePomo({ ...pb(), phase: 'break', round: 4 }, 0);
    expect(p.round).toBe(1);
  });
  it('adjust focus clamps and syncs remaining when idle', () => {
    const p = adjustPomo(pb(), 'focusMin', 5);
    expect(p.focusMin).toBe(30);
    expect(p.remaining).toBe(1800);
  });
  it('adjust clamps to 1..90', () => {
    expect(adjustPomo({ ...pb(), focusMin: 90 }, 'focusMin', 5).focusMin).toBe(90);
    expect(adjustPomo({ ...pb(), breakMin: 1 }, 'breakMin', -1).breakMin).toBe(1);
  });
  it('toggle from idle starts from remaining', () => {
    const p = pomoToggle(pb(), 1000);
    expect(p.running).toBe(true);
    expect(p.endAt).toBe(1000 + 1500 * 1000);
  });
  it('reset returns to focus round 1', () => {
    const p = pomoReset({ ...pb(), phase: 'break', round: 3, remaining: 10 });
    expect(p).toMatchObject({ phase: 'focus', round: 1, running: false, remaining: 1500, endAt: null });
  });
});

describe('world clock offset', () => {
  it('returns 동일 for same offset', () => expect(zoneOffsetLabel(0)).toBe('동일'));
  it('formats a negative diff', () => expect(zoneOffsetLabel(-14 * 60)).toBe('−14시간'));
  it('formats a positive diff', () => expect(zoneOffsetLabel(60)).toBe('+1시간'));
  it('formats half-hour diffs', () => expect(zoneOffsetLabel(-90)).toBe('−1시간 30분'));
  it('formats sub-hour diffs', () => expect(zoneOffsetLabel(30)).toBe('+30분'));
});

describe('persistence', () => {
  it('round-trips persisted fields', () => {
    const s = initialState();
    s.theme = 'light';
    s.volume = 42;
    s.clockFormat = '12';
    const back = hydrate(serialize(s), 0);
    expect(back.theme).toBe('light');
    expect(back.volume).toBe(42);
    expect(back.clockFormat).toBe('12');
  });
  it('does not reopen drawers on reload', () => {
    const s = initialState();
    s.settingsOpen = true;
    s.examEdit = true;
    const back = hydrate(serialize(s));
    expect(back.settingsOpen).toBe(false);
    expect(back.examEdit).toBe(false);
  });
  it('reconstructs a running timer from endAt', () => {
    const s = initialState();
    // 300s timer started at t=10_000 -> ends at 310_000; 120s in there are 180s left.
    s.timers[0] = { ...s.timers[0], running: true, endAt: 310_000, remaining: 300 };
    const back = hydrate(serialize(s), 10_000 + 120_000);
    expect(back.timers[0].running).toBe(true);
    expect(Math.round(back.timers[0].remaining)).toBe(180);
  });
  it('quietly settles an elapsed running timer on hydrate (no surprise flash: done stays false)', () => {
    const s = initialState();
    s.timers[0] = { ...s.timers[0], running: true, endAt: 10_000, remaining: 300 };
    const back = hydrate(serialize(s), 10_000 + 400_000);
    expect(back.timers[0].done).toBe(false);
    expect(back.timers[0].running).toBe(false);
    expect(back.timers[0].remaining).toBe(0);
    expect(back.timers[0].endAt).toBeNull();
  });
  it('clears a custom sound selection with no persisted data on hydrate', () => {
    const s = initialState();
    s.sound = 'custom'; s.customName = 'my.mp3'; s.customData = null;
    const back = hydrate(serialize(s));
    expect(back.sound).toBe('chime');
    expect(back.customName).toBeNull();
  });
  it('keeps a custom sound backed by persisted data', () => {
    const s = initialState();
    s.sound = 'custom'; s.customName = 'my.mp3'; s.customData = 'data:audio/mpeg;base64,AA==';
    const back = hydrate(serialize(s));
    expect(back.sound).toBe('custom');
    expect(back.customName).toBe('my.mp3');
  });
  it('falls back to initial state on malformed JSON', () => {
    expect(hydrate('{not json', 0).theme).toBe('dark');
  });
  it('does not persist the stopwatch', () => {
    const s = initialState();
    s.sw = { running: true, startedAt: 5, acc: 999, laps: [1, 2] };
    const back = hydrate(serialize(s));
    expect(back.sw).toEqual({ running: false, startedAt: 0, acc: 0, laps: [] });
  });
});
