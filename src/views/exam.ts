import { el, clear } from '../dom';
import { iconClose, iconEdit, iconPlus } from '../icons';
import {
  fmtClock, examCalc, nowSec, parseHM, addPeriod, removePeriod, updPeriod, SUNEUNG,
  type Period,
} from '../state';
import { PILL_META, clockParts } from './header';
import type { Ctx, View } from '../view';

function syncInput(input: HTMLInputElement, value: string): void {
  if (document.activeElement !== input && input.value !== value) input.value = value;
}

interface RowRef { id: number; view?: { row: HTMLDivElement; dot: HTMLSpanElement; name: HTMLSpanElement; range: HTMLSpanElement }; edit?: { name: HTMLInputElement; start: HTMLInputElement; end: HTMLInputElement }; }

export function createExamView(): View {
  let root: HTMLElement;
  let card: HTMLDivElement;
  let stateLabel: HTMLSpanElement;
  let curClock: HTMLSpanElement;
  let titleEl: HTMLDivElement;
  let remainBlock: HTMLDivElement;
  let remainNum: HTMLSpanElement;
  let remainLabel: HTMLSpanElement;
  let bar: HTMLDivElement;
  let subBlock: HTMLDivElement;
  let rows: RowRef[] = [];
  let editing = false;

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    rows = [];
    editing = ctx.state.examEdit;
    clear(root);
    const wrap = el('div', { style: 'max-width:620px;margin:0 auto' });

    // ---- header card ----
    stateLabel = el('span', { style: 'font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase' });
    curClock = el('span', { style: 'font-size:12.5px;color:var(--muted)' });
    titleEl = el('div', { style: 'font-size:28px;font-weight:600;letter-spacing:-.01em;margin-top:10px' });
    remainNum = el('span', { class: 'mono', style: 'font-size:40px;font-weight:200' });
    remainLabel = el('span', { style: 'font-size:12.5px;color:var(--muted)' });
    bar = el('div', { style: 'height:100%;border-radius:3px;transition:width .3s linear' });
    remainBlock = el('div', {}, [
      el('div', { style: 'display:flex;align-items:baseline;gap:9px;margin-top:8px' }, [remainNum, remainLabel]),
      el('div', { style: 'height:6px;border-radius:3px;background:var(--track);margin-top:14px;overflow:hidden' }, [bar]),
    ]);
    subBlock = el('div', { style: 'font-size:13px;color:var(--muted);margin-top:8px' });
    card = el('div', { style: 'padding:22px;border-radius:20px;margin-bottom:16px' }, [
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [stateLabel, curClock]),
      titleEl, remainBlock, subBlock,
    ]);
    wrap.append(card);

    // ---- period list ----
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:7px' });
    const sorted = examCalc(ctx.state.periods, nowSec(new Date(ctx.now()))).sorted;
    for (const p of sorted) list.append(editing ? buildEditRow(ctx, p) : buildViewRow(p));
    wrap.append(list);

    // ---- actions ----
    wrap.append(buildActions(ctx));

    root.append(wrap);
    update(ctx);
  }

  function buildViewRow(p: Period): HTMLElement {
    const dot = el('span', { style: 'width:9px;height:9px;border-radius:50%;flex:none' });
    const name = el('span', { style: 'flex:1;font-size:14px;font-weight:500' }, [p.name]);
    const range = el('span', { class: 'mono', style: 'font-size:13.5px;letter-spacing:.02em' }, [p.start + '–' + p.end]);
    const dur = el('span', { style: 'font-size:11.5px;color:var(--faint);width:42px;text-align:right' }, [Math.round((parseHM(p.end) - parseHM(p.start)) / 60) + '분']);
    const row = el('div', { style: 'display:flex;align-items:center;gap:13px;padding:14px 16px;border-radius:14px' }, [dot, name, range, dur]);
    rows.push({ id: p.id, view: { row, dot, name, range } });
    return row;
  }

  function buildEditRow(ctx: Ctx, p: Period): HTMLElement {
    const name = el('input', {
      value: p.name, class: 'f-accent-bd',
      style: 'flex:1;min-width:0;background:var(--surface-2);border:1px solid var(--border);outline:none;font-size:13.5px;color:var(--text);padding:8px 10px;border-radius:9px',
      oninput: (e: Event) => ctx.setState({ periods: updPeriod(ctx.state.periods, p.id, 'name', (e.target as HTMLInputElement).value) }),
    }) as HTMLInputElement;
    const start = el('input', {
      type: 'time', value: p.start, class: 'mono f-accent-bd',
      style: 'background:var(--surface-2);border:1px solid var(--border);outline:none;font-size:12.5px;color:var(--text);padding:7px 8px;border-radius:9px',
      oninput: (e: Event) => ctx.setState({ periods: updPeriod(ctx.state.periods, p.id, 'start', (e.target as HTMLInputElement).value) }),
    }) as HTMLInputElement;
    const end = el('input', {
      type: 'time', value: p.end, class: 'mono f-accent-bd',
      style: 'background:var(--surface-2);border:1px solid var(--border);outline:none;font-size:12.5px;color:var(--text);padding:7px 8px;border-radius:9px',
      oninput: (e: Event) => ctx.setState({ periods: updPeriod(ctx.state.periods, p.id, 'end', (e.target as HTMLInputElement).value) }),
    }) as HTMLInputElement;
    const del = el('button', {
      class: 'h-danger',
      style: 'width:30px;height:32px;border-radius:9px;background:transparent;border:none;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none',
      onclick: () => ctx.setState({ periods: removePeriod(ctx.state.periods, p.id) }, { main: true }),
    }, [iconClose(15)]);
    const row = el('div', { style: 'display:flex;align-items:center;gap:9px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:14px' }, [name, start, end, del]);
    rows.push({ id: p.id, edit: { name, start, end } });
    return row;
  }

  function buildActions(ctx: Ctx): HTMLElement {
    const box = el('div', { style: 'display:flex;gap:9px;margin-top:16px' });
    if (editing) {
      box.append(
        el('button', {
          class: 'h-bd2',
          style: 'flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:13px;color:var(--text);font-size:13px;font-weight:500;cursor:pointer',
          onclick: () => { const { periods, nextPid } = addPeriod(ctx.state.periods, ctx.state.nextPid); ctx.setState({ periods, nextPid }, { main: true }); },
        }, [iconPlus(14, 1.7), '교시 추가']),
        el('button', {
          class: 'h-bright6',
          style: 'flex:1;padding:12px;background:var(--accent);border:none;border-radius:13px;color:var(--on-accent);font-size:13px;font-weight:600;cursor:pointer',
          onclick: () => ctx.setState({ examEdit: false }, { main: true }),
        }, ['완료']),
      );
    } else {
      box.append(
        el('button', {
          class: 'h-bd2',
          style: 'flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:13px;color:var(--text);font-size:13px;font-weight:500;cursor:pointer',
          onclick: () => ctx.setState({ examEdit: true }, { main: true }),
        }, [iconEdit(14), '편집']),
        el('button', {
          class: 'h-bright10',
          style: 'flex:1;padding:12px;background:var(--accent-soft);border:1px solid var(--border);border-radius:13px;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer',
          onclick: () => ctx.setState({ examEdit: false, periods: SUNEUNG.map((p) => ({ ...p })) }, { main: true }),
        }, ['수능 시간표 불러오기']),
      );
    }
    return box;
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    const now = new Date(ctx.now());
    const ec = examCalc(s.periods, nowSec(now));
    const meta = PILL_META[ec.state];

    card.style.background = meta.bg;
    card.style.border = '1px solid ' + meta.bd;
    stateLabel.textContent = meta.l;
    stateLabel.style.color = meta.c;
    curClock.textContent = '현재 ' + clockParts(s, now).hhmm;
    titleEl.textContent = ec.title;

    const hasRemain = ec.state !== 'done';
    const subOnly = ec.state === 'break' || ec.state === 'done';
    remainBlock.style.display = hasRemain ? '' : 'none';
    if (hasRemain) {
      remainNum.textContent = fmtClock(ec.remain);
      remainNum.style.color = meta.c;
      remainLabel.textContent = ec.remainLabel;
      bar.style.width = Math.round(Math.max(0, Math.min(1, ec.prog)) * 100) + '%';
      bar.style.background = meta.c;
    }
    subBlock.style.display = subOnly ? '' : 'none';
    if (subOnly) subBlock.textContent = ec.sub;

    if (editing) {
      // keep non-focused inputs in sync; never clobber the field being edited
      for (const ref of rows) {
        if (!ref.edit) continue;
        const p = s.periods.find((x) => x.id === ref.id);
        if (!p) continue;
        syncInput(ref.edit.name, p.name);
        syncInput(ref.edit.start, p.start);
        syncInput(ref.edit.end, p.end);
      }
      return;
    }

    // view mode: refresh per-row current/done/upcoming styling
    const nSec = nowSec(now);
    for (const ref of rows) {
      if (!ref.view) continue;
      const p = s.periods.find((x) => x.id === ref.id);
      if (!p) continue;
      const st = parseHM(p.start); const en = parseHM(p.end);
      const rs = en <= nSec ? 'done' : nSec >= st && nSec < en ? 'current' : 'up';
      ref.view.row.style.background = rs === 'current' ? 'var(--accent-soft)' : 'transparent';
      ref.view.row.style.border = '1px solid ' + (rs === 'current' ? 'var(--accent)' : 'var(--border)');
      ref.view.dot.style.background = rs === 'current' ? 'var(--accent)' : rs === 'done' ? 'var(--faint)' : 'var(--border-2)';
      ref.view.name.textContent = p.name;
      ref.view.name.style.color = rs === 'done' ? 'var(--faint)' : 'var(--text)';
      ref.view.range.textContent = p.start + '–' + p.end;
      ref.view.range.style.color = rs === 'done' ? 'var(--faint)' : 'var(--muted)';
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
