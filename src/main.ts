import './styles.css';
import { el, clear } from './dom';
import { AudioEngine } from './audio';
import {
  hydrate, loadKey, saveKey, serialize, advancePomo,
  type AppState, type Tool,
} from './state';
import type { Ctx, RenderOpts, View } from './view';
import { createSidebar } from './views/sidebar';
import { createHeader } from './views/header';
import { createSettings } from './views/settings';
import { createTimerView } from './views/timer';
import { createStopwatchView } from './views/stopwatch';
import { createClockView } from './views/clock';
import { createExamView } from './views/exam';
import { createPomodoroView } from './views/pomodoro';

const NARROW = 760;

class App {
  state: AppState;
  audio: AudioEngine;

  private rootEl!: HTMLDivElement;
  private asideEl!: HTMLElement;
  private headerEl!: HTMLElement;
  private bodyEl!: HTMLDivElement;
  private settingsHost!: HTMLDivElement;
  private flashEl!: HTMLDivElement;

  private views: Record<Tool, View>;
  private sidebar = createSidebar();
  private header = createHeader();
  private settings = createSettings();
  private current!: View;

  constructor(mount: HTMLElement) {
    this.state = hydrate(loadKey(), Date.now());
    this.state.narrow = window.innerWidth < NARROW;
    this.audio = new AudioEngine(() => this.state.volume);
    if (this.state.customData) this.audio.setCustom(this.state.customData);

    this.views = {
      timer: createTimerView(),
      stopwatch: createStopwatchView(),
      clock: createClockView(),
      exam: createExamView(),
      pomo: createPomodoroView(),
    };

    this.buildShell(mount);
    this.mountTool();
    this.syncSettings();
    this.renderDynamic();
    this.wireGlobals();
  }

  private ctx(): Ctx {
    return {
      state: this.state,
      audio: this.audio,
      now: () => Date.now(),
      setState: (patch, opts) => this.setState(patch, opts),
    };
  }

  private buildShell(mount: HTMLElement): void {
    this.flashEl = el('div', { style: 'position:absolute;inset:0;background:var(--danger);pointer-events:none;z-index:60;display:none' });
    this.asideEl = el('aside');
    this.headerEl = el('header');
    this.bodyEl = el('div', { class: 'sc', style: 'flex:1;overflow-y:auto;padding:28px 30px 40px' });
    this.settingsHost = el('div');
    const mainEl = el('main', { style: 'flex:1;display:flex;flex-direction:column;min-width:0' }, [this.headerEl, this.bodyEl]);

    this.rootEl = el('div', {
      style: "position:fixed;inset:0;display:flex;background:var(--bg);color:var(--text);font-family:'Sora',system-ui,sans-serif;overflow:hidden",
    }, [this.flashEl, this.asideEl, mainEl, this.settingsHost]);
    this.rootEl.setAttribute('data-theme', this.state.theme);

    clear(mount);
    mount.append(this.rootEl);

    this.sidebar.build(this.asideEl, this.ctx());
    this.header.build(this.headerEl, this.ctx());
  }

  private mountTool(): void {
    this.current = this.views[this.state.tool];
    this.current.build(this.bodyEl, this.ctx());
  }

  private syncSettings(): void {
    if (this.state.settingsOpen) this.settings.build(this.settingsHost, this.ctx());
    else clear(this.settingsHost);
  }

  setState(patch: Partial<AppState>, opts?: RenderOpts): void {
    const prevTool = this.state.tool;
    const prevCollapsed = this.state.navCollapsed;
    const prevNarrow = this.state.narrow;
    const prevSettings = this.state.settingsOpen;
    const prevTheme = this.state.theme;

    Object.assign(this.state, patch);
    saveKey(serialize(this.state));
    this.rootEl.setAttribute('data-theme', this.state.theme);

    if (this.state.tool !== prevTool) this.mountTool();
    else if (opts?.main) this.current.rebuild(this.ctx());

    // Theme swaps the sidebar's sun/moon icon + label; collapse/narrow change its layout.
    if (this.state.navCollapsed !== prevCollapsed || this.state.narrow !== prevNarrow ||
        this.state.theme !== prevTheme || opts?.sidebar) {
      this.sidebar.rebuild(this.ctx());
    }

    if (this.state.settingsOpen !== prevSettings) this.syncSettings();
    else if (opts?.settings && this.state.settingsOpen) this.settings.rebuild(this.ctx());

    this.renderDynamic();
  }

  private renderDynamic(): void {
    const ctx = this.ctx();
    this.header.update(ctx);
    this.sidebar.update(ctx);
    this.current.update(ctx);
    if (this.state.settingsOpen) this.settings.update(ctx);
    const flashing = this.state.flash && (this.state.timers.some((t) => t.done) || this.state.pomo.done);
    this.flashEl.style.display = flashing ? 'block' : 'none';
    this.flashEl.style.animation = flashing ? 'flashkf .9s ease-in-out infinite' : 'none';
  }

  private tick = (): void => {
    const now = Date.now();
    let changed = false;
    const timers = this.state.timers.map((t) => {
      if (t.running && t.endAt != null && t.endAt <= now && !t.done) {
        changed = true;
        this.audio.startRing(t.id, t.sound);
        return { ...t, running: false, done: true, remaining: 0, endAt: null };
      }
      return t;
    });
    let pomo = this.state.pomo;
    if (pomo.running && pomo.endAt != null && pomo.endAt <= now && !pomo.done) {
      this.audio.play(this.state.sound);
      pomo = advancePomo(pomo, now);
      changed = true;
    }
    if (changed) {
      this.state.timers = timers;
      this.state.pomo = pomo;
      saveKey(serialize(this.state));
    }
    this.renderDynamic();
  };

  private wireGlobals(): void {
    setInterval(this.tick, 100);

    window.addEventListener('resize', () => {
      const narrow = window.innerWidth < NARROW;
      if (narrow !== this.state.narrow) this.setState({ narrow });
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.tick(); // reconcile immediately on refocus
    });

    const unlock = (): void => {
      this.audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
}

new App(document.getElementById('app')!);
