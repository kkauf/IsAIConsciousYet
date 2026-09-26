// Tell search engines (Bing, Yandex and others via IndexNow) that pages changed.
// Usage: node pipeline/indexnow.mjs [--dry-run] [url ...]
// With no URLs it submits the homepage, /cases and every published case file.
// The key is public by design: it is served at keyLocation so the engines can verify the host.
import { readdirSync, readFileSync } from 'node:fs';

const HOST = 'isaiconsciousyet.com';
const SITE = `https://${HOST}`;
const KEY = '7678bfa32176f8b4f487413cd5bd5c3b';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let urls = args.filter((a) => a !== '--dry-run');
if (!urls.length) {
  const dir = new URL('../content/cases/', import.meta.url);
  const slugs = readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .filter((c) => c.status === 'published').map((c) => c.slug);
  urls = [SITE, `${SITE}/cases`, ...slugs.map((s) => `${SITE}/cases/${s}`)];
}

const payload = { host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls };
if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload),
  });
  console.log(`IndexNow ${res.status} ${res.statusText}: ${urls.length} URLs`);
  if (!res.ok) process.exit(1);
}
