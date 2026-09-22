/**
 * Page registry for the sitemap, llms.txt and OG images. Pages that are noindex (drafts,
 * legal drafts, dev) are listed with `index: false` so they get an OG image but stay out of
 * the sitemap and llms.txt.
 */
import { getCollection } from 'astro:content';
import { BANKS } from '../config/banks';
import { datasets } from '../../lib/data';

export interface PageEntry {
  path: string;
  title: string;
  description: string;
  index: boolean;
  lastmod: string;
  section: 'calculator' | 'data' | 'guide' | 'bank' | 'info';
}

const ratesUpdated = datasets.rates.tracks.prime.lastUpdated;
const BASE = '2026-09-22';

export async function allPages(): Promise<PageEntry[]> {
  const guides = await getCollection('guides');
  return [
    { path: '/', title: 'מחשבון מחזור משכנתא', description: 'כמה תחסכו במחזור, נטו אחרי עמלות. תוצאה מיידית בלי להשאיר פרטים.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/calculators/', title: 'מחשבוני משכנתא', description: 'כל המחשבונים: מחזור, החזר חודשי, כמה משכנתא, עמלת פירעון, מס רכישה, לוח סילוקין.', index: true, lastmod: BASE, section: 'calculator' },
    { path: '/calculators/monthly-payment/', title: 'מחשבון החזר חודשי', description: 'כמה תשלמו כל חודש על משכנתא, בשפיצר ובקרן שווה.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/calculators/prepayment-fee/', title: 'מחשבון עמלת פירעון מוקדם', description: 'הערכת עמלת היוון והנחות במסלול בריבית קבועה.', index: true, lastmod: datasets.prepaymentFee.operationalFee.lastUpdated, section: 'calculator' },
    { path: '/calculators/purchase-tax/', title: 'מחשבון מס רכישה', description: 'מס רכישה לפי מדרגות רשות המסים, לדירה יחידה ולדירה נוספת.', index: true, lastmod: datasets.purchaseTax.singleHome.brackets.lastUpdated, section: 'calculator' },
    { path: '/calculators/how-much-mortgage/', title: 'כמה משכנתא אפשר לקבל', description: 'מחיר דירה ומשכנתא מרביים לפי הכנסה, הון עצמי ומגבלות המימון.', index: true, lastmod: datasets.regulation.maxLtv.firstHome.lastUpdated, section: 'calculator' },
    { path: '/calculators/amortization/', title: 'לוח סילוקין: שפיצר מול קרן שווה', description: 'לוח סילוקין שנתי והשוואת ריבית בין שפיצר לקרן שווה.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/ribit-mashkanta-hayom/', title: 'ריבית משכנתא היום', description: 'ריביות משכנתא ממוצעות לפי מסלול, מנתוני בנק ישראל.', index: true, lastmod: ratesUpdated, section: 'data' },
    { path: '/methodology/', title: 'איך אנחנו מחשבים', description: 'נוסחאות, הנחות, מקורות ומגבלות של המחשבונים.', index: true, lastmod: BASE, section: 'info' },
    { path: '/guides/', title: 'מדריכי משכנתא', description: 'מדריכים קצרים על מחזור, מסלולים, עמלות ויועצים.', index: true, lastmod: BASE, section: 'guide' },
    ...guides.map((g) => ({ path: `/guides/${g.id}/`, title: g.data.title, description: g.data.description, index: !g.data.draft, lastmod: g.data.updated, section: 'guide' as const })),
    { path: '/banks/', title: 'מחזור משכנתא לפי בנק', description: 'איך בודקים מחזור בכל אחד מהבנקים.', index: true, lastmod: BASE, section: 'bank' },
    ...BANKS.map((b) => ({ path: `/banks/${b.slug}/`, title: `מחזור משכנתא ב${b.name}`, description: `איך לבדוק מחזור משכנתא ב${b.name}.`, index: !b.draft, lastmod: BASE, section: 'bank' as const })),
    { path: '/about/', title: 'אודות', description: 'מי אנחנו ואיך האתר ממומן.', index: true, lastmod: BASE, section: 'info' },
    { path: '/accessibility/', title: 'הצהרת נגישות', description: 'רמת הנגישות ודרכי פנייה.', index: true, lastmod: BASE, section: 'info' },
    { path: '/privacy/', title: 'מדיניות פרטיות', description: 'אילו פרטים נאספים ולמי הם מועברים.', index: false, lastmod: BASE, section: 'info' },
    { path: '/terms/', title: 'תנאי שימוש', description: 'תנאי השימוש באתר.', index: false, lastmod: BASE, section: 'info' },
    { path: '/dev/tokens/', title: 'Tokens', description: 'Design tokens', index: false, lastmod: BASE, section: 'info' },
  ];
}
