/** Deterministic Hebrew date formatting (no Intl, so build and browser output match). */
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/** "2026-09-22" → "22 בספטמבר 2026" */
export function hebrewDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ב${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** "2026-08" → "אוגוסט 2026" */
export function hebrewMonth(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}
