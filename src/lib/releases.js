// Releases are read from GitHub at build time, so the changelog and the "latest version"
// shown on the site are always real. Fails soft: the site still builds without them.

import { SITE } from '../config/site.js';

let cache = null;

function firstLine(text) {
  const line = (text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[#*_`>]/g, '').trim())
    .find(Boolean);
  return line ? line.slice(0, 160) : '';
}

export async function getReleases() {
  if (cache) return cache;
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'iweb-landing-build' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${SITE.releasesRepo}/releases?per_page=30`, { headers });
    if (!res.ok) throw new Error(`GitHub releases: HTTP ${res.status}`);
    const list = await res.json();
    cache = list
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => ({
        tag: r.tag_name,
        name: r.name || r.tag_name,
        date: r.published_at,
        url: r.html_url,
        summary: firstLine(r.body),
        zipUrl: r.assets?.find((a) => a.name === 'iWeb.Extension.zip')?.browser_download_url || null,
      }));
  } catch (err) {
    console.warn('[releases] using no release data:', err.message);
    cache = [];
  }
  return cache;
}

export async function getLatestRelease() {
  const releases = await getReleases();
  return releases[0] || null;
}

export function formatReleaseDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}
