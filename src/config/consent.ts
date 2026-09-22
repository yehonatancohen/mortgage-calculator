/**
 * Consent wording shown in the lead forms. The version is stored with every lead,
 * so bump it whenever the wording changes. Have a lawyer review before launch.
 */
export const CONSENT = {
  version: '2026-09-22',
  contact: 'אני מאשר/ת שיועץ משכנתאות עצמאי אחד יחזור אליי בטלפון לגבי הבדיקה.',
  marketing: 'אשמח לקבל עדכונים על ריביות ומחזור (אפשר לבטל בכל עת).',
  alert: 'נשלח לך הודעה כשמחזור יהיה משתלם לך. אפשר לבטל בכל עת.',
} as const;

/** What happens after a refinance lead is sent. Operational promise: edit to match reality. */
export const NEXT_STEPS = {
  callWithin: 'תוך יום עסקים אחד',
  steps: ['היועץ עובר על הנתונים שהזנת.', 'הוא מתקשר אליך מהמספר שלו לשיחה קצרה.', 'אם יש מה לשפר, תקבל/י ממנו דוח מפורט עם הצעה.'],
} as const;
