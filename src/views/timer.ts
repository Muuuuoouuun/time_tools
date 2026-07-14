import { el } from '../dom';
import type { Ctx, View } from '../view';

// Placeholder — implemented in Task 4.
export function createTimerView(): View {
  let root: HTMLElement;
  function build(r: HTMLElement, _ctx: Ctx): void {
    root = r;
    root.replaceChildren(el('div', { style: 'color:var(--muted);padding:40px;text-align:center' }, ['timer view — 준비 중']));
  }
  return { build, update: () => {}, rebuild: (ctx) => build(root, ctx) };
}
