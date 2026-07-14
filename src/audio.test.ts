import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from './audio';

describe('ring loop scheduling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('rings immediately, repeats every 1.7s, and auto-stops by 30s', () => {
    const eng = new AudioEngine(() => 70);
    const spy = vi.fn();
    eng.play = spy; // override synthesis; only test scheduling

    eng.startRing(1, 'chime');
    expect(spy).toHaveBeenCalledTimes(1); // immediate

    vi.advanceTimersByTime(30_000);
    // 1 immediate + 17 interval fires (17 * 1700 = 28_900 <= 30_000; next at 30_600 skipped)
    expect(spy).toHaveBeenCalledTimes(18);

    // after auto-stop, no further rings
    vi.advanceTimersByTime(10_000);
    expect(spy).toHaveBeenCalledTimes(18);
  });

  it('stopRing halts repeats', () => {
    const eng = new AudioEngine(() => 70);
    const spy = vi.fn();
    eng.play = spy;
    eng.startRing(2, 'bell');
    vi.advanceTimersByTime(1700 * 3); // 3 repeats
    eng.stopRing(2);
    const count = spy.mock.calls.length;
    vi.advanceTimersByTime(10_000);
    expect(spy).toHaveBeenCalledTimes(count);
  });

  it('startRing is idempotent per id', () => {
    const eng = new AudioEngine(() => 70);
    const spy = vi.fn();
    eng.play = spy;
    eng.startRing(3, 'chime');
    eng.startRing(3, 'chime'); // second call: plays once more immediately but no 2nd interval
    expect(spy).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1700);
    expect(spy).toHaveBeenCalledTimes(3); // single interval, not doubled
  });

  it('silent at volume 0', () => {
    const eng = new AudioEngine(() => 0);
    // real play path: returns before touching AudioContext
    expect(() => eng.play('chime')).not.toThrow();
  });
});
