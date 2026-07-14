import { el, clear } from '../dom';
import { iconPlay, iconPause, iconReset, iconSkip } from '../icons';
import { fmtClock, pomoRemaining, pomoToggle, pomoReset, advancePomo, adjustPomo } from '../state';
import type { Ctx, View } from '../view';

const PCIRC = 2 * Math.PI * 124;
const BREAK_COLOR = '#6fcf9a';

export function createPomodoroView(): View {
  let root: HTMLElement;
  let chipFocus: HTMLSpanElement;
  let chipBreak: HTMLSpanElement;
  let ring: SVGCircleElement;
  let displayEl: HTMLSpanElement;
  let phaseLabel: HTMLSpanElement;
  let dots: HTMLSpanElement[] = [];
  let toggleBtn: HTMLButtonElement;
  let toggleRunning: boolean | null = null;
  let focusMinEl: HTMLSpanElement;
  let breakMinEl: HTMLSpanElement;

  function stepper(label: string, valueEl: HTMLSpanElement, onDown: () => void, onUp: () => void): HTMLElement {
    const mk = (t: string, on: () => void) => el('button', {
      class: 'h-bright',
      style: 'width:28px;height:28px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);cursor:pointer;font-size:14px',
      onclick: on,
    }, [t]);
    return el('div', { style: 'flex:1;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:14px' }, [
      el('div', { style: 'font-size:11px;color:var(--muted);margin-bottom:9px' }, [label]),
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [mk('−', onDown), valueEl, mk('+', onUp)]),
    ]);
  }

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    dots = [];
    toggleRunning = null;
    clear(root);
    const P = ctx.state.pomo;
    const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;max-width:560px;margin:0 auto;padding-top:14px' });

    chipFocus = el('span', { style: 'padding:6px 16px;border-radius:18px;font-size:12.5px;font-weight:500' }, ['집중']);
    chipBreak = el('span', { style: 'padding:6px 16px;border-radius:18px;font-size:12.5px;font-weight:500' }, ['휴식']);
    wrap.append(el('div', { style: 'display:inline-flex;padding:4px;background:var(--surface);border:1px solid var(--border);border-radius:22px;margin-bottom:22px' }, [chipFocus, chipBreak]));

    const ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ringSvg.setAttribute('width', '270'); ringSvg.setAttribute('height', '270');
    ringSvg.setAttribute('viewBox', '0 0 270 270');
    ringSvg.setAttribute('style', 'position:absolute;transform:rotate(-90deg)');
    ringSvg.innerHTML = '<circle cx="135" cy="135" r="124" fill="none" stroke="var(--track)" stroke-width="7"/>' +
      '<circle cx="135" cy="135" r="124" fill="none" stroke-width="7" stroke-linecap="round" style="transition:stroke-dashoffset .25s linear"/>';
    ring = ringSvg.querySelectorAll('circle')[1] as SVGCircleElement;
    ring.setAttribute('stroke-dasharray', PCIRC.toFixed(1));
    displayEl = el('span', { class: 'mono', style: 'font-size:58px;font-weight:200;line-height:1' });
    phaseLabel = el('span', { style: 'font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase' });
    wrap.append(el('div', { style: 'position:relative;width:270px;height:270px;display:flex;align-items:center;justify-content:center' }, [
      ringSvg,
      el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:9px' }, [displayEl, phaseLabel]),
    ]));

    const dotRow = el('div', { style: 'display:flex;gap:8px;margin-top:18px' });
    for (let i = 0; i < P.cycles; i++) {
      const d = el('span', { style: 'width:11px;height:11px;border-radius:50%' });
      dots.push(d);
      dotRow.append(d);
    }
    wrap.append(dotRow);

    const resetBtn = el('button', {
      title: '초기화', class: 'h-text-bd2',
      style: 'width:48px;height:48px;border-radius:16px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => ctx.setState({ pomo: pomoReset(ctx.state.pomo) }),
    }, [iconReset(18)]);
    toggleBtn = el('button', {
      class: 'h-bright',
      style: 'width:72px;height:72px;border-radius:24px;border:none;color:var(--on-accent);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => ctx.setState({ pomo: pomoToggle(ctx.state.pomo, ctx.now()) }),
    }) as HTMLButtonElement;
    const skipBtn = el('button', {
      title: '건너뛰기', class: 'h-text-bd2',
      style: 'width:48px;height:48px;border-radius:16px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => ctx.setState({ pomo: advancePomo(ctx.state.pomo, ctx.now()) }),
    }, [iconSkip(18)]);
    wrap.append(el('div', { style: 'display:flex;align-items:center;gap:16px;margin-top:22px' }, [resetBtn, toggleBtn, skipBtn]));

    focusMinEl = el('span', { class: 'mono', style: 'font-size:18px;font-weight:400' });
    breakMinEl = el('span', { class: 'mono', style: 'font-size:18px;font-weight:400' });
    wrap.append(el('div', { style: 'display:flex;gap:10px;margin-top:26px;width:100%' }, [
      stepper('집중 시간', focusMinEl,
        () => ctx.setState({ pomo: adjustPomo(ctx.state.pomo, 'focusMin', -5) }),
        () => ctx.setState({ pomo: adjustPomo(ctx.state.pomo, 'focusMin', 5) })),
      stepper('휴식 시간', breakMinEl,
        () => ctx.setState({ pomo: adjustPomo(ctx.state.pomo, 'breakMin', -1) }),
        () => ctx.setState({ pomo: adjustPomo(ctx.state.pomo, 'breakMin', 1) })),
    ]));

    root.append(wrap);
    update(ctx);
  }

  function update(ctx: Ctx): void {
    const P = ctx.state.pomo;
    const prem = pomoRemaining(P, ctx.now());
    const pdur = (P.phase === 'focus' ? P.focusMin : P.breakMin) * 60;
    const pp = pdur > 0 ? prem / pdur : 0;
    const isFocus = P.phase === 'focus';
    const color = isFocus ? 'var(--accent)' : BREAK_COLOR;

    chipFocus.style.background = isFocus ? 'var(--accent)' : 'transparent';
    chipFocus.style.color = isFocus ? 'var(--on-accent)' : 'var(--muted)';
    chipBreak.style.background = !isFocus ? BREAK_COLOR : 'transparent';
    chipBreak.style.color = !isFocus ? '#0c1a12' : 'var(--muted)';

    ring.setAttribute('stroke', color);
    ring.setAttribute('stroke-dashoffset', (PCIRC * (1 - Math.max(0, Math.min(1, pp)))).toFixed(1));
    displayEl.textContent = fmtClock(Math.ceil(prem));
    phaseLabel.textContent = isFocus ? '집중 · ' + P.round + '/' + P.cycles : '휴식';
    phaseLabel.style.color = color;

    for (let i = 0; i < dots.length; i++) dots[i].style.background = i < P.round ? 'var(--accent)' : 'var(--track)';

    toggleBtn.style.background = color;
    toggleBtn.style.boxShadow = `0 12px 30px -10px ${color}`;
    if (P.running !== toggleRunning) {
      toggleBtn.replaceChildren(P.running ? iconPause(26) : iconPlay(26));
      toggleRunning = P.running;
    }

    focusMinEl.textContent = P.focusMin + '분';
    breakMinEl.textContent = P.breakMin + '분';
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
