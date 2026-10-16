import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config/site.js';

// Static output: every page is plain HTML (fully indexable without JavaScript).
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404') })],
});
