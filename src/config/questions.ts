/**
 * Question pages (/questions/…): one specific question per page, in the order an answer engine
 * (and a hurried reader) wants it: short answer, the data, a worked example, the source and the
 * tool that lets you run your own numbers. Every figure is computed here from lib/mortgage and
 * data/*.json at build time, never typed by hand, so it moves when the data files move.
 */
import { benchmarkRate, datasets, limits, purchaseCosts, purchaseTaxBrackets, refinanceAssumptions, trackRates } from '../../lib/data';
import {
  affordability,
  equalPrincipalSchedule,
  estimateFixedTrackFee,
  formatILS,
  formatNumber,
  formatPercent,
  indexedSpitzer,
  partialPrepayment,
  payment,
  purchaseTax,
  spitzerSchedule,
  upfrontCosts,
} from '../../lib/mortgage';
import { formatDuration } from '../ui/calcs';
import { hebrewDate, hebrewMonth } from '../ui/dates';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; caption: string; head: string[]; rows: string[][] };

export interface Question {
  slug: string;
  /** The question, used as H1 and as the FAQ/Article headline. */
  question: string;
  metaTitle: string;
  description: string;
  /** The direct answer, 1–2 sentences with the number in it. */
  short: string;
  data: Block[];
  example: Block[];
  /** Caveats and what the numbers leave out. */
  limits: string[];
  sources: { label: string; url: string }[];
  /** ISO date of the newest input used. */
  updated: string;
  tool: { href: string; title: string; text: string };
  followUps: { q: string; a: string }[];
  related: string[];
}

const BOI_MONTHLY = datasets.rates.tracks.prime.source;
const BOI_329 = 'https://www.boi.org.il/roles/supervisionregulation/nbt/nbt329/';
const TAX_INSTRUCTION = 'https://www.gov.il/he/pages/inst-01-2026';
const FEE_ORDER = 'https://www.boi.org.il/media/qy5cow0l/116.pdf';
const CBS = 'https://www.cbs.gov.il/he/mediarelease/Madad';

const src = {
  rates: { label: 'בנק ישראל: דוח חודשי על הלוואות לדיור', url: BOI_MONTHLY },
  directive: { label: 'בנק ישראל: הוראת ניהול בנקאי תקין 329', url: BOI_329 },
  tax: { label: 'רשות המסים: הוראת ביצוע מיסוי מקרקעין 1/2026', url: TAX_INSTRUCTION },
  fee: { label: 'צו הבנקאות (פירעון מוקדם של הלוואה לדיור), התשס"ב-2002', url: FEE_ORDER },
  cbs: { label: 'הלשכה המרכזית לסטטיסטיקה: מדד המחירים לצרכן', url: CBS },
};

const p = (text: string): Block => ({ type: 'p', text });
const ltr = (s: string) => `⁦${s}⁩`;

