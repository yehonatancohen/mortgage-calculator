/**
 * Generic runner for the secondary calculators: wires AmountFields, chip groups and checkboxes
 * to a pure view function and updates [data-out] / [data-rows] live. No framework, no spinners.
 */
import { formatILS } from '../../lib/mortgage';
import type { CalcView } from '../ui/calcs';
import { trackOnce } from './analytics';
import { chipGroup } from './chips';
import { enhanceField } from './fields';
import { countTo } from './motion';

export function initCalc<S extends object>(root: HTMLElement, initial: S, compute: (s: S) => CalcView) {
  let state = { ...initial };
  let view = compute(state);

  const update = (patch: Partial<S>) => {
    const prev = view;
    state = { ...state, ...patch };
    view = compute(state);
    render(prev, view);
    trackOnce('calculator_used', { calc: root.dataset.calc ?? '' });
  };

  root.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => enhanceField(el, (v) => update({ [el.dataset.field!]: v } as Partial<S>)));
  root.querySelectorAll<HTMLElement>('[data-chips]').forEach((g) => chipGroup(g, (v) => update({ [g.dataset.chips!]: v } as Partial<S>)));
  root.querySelectorAll<HTMLInputElement>('input[data-check]').forEach((c) => c.addEventListener('change', () => update({ [c.dataset.check!]: c.checked } as Partial<S>)));

  function render(prev: CalcView, v: CalcView) {
    for (const [key, text] of Object.entries(v.out)) {
      root.querySelectorAll<HTMLElement>(`[data-out="${key}"]`).forEach((el) => {
        const to = v.counts?.[key];
        const from = prev.counts?.[key];
        if (el.hasAttribute('data-count') && to !== undefined && from !== undefined) {
          el.style.setProperty('--chars', String(text.length));
          countTo(el, [from], [to], ([n]) => formatILS(n!), to >= 100_000 ? 1000 : 1);
        } else el.textContent = text;
      });
    }
    for (const [key, rows] of Object.entries(v.rows ?? {})) {
      const body = root.querySelector<HTMLElement>(`[data-rows="${key}"]`);
      if (!body) continue;
      const labels = [...(body.closest('table')?.querySelectorAll('thead th') ?? [])].map((th) => th.textContent ?? '');
      body.replaceChildren(
        ...rows.map((cells) => {
          const tr = document.createElement('tr');
          cells.forEach((c, i) => {
            const td = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) td.setAttribute('scope', 'row');
            else {
              td.className = 'num';
              if (labels[i]) td.dataset.label = labels[i];
            }
            const v = document.createElement('bdi');
            if (i === 0) v.className = 'num';
            v.textContent = c;
            td.appendChild(v);
            tr.appendChild(td);
          });
          return tr;
        }),
      );
    }
    const live = root.querySelector<HTMLElement>('[data-announce]');
    if (live) {
      clearTimeout(Number(live.dataset.t));
      live.dataset.t = String(window.setTimeout(() => (live.textContent = root.querySelector('[data-summary]')?.textContent ?? ''), 800));
    }
  }
  root.classList.add('is-ready');
}
