import type { AppState } from './state';
import type { AudioEngine } from './audio';

/** What a structural setState should rebuild (chrome collapse/settings/tool are auto-detected). */
export interface RenderOpts {
  main?: boolean;     // rebuild the current tool view's subtree
  sidebar?: boolean;  // rebuild the sidebar
  settings?: boolean; // rebuild the settings drawer (while open)
}

/** Context handed to every view. `setState` mutates + persists + re-renders. */
export interface Ctx {
  state: AppState;
  setState(patch: Partial<AppState>, opts?: RenderOpts): void;
  audio: AudioEngine;
  now(): number;
}

/**
 * A view builds its DOM once (storing node refs), then `update()` refreshes only
 * dynamic values each tick. `rebuild()` re-runs build after a structural change.
 * Views never rewrite user-editable inputs inside `update()` (focus preservation).
 */
export interface View {
  build(root: HTMLElement, ctx: Ctx): void;
  update(ctx: Ctx): void;
  rebuild(ctx: Ctx): void;
}
