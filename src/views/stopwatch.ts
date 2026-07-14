import { el, clear } from '../dom';
import { iconPlay, iconPause, iconReset, iconLap } from '../icons';
import { swElapsed, swToggle, swReset, swLap, fmtSW, pad } from '../state';
import type { Ctx, View } from '../view';

export function createStopwatchView(): View {
  let root: HTMLElement;
  let mainEl: HTMLSpanElement;
  let csEl: HTMLSpanElement;
  let statusEl: HTMLSpanElement;
  let toggleBtn: HTMLButtonElement;
  let toggleRunning: boolean | null = null;

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    toggleRunning = null;
    clear(root);
    const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;max-width:520px;margin:0 auto;padding-top:24px' });

    mainEl = el('span', { style: 'font-size:74px;letter-spacing:.01em' });
    csEl = el('span', { style: 'font-size:34px;color:var(--muted);width:62px;text-align:left;padding-left:6px' });
    const display = el('div', { class: 'mono', style: 'display:flex;align-items:baseline;font-weight:200;color:var(--text)' }, [mainEl, csEl]);
    statusEl = el('span', { style: 'font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;margin-top:8px' });

    const lapBtn = el('button', {
      title: '랩', class: 'h-text-bd2',
      style: 'width:52px;height:52px;border-radius:17px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => ctx.setState({ sw: swLap(ctx.state.sw, ctx.now()) }, { main: true }),
    }, [iconLap(19)]);
    toggleBtn = el('button', {
      class: 'h-bright',
      style: 'width:76px;height:76px;border-radius:25px;background:var(--accent);border:none;color:var(--on-accent);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 12px 30px -10px var(--accent)',
      onclick: () => ctx.setState({ sw: swToggle(ctx.state.sw, ctx.now()) }, { main: true }),
    }) as HTMLButtonElement;
    const resetBtn = el('button', {
      title: '초기화', class: 'h-text-bd2',
      style: 'width:52px;height:52px;border-radius:17px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => ctx.setState({ sw: swReset() }, { main: true }),
    }, [iconReset(19)]);
    const controls = el('div', { style: 'display:flex;align-items:center;gap:16px;margin-top:28px' }, [lapBtn, toggleBtn, resetBtn]);

    const lapList = el('div', { style: 'width:100%;margin-top:26px;display:flex;flex-direction:column' });
    let prev = 0;
    const rows = ctx.state.sw.laps.map((tot, i) => {
      const sp = tot - prev; prev = tot;
      const spf = fmtSW(sp); const tf = fmtSW(tot);
      return { n: pad(i + 1), split: spf.main + '.' + spf.cs, total: tf.main + '.' + tf.cs };
    }).reverse();
    for (const l of rows) {
      lapList.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:11px 8px;border-bottom:1px solid var(--border)' }, [
        el('span', { style: 'font-size:12.5px;color:var(--muted);letter-spacing:.04em' }, ['랩 ' + l.n]),
        el('span', { class: 'mono', style: 'font-size:13.5px;color:var(--muted)' }, ['+' + l.split]),
        el('span', { class: 'mono', style: 'font-size:14px;color:var(--text);font-weight:300' }, [l.total]),
      ]));
    }

    wrap.append(display, statusEl, controls, lapList);
    root.append(wrap);
    update(ctx);
  }

  function update(ctx: Ctx): void {
    const sw = ctx.state.sw;
    const swe = swElapsed(sw, ctx.now());
    const f = fmtSW(swe);
    mainEl.textContent = f.main;
    csEl.textContent = '.' + f.cs;
    statusEl.textContent = sw.running ? '측정 중' : swe > 0 ? '일시정지' : '대기';
    statusEl.style.color = sw.running ? 'var(--accent)' : 'var(--muted)';
    if (sw.running !== toggleRunning) {
      toggleBtn.replaceChildren(sw.running ? iconPause(28) : iconPlay(28));
      toggleRunning = sw.running;
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
