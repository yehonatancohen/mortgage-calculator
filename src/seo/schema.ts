/** schema.org JSON-LD builders. All URLs are absolute, built from SITE.url. */
import { SITE } from '../config/site';

export interface Crumb {
  name: string;
  path: string;
}

const abs = (path: string) => new URL(path, SITE.url).href;
const orgId = () => abs('/#organization');

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': orgId(),
  name: SITE.brand,
  url: abs('/'),
  logo: abs('/icon-512.png'),
  description: SITE.tagline,
  email: SITE.contactEmail,
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#website'),
  name: SITE.brand,
  url: abs('/'),
  inLanguage: 'he-IL',
  publisher: { '@id': orgId() },
});

export const breadcrumbLd = (crumbs: Crumb[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
});

export const webApplicationLd = (o: { name: string; description: string; path: string; dateModified: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: o.name,
  description: o.description,
  url: abs(o.path),
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  inLanguage: 'he-IL',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
  dateModified: o.dateModified,
  publisher: { '@id': orgId() },
});

export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
});

export const articleLd = (o: { headline: string; description: string; path: string; datePublished: string; dateModified: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: o.headline,
  description: o.description,
  url: abs(o.path),
  mainEntityOfPage: abs(o.path),
  inLanguage: 'he-IL',
  datePublished: o.datePublished,
  dateModified: o.dateModified,
  author: { '@type': 'Person', name: SITE.editorial.author.name, jobTitle: SITE.editorial.author.title },
  reviewedBy: { '@type': 'Person', name: SITE.editorial.reviewer.name, jobTitle: SITE.editorial.reviewer.title },
  publisher: { '@id': orgId() },
});

export const datasetLd = (o: { name: string; description: string; path: string; dateModified: string; temporalCoverage: string; sourceUrl: string; variables: string[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: o.name,
  description: o.description,
  url: abs(o.path),
  inLanguage: 'he-IL',
  dateModified: o.dateModified,
  temporalCoverage: o.temporalCoverage,
  isBasedOn: o.sourceUrl,
  variableMeasured: o.variables,
  license: abs('/terms/'),
  creator: { '@id': orgId() },
  isAccessibleForFree: true,
});
