/** Motion helpers. Everything collapses to an instant change under prefers-reduced-motion. */

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const running = new WeakMap<Element, number>();

/**
 * Count a figure from its previous numbers to new ones. `render` formats the in-between values;
 * tabular numerals keep the width steady while digits change.
 */
export function countTo(el: HTMLElement, from: number[], to: number[], render: (vals: number[]) => string, duration = 320) {
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reducedMotion() || from.length !== to.length || from.every((v, i) => v === to[i])) {
    el.textContent = render(to);
    return;
  }
  const start = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const k = ease(t);
    el.textContent = render(to.map((v, i) => Math.round((from[i]! + (v - from[i]!) * k) / 1000) * 1000));
    if (t < 1) running.set(el, requestAnimationFrame(step));
    else {
      el.textContent = render(to);
      running.delete(el);
    }
  };
  running.set(el, requestAnimationFrame(step));
}

/** Step change through the View Transitions API when available; plain swap otherwise. */
export function transition(update: () => void, direction: 'forward' | 'back' = 'forward') {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (!doc.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  document.documentElement.dataset.vtDir = direction;
  const vt = doc.startViewTransition(update);
  vt.finished.finally(() => delete document.documentElement.dataset.vtDir);
}
