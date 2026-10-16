// Single source of truth for names, URLs and links. Change the product name or move to a
// custom domain here; every page, meta tag, sitemap entry and JSON-LD block follows.

export const SITE = {
  name: 'iWeb',
  descriptor: 'macOS-style New Tab Dashboard for Chrome',
  tagline: 'Your new tab, reimagined.',
  url: 'https://iweb-landing.vercel.app',
  locale: 'en_IN',
  themeColor: '#0b0b0f',

  // Install: the Chrome Web Store URL replaces the manual guide once published.
  chromeWebStoreUrl: null,
  releasesRepo: '2k-Aakaash/iWeb',
  sourceRepo: '2k-Aakaash/iweb-react',
  demoUrl: 'https://iweb-two.vercel.app',

  author: {
    name: '2K Aakaash',
    url: 'https://2k-aakaash.vercel.app',
    github: 'https://github.com/2k-Aakaash',
  },
};

export const LINKS = {
  github: `https://github.com/${SITE.sourceRepo}`,
  releases: `https://github.com/${SITE.releasesRepo}/releases`,
  latestRelease: `https://github.com/${SITE.releasesRepo}/releases/latest`,
  install: SITE.chromeWebStoreUrl || '/install',
  issues: `https://github.com/${SITE.sourceRepo}/issues`,
};

export const NAV = [
  { href: '/features/smart-stack', label: 'Smart Stack' },
  { href: '/features/markets', label: 'Markets' },
  { href: '/features/spotlight', label: 'Spotlight' },
  { href: '/features/wallpapers', label: 'Wallpapers' },
  { href: '/changelog', label: 'Changelog' },
];
