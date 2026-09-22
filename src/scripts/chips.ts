/** Radio-style chip groups: click/tap, arrow keys (RTL-aware), roving tabindex. */
export interface ChipGroup {
  value(): string | null;
  set(v: string | null): void;
}

export function chipGroup(group: HTMLElement, onSelect: (value: string, chip: HTMLButtonElement) => void): ChipGroup {
  const chips = () => [...group.querySelectorAll<HTMLButtonElement>('[data-answer]')];
  const set = (v: string | null) => {
    chips().forEach((c, i) => {
      const on = c.dataset.answer === v;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on || (v === null && i === 0) ? 0 : -1;
    });
  };
  group.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-answer]');
    if (!chip || !group.contains(chip)) return;
    set(chip.dataset.answer!);
    onSelect(chip.dataset.answer!, chip);
  });
  group.addEventListener('keydown', (e) => {
    const list = chips();
    const idx = list.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    const rtl = getComputedStyle(group).direction === 'rtl';
    const next = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const target = list[(idx + next + list.length) % list.length]!;
    list.forEach((c) => (c.tabIndex = c === target ? 0 : -1));
    target.focus();
  });
  const current = chips().find((c) => c.getAttribute('aria-checked') === 'true');
  set(current?.dataset.answer ?? null);
  return { value: () => chips().find((c) => c.getAttribute('aria-checked') === 'true')?.dataset.answer ?? null, set };
}