export function buildQuestions(): Question[] {
  const bench = benchmarkRate();
  const rate = Math.round(bench * 100 * 20) / 20 / 100; // nearest 0.05%, as on the calculator pages
  const period = hebrewMonth(String(datasets.rates.period.value));
  const ratesUpdated = datasets.rates.tracks.prime.lastUpdated;
  const a = refinanceAssumptions();
  const [swLo, swHi] = purchaseCosts.mortgageFees;
  const pct0 = (x: number) => formatPercent(x, 0);

  /* 1. Refinance cost */
  const fixedMarket = Math.round(trackRates.fixedUnlinked * 100 * 20) / 20 / 100;
  const feeCase = (contract: number) =>
    estimateFixedTrackFee({ balance: 400_000, contractRate: contract, marketRate: fixedMarket, monthsRemaining: 180, yearsElapsed: 4, gaveNotice: true }, a.fee).total;
  const feeRows = [fixedMarket + 0.015, fixedMarket + 0.0025, Math.max(0.005, fixedMarket - 0.015)].map((c, i) => [
    ['ריבית בחוזה גבוהה מהשוק ב־1.5 נק׳', 'ריבית בחוזה גבוהה מהשוק ב־0.25 נק׳', 'ריבית בחוזה נמוכה מהשוק ב־1.5 נק׳'][i]!,
    formatPercent(c),
    formatILS(Math.round(feeCase(c) / 10) * 10),
  ]);
  const qRefiCost: Question = {
    slug: 'kama-ole-mihzur-mashkanta',
    question: 'כמה עולה מחזור משכנתא?',
    metaTitle: 'כמה עולה מחזור משכנתא? עלויות, עמלות ודוגמה',
    description: `מחזור משכנתא עולה עמלת פירעון מוקדם (תלויה במסלול) ועוד כ־${formatILS(swLo)}–${formatILS(swHi)} עלויות מעבר. נתונים, דוגמה מחושבת ומחשבון.`,
    short: `מחזור משכנתא עולה שני דברים: עמלת פירעון מוקדם על המשכנתא הישנה, ועוד כ־${ltr(`${formatILS(swLo)}–${formatILS(swHi)}`)} עלויות מעבר (שמאות, פתיחת תיק ורישום משכון). בפריים ובמסלולים משתנים העמלה קטנה מאוד. במסלול קבוע היא יכולה להגיע לאלפי שקלים או יותר, ותלויה בפער בין הריבית בחוזה לריבית היום.`,
    data: [
      { type: 'table', caption: 'מרכיבי העלות', head: ['רכיב', 'סדר גודל', 'תלוי ב'], rows: [
        ['עמלת היוון (מסלול קבוע)', 'מאפס ועד אלפי שקלים', 'הפער בין ריבית החוזה לריבית היום, והזמן שנותר'],
        ['הנחה לפי ותק', '20% אחרי 3 שנים, 30% אחרי 5', 'מועד לקיחת ההלוואה'],
        ['עמלה תפעולית', formatILS(datasets.prepaymentFee.operationalFee.value), 'קבועה'],
        ['אי־מתן הודעה מוקדמת', `${formatPercent(datasets.prepaymentFee.noNoticeFeeRate.value, 1)} מהסכום הנפרע`, 'הודעה של פחות מ־10 ימים'],
        ['עלויות מעבר', `${formatILS(swLo)}–${formatILS(swHi)}`, 'הערכה שלנו: שמאות, פתיחת תיק, רישום משכון'],
      ] },
    ],
    example: [
      p(`מסלול קבוע לא צמוד, יתרה ₪400,000, 15 שנה שנותרו, ההלוואה נלקחה לפני 4 שנים, הודעה מוקדמת ניתנה. ריבית השוק לקבועה לא צמודה (${period}): ${formatPercent(fixedMarket)}.`),
      { type: 'table', caption: 'הערכת עמלת פירעון מוקדם לפי ריבית החוזה', head: ['תרחיש', 'ריבית בחוזה', 'עמלה משוערת'], rows: feeRows },
      p('עם עלויות המעבר, העלות הכוללת של המחזור היא סכום העמלה ועוד עלויות המעבר. רק חיסכון גדול מהסכום הזה הופך את המחזור למשתלם.'),
    ],
    limits: ['זו הערכה פשוטה של עמלת ההיוון. הבנק מחשב לפי לוח הסילוקין המדויק של כל מסלול, ולכן כדאי לבקש ממנו דוח יתרות לסילוק לפני החלטה.', 'עלויות המעבר הן הערכה שלנו, כי אין מקור רשמי שמפרסם סכום כולל.'],
    sources: [src.fee, src.rates],
    updated: [datasets.prepaymentFee.operationalFee.lastUpdated, ratesUpdated].sort().at(-1)!,
    tool: { href: '/', title: 'בדקו כמה תחסכו נטו', text: 'מחשבון המחזור מחסיר עמלה ועלויות מהחיסכון.' },
    followUps: [
      { q: 'האם תמיד צריך לשלם עמלת פירעון מוקדם?', a: 'לא. במסלולי פריים ובמסלולים משתנים העמלה נמוכה מאוד, ובמסלול קבוע אין עמלת היוון כשהריבית היום לא נמוכה מהריבית בחוזה. נשארת רק עמלה תפעולית.' },
      { q: 'איך מקטינים את העמלה?', a: 'הודעה מוקדמת של עשרה ימים לפחות, והמתנה לוותק של שלוש או חמש שנים מורידות את העמלה. לפעמים משתלם למחזר רק חלק מהמסלולים.' },
    ],
    related: ['ha-im-mishtale-lifroa-mashkanta', 'ribit-mashkanta-memutza'],
  };

  /* 2. Average rate */
  const qRate: Question = {
    slug: 'ribit-mashkanta-memutza',
    question: 'מה ריבית המשכנתא הממוצעת היום?',
    metaTitle: `מה ריבית המשכנתא הממוצעת? נתוני ${period}`,
    description: `ריבית משכנתא ממוצעת ב${period} לפי מסלול, מנתוני בנק ישראל: לתמהיל טיפוסי לא צמוד כ־${formatPercent(bench)}.`,
    short: `לפי נתוני בנק ישראל ל${period}, הריבית הממוצעת בהלוואות חדשות לדיור לתמהיל טיפוסי לא צמוד היא כ־${formatPercent(bench)}. פריים ${formatPercent(trackRates.prime)}, קבועה לא צמודה ${formatPercent(trackRates.fixedUnlinked)}, וקבועה צמודה ${formatPercent(trackRates.fixedLinked)} (ריבית ריאלית, לפני הצמדה).`,
    data: [
      { type: 'table', caption: `ריבית שנתית ממוצעת בהלוואות חדשות, ${period}`, head: ['מסלול', 'ריבית ממוצעת', 'החזר ל־₪1M ל־25 שנה'], rows: [
        ...Object.values(datasets.rates.tracks).map((t) => [t.label, formatPercent(t.value / 100), formatILS(payment(1_000_000, t.value / 100, 300))]),
        ['תמהיל טיפוסי לא צמוד', formatPercent(bench), formatILS(payment(1_000_000, bench, 300))],
      ] },
    ],
    example: [
      p(`משכנתא של ₪1,000,000 ל־25 שנה בריבית ${formatPercent(bench)} משולמת ב־${formatILS(payment(1_000_000, bench, 300))} בחודש. כל שינוי של חצי נקודת אחוז בריבית משנה את ההחזר בכ־${formatILS(Math.abs(payment(1_000_000, bench + 0.005, 300) - payment(1_000_000, bench, 300)))} בחודש.`),
    ],
    limits: ['הממוצע משקף את כל ההלוואות החדשות באותו חודש. הריבית האישית תלויה בשיעור המימון, ביחס ההחזר להכנסה, בתקופה ובתמהיל.', 'ריביות במסלולים צמודים הן ריאליות: ההחזר בפועל משתנה עם המדד.'],
    sources: [src.rates],
    updated: ratesUpdated,
    tool: { href: '/', title: 'הריבית שלך גבוהה מהממוצע?', text: 'בדקו כמה תחסכו במחזור.' },
    followUps: [
      { q: 'איפה רואים את השינוי לאורך זמן?', a: 'בעמוד ריבית משכנתא היום יש היסטוריה חודשית והשוואה לחודש ולשנה קודמים.' },
      { q: 'האם הריבית בבנק שלי תהיה זהה לממוצע?', a: 'לא בהכרח. הבנקים נותנים ריבית אישית, וההפרש מהממוצע יכול להיות משמעותי בשני הכיוונים.' },
    ],
    related: ['kama-ole-mihzur-mashkanta', 'hachzar-hodshi-mashkanta-million'],
  };

  /* 3. Income → mortgage */
  const incomes = [12_000, 15_000, 20_000, 25_000, 30_000];
  const incomeRow = (income: number, pti: number) => {
    const r = affordability({ netIncome: income, obligations: 0, equity: 1_000_000_000, annualRate: bench, months: 300, maxPaymentToIncome: pti, maxLtv: limits.maxLtv.firstHome });
    return [formatILS(income), formatILS(Math.round(r.maxPayment)), formatILS(Math.floor(r.maxLoanByIncome / 1000) * 1000)];
  };
  const ex20 = affordability({ netIncome: 20_000, obligations: 0, equity: 1_000_000_000, annualRate: bench, months: 300, maxPaymentToIncome: limits.recommendedPaymentToIncome, maxLtv: limits.maxLtv.firstHome });
  const qIncome: Question = {
    slug: 'kama-mashkanta-im-maskoret',
    question: 'כמה משכנתא אפשר לקבל לפי הכנסה?',
    metaTitle: 'כמה משכנתא אפשר לקבל לפי הכנסה? טבלה ודוגמה',
    description: `כמה משכנתא אפשר לקבל עם הכנסה של 15,000, 20,000 או 30,000 ₪ נטו? טבלה לפי ${formatNumber(limits.recommendedPaymentToIncome * 100)}% מההכנסה, עם המגבלות של בנק ישראל.`,
    short: `בהכנסה נטו של ₪20,000 בחודש, החזר של ${formatNumber(limits.recommendedPaymentToIncome * 100)}% מההכנסה (${formatILS(Math.round(ex20.maxPayment))}) מאפשר משכנתא של כ־${formatILS(Math.floor(ex20.maxLoanByIncome / 1000) * 1000)} ל־25 שנה בריבית ${formatPercent(bench)}. התקרה הרגולטורית גבוהה יותר (${formatNumber(limits.maxPaymentToIncome * 100)}%), אבל בנקים בדרך כלל מאשרים פחות. הסכום בפועל מוגבל גם בהון העצמי.`,
    data: [
      { type: 'table', caption: `משכנתא מרבית לפי הכנסה נטו, 25 שנה, ריבית ${formatPercent(bench)}, ללא התחייבויות אחרות`, head: ['הכנסה נטו בחודש', `החזר מרבי (${formatNumber(limits.recommendedPaymentToIncome * 100)}%)`, 'משכנתא מרבית'], rows: incomes.map((i) => incomeRow(i, limits.recommendedPaymentToIncome)) },
      { type: 'table', caption: `אותו חישוב בתקרה הרגולטורית של ${formatNumber(limits.maxPaymentToIncome * 100)}% מההכנסה`, head: ['הכנסה נטו בחודש', `החזר מרבי (${formatNumber(limits.maxPaymentToIncome * 100)}%)`, 'משכנתא מרבית'], rows: incomes.map((i) => incomeRow(i, limits.maxPaymentToIncome)) },
    ],
    example: [
      p(`זוג עם הכנסה נטו של ₪20,000: ההחזר המומלץ ${formatILS(Math.round(ex20.maxPayment))}. משכנתא של ${formatILS(Math.floor(ex20.maxLoanByIncome / 1000) * 1000)} תדרוש הון עצמי של ${pct0(1 - limits.maxLtv.firstHome)} לפחות משווי דירה ראשונה. אם ההון קטן, ההון הוא הגבול ולא ההכנסה.`),
    ],
    limits: [`הבנק בודק גם היסטוריה פיננסית, יציבות הכנסה וגיל הלווים. ${formatNumber(limits.recommendedPaymentToIncome * 100)}% הוא ברירת מחדל שמרנית שלנו, לא נתון רגולטורי.`, 'לא כולל התחייבויות קיימות. מחסירים אותן מההחזר המרבי.'],
    sources: [src.directive, src.rates],
    updated: [datasets.regulation.maxPaymentToIncome.lastUpdated, ratesUpdated].sort().at(-1)!,
    tool: { href: '/calculators/how-much-mortgage/', title: 'חשבו לפי ההכנסה וההון שלכם', text: 'המחשבון מחזיר את הנמוך מבין מגבלת ההכנסה למגבלת ההון.' },
    followUps: [
      { q: 'מה התקרה הרגולטורית להחזר?', a: `בנק ישראל מגביל את יחס ההחזר להכנסה ל־${formatNumber(limits.maxPaymentToIncome * 100)}%. מעל 40% ההלוואה כרוכה בדרישת הון גבוהה יותר מהבנק, ולכן בפועל מאשרים פחות.` },
      { q: 'האם ההכנסה של שני בני הזוג נספרת?', a: 'כן, הכנסה נטו של כל הלווים יחד, בניכוי החזרי הלוואות אחרות.' },
    ],
    related: ['kama-hon-atzmi-ledira', 'hachzar-hodshi-mashkanta-million'],
  };

  /* 4. Equity for a 2M apartment */
  const eqRow = (type: 'firstHome' | 'replacementHome' | 'additionalHome', price: number) => {
    const tax = purchaseTax(price, type === 'additionalHome' ? purchaseTaxBrackets.additionalHome : purchaseTaxBrackets.singleHome).total;
    return upfrontCosts({ price, maxLtv: limits.maxLtv[type], purchaseTax: tax, lawyerRate: purchaseCosts.lawyerRate, brokerRate: 0, vatRate: purchaseCosts.vatRate, mortgageFees: (swLo + swHi) / 2 });
  };
  const up = (n: number) => formatILS(Math.ceil(n / 1000) * 1000);
  const e2 = eqRow('firstHome', 2_000_000);
  const qEquity: Question = {
    slug: 'kama-hon-atzmi-ledira',
    question: 'כמה הון עצמי צריך לקנות דירה?',
    metaTitle: 'כמה הון עצמי צריך לדירה? טבלה לפי מחיר',
    description: `לדירה ראשונה ב־2 מיליון ₪ צריך לפחות ${up(e2.minEquityForPrice)} הון עצמי, ועוד עלויות רכישה. טבלה לפי מחיר וסוג הדירה.`,
    short: `לדירה ראשונה בשווי ₪2,000,000 אפשר לממן עד ${pct0(limits.maxLtv.firstHome)}, כלומר ההון העצמי המינימלי הוא ${up(e2.minEquityForPrice)}. מעל זה צריך מזומן לעלויות רכישה: מס רכישה (${formatILS(Math.round(e2.purchaseTax))} כאן), עורך דין ועלויות משכנתא. בסך הכול כ־${up(e2.cashNeeded)} ביום הרכישה, בלי תיווך.`,
    data: [
      { type: 'table', caption: 'שיעור המימון המרבי לפי סוג הרכישה', head: ['סוג רכישה', 'מימון מרבי', 'הון עצמי מינימלי'], rows: (['firstHome', 'replacementHome', 'additionalHome'] as const).map((t) => [datasets.regulation.maxLtv[t].label, pct0(limits.maxLtv[t]), pct0(1 - limits.maxLtv[t])]) },
      { type: 'table', caption: 'מזומן נדרש ביום הרכישה לדירה ראשונה, בלי תיווך', head: ['מחיר הדירה', 'הון עצמי מינימלי', 'עלויות רכישה', 'סך הכול'], rows: [1_500_000, 2_000_000, 2_500_000, 3_000_000].map((pr) => { const r = eqRow('firstHome', pr); return [formatILS(pr), up(r.minEquityForPrice), up(r.costsTotal), up(r.cashNeeded)]; }) },
    ],
    example: [
      p(`דירה ראשונה ב־₪2,000,000: הון עצמי מינימלי ${up(e2.minEquityForPrice)}, מס רכישה ${formatILS(Math.round(e2.purchaseTax))}, עורך דין ${formatILS(Math.round(e2.lawyer))} (${formatPercent(purchaseCosts.lawyerRate, 1)} ועוד מע"מ), שמאות ופתיחת תיק כ־${formatILS(Math.round(e2.mortgageFees))}. סך הכול ${up(e2.cashNeeded)}, כלומר ${formatPercent(e2.cashShareOfPrice, 1)} ממחיר הדירה.`),
    ],
    limits: ['עלויות עורך הדין והמשכנתא הן הערכות ניתנות לשינוי במחשבון, לא תעריף קבוע. עלויות שיפוץ, מעבר ורהיטים לא כלולות.', 'תיווך (בדרך כלל כ־2% ועוד מע"מ) מתווסף כשנעזרים במתווך.'],
    sources: [src.directive, src.tax],
    updated: [datasets.regulation.maxLtv.firstHome.lastUpdated, datasets.purchaseTax.singleHome.brackets.lastUpdated, datasets.purchaseCosts.lawyerFeeRate.lastUpdated].sort().at(-1)!,
    tool: { href: '/calculators/upfront-costs/', title: 'חשבו את המזומן שצריך', text: 'הון עצמי ועלויות רכישה לפי המחיר וסוג הדירה שלכם.' },
    followUps: [
      { q: 'האם אפשר לממן את עלויות הרכישה במשכנתא?', a: 'לא. המשכנתא מממנת חלק ממחיר הדירה בלבד. מס רכישה ועלויות נלוות משולמים מהון עצמי.' },
      { q: 'מה ההבדל בין דירה ראשונה לחלופית?', a: 'דירה חלופית היא של מי שמוכר דירה קיימת. שיעור המימון בה נמוך יותר, ולכן צריך יותר הון עצמי.' },
    ],
    related: ['kama-mas-rechisha', 'kama-mashkanta-im-maskoret'],
  };

  /* 5. Purchase tax */
  const taxExample = purchaseTax(2_500_000, purchaseTaxBrackets.singleHome);
  const qTax: Question = {
    slug: 'kama-mas-rechisha',
    question: 'כמה מס רכישה משלמים על דירה?',
    metaTitle: 'כמה מס רכישה משלמים על דירה? מדרגות ודוגמה',
    description: `מס רכישה על דירה יחידה ב־2.5 מיליון ₪: ${formatILS(Math.round(taxExample.total))}. מדרגות רשות המסים, דירה נוספת ודוגמה.`,
    short: `על דירה יחידה בשווי ₪2,500,000 מס הרכישה הוא ${formatILS(Math.round(taxExample.total))} (${formatPercent(taxExample.effectiveRate, 2)} מהמחיר). המס מדורג: המדרגה הראשונה פטורה עד ${formatILS(purchaseTaxBrackets.singleHome[0]!.upTo!)}, ומעליה שיעורים עולים. דירה נוספת ממוסה מהשקל הראשון.`,
    data: [
      { type: 'table', caption: `מדרגות מס רכישה לדירה יחידה, בתוקף מ־${hebrewDate(String(purchaseTaxBrackets.validFrom))}`, head: ['עד מחיר', 'שיעור'], rows: purchaseTaxBrackets.singleHome.map((b) => [b.upTo === null ? 'ללא תקרה' : formatILS(b.upTo), formatPercent(b.rate, 1)]) },
      { type: 'table', caption: 'מס רכישה לפי מחיר הדירה', head: ['מחיר הדירה', 'דירה יחידה', 'דירה נוספת'], rows: [1_800_000, 2_500_000, 3_500_000, 5_000_000].map((pr) => [formatILS(pr), formatILS(Math.round(purchaseTax(pr, purchaseTaxBrackets.singleHome).total)), formatILS(Math.round(purchaseTax(pr, purchaseTaxBrackets.additionalHome).total))]) },
    ],
    example: [
      p(`דירה יחידה ב־₪2,500,000: ${taxExample.lines.map((l) => `${formatILS(Math.round(l.taxable))} × ${formatPercent(l.rate, 1)} = ${formatILS(Math.round(l.tax))}`).join('; ')}. סך הכול ${formatILS(Math.round(taxExample.total))}.`),
    ],
    limits: ['לא כולל הקלות לקבוצות מסוימות, כמו עולים חדשים ונכים.', 'מדרגות דירה נוספת הן הוראת שעה. כדאי לבדוק מול רשות המסים לפני עסקה.'],
    sources: [src.tax],
    updated: datasets.purchaseTax.singleHome.brackets.lastUpdated,
    tool: { href: '/calculators/purchase-tax/', title: 'חשבו מס רכישה למחיר שלכם', text: 'פירוט לכל מדרגה, דירה יחידה או נוספת.' },
    followUps: [
      { q: 'מתי משלמים מס רכישה?', a: 'בדרך כלל תוך 60 יום מהחתימה על החוזה, לפי השומה של רשות המסים.' },
      { q: 'האם המדרגות משתנות?', a: 'כן, הן מתעדכנות בהוראות רשות המסים. הנתונים כאן מתייחסים לתאריך העדכון בעמוד.' },
    ],
    related: ['kama-hon-atzmi-ledira', 'kama-mashkanta-im-maskoret'],
  };

  /* 6. Spitzer vs equal principal */
  const sp = spitzerSchedule(1_000_000, rate, 300);
  const ks = equalPrincipalSchedule(1_000_000, rate, 300);
  const qSpitzer: Question = {
    slug: 'shpitzer-o-keren-shava',
    question: 'מה עדיף: שפיצר או קרן שווה?',
    metaTitle: 'שפיצר או קרן שווה? השוואה במספרים',
    description: `במשכנתא של מיליון ₪ ל־25 שנה, קרן שווה חוסכת כ־${formatILS(Math.round(sp.totalInterest - ks.totalInterest))} בריבית, אבל ההחזר הראשון גבוה ב־${formatILS(Math.round(ks.firstPayment - sp.firstPayment))}.`,
    short: `קרן שווה זולה יותר בסך הריבית, שפיצר נוח יותר בהחזר החודשי. במשכנתא של ₪1,000,000 ל־25 שנה בריבית ${formatPercent(rate)}, קרן שווה חוסכת כ־${formatILS(Math.round(sp.totalInterest - ks.totalInterest))} בריבית, אבל ההחזר הראשון בה ${formatILS(Math.round(ks.firstPayment))} לעומת ${formatILS(Math.round(sp.firstPayment))} בשפיצר. הבחירה נקבעת לפי ההחזר שנוח לעמוד בו היום.`,
    data: [
      { type: 'table', caption: `₪1,000,000, 25 שנה, ריבית ${formatPercent(rate)}`, head: ['', 'שפיצר', 'קרן שווה'], rows: [
        ['החזר ראשון', formatILS(Math.round(sp.firstPayment)), formatILS(Math.round(ks.firstPayment))],
        ['החזר אחרון', formatILS(Math.round(sp.lastPayment)), formatILS(Math.round(ks.lastPayment))],
        ['סך הריבית', formatILS(Math.round(sp.totalInterest)), formatILS(Math.round(ks.totalInterest))],
        ['סך כל התשלומים', formatILS(Math.round(sp.totalPaid)), formatILS(Math.round(ks.totalPaid))],
      ] },
    ],
    example: [
      p(`בשפיצר משלמים ${formatILS(Math.round(sp.firstPayment))} כל חודש. בקרן שווה מתחילים ב־${formatILS(Math.round(ks.firstPayment))} ויורדים ל־${formatILS(Math.round(ks.lastPayment))}. הפרש ההחזר הראשון, ${formatILS(Math.round(ks.firstPayment - sp.firstPayment))}, הוא המחיר החודשי של החיסכון בריבית.`),
    ],
    limits: ['ההשוואה בריבית קבועה ובלי הצמדה. במסלול צמוד שני החלקים משתנים עם המדד.', 'אפשר לשלב: שיטה שונה לכל מסלול.'],
    sources: [src.rates],
    updated: ratesUpdated,
    tool: { href: '/calculators/amortization/', title: 'לוח סילוקין שנה אחר שנה', text: 'השוו שפיצר וקרן שווה לפי הסכום, הריבית והתקופה שלכם.' },
    followUps: [
      { q: 'למה בשפיצר רוב ההחזר בהתחלה הוא ריבית?', a: 'כי הריבית מחושבת על היתרה, והיתרה בהתחלה גבוהה. עם הזמן חלק הקרן בהחזר גדל.' },
      { q: 'מי מקבל קל יותר אישור?', a: 'קרן שווה מתחילה בהחזר גבוה יותר, ולכן יחס ההחזר להכנסה בה גבוה יותר בשנים הראשונות. שפיצר קל יותר לאישור.' },
    ],
    related: ['hachzar-hodshi-mashkanta-million', 'ha-im-mishtale-lifroa-mashkanta'],
  };

  /* 7. Monthly payment on 1M */
  const qMonthly: Question = {
    slug: 'hachzar-hodshi-mashkanta-million',
    question: 'מה ההחזר החודשי על משכנתא של מיליון שקל?',
    metaTitle: 'החזר חודשי על משכנתא של מיליון שקל: טבלה',
    description: `משכנתא של מיליון ₪ ל־25 שנה בריבית ${formatPercent(rate)}: ${formatILS(Math.round(payment(1_000_000, rate, 300)))} בחודש. טבלה לפי ריבית ותקופה.`,
    short: `משכנתא של ₪1,000,000 ל־25 שנה בריבית ${formatPercent(rate)} (בשפיצר) עולה כ־${formatILS(Math.round(payment(1_000_000, rate, 300)))} בחודש, וסך הריבית לאורך התקופה ${formatILS(Math.round(spitzerSchedule(1_000_000, rate, 300).totalInterest))}. כל נקודת אחוז בריבית משנה את ההחזר בכ־${formatILS(Math.round(payment(1_000_000, rate + 0.01, 300) - payment(1_000_000, rate, 300)))}.`,
    data: [
      { type: 'table', caption: 'החזר חודשי בשפיצר על ₪1,000,000', head: ['ריבית', '20 שנה', '25 שנה', '30 שנה'], rows: [rate - 0.01, rate, rate + 0.01, rate + 0.02].map((r) => [formatPercent(r), ...[240, 300, 360].map((m) => formatILS(Math.round(payment(1_000_000, r, m))))]) },
    ],
    example: [
      p(`בריבית ${formatPercent(rate)}: 20 שנה ${formatILS(Math.round(payment(1_000_000, rate, 240)))}, 30 שנה ${formatILS(Math.round(payment(1_000_000, rate, 360)))}. הארכה מ־20 ל־30 שנה מורידה את ההחזר בכ־${formatILS(Math.round(payment(1_000_000, rate, 240) - payment(1_000_000, rate, 360)))}, אבל מגדילה את סך הריבית.`),
    ],
    limits: ['ריבית קבועה ובלי הצמדה למדד. במסלול צמוד ובמסלולים משתנים ההחזר משתנה עם הזמן.', 'משכנתא אמיתית היא בדרך כלל תמהיל של כמה מסלולים בריביות שונות.'],
    sources: [src.rates],
    updated: ratesUpdated,
    tool: { href: '/calculators/monthly-payment/', title: 'חשבו את ההחזר שלכם', text: 'סכום, ריבית ותקופה, עם השוואה לקרן שווה.' },
    followUps: [
      { q: 'כמה הכנסה צריך כדי לעמוד בהחזר כזה?', a: `בחישוב שמרני של ${formatNumber(limits.recommendedPaymentToIncome * 100)}% מההכנסה נטו, החזר של ${formatILS(Math.round(payment(1_000_000, rate, 300)))} מתאים להכנסה של כ־${formatILS(Math.ceil(payment(1_000_000, rate, 300) / limits.recommendedPaymentToIncome / 500) * 500)} נטו.` },
    ],
    related: ['kama-mashkanta-im-maskoret', 'kama-oleh-hatzmada-lamadad'],
  };

  /* 8. CPI linkage */
  const idx = (g: number) => indexedSpitzer(1_000_000, 0.03, 300, g);
  const qCpi: Question = {
    slug: 'kama-oleh-hatzmada-lamadad',
    question: 'כמה עולה ההצמדה למדד במשכנתא?',
    metaTitle: 'כמה עולה הצמדה למדד במשכנתא? השוואה',
    description: `בהלוואה צמודה של מיליון ₪ ל־25 שנה בריבית ריאלית 3%, אינפלציה של 2% בשנה מוסיפה כ־${formatILS(Math.round(idx(0.02).totalPaid - idx(0.02).unindexedTotal))} לסך התשלומים. טבלה לפי אינפלציה.`,
    short: `במסלול צמוד, הקרן וההחזר עולים עם מדד המחירים לצרכן. בהלוואה של ₪1,000,000 ל־25 שנה בריבית ריאלית 3%, אינפלציה קבועה של 2% בשנה מגדילה את סך התשלומים ב־${formatILS(Math.round(idx(0.02).totalPaid - idx(0.02).unindexedTotal))}, והחזר בסוף התקופה גבוה בכ־${formatPercent(idx(0.02).lastPayment / idx(0.02).firstPayment - 1, 0)} מההחזר הראשון. באינפלציה של 4% ההפרש כבר ${formatILS(Math.round(idx(0.04).totalPaid - idx(0.04).unindexedTotal))}.`,
    data: [
      { type: 'table', caption: '₪1,000,000, 25 שנה, ריבית ריאלית 3%, אינפלציה קבועה', head: ['אינפלציה', 'החזר ראשון', 'החזר אחרון', 'סך התשלומים', 'תוספת בגלל ההצמדה'], rows: [0, 0.02, 0.04, 0.06].map((g) => { const r = idx(g); return [formatPercent(g, 0), formatILS(Math.round(r.firstPayment)), formatILS(Math.round(r.lastPayment)), formatILS(Math.round(r.totalPaid)), formatILS(Math.round(r.totalPaid - r.unindexedTotal))]; }) },
    ],
    example: [
      p('באינפלציה של 2% בשנה, ההחזר החודשי בהלוואה צמודה עולה בהדרגה. ה"תוספת" היא ההפרש בסך התשלומים לעומת אותה הלוואה ללא הצמדה, ולא עלות נוספת בערך ריאלי: היא משקפת בעיקר את שחיקת הכסף.'),
    ],
    limits: ['הסימולציה מניחה אינפלציה קבועה, ובפועל המדד משתנה מחודש לחודש. אי אפשר לחזות אותו.', 'הכנסה של רוב המשקי הבית גם היא צמודה לאינפלציה בטווח ארוך, ולכן ההחזר הריאלי מהכנסה יציב יותר מהמספר הנומינלי.'],
    sources: [src.cbs, src.rates],
    updated: ratesUpdated,
    tool: { href: '/calculators/cpi-linkage/', title: 'הריצו הצמדה לפי אינפלציה שתבחרו', text: 'ראו את ההחזר והסכום הכולל בתרחישים שונים.' },
    followUps: [
      { q: 'האם הצמדה היא בהכרח רעה?', a: 'לא. הריבית במסלול צמוד נמוכה יותר, והכנסה שעולה עם המחירים מקזזת חלק מהעלייה. הסיכון הוא אינפלציה גבוהה מהצפוי.' },
      { q: 'איפה רואים את שיעור האינפלציה?', a: 'הלשכה המרכזית לסטטיסטיקה מפרסמת את המדד בכל 15 לחודש.' },
    ],
    related: ['hachzar-hodshi-mashkanta-million', 'ribit-mashkanta-memutza'],
  };

  /* 9. Is partial prepayment worth it */
  const pp = partialPrepayment({ balance: 800_000, annualRate: rate, monthsRemaining: 240, lumpSum: 100_000 });
  const qPrepay: Question = {
    slug: 'ha-im-mishtale-lifroa-mashkanta',
    question: 'האם משתלם לפרוע משכנתא מוקדם?',
    metaTitle: 'האם משתלם לפרוע משכנתא מוקדם? קיצור או הקטנה',
    description: `פירעון חלקי של ₪100,000 ממשכנתא של ₪800,000 מקצר את התקופה ב־${formatDuration(pp.shorten.monthsSaved)} וחוסך כ־${formatILS(Math.round(pp.shorten.interestSaved))} בריבית. חישוב ומחשבון.`,
    short: `פירעון חלקי כמעט תמיד חוסך ריבית, וכדאי אם הריבית במשכנתא גבוהה מהתשואה הצפויה מהכסף ואם עמלת הפירעון נמוכה. בדוגמה, פירעון של ₪100,000 ממשכנתא של ₪800,000 (${formatPercent(rate)}, 20 שנה שנותרו) בקיצור התקופה חוסך ${formatILS(Math.round(pp.shorten.interestSaved))} ומקצר ${formatDuration(pp.shorten.monthsSaved)}. בהקטנת ההחזר החיסכון בריבית ${formatILS(Math.round(pp.lower.interestSaved))}, וההחזר יורד ב־${formatILS(Math.round(pp.lower.monthlySaving))}.`,
    data: [
      { type: 'table', caption: `פירעון חלקי של ₪100,000 ממשכנתא של ₪800,000, ריבית ${formatPercent(rate)}, 20 שנה שנותרו`, head: ['', 'קיצור התקופה', 'הקטנת ההחזר'], rows: [
        ['החזר חודשי אחרי', formatILS(Math.round(pp.currentPayment)), formatILS(Math.round(pp.lower.payment))],
        ['תקופה שנותרה', formatDuration(pp.shorten.months), formatDuration(240)],
        ['חיסכון בריבית', formatILS(Math.round(pp.shorten.interestSaved)), formatILS(Math.round(pp.lower.interestSaved))],
      ] },
    ],
    example: [
      p(`ללא פירעון ההחזר הוא ${formatILS(Math.round(pp.currentPayment))} ל־240 חודשים, עם סך ריבית ${formatILS(Math.round(pp.currentInterest))}. אחרי פירעון של ₪100,000 אפשר להמשיך באותו החזר ולסיים ${formatDuration(pp.shorten.monthsSaved)} מוקדם יותר, או להישאר באותה תקופה ולשלם פחות בחודש.`),
    ],
    limits: ['לא כולל עמלת פירעון מוקדם, שתלויה במסלולים ויכולה לבטל את החיסכון במסלול קבוע.', 'לפני פירעון כדאי להשאיר כרית נזילות, ולהשוות לתשואה חלופית על הכסף.'],
    sources: [src.fee, src.rates],
    updated: [datasets.prepaymentFee.operationalFee.lastUpdated, ratesUpdated].sort().at(-1)!,
    tool: { href: '/calculators/partial-prepayment/', title: 'בדקו את הפירעון שלכם', text: 'קיצור תקופה מול הקטנת החזר לפי הסכום שלכם.' },
    followUps: [
      { q: 'מה עדיף, לקצר או להקטין את ההחזר?', a: 'קיצור התקופה חוסך יותר ריבית. הקטנת ההחזר משחררת תזרים חודשי ומשאירה גמישות. הבחירה תלויה במה חשוב לכם.' },
      { q: 'באילו מסלולים העמלה גבוהה?', a: 'בעיקר בריבית קבועה. בפריים ובמשתנה העמלה נמוכה.' },
    ],
    related: ['kama-ole-mihzur-mashkanta', 'shpitzer-o-keren-shava'],
  };

  return [qRefiCost, qRate, qIncome, qEquity, qTax, qSpitzer, qMonthly, qCpi, qPrepay];
}

/** Titles only, for link lists that must not compute everything (kept in sync by the build). */
export const QUESTION_TITLES: Record<string, string> = {
  'kama-ole-mihzur-mashkanta': 'כמה עולה מחזור משכנתא?',
  'ribit-mashkanta-memutza': 'מה ריבית המשכנתא הממוצעת היום?',
  'kama-mashkanta-im-maskoret': 'כמה משכנתא אפשר לקבל לפי הכנסה?',
  'kama-hon-atzmi-ledira': 'כמה הון עצמי צריך לקנות דירה?',
  'kama-mas-rechisha': 'כמה מס רכישה משלמים על דירה?',
  'shpitzer-o-keren-shava': 'מה עדיף: שפיצר או קרן שווה?',
  'hachzar-hodshi-mashkanta-million': 'מה ההחזר החודשי על משכנתא של מיליון שקל?',
  'kama-oleh-hatzmada-lamadad': 'כמה עולה ההצמדה למדד במשכנתא?',
  'ha-im-mishtale-lifroa-mashkanta': 'האם משתלם לפרוע משכנתא מוקדם?',
};
