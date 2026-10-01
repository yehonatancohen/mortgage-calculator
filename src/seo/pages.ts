/**
 * Page registry for the sitemap, llms.txt and OG images. Pages that are noindex (drafts,
 * legal drafts, dev) are listed with `index: false` so they get an OG image but stay out of
 * the sitemap and llms.txt.
 */
import { getCollection } from 'astro:content';
import { BANKS } from '../config/banks';
import { datasets } from '../../lib/data';
import { buildQuestions } from '../config/questions';

export interface PageEntry {
  path: string;
  title: string;
  description: string;
  index: boolean;
  lastmod: string;
  section: 'calculator' | 'data' | 'question' | 'guide' | 'bank' | 'info';
}

const ratesUpdated = datasets.rates.tracks.prime.lastUpdated;
const BASE = '2026-09-22';
const LAST = '2026-09-28';

export async function allPages(): Promise<PageEntry[]> {
  const guides = await getCollection('guides');
  const questions = buildQuestions();
  return [
    { path: '/', title: 'מחשבון מחזור משכנתא', description: 'כמה תחסכו במחזור, נטו אחרי עמלות. תוצאה מיידית בלי להשאיר פרטים.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/calculators/', title: 'מחשבוני משכנתא', description: 'תשעה מחשבונים: מחזור, פירעון חלקי, הצמדה למדד, כמה משכנתא, הון עצמי ועלויות, מס רכישה, החזר חודשי, עמלת פירעון ולוח סילוקין.', index: true, lastmod: LAST, section: 'calculator' },
    { path: '/calculators/partial-prepayment/', title: 'פירעון חלקי: לקצר או להקטין החזר', description: 'כמה ריבית חוסכים בפירעון חלקי, ומה עדיף: קיצור תקופה או הקטנת החזר.', index: true, lastmod: datasets.prepaymentFee.operationalFee.lastUpdated, section: 'calculator' },
    { path: '/calculators/cpi-linkage/', title: 'הצמדה למדד: כמה ההחזר יעלה', description: 'החזר וסך תשלומים במסלול צמוד לפי אינפלציה שנתית.', index: true, lastmod: datasets.rates.tracks.fixedLinked.lastUpdated, section: 'calculator' },
    { path: '/calculators/upfront-costs/', title: 'הון עצמי ועלויות רכישה', description: 'כמה מזומן צריך ביום הרכישה: הון עצמי, מס רכישה, עורך דין ותיווך.', index: true, lastmod: datasets.purchaseCosts.lawyerFeeRate.lastUpdated, section: 'calculator' },
    { path: '/calculators/monthly-payment/', title: 'מחשבון החזר חודשי', description: 'כמה תשלמו כל חודש על משכנתא, בשפיצר ובקרן שווה.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/calculators/prepayment-fee/', title: 'מחשבון עמלת פירעון מוקדם', description: 'הערכת עמלת היוון והנחות במסלול בריבית קבועה.', index: true, lastmod: datasets.prepaymentFee.operationalFee.lastUpdated, section: 'calculator' },
    { path: '/calculators/purchase-tax/', title: 'מחשבון מס רכישה', description: 'מס רכישה לפי מדרגות רשות המסים, לדירה יחידה ולדירה נוספת.', index: true, lastmod: datasets.purchaseTax.singleHome.brackets.lastUpdated, section: 'calculator' },
    { path: '/calculators/how-much-mortgage/', title: 'כמה משכנתא אפשר לקבל', description: 'מחיר דירה ומשכנתא מרביים לפי הכנסה, הון עצמי ומגבלות המימון.', index: true, lastmod: datasets.regulation.maxLtv.firstHome.lastUpdated, section: 'calculator' },
    { path: '/calculators/amortization/', title: 'לוח סילוקין: שפיצר מול קרן שווה', description: 'לוח סילוקין שנתי והשוואת ריבית בין שפיצר לקרן שווה.', index: true, lastmod: ratesUpdated, section: 'calculator' },
    { path: '/ribit-mashkanta-hayom/', title: 'ריבית משכנתא היום', description: 'ריביות משכנתא ממוצעות לפי מסלול, מנתוני בנק ישראל.', index: true, lastmod: ratesUpdated, section: 'data' },
    { path: '/questions/', title: 'שאלות ותשובות על משכנתאות', description: 'תשובות ישירות לשאלות נפוצות, עם מספרים מחושבים, מקור ומחשבון.', index: true, lastmod: LAST, section: 'question' },
    ...questions.map((q) => ({ path: `/questions/${q.slug}/`, title: q.question, description: q.description, index: true, lastmod: q.updated, section: 'question' as const })),
    { path: '/methodology/', title: 'איך אנחנו מחשבים', description: 'נוסחאות, הנחות, מקורות ומגבלות של המחשבונים.', index: true, lastmod: BASE, section: 'info' },
    { path: '/guides/', title: 'מדריכי משכנתא', description: 'מדריכים קצרים על מחזור, מסלולים, עמלות ויועצים.', index: true, lastmod: BASE, section: 'guide' },
    ...guides.map((g) => ({ path: `/guides/${g.id}/`, title: g.data.title, description: g.data.description, index: !g.data.draft, lastmod: g.data.updated, section: 'guide' as const })),
    { path: '/banks/', title: 'מחזור משכנתא לפי בנק', description: 'איך בודקים מחזור בכל אחד מהבנקים.', index: true, lastmod: BASE, section: 'bank' },
    ...BANKS.map((b) => ({ path: `/banks/${b.slug}/`, title: `מחזור משכנתא ב${b.name}`, description: `איך לבדוק מחזור משכנתא ב${b.name}.`, index: !b.draft, lastmod: BASE, section: 'bank' as const })),
    { path: '/about/', title: 'אודות', description: 'למה האתר קיים, איך הוא עובד ולמה אפשר לסמוך עליו.', index: true, lastmod: LAST, section: 'info' },
    { path: '/how-we-make-money/', title: 'איך תכל\'ס משכנתא מרוויחה כסף', description: 'מי משלם, מה הקשר ליועצי משכנתאות ומה לא משפיע על התוצאות.', index: true, lastmod: LAST, section: 'info' },
    { path: '/accessibility/', title: 'הצהרת נגישות', description: 'רמת הנגישות ודרכי פנייה.', index: true, lastmod: BASE, section: 'info' },
    { path: '/contact/', title: 'יצירת קשר', description: 'שאלה על מחשבון, תיקון נתון או בקשה לבדיקה מול יועץ עצמאי.', index: true, lastmod: BASE, section: 'info' },
    { path: '/privacy/', title: 'מדיניות פרטיות', description: 'אילו פרטים נאספים ולמי הם מועברים.', index: true, lastmod: BASE, section: 'info' },
    { path: '/terms/', title: 'תנאי שימוש', description: 'תנאי השימוש באתר.', index: true, lastmod: BASE, section: 'info' },
    { path: '/dev/tokens/', title: 'Tokens', description: 'Design tokens', index: false, lastmod: BASE, section: 'info' },
  ];
}
