import { el, clear } from '../dom';
import { iconChevronLeft, iconChevronRight, iconSun, iconMoon, iconSettings } from '../icons';
import { TOOL_ORDER, TOOL_TITLES, NAV_ICONS } from '../labels';
import type { Ctx, View } from '../view';
import type { Tool } from '../state';

interface NavRef { key: Tool; btn: HTMLButtonElement; badge: HTMLSpanElement; }

export function createSidebar(): View {
  let root: HTMLElement;
  let navRefs: NavRef[] = [];
  let themeLabelEl: HTMLSpanElement | null = null;

  function collapsedOf(ctx: Ctx): boolean {
    return ctx.state.navCollapsed || ctx.state.narrow;
  }

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    navRefs = [];
    themeLabelEl = null;
    const s = ctx.state;
    const collapsed = collapsedOf(ctx);
    const expanded = !collapsed;

    // aside container styling
    root.setAttribute('class', 'sc');
    root.setAttribute('style',
      `width:${collapsed ? '70px' : '216px'};flex:none;background:var(--bg-2);border-right:1px solid var(--border);` +
      `display:flex;flex-direction:column;padding:22px 0;transition:width .18s ease;overflow:hidden`);
    clear(root);

    // ---- brand ----
    const brand = el('div', {
      style: `display:flex;align-items:center;gap:10px;justify-content:${collapsed ? 'center' : 'flex-start'};padding:${collapsed ? '0 0 20px' : '0 22px 26px'}`,
    });
    brand.append(el('span', { style: 'width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent);flex:none' }));
    if (expanded) {
      const title = el('span', { style: 'font-size:15px;font-weight:600;letter-spacing:-.01em;line-height:1.15;flex:1;white-space:nowrap' });
      title.innerHTML = '교실 타이머<br><span style="font-size:11px;font-weight:400;color:var(--faint)">Classroom Suite</span>';
      brand.append(title);
    }
    if (!s.narrow && !s.navCollapsed) {
      brand.append(el('button', {
        title: '접기', class: 'h-text',
        style: 'width:26px;height:26px;border-radius:8px;background:transparent;border:none;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none',
        onclick: () => ctx.setState({ navCollapsed: true }),
      }, [iconChevronLeft()]));
    }
    root.append(brand);

    // ---- expand button (only when collapsed by user, not narrow) ----
    if (!s.narrow && s.navCollapsed) {
      root.append(el('button', {
        title: '펼치기', class: 'h-text',
        style: 'margin:0 auto 12px;width:32px;height:32px;border-radius:9px;background:var(--surface);border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
        onclick: () => ctx.setState({ navCollapsed: false }),
      }, [iconChevronRight()]));
    }

    // ---- nav ----
    const nav = el('nav', { style: 'display:flex;flex-direction:column;gap:2px;padding:0 12px;flex:1' });
    for (const key of TOOL_ORDER) {
      const badge = el('span', {
        class: 'mono',
        style: 'margin-left:auto;font-size:11px;font-weight:600;color:var(--accent);background:var(--accent-soft);padding:2px 7px;border-radius:20px;display:none',
      });
      const children: (Node | string)[] = [el('span', { style: 'display:flex' }, [NAV_ICONS[key]()])];
      if (expanded) children.push(el('span', { style: 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, [TOOL_TITLES[key][0]]));
      children.push(badge);
      const btn = el('button', {
        title: TOOL_TITLES[key][0], class: 'h-surface',
        style: navBtnStyle(key === s.tool, collapsed),
        onclick: () => ctx.setState({ tool: key }, { main: true }),
      }, children);
      nav.append(btn);
      navRefs.push({ key, btn, badge });
    }
    root.append(nav);

    // ---- footer ----
    const foot = el('div', {
      style: `padding:14px 12px 0;border-top:1px solid var(--border);margin:8px 12px 0;display:flex;gap:8px;flex-direction:${collapsed ? 'column' : 'row'}`,
    });
    const isDark = s.theme === 'dark';
    themeLabelEl = expanded ? el('span', { style: 'white-space:nowrap' }, [isDark ? '라이트' : '다크']) : null;
    const themeChildren: (Node | string)[] = [isDark ? iconSun() : iconMoon()];
    if (themeLabelEl) themeChildren.push(themeLabelEl);
    foot.append(el('button', {
      title: '테마 전환', class: 'h-text-bd2',
      style: `flex:${collapsed ? 'none' : '1'};display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:11px;color:var(--muted);font-size:12px;font-weight:500;cursor:pointer`,
      onclick: () => ctx.setState({ theme: s.theme === 'dark' ? 'light' : 'dark' }),
    }, themeChildren));
    foot.append(el('button', {
      title: '알림 설정', class: 'h-text-bd2',
      style: `width:${collapsed ? 'auto' : '42px'};display:flex;align-items:center;justify-content:center;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:11px;color:var(--muted);cursor:pointer`,
      onclick: () => ctx.setState({ settingsOpen: !s.settingsOpen }),
    }, [iconSettings()]));
    root.append(foot);
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    const collapsed = collapsedOf(ctx);
    const runCount = s.timers.filter((t) => t.running).length;
    for (const ref of navRefs) {
      ref.btn.setAttribute('style', navBtnStyle(ref.key === s.tool, collapsed));
      const showBadge = ref.key === 'timer' && runCount > 0 && !collapsed;
      ref.badge.style.display = showBadge ? '' : 'none';
      if (showBadge) ref.badge.textContent = String(runCount);
    }
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}

function navBtnStyle(active: boolean, collapsed: boolean): string {
  return `position:relative;display:flex;align-items:center;gap:12px;justify-content:${collapsed ? 'center' : 'flex-start'};` +
    `padding:${collapsed ? '11px 0' : '11px 14px'};border:none;background:${active ? 'var(--surface)' : 'transparent'};` +
    `border-radius:12px;color:${active ? 'var(--text)' : 'var(--muted)'};font-size:13.5px;font-weight:${active ? '600' : '400'};cursor:pointer;text-align:left`;
}
