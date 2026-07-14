import { svg } from './dom';

// Stroke-style icon (fill:none, currentColor stroke, round caps) — most UI glyphs.
function stroke(inner: string, size: number, sw = 1.5, vb = '0 0 16 16'): SVGSVGElement {
  return svg(inner, {
    width: size, height: size, viewBox: vb,
    fill: 'none', stroke: 'currentColor', 'stroke-width': sw,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
}

// Filled icon (currentColor fill) — play / pause.
function filled(inner: string, size: number, vb = '0 0 24 24'): SVGSVGElement {
  return svg(inner, { width: size, height: size, viewBox: vb, fill: 'currentColor' });
}

// ---- Nav icons (17px, from prototype lines 421–427) ----
export const navTimer = () => stroke('<circle cx="8" cy="9.3" r="4.7"/><path d="M8 9.3V6.3M6.2 1.6h3.6M12.2 4.3l.9.9"/>', 17);
export const navStopwatch = () => stroke('<circle cx="8" cy="9" r="5"/><path d="M8 9l2-1.4M6.4 1.6h3.2M8 1.6v1.9"/>', 17);
export const navClock = () => stroke('<circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.6 1.5"/>', 17);
export const navExam = () => stroke('<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M5 6h6M5 9h6M5 11.6h3.4"/>', 17);
export const navPomo = () => stroke('<path d="M8 2a6 6 0 1 0 6 6"/><path d="M8 8V4.5M14 4.5l-2 1"/>', 17);

// ---- Controls ----
export const iconPlay = (size = 26) => filled('<path d="M8 5.5v13l11-6.5z"/>', size);
export const iconPause = (size = 26) => filled('<rect x="7" y="6" width="3.4" height="12" rx="1.2"/><rect x="13.6" y="6" width="3.4" height="12" rx="1.2"/>', size);
export const iconReset = (size = 18) => stroke('<path d="M13 8A5 5 0 1 1 11.5 4.5"/><path d="M13 2.5V5.2h-2.7"/>', size);
export const iconSkip = (size = 18) => stroke('<path d="M4 3l7 5-7 5zM12 3v10"/>', size);
export const iconLap = (size = 19) => stroke('<path d="M4 2v12"/><path d="M4 3h7.5l-1.6 2.4L11.5 8H4"/>', size);
export const iconClose = (size = 15) => stroke('<path d="M4 4l8 8M12 4l-8 8"/>', size);
export const iconCheck = (size = 12, sw = 2) => stroke('<path d="M3 8.5l3.2 3.2L13 4.5"/>', size, sw);
export const iconChevronLeft = (size = 15) => stroke('<path d="M10 3L5 8l5 5"/>', size, 1.6);
export const iconChevronRight = (size = 15) => stroke('<path d="M6 3l5 5-5 5"/>', size, 1.6);
export const iconPlus = (size = 20, sw = 1.6) => stroke('<path d="M8 3.5v9M3.5 8h9"/>', size, sw);
export const iconEdit = (size = 14) => stroke('<path d="M11 2.5l2.5 2.5L6 12.5 3 13l.5-3z"/>', size);
export const iconUpload = (size = 16) => stroke('<path d="M8 11V3M5 6l3-3 3 3"/><path d="M3 11v2h10v-2"/>', size);
export const iconSun = (size = 15) => stroke('<circle cx="8" cy="8" r="3.3"/><path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4"/>', size);
export const iconMoon = (size = 15) => stroke('<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/>', size);
export const iconSettings = (size = 16) => svg('<path d="M2.5 5h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="5" r="1.7" fill="var(--bg-2)" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 11h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10.5" cy="11" r="1.7" fill="var(--bg-2)" stroke="currentColor" stroke-width="1.5"/>', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none' });
export const iconSpeaker = (size = 14, arc = true) => stroke(`<path d="M3 6v4h2.5L9 13V3L5.5 6H3z"/>${arc ? '<path d="M11.5 6.2a2.6 2.6 0 0 1 0 3.6"/>' : ''}`, size);
