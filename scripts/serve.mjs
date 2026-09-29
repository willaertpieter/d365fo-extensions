/**
 * Serves _site/ on http://localhost:4000/d365fo-extensions/, the same path as
 * on GitHub Pages, so relative links behave the same.
 *
 *   node scripts/build.mjs && node scripts/serve.mjs
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../_site', import.meta.url));
const base = '/d365fo-extensions/';
const port = Number(process.env.PORT) || 4000;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.zip': 'application/zip',
};

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!url.startsWith(base)) {
    res.writeHead(302, { Location: base }).end();
    return;
  }
  let file = normalize(join(site, url.slice(base.length)));
  if (!file.startsWith(site)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.endsWith('/')) return res.writeHead(301, { Location: `${url}/` }).end();
    file = join(file, 'index.html');
  }
  const found = existsSync(file);
  res.writeHead(found ? 200 : 404, { 'Content-Type': types[extname(found ? file : '.html')] || 'application/octet-stream' });
  res.end(readFileSync(found ? file : join(site, '404.html')));
}).listen(port, () => console.log(`http://localhost:${port}${base}`));
