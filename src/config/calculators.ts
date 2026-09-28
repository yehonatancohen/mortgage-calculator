/**
 * The calculator hub: one registry drives the hub page, footer, related-calculator links,
 * the sitemap and llms.txt, so a new calculator only needs to be added here and in pages/.
 * `related` lists the calculators a visitor at this stage most plausibly needs next; the
 * lists are deliberately short and mutual where it makes sense.
 */
export type CalcGroup = 'have' | 'buy' | 'understand';

export interface CalcEntry {
  path: string;
  title: string;
  short: string;
  text: string;
  group: CalcGroup;
  related: string[];
  /** Question pages (/questions/…) that answer the most common query about this calculator. */
  questions: string[];
}

export const CALC_GROUPS: Record<CalcGroup, { title: string; text: string }> = {
  have: { title: 'כבר יש לי משכנתא', text: 'לבדוק אם כדאי למחזר, לפרוע חלק או להבין מה קורה עם ההצמדה.' },
  buy: { title: 'אני קונה דירה', text: 'כמה משכנתא אפשר לקבל, כמה מזומן צריך ומה יהיה ההחזר.' },
  understand: { title: 'להבין את המספרים', text: 'איך נבנה ההחזר ומה ההבדל בין שיטות החישוב.' },
};

export const CALCULATORS: CalcEntry[] = [
  {
    path: '/',
    title: 'מחשבון מחזור משכנתא',
    short: 'מחזור משכנתא',
    text: 'כמה תחסכו אם תמחזרו, נטו אחרי עמלות. תוצאה מיידית.',
    group: 'have',
    related: ['/calculators/prepayment-fee/', '/calculators/partial-prepayment/', '/calculators/cpi-linkage/'],
    questions: ['/questions/kama-ole-mihzur-mashkanta/', '/questions/ribit-mashkanta-memutza/'],
  },
  {
    path: '/calculators/prepayment-fee/',
    title: 'עמלת פירעון מוקדם',
    short: 'עמלת פירעון מוקדם',
    text: 'הערכת העמלה על מסלול בריבית קבועה.',
    group: 'have',
    related: ['/', '/calculators/partial-prepayment/'],
    questions: ['/questions/kama-ole-mihzur-mashkanta/'],
  },
  {
    path: '/calculators/partial-prepayment/',
    title: 'פירעון חלקי: לקצר או להקטין החזר',
    short: 'פירעון חלקי',
    text: 'מה עדיף לעשות עם כסף פנוי: לקצר את התקופה או להקטין את ההחזר.',
    group: 'have',
    related: ['/calculators/prepayment-fee/', '/calculators/amortization/', '/'],
    questions: ['/questions/ha-im-mishtale-lifroa-mashkanta/'],
  },
  {
    path: '/calculators/cpi-linkage/',
    title: 'הצמדה למדד: כמה ההחזר יעלה',
    short: 'הצמדה למדד',
    text: 'איך אינפלציה משנה את ההחזר ואת סך התשלומים במסלול צמוד.',
    group: 'have',
    related: ['/calculators/monthly-payment/', '/', '/calculators/amortization/'],
    questions: ['/questions/kama-oleh-hatzmada-lamadad/'],
  },
  {
    path: '/calculators/how-much-mortgage/',
    title: 'כמה משכנתא אפשר לקבל',
    short: 'כמה משכנתא אפשר לקבל',
    text: 'לפי הכנסה, הון עצמי ומגבלות המימון.',
    group: 'buy',
    related: ['/calculators/upfront-costs/', '/calculators/monthly-payment/', '/calculators/purchase-tax/'],
    questions: ['/questions/kama-mashkanta-im-maskoret/'],
  },
  {
    path: '/calculators/upfront-costs/',
    title: 'הון עצמי ועלויות רכישה',
    short: 'הון עצמי ועלויות',
    text: 'כמה מזומן צריך ביום הרכישה: הון עצמי, מס רכישה, עורך דין ותיווך.',
    group: 'buy',
    related: ['/calculators/purchase-tax/', '/calculators/how-much-mortgage/', '/calculators/monthly-payment/'],
    questions: ['/questions/kama-hon-atzmi-ledira/'],
  },
  {
    path: '/calculators/purchase-tax/',
    title: 'מס רכישה',
    short: 'מס רכישה',
    text: 'לפי מדרגות רשות המסים, לדירה יחידה ונוספת.',
    group: 'buy',
    related: ['/calculators/upfront-costs/', '/calculators/how-much-mortgage/'],
    questions: ['/questions/kama-mas-rechisha/'],
  },
  {
    path: '/calculators/monthly-payment/',
    title: 'החזר חודשי',
    short: 'החזר חודשי',
    text: 'כמה תשלמו כל חודש, בשפיצר ובקרן שווה.',
    group: 'understand',
    related: ['/calculators/amortization/', '/calculators/how-much-mortgage/', '/calculators/cpi-linkage/'],
    questions: ['/questions/hachzar-hodshi-mashkanta-million/'],
  },
  {
    path: '/calculators/amortization/',
    title: 'לוח סילוקין: שפיצר מול קרן שווה',
    short: 'לוח סילוקין',
    text: 'שפיצר מול קרן שווה, שנה אחר שנה.',
    group: 'understand',
    related: ['/calculators/monthly-payment/', '/calculators/partial-prepayment/'],
    questions: ['/questions/shpitzer-o-keren-shava/'],
  },
];

export const calcByPath = (path: string) => CALCULATORS.find((c) => c.path === path);
