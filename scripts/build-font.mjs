// Builds one self-hosted Heebo variable subset: Hebrew + Basic Latin + digits + ₪ + punctuation.
// Digits live in fontsource's latin file and ₪ in its hebrew file, so we merge the source TTF subset ourselves.
// Usage: node scripts/build-font.mjs  → public/fonts/heebo-var-subset.woff2
import fs from 'node:fs';
import subsetFont from 'subset-font';
import { decompress } from 'wawoff2';

const ranges = [
  [0x20, 0x7e], [0xa0, 0xa0], [0xd7, 0xd7], [0xf7, 0xf7], // Basic Latin, nbsp, × ÷
  [0x5b0, 0x5c7], [0x5d0, 0x5ea], [0x5f3, 0x5f4],        // Hebrew points, letters, geresh/gershayim
  [0x200e, 0x200f], [0x2010, 0x2014], [0x2018, 0x201e], [0x2022, 0x2022], [0x2026, 0x2026],
  [0x20aa, 0x20aa], [0x2192, 0x2192], [0x2212, 0x2212], [0x2248, 0x2248], [0x2264, 0x2265],
];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);

const dir = 'node_modules/@fontsource-variable/heebo/files/';
// Upstream ships Heebo split per script, so we emit two subsets and load them via unicode-range.
const out = [];
for (const [sub, filter] of [['latin', (c) => c < 0x590 || (c >= 0x2010 && c !== 0x20aa)], ['hebrew', (c) => (c >= 0x590 && c < 0x600) || c === 0x20aa || c === 0x200e || c === 0x200f]]) {
  const ttf = Buffer.from(await decompress(fs.readFileSync(`${dir}heebo-${sub}-wght-normal.woff2`)));
  const chars = [...text].filter((ch) => filter(ch.codePointAt(0))).join('');
  const buf = await subsetFont(ttf, chars, { targetFormat: 'woff2' });
  const file = `public/fonts/heebo-${sub}.woff2`;
  fs.writeFileSync(file, buf);
  out.push(`${file} ${(buf.length / 1024).toFixed(1)}KB`);
}
console.log(out.join('\n'));
