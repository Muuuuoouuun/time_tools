// Minimal DOM builders. Kept tiny on purpose: the whole app is built from el()/svg().

type Handler = (e: Event) => void;
type AttrValue = string | number | boolean | Handler;
type Attrs = Record<string, AttrValue>;
type Child = Node | string | null | undefined | false;

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  applyAttrs(n, attrs);
  append(n, children);
  return n;
}

export function applyAttrs(n: HTMLElement, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'style') n.setAttribute('style', String(v));
    else if (k === 'class') n.className = String(v);
    else if (k === 'value') (n as HTMLInputElement).value = String(v);
    else if (k === 'checked') (n as HTMLInputElement).checked = Boolean(v);
    else if (k.startsWith('on') && typeof v === 'function') {
      n.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (v === true) n.setAttribute(k, '');
    else if (v !== false) n.setAttribute(k, String(v));
  }
}

function append(n: Node, children: Child[]): void {
  for (const c of children) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

/** Build an <svg> from an inner-markup string. Attributes go on the root <svg>. */
export function svg(inner: string, attrs: Record<string, string | number> = {}): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, String(v));
  root.innerHTML = inner;
  return root;
}

/** Clear all children of a node. */
export function clear(n: Node): void {
  while (n.firstChild) n.removeChild(n.firstChild);
}
