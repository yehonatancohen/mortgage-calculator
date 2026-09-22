// WCAG contrast for the OKLCH tokens in src/styles/tokens.css (both themes).
// Usage: node scripts/contrast.mjs
import fs from 'node:fs';

const css = fs.readFileSync('src/styles/tokens.css', 'utf8');
const block = (re) => Object.fromEntries([...(css.match(re)?.[1] ?? '').matchAll(/--(c-[\w-]+):\s*oklch\(([^)]+)\)/g)].map((m) => [m[1], m[2]]));
const light = block(/\/\* THEME:LIGHT \*\/([\s\S]*?)\/\* END:LIGHT \*\//);
const dark = block(/\/\* THEME:DARK \*\/([\s\S]*?)\/\* END:DARK \*\//);

function oklchToLinear(str) {
  const [L, C, H] = str.split('/')[0].trim().split(/\s+/).map(Number);
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.map((v) => Math.min(1, Math.max(0, v)));
}
const lum = (s) => { const [r, g, b] = oklchToLinear(s); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const hex = (s) => '#' + oklchToLinear(s).map((v) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)).toString(16).padStart(2, '0')).join('');

const pairs = [
  ['c-text', 'c-surface', 4.5], ['c-text', 'c-bg', 4.5], ['c-text-2', 'c-surface', 4.5], ['c-text-2', 'c-bg', 4.5],
  ['c-text-3', 'c-surface', 4.5], ['c-accent-ink', 'c-surface', 4.5], ['c-on-accent', 'c-accent', 4.5], ['c-on-accent', 'c-accent-hover', 4.5],
  ['c-savings', 'c-surface', 4.5], ['c-savings', 'c-savings-soft', 4.5], ['c-attention', 'c-surface', 4.5], ['c-danger', 'c-surface', 4.5],
  ['c-accent-ink', 'c-accent-soft', 4.5], ['c-border-strong', 'c-surface', 3], ['c-focus', 'c-surface', 3], ['c-focus', 'c-bg', 3], ['c-track', 'c-surface', 3],
];
let fail = 0;
for (const [name, theme] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name}`);
  for (const [fg, bg, min] of pairs) {
    if (!theme[fg] || !theme[bg]) { console.log(`  missing ${fg} or ${bg}`); fail++; continue; }
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(16)} on ${bg.padEnd(16)} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${hex(theme[fg])} / ${hex(theme[bg])}`);
  }
}
process.exitCode = fail ? 1 : 0;
