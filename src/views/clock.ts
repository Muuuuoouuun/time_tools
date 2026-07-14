import { el, clear } from '../dom';
import { WORLD_ZONES, WEEKDAYS, zoneOffsetLabel, zoneDiffMinutes, type ClockFormat } from '../state';
import { clockParts } from './header';
import type { Ctx, View } from '../view';

export function createClockView(): View {
  let root: HTMLElement;
  let dateEl: HTMLSpanElement;
  let hhmmEl: HTMLSpanElement;
  let ssEl: HTMLSpanElement;
  let seg: { el: HTMLSpanElement; fmt: ClockFormat }[] = [];
  let world: { time: HTMLSpanElement; diff: HTMLDivElement; tz: string; fmt: Intl.DateTimeFormat | null }[] = [];

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    seg = [];
    world = [];
    clear(root);
    const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;max-width:560px;margin:0 auto;padding-top:30px' });

    dateEl = el('span', { style: 'font-size:14px;font-weight:500;color:var(--muted)' });
    hhmmEl = el('span', { style: 'font-size:96px;letter-spacing:.01em;line-height:1' });
    ssEl = el('span', { style: 'font-size:36px;color:var(--accent);width:62px;text-align:left;padding-left:8px' });
    const clock = el('div', { class: 'mono', style: 'display:flex;align-items:baseline;font-weight:200;color:var(--text);margin-top:12px' }, [hhmmEl, ssEl]);

    // 12/24h toggle (hardening §5.3)
    const pill = el('div', { style: 'display:inline-flex;padding:4px;background:var(--surface);border:1px solid var(--border);border-radius:22px;margin-top:20px' });
    for (const fmt of ['24', '12'] as ClockFormat[]) {
      const s = el('span', {
        style: 'padding:6px 16px;border-radius:18px;font-size:12.5px;font-weight:500;cursor:pointer',
        onclick: () => ctx.setState({ clockFormat: fmt }),
      }, [fmt === '24' ? '24시간' : '12시간']);
      seg.push({ el: s, fmt });
      pill.append(s);
    }

    const worldSection = el('div', { style: 'width:100%;margin-top:44px' });
    worldSection.append(el('span', { style: 'font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)' }, ['세계 시각']));
    const grid = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px' });
    for (const z of WORLD_ZONES) {
      const diff = el('div', { style: 'font-size:11px;color:var(--faint);margin-top:2px' });
      const time = el('span', { class: 'mono', style: 'font-size:22px;font-weight:300;letter-spacing:.02em' });
      grid.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:15px 17px;background:var(--surface);border:1px solid var(--border);border-radius:14px' }, [
        el('div', {}, [el('div', { style: 'font-size:13.5px;font-weight:500' }, [z.city]), diff]),
        time,
      ]));
      let fmt: Intl.DateTimeFormat | null = null;
      try {
        fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: z.tz });
      } catch { /* unsupported tz */ }
      world.push({ time, diff, tz: z.tz, fmt });
    }
    worldSection.append(grid);

    wrap.append(dateEl, clock, pill, worldSection);
    root.append(wrap);
    update(ctx);
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    const now = new Date(ctx.now());
    dateEl.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;
    const { hhmm, ss } = clockParts(s, now);
    hhmmEl.textContent = hhmm;
    ssEl.textContent = ss;
    for (const g of seg) {
      const on = g.fmt === s.clockFormat;
      g.el.style.background = on ? 'var(--accent)' : 'transparent';
      g.el.style.color = on ? 'var(--on-accent)' : 'var(--muted)';
    }
    for (const w of world) {
      w.time.textContent = w.fmt ? w.fmt.format(now) : '--:--';
      w.diff.textContent = zoneOffsetLabel(zoneDiffMinutes(w.tz, now));
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
