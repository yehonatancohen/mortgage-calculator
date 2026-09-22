/**
 * llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI assistants,
 * with the current key figures and where they come from.
 */
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { allPages } from '../seo/pages';
import { benchmarkRate, datasets, limits } from '../../lib/data';
import { formatPercent } from '../../lib/mortgage';
import { hebrewMonth } from '../ui/dates';

export const GET: APIRoute = async () => {
  const pages = (await allPages()).filter((p) => p.index);
  const abs = (p: string) => new URL(p, SITE.url).href;
  const section = (name: string, s: string) => {
    const items = pages.filter((p) => p.section === s);
    return items.length ? `## ${name}\n\n${items.map((p) => `- [${p.title}](${abs(p.path)}): ${p.description}`).join('\n')}\n` : '';
  };
  const r = datasets.rates;
  const period = hebrewMonth(String(r.period.value));
  const rateLines = Object.values(r.tracks)
    .map((t) => `- ${t.label}: ${formatPercent(t.value / 100)}`)
    .join('\n');

  const body = `# ${SITE.brand}

> ${SITE.tagline} מחשבוני משכנתא בעברית לישראל: מחזור משכנתא, החזר חודשי, כמה משכנתא אפשר לקבל, עמלת פירעון מוקדם, מס רכישה ולוח סילוקין. כל תוצאה היא הערכה עם הנחות מפורטות, ולא ייעוץ פיננסי.

Language: Hebrew (he-IL). Currency: ILS (₪). Rates are nominal annual, compounded monthly.

## Key figures (${period})

Source: Bank of Israel average rates on new housing loans (${r.tracks.prime.source}). Updated ${r.tracks.prime.lastUpdated}.

${rateLines}
- Typical unlinked mix (benchmark used by the refinance calculator): ${formatPercent(benchmarkRate())}
- Max LTV: first home ${formatPercent(limits.maxLtv.firstHome, 0)}, replacement ${formatPercent(limits.maxLtv.replacementHome, 0)}, additional ${formatPercent(limits.maxLtv.additionalHome, 0)}

Methodology and every assumption: ${abs('/methodology/')}

${section('Calculators', 'calculator')}
${section('Data', 'data')}
${section('Guides', 'guide')}
${section('Refinance by bank', 'bank')}
${section('About', 'info')}`;

  return new Response(body.replace(/\n{3,}/g, '\n\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
