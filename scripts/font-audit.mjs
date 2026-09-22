// Font audit: tabular digits across weights, shekel coverage, file size.
// Usage: node scripts/font-audit.mjs
import fs from 'node:fs';
import * as hb from 'harfbuzzjs';
import { decompress } from 'wawoff2';

const fams = { heebo: 'heebo', noto: 'noto-sans-hebrew', rubik: 'rubik' };
for (const [name, dir] of Object.entries(fams)) {
  const base = `node_modules/@fontsource-variable/${dir}/files/`;
  for (const sub of ['hebrew', 'latin']) {
    const raw = fs.readFileSync(`${base}${dir}-${sub}-wght-normal.woff2`);
    const face = new hb.Face(new hb.Blob(await decompress(raw)), 0);
    const font = new hb.Font(face);
    const out = [];
    for (const wght of [400, 500, 700, 800]) {
      font.setVariations([hb.Variation.fromString(`wght=${wght}`)]);
      const widths = new Set();
      for (const d of '0123456789,') {
        const buf = new hb.Buffer();
        buf.addText(d); buf.guessSegmentProperties();
        hb.shape(font, buf, name === 'rubik' ? [hb.Feature.fromString('tnum')] : []);
        const [info] = buf.getGlyphInfos(); const [pos] = buf.getGlyphPositions();
        if (d !== ',') widths.add(info.codepoint === 0 ? 'missing' : pos.xAdvance);
      }
      out.push(`${wght}:${[...widths].join('/')}`);
    }
    const has = face.collectUnicodes().includes(0x20aa);
    console.log(name.padEnd(6), sub.padEnd(7), `${(raw.length / 1024).toFixed(1)}KB`.padEnd(8), `₪ ${has ? 'yes' : 'no '}`, 'digit advances', out.join('  '));
  }
}
