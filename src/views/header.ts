import { el } from '../dom';
import { TOOL_TITLES } from '../labels';
import { fmtClock, examCalc, nowSec, pad, type ExamState } from '../state';
import type { Ctx, View } from '../view';

interface PillMeta { l: string; c: string; bg: string; bd: string; }
const PILL_META: Record<ExamState, PillMeta> = {
  active: { l: '진행 중', c: 'var(--accent)', bg: 'var(--accent-soft)', bd: 'var(--accent)' },
  break: { l: '쉬는 시간', c: 'var(--text)', bg: 'var(--surface)', bd: 'var(--border)' },
  wait: { l: '시작 전', c: 'var(--muted)', bg: 'var(--surface)', bd: 'var(--border)' },
  done: { l: '종료', c: 'var(--faint)', bg: 'var(--surface)', bd: 'var(--border)' },
};

export function clockParts(state: { clockFormat: '24' | '12' }, d: Date): { hhmm: string; ss: string } {
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  if (state.clockFormat === '12') { let hh = h % 12; if (hh === 0) hh = 12; h = hh; }
  return { hhmm: pad(h) + ':' + pad(m), ss: pad(s) };
}

export function createHeader(): View {
  let root: HTMLElement;
  let titleEl: HTMLDivElement;
  let subEl: HTMLDivElement;
  let pill: HTMLDivElement;
  let pillDot: HTMLSpanElement;
  let pillText: HTMLSpanElement;
  let hhmmEl: HTMLSpanElement;
  let ssEl: HTMLSpanElement;

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    root.setAttribute('style', 'display:flex;align-items:center;justify-content:space-between;padding:20px 30px;border-bottom:1px solid var(--border);flex:none');
    root.replaceChildren();

    titleEl = el('div', { style: 'font-size:19px;font-weight:600;letter-spacing:-.01em' });
    subEl = el('div', { style: 'font-size:12.5px;color:var(--muted);margin-top:2px' });
    const left = el('div', {}, [titleEl, subEl]);

    pillDot = el('span', { style: 'width:7px;height:7px;border-radius:50%' });
    pillText = el('span', { style: 'font-size:12px;font-weight:500' });
    pill = el('div', { style: 'display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:22px' }, [pillDot, pillText]);

    hhmmEl = el('span', {});
    ssEl = el('span', { style: 'color:var(--faint);font-size:15px' });
    const clock = el('div', { class: 'mono', style: 'font-size:22px;font-weight:300;letter-spacing:.02em' }, [hhmmEl, ssEl]);

    const right = el('div', { style: 'display:flex;align-items:center;gap:16px' }, [pill, clock]);
    root.append(left, right);
    update(ctx);
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    const [title, sub] = TOOL_TITLES[s.tool];
    titleEl.textContent = title;
    subEl.textContent = sub;
    subEl.style.display = s.narrow ? 'none' : '';

    const now = new Date(ctx.now());
    const { hhmm, ss } = clockParts(s, now);
    hhmmEl.textContent = hhmm;
    ssEl.textContent = ':' + ss;

    if (s.narrow) {
      pill.style.display = 'none';
    } else {
      pill.style.display = 'inline-flex';
      const ec = examCalc(s.periods, nowSec(now));
      const meta = PILL_META[ec.state];
      const text = ec.state === 'active' ? ec.title + ' · ' + fmtClock(ec.remain)
        : ec.state === 'break' ? '쉬는 시간'
        : ec.state === 'wait' ? '수업 전' : '일정 종료';
      pill.style.background = meta.bg;
      pill.style.border = '1px solid ' + meta.bd;
      pillDot.style.background = meta.c;
      pillText.style.color = meta.c;
      pillText.textContent = text;
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}
