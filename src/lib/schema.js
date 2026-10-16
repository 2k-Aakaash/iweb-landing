// JSON-LD builders (schema.org). Kept in one place so every page describes the product the
// same way.

import { SITE, LINKS } from '../config/site.js';

const abs = (path) => new URL(path, SITE.url).href;

export function personSchema() {
  return {
    '@type': 'Person',
    '@id': `${SITE.author.url}#person`,
    name: SITE.author.name,
    url: SITE.author.url,
    sameAs: [SITE.author.github],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: `${SITE.name}: ${SITE.descriptor}`,
    publisher: personSchema(),
  };
}

export function softwareSchema(latest) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    alternateName: `${SITE.name} New Tab`,
    description: 'A macOS-style new tab dashboard for Chrome with widgets, Spotlight search, markets, wallpapers and music. Free, open source and private by design.',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome, Microsoft Edge, Brave',
    url: SITE.url,
    downloadUrl: SITE.chromeWebStoreUrl || LINKS.latestRelease,
    installUrl: abs('/install'),
    isAccessibleForFree: true,
    license: 'https://github.com/' + SITE.sourceRepo,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    author: personSchema(),
  };
  if (latest?.tag) {
    data.softwareVersion = latest.tag.replace(/^v/, '');
    if (latest.date) data.dateModified = latest.date;
  }
  return data;
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: abs(item.href),
    })),
  };
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}
