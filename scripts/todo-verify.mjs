// Lists every data value still marked TODO_VERIFY. Usage: npm run todo-verify [-- --md]
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('data');
const rows = [];
const walk = (file, node, p) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  if ('value' in node) {
    if (node.TODO_VERIFY) rows.push({ file, path: p, value: JSON.stringify(node.value), source: node.source, note: node.note ?? '' });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(file, v, p ? `${p}.${k}` : k);
};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) walk(f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), '');

if (process.argv.includes('--md')) {
  console.log('| File | Path | Placeholder | Source to check |\n|---|---|---|---|');
  for (const r of rows) console.log(`| \`${r.file}\` | \`${r.path}\` | \`${r.value}\` | ${r.source} |`);
} else {
  for (const r of rows) console.log(`${r.file.padEnd(20)} ${r.path.padEnd(40)} ${r.value}`);
  console.log(`\n${rows.length} values marked TODO_VERIFY`);
}
