import { el, clear } from '../dom';
import { iconPlay, iconPause, iconReset, iconPlus, iconClose, iconSpeaker } from '../icons';
import {
  fmtClock, remOf, mapTimer, toggleTimer, resetTimer, plusMin, setPreset,
  addTimer, removeTimer, soundOptions, type Timer,
} from '../state';
import type { Ctx, View } from '../view';

const FCIRC = 2 * Math.PI * 124; // hero ring circumference
const PRESETS = [1, 3, 5, 10, 25, 45];
type Mode = 'run' | 'idle' | 'done';

function modeOf(t: Timer): Mode {
  return t.done ? 'done' : t.running ? 'run' : 'idle';
}
function syncInput(input: HTMLInputElement, value: string): void {
  if (document.activeElement !== input && input.value !== value) input.value = value;
}

interface CardRef {
  id: number;
  card: HTMLDivElement;
  dot: HTMLSpanElement;
  name: HTMLInputElement;
  display: HTMLDivElement;
  bar: HTMLDivElement;
  toggle: HTMLButtonElement;
  reset: HTMLButtonElement;
  mode: Mode | null;
}

export function createTimerView(): View {
  let root: HTMLElement;
  let heroName: HTMLInputElement;
  let heroDisplay: HTMLSpanElement;
  let heroStatus: HTMLSpanElement;
  let heroRing: SVGCircleElement;
  let heroToggle: HTMLButtonElement;
  let heroToggleMode: Mode | null = null;
  let heroSound: HTMLSelectElement;
  let presetBtns: { btn: HTMLButtonElement; sec: number }[] = [];
  let cardRefs: CardRef[] = [];

  function focused(ctx: Ctx): Timer {
    const s = ctx.state;
    return s.timers.find((t) => t.id === s.focusId) || s.timers[0];
  }

  // ---- handlers ----
  function commit(ctx: Ctx, id: number, fn: (t: Timer) => Timer): void {
    ctx.setState({ timers: mapTimer(ctx.state.timers, id, fn) });
  }
  function onToggle(ctx: Ctx, id: number): void {
    const t = ctx.state.timers.find((x) => x.id === id);
    if (t?.done) ctx.audio.stopRing(id);
    commit(ctx, id, (x) => toggleTimer(x, ctx.now()));
  }
  function onReset(ctx: Ctx, id: number): void {
    ctx.audio.stopRing(id);
    commit(ctx, id, resetTimer);
  }

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    presetBtns = [];
    cardRefs = [];
    heroToggleMode = null; // fresh empty button each rebuild — force icon injection in update()
    clear(root);
    const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;max-width:960px;margin:0 auto' });
    wrap.append(buildHero(ctx), buildGrid(ctx));
    root.append(wrap);
    update(ctx);
  }

  function buildHero(ctx: Ctx): HTMLElement {
    const ft = focused(ctx);
    const box = el('div', { style: 'display:flex;flex-direction:column;align-items:center;padding:6px 0 8px' });

    heroName = el('input', {
      value: ft.name, placeholder: '타이머 이름', class: 'f-surface',
      style: 'text-align:center;background:transparent;border:none;outline:none;font-size:15px;font-weight:500;color:var(--text);padding:6px 10px;border-radius:9px;width:240px;margin-bottom:8px',
      oninput: (e: Event) => commit(ctx, focused(ctx).id, (t) => ({ ...t, name: (e.target as HTMLInputElement).value })),
    }) as HTMLInputElement;

    heroDisplay = el('span', { class: 'mono', style: 'font-size:58px;font-weight:200;letter-spacing:.01em;line-height:1' });
    heroStatus = el('span', { style: 'font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase' });
    const ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ringSvg.setAttribute('width', '270'); ringSvg.setAttribute('height', '270');
    ringSvg.setAttribute('viewBox', '0 0 270 270');
    ringSvg.setAttribute('style', 'position:absolute;transform:rotate(-90deg)');
    ringSvg.innerHTML = '<circle cx="135" cy="135" r="124" fill="none" stroke="var(--track)" stroke-width="7"/>' +
      '<circle cx="135" cy="135" r="124" fill="none" stroke-width="7" stroke-linecap="round" style="transition:stroke-dashoffset .25s linear"/>';
    heroRing = ringSvg.querySelectorAll('circle')[1] as SVGCircleElement;
    heroRing.setAttribute('stroke-dasharray', FCIRC.toFixed(1));
    const ringWrap = el('div', { style: 'position:relative;width:270px;height:270px;display:flex;align-items:center;justify-content:center' }, [
      ringSvg,
      el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:9px' }, [heroDisplay, heroStatus]),
    ]);

    const resetBtn = el('button', {
      title: '초기화', class: 'h-text-bd2',
      style: 'width:48px;height:48px;border-radius:16px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => onReset(ctx, focused(ctx).id),
    }, [iconReset(18)]);
    heroToggle = el('button', {
      class: 'h-bright',
      style: 'width:72px;height:72px;border-radius:24px;border:none;color:var(--on-accent);display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => onToggle(ctx, focused(ctx).id),
    }) as HTMLButtonElement;
    const plusBtn = el('button', {
      title: '+1분', class: 'h-text-bd2',
      style: 'width:48px;height:48px;border-radius:16px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;font-weight:600',
      onclick: () => commit(ctx, focused(ctx).id, (t) => plusMin(t, ctx.now())),
    }, ['+1분']);
    const controls = el('div', { style: 'display:flex;align-items:center;gap:16px;margin-top:14px' }, [resetBtn, heroToggle, plusBtn]);

    const presetRow = el('div', { style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:20px' });
    for (const mn of PRESETS) {
      const btn = el('button', {
        class: 'h-bd2',
        style: 'padding:7px 14px;border-radius:11px;font-size:12.5px;font-weight:500;cursor:pointer',
        onclick: () => { ctx.audio.stopRing(focused(ctx).id); commit(ctx, focused(ctx).id, (t) => setPreset(t, mn * 60)); },
      }, [mn + '분']) as HTMLButtonElement;
      presetBtns.push({ btn, sec: mn * 60 });
      presetRow.append(btn);
    }

    heroSound = el('select', {
      class: 'mono',
      style: 'background:transparent;border:none;outline:none;font-size:12.5px;color:var(--text);cursor:pointer;font-weight:500',
      onchange: (e: Event) => commit(ctx, focused(ctx).id, (t) => ({ ...t, sound: (e.target as HTMLSelectElement).value })),
    }) as HTMLSelectElement;
    for (const o of soundOptions(ctx.state.customName)) heroSound.append(el('option', { value: o.id }, [o.label]));
    const soundBar = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:16px;padding:9px 14px;background:var(--surface);border:1px solid var(--border);border-radius:12px' }, [
      iconSpeaker(14, true),
      el('span', { style: 'font-size:12px;color:var(--muted)' }, ['알림음']),
      heroSound,
    ]);

    box.append(heroName, ringWrap, controls, presetRow, soundBar);
    return box;
  }

  function buildGrid(ctx: Ctx): HTMLElement {
    const section = el('div', { style: 'width:100%;margin-top:34px' });
    section.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px' }, [
      el('span', { style: 'font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)' }, ['모든 타이머 · 그룹별']),
    ]));
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px' });
    for (const t of ctx.state.timers) grid.append(buildCard(ctx, t));
    grid.append(el('button', {
      class: 'h-text-accent',
      style: 'min-height:158px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:transparent;border:1px dashed var(--border-2);border-radius:16px;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer',
      onclick: () => ctx.setState(addTimer(ctx.state), { main: true }),
    }, [iconPlus(20, 1.6), '타이머 추가']));
    section.append(grid);
    return section;
  }

  function buildCard(ctx: Ctx, t: Timer): HTMLElement {
    const dot = el('span', { style: 'width:8px;height:8px;border-radius:50%;flex:none' });
    const name = el('input', {
      value: t.name, placeholder: '이름', class: 'f-surface2',
      style: 'flex:1;min-width:0;background:transparent;border:none;outline:none;font-size:13px;font-weight:500;color:var(--text);padding:2px 4px;border-radius:6px',
      onclick: (e: Event) => e.stopPropagation(),
      oninput: (e: Event) => commit(ctx, t.id, (x) => ({ ...x, name: (e.target as HTMLInputElement).value })),
    }) as HTMLInputElement;
    const del = el('button', {
      title: '삭제', class: 'h-danger',
      style: 'width:24px;height:24px;border-radius:7px;background:transparent;border:none;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none',
      onclick: (e: Event) => { e.stopPropagation(); ctx.audio.stopRing(t.id); const p = removeTimer(ctx.state, t.id); if (p) ctx.setState(p, { main: true }); },
    }, [iconClose(13)]);
    const display = el('div', { class: 'mono', style: 'font-size:34px;font-weight:200;letter-spacing:.01em;margin-bottom:12px' });
    const bar = el('div', { style: 'height:100%;border-radius:2px;transition:width .25s linear' });
    const barTrack = el('div', { style: 'height:4px;background:var(--track);border-radius:2px;margin-bottom:13px;overflow:hidden' }, [bar]);
    const toggle = el('button', {
      class: 'h-bright6',
      style: 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer',
      onclick: () => onToggle(ctx, t.id),
    }) as HTMLButtonElement;
    const reset = el('button', {
      title: '초기화', class: 'h-text',
      style: 'width:40px;display:flex;align-items:center;justify-content:center;padding:9px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--muted);cursor:pointer',
      onclick: () => onReset(ctx, t.id),
    }, [iconReset(14)]);
    const card = el('div', {
      style: 'border-radius:16px;padding:14px;cursor:pointer',
      onclick: () => ctx.setState({ focusId: t.id }),
    }, [
      el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:12px' }, [dot, name, del]),
      display, barTrack,
      el('div', { style: 'display:flex;gap:7px' }, [toggle, reset]),
    ]);
    cardRefs.push({ id: t.id, card, dot, name, display, bar, toggle, reset, mode: null });
    return card;
  }

  // ---- dynamic refresh ----
  function update(ctx: Ctx): void {
    const s = ctx.state;
    const now = ctx.now();
    const ft = focused(ctx);

    // hero
    const fr = remOf(ft, now);
    const feff = ft.done ? 1 : Math.max(0, Math.min(1, ft.total > 0 ? fr / ft.total : 0));
    const fcolor = ft.done ? 'var(--danger)' : ft.running ? ft.accent : 'var(--muted)';
    syncInput(heroName, ft.name);
    heroDisplay.textContent = fmtClock(Math.ceil(fr));
    heroRing.setAttribute('stroke', fcolor);
    heroRing.setAttribute('stroke-dashoffset', (FCIRC * (1 - feff)).toFixed(1));
    heroStatus.textContent = ft.done ? '완료 · 알람' : ft.running ? '진행 중' : '준비';
    heroStatus.style.color = fcolor;
    const hMode = modeOf(ft);
    heroToggle.style.background = ft.done ? 'var(--danger)' : ft.accent;
    heroToggle.style.boxShadow = `0 12px 30px -10px ${fcolor}`;
    if (hMode !== heroToggleMode) {
      heroToggle.replaceChildren(hMode === 'run' ? iconPause(26) : hMode === 'idle' ? iconPlay(26) : iconReset(25));
      heroToggleMode = hMode;
    }
    for (const p of presetBtns) {
      const on = ft.total === p.sec;
      p.btn.style.background = on ? 'var(--accent-soft)' : 'var(--surface)';
      p.btn.style.border = '1px solid ' + (on ? 'var(--accent)' : 'var(--border)');
      p.btn.style.color = on ? 'var(--accent)' : 'var(--muted)';
    }
    if (document.activeElement !== heroSound && heroSound.value !== ft.sound) heroSound.value = ft.sound;

    // cards
    for (const ref of cardRefs) {
      const t = s.timers.find((x) => x.id === ref.id);
      if (!t) continue;
      const rem = remOf(t, now);
      const eff = t.done ? 1 : Math.max(0, Math.min(1, t.total > 0 ? rem / t.total : 0));
      const color = t.done ? 'var(--danger)' : t.running ? t.accent : 'var(--muted)';
      ref.dot.style.background = color;
      syncInput(ref.name, t.name);
      ref.display.textContent = fmtClock(Math.ceil(rem));
      ref.display.style.color = t.done ? 'var(--danger)' : 'var(--text)';
      ref.bar.style.width = (eff * 100).toFixed(1) + '%';
      ref.bar.style.background = color;
      const focus = t.id === s.focusId;
      ref.card.style.background = focus ? 'var(--surface)' : 'var(--panel)';
      ref.card.style.border = '1px solid ' + (t.done ? 'var(--danger)' : focus ? 'var(--border-2)' : 'var(--border)');
      ref.toggle.style.background = t.done ? 'var(--danger)' : t.running ? 'var(--surface-2)' : t.accent;
      ref.toggle.style.border = '1px solid ' + (t.running ? 'var(--border)' : 'transparent');
      ref.toggle.style.color = t.running ? 'var(--text)' : 'var(--on-accent)';
      const m = modeOf(t);
      if (m !== ref.mode) {
        ref.toggle.replaceChildren(
          m === 'run' ? iconPause(13) : m === 'idle' ? iconPlay(13) : iconReset(12),
          m === 'run' ? '일시정지' : m === 'idle' ? '시작' : '다시',
        );
        ref.mode = m;
      }
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
