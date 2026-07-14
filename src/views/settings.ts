import { el } from '../dom';
import { iconClose } from '../icons';
import type { Ctx, View } from '../view';

// Minimal drawer so open/close works in Task 3; full contents added in Task 9.
export function createSettings(): View {
  let root: HTMLElement;
  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    const panel = el('div', {
      class: 'sc',
      style: 'width:380px;height:100%;background:var(--panel);border-left:1px solid var(--border);padding:26px;overflow-y:auto;box-shadow:-24px 0 60px -20px rgba(0,0,0,.5)',
      onclick: (e: Event) => e.stopPropagation(),
    }, [
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px' }, [
        el('span', { style: 'font-size:16px;font-weight:600' }, ['알림 설정']),
        el('button', {
          class: 'h-text',
          style: 'width:30px;height:30px;border-radius:9px;background:var(--surface);border:none;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
          onclick: () => ctx.setState({ settingsOpen: false }),
        }, [iconClose()]),
      ]),
      el('div', { style: 'color:var(--muted);font-size:13px' }, ['설정 준비 중']),
    ]);
    root.replaceChildren(el('div', {
      style: 'position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);z-index:50;display:flex;justify-content:flex-end',
      onclick: () => ctx.setState({ settingsOpen: false }),
    }, [panel]));
  }
  return { build, update: () => {}, rebuild: (ctx) => build(root, ctx) };
}
