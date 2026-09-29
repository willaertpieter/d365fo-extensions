/**
 * Builds the static site into _site/.
 *
 *   node scripts/build.mjs
 *
 * Input:
 *   site.config.json              site title, description and public URL
 *   extensions/<slug>/
 *     extension.json              tagline, status, order, highlights, store links,
 *                                 screenshot captions, permission explanations
 *     README.md                   the description on the extension's page
 *     CHANGELOG.md                optional, shown under "What's new"
 *     releases/*.zip              the packages; the highest manifest version is "latest"
 *     screenshots/*.png           optional, listed in extension.json
 *   site/                         stylesheet, script and images, copied as they are
 *
 * Everything about a release (name, version, icon, permissions, minimum browser
 * version) is read from the manifest.json inside its zip, so publishing a new
 * version is: drop the zip in releases/, push.
 *
 * No dependencies: runs on a plain Node 20+.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, '_site');
const config = readJson(join(root, 'site.config.json'));

// ---------------------------------------------------------------------------
// Helpers

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const slugify = (s) =>
  s.toLowerCase().replace(/<[^>]+>|[`*]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The 11-character video ID from any YouTube address: watch, youtu.be, shorts, embed or live. */
function youtubeId(url) {
  return /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/.exec(url)?.[1] || null;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** The date a file was last committed, or its modification date outside git. */
function fileDate(path) {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', path], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (date) return date;
  } catch {
    // Not a git checkout: fall through.
  }
  return statSync(path).mtime.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Zip reading: just enough to pull manifest.json and the icon out of a package.

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('damaged zip central directory');
    const nameLength = buf.readUInt16LE(p + 28);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLength).replace(/\\/g, '/');
    entries.set(name, { method: buf.readUInt16LE(p + 10), size: buf.readUInt32LE(p + 20), offset: buf.readUInt32LE(p + 42) });
    p += 46 + nameLength + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return {
    names: [...entries.keys()],
    read(name) {
      const e = entries.get(name);
      if (!e) return null;
      const start = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
      const data = buf.subarray(start, start + e.size);
      if (e.method === 0) return Buffer.from(data);
      if (e.method === 8) return inflateRawSync(data);
      throw new Error(`unsupported compression method ${e.method} for ${name}`);
    },
  };
}

function readPackage(path) {
  const buf = readFileSync(path);
  const zip = readZip(buf);
  // The manifest is at the root, or inside one top-level folder.
  const manifestName = zip.names
    .filter((n) => n === 'manifest.json' || n.endsWith('/manifest.json'))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0];
  if (!manifestName) throw new Error('no manifest.json in the zip');
  const prefix = manifestName.slice(0, -'manifest.json'.length);
  const manifest = JSON.parse(zip.read(manifestName).toString('utf8').replace(/^﻿/, ''));

  // Resolve __MSG_name__ strings from the default locale.
  const locale = manifest.default_locale && zip.read(`${prefix}_locales/${manifest.default_locale}/messages.json`);
  const messages = locale ? JSON.parse(locale.toString('utf8').replace(/^﻿/, '')) : {};
  const msg = (s) =>
    typeof s === 'string' ? s.replace(/__MSG_(\w+)__/g, (m, key) => {
      const hit = Object.entries(messages).find(([k]) => k.toLowerCase() === key.toLowerCase());
      return hit ? hit[1].message : m;
    }) : s;

  const icons = manifest.icons || {};
  const iconSize = Object.keys(icons).map(Number).sort((a, b) => b - a)[0];
  return {
    manifest: { ...manifest, name: msg(manifest.name), description: msg(manifest.description) },
    icon: iconSize ? zip.read(prefix + icons[iconSize].replace(/^\//, '')) : null,
    size: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
}

// ---------------------------------------------------------------------------
// Markdown: the subset the extension descriptions use (headings, paragraphs,
// lists, tables, code, block quotes, bold, italics, links).

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) =>
      /^https?:/.test(url) ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : `<a href="${url}">${label}</a>`);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
}

function markdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blank = (l) => !l.trim();
  const listItem = /^\s*([-*]|\d+\.)\s+(.*)$/;
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (blank(line)) {
      i++;
    } else if (line.startsWith('```')) {
      const code = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    } else if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      const level = m[1].length;
      html.push(`<h${level} id="${slugify(m[2])}">${inline(m[2])}</h${level}>`);
      i++;
    } else if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i]));
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
      );
    } else if ((m = listItem.exec(line))) {
      const tag = /\d/.test(m[1]) ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && (m = listItem.exec(lines[i]))) {
        let item = m[2];
        for (i++; i < lines.length && /^\s{2,}\S/.test(lines[i]) && !listItem.test(lines[i]); i++) item += ` ${lines[i].trim()}`;
        items.push(`<li>${inline(item)}</li>`);
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
    } else if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote>${markdown(quote.join('\n'))}</blockquote>`);
    } else {
      const para = [line.trim()];
      for (i++; i < lines.length && !blank(lines[i]) && !/^(#{1,6}\s|```|\s*\||>)/.test(lines[i]) && !listItem.test(lines[i]); i++) {
        para.push(lines[i].trim());
      }
      html.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return html.join('\n');
}

// ---------------------------------------------------------------------------
// Permissions, in words a D365 user understands.

const PERMISSION_TEXT = {
  activeTab: 'Access to the current tab, only while you use the extension on it.',
  alarms: 'Runs a task on a schedule.',
  clipboardWrite: 'Copies text to the clipboard.',
  contextMenus: 'Adds an item to the right-click menu.',
  downloads: 'Saves files to your computer.',
  notifications: 'Shows notifications.',
  scripting: "Runs the extension's own script in a page.",
  sidePanel: "Shows the extension in the browser's side panel.",
  storage: "Saves the extension's settings in your browser.",
  tabs: 'Sees the address and title of your open tabs.',
};

const isD365Host = (pattern) => /dynamics\.com|microsoftdynamics\.us/.test(pattern);

function permissionRows(manifest, explained = {}) {
  const rows = [];
  const add = (name, text, optional) => rows.push({ name, text, optional });
  for (const p of manifest.permissions || []) add(p, explained[p] || PERMISSION_TEXT[p] || '', false);
  for (const p of manifest.optional_permissions || []) add(p, explained[p] || PERMISSION_TEXT[p] || '', true);

  const hosts = manifest.host_permissions || [];
  if (hosts.length) {
    const d365 = hosts.every(isD365Host);
    add(
      d365 ? 'Dynamics 365 F&O sites' : 'Site access',
      `${d365 ? 'Runs on D365 Finance & Operations pages only, and reads D365 with your own session.' : 'Runs on these sites.'}` +
        `<details><summary>${hosts.length} address pattern${hosts.length === 1 ? '' : 's'}</summary><ul class="hosts">${hosts
          .map((h) => `<li><code>${escapeHtml(h)}</code></li>`)
          .join('')}</ul></details>`,
      false,
    );
  }
  const optionalHosts = manifest.optional_host_permissions || [];
  if (optionalHosts.length) {
    add('Other sites', 'Grants nothing by itself. The browser asks you per site, only when you enable the extension on an address outside the list above.', true);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Load the extensions.

const extensionsDir = join(root, 'extensions');
const extensions = readdirSync(extensionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
  .map(({ name: slug }) => {
    const dir = join(extensionsDir, slug);
    const meta = existsSync(join(dir, 'extension.json')) ? readJson(join(dir, 'extension.json')) : {};
    const releasesDir = join(dir, 'releases');
    const zips = existsSync(releasesDir) ? readdirSync(releasesDir).filter((f) => f.toLowerCase().endsWith('.zip')) : [];
    if (!zips.length) fail(`extensions/${slug}/releases/ has no .zip file`);

    const releases = zips
      .map((file) => {
        const path = join(releasesDir, file);
        let pkg;
        try {
          pkg = readPackage(path);
        } catch (e) {
          fail(`extensions/${slug}/releases/${file}: ${e.message}`);
        }
        return { file, path, date: fileDate(path), ...pkg, version: pkg.manifest.version, download: `downloads/${slug}/${file}` };
      })
      .sort((a, b) => compareVersions(b.version, a.version));

    const seen = new Set();
    for (const r of releases) {
      if (seen.has(r.version)) fail(`extensions/${slug}/releases/ has two zips with version ${r.version}`);
      seen.add(r.version);
    }

    const latest = releases[0];
    const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
    return {
      slug,
      dir,
      name: meta.name || latest.manifest.short_name || latest.manifest.name,
      tagline: meta.tagline || latest.manifest.description || '',
      status: meta.status || (compareVersions(latest.version, '1.0.0') < 0 ? 'beta' : 'stable'),
      order: meta.order ?? 999,
      highlights: meta.highlights || [],
      store: meta.store || {},
      videos: (meta.videos || []).map((v) => {
        const id = youtubeId(v.url);
        if (!id) fail(`extensions/${slug}/extension.json: not a YouTube video address: ${v.url}`);
        return { id, title: v.title || '', vertical: v.vertical ?? /\/shorts\//.test(v.url) };
      }),
      screenshots: (meta.screenshots || []).filter((s) => {
        const ok = existsSync(join(dir, 'screenshots', s.file));
        if (!ok) console.warn(`build: extensions/${slug}/screenshots/${s.file} not found, skipped`);
        return ok;
      }),
      permissions: permissionRows(latest.manifest, meta.permissions),
      readme: markdown(read('README.md')),
      changelog: markdown(read('CHANGELOG.md')),
      releases,
      latest,
      minimumBrowser: latest.manifest.minimum_chrome_version || '',
    };
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Page parts

const LOGO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-2 .9-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20c0 1.1.9 2 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>`;

const ICONS = {
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  browser: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6.5" cy="6.5" r=".8" fill="currentColor"/><circle cx="9" cy="6.5" r=".8" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1 11H5L4 9zm4 0V7a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

const statusBadge = (status) =>
  `<span class="badge badge-${status === 'beta' ? 'beta' : 'stable'}">${status === 'beta' ? 'Beta' : 'Stable'}</span>`;

function layout({ title, description, depth, body, nav }) {
  const r = depth ? '../'.repeat(depth) : './';
  const fullTitle = title ? `${title} · ${config.title}` : config.title;
  return `<!doctype html>
<html lang="en" data-browser="edge">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description || config.description)}">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description || config.description)}">
<meta property="og:type" content="website">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${r}assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/style.css">
<script src="${r}assets/site.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${r}"><span class="brand-mark">${LOGO}</span><span class="brand-name">${escapeHtml(config.title)}</span></a>
    <nav class="site-nav" aria-label="Main">
      <a href="${r}#extensions"${nav === 'home' ? ' aria-current="page"' : ''}>Extensions</a>
      <a href="${r}install/"${nav === 'install' ? ' aria-current="page"' : ''}>Install guide</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand"><span class="brand-mark small">${LOGO}</span> ${escapeHtml(config.title)}</div>
    <p>Free extensions for Dynamics 365 Finance &amp; Operations. Not affiliated with or endorsed by Microsoft. Microsoft, Dynamics 365 and Microsoft Edge are trademarks of the Microsoft group of companies; Chrome is a trademark of Google LLC.</p>
    <p class="footer-links"><a href="${r}install/">Install guide</a> · <a href="${r}catalog.json">catalog.json</a></p>
  </div>
</footer>
<dialog class="lightbox" id="lightbox"><form method="dialog"><button class="lightbox-close" aria-label="Close">×</button></form><img alt=""><p class="lightbox-caption"></p></dialog>
</body>
</html>
`;
}

function copyField(label) {
  return `<span class="copy-field"><code data-ext-url>edge://extensions</code><button type="button" class="copy-btn" data-copy-ext aria-label="Copy ${label}">${ICONS.copy}<span>Copy</span></button></span>`;
}

function browserTabs() {
  return `<div class="browser-tabs" role="tablist" aria-label="Your browser">
    <button type="button" role="tab" data-browser-tab="edge" aria-selected="true">Microsoft Edge</button>
    <button type="button" role="tab" data-browser-tab="chrome" aria-selected="false">Google Chrome</button>
  </div>
  <p class="unsupported-note" hidden>These extensions run in <strong>Microsoft Edge</strong> and <strong>Google Chrome</strong>. Open this page in one of those browsers to install.</p>`;
}

function installSteps(ext) {
  const name = ext ? escapeHtml(ext.name) : 'the extension';
  const folder = ext ? `Documents\\D365 extensions\\${escapeHtml(ext.name.replace(/[\\/:*?"<>|]/g, ''))}` : 'Documents\\D365 extensions\\&lt;extension name&gt;';
  return `<ol class="steps">
  <li><h4>Unzip it to a folder that stays</h4>
    <p>Right-click the downloaded zip, choose <strong>Extract All…</strong> and extract it to a permanent folder, for example <code>${folder}</code>. Don't use Downloads or a temporary folder: the browser runs the extension from this folder, and your settings belong to it.</p></li>
  <li><h4>Open the extensions page</h4>
    <p>Paste this address into the address bar: ${copyField('the extensions page address')}</p>
    <p class="hint">Browsers don't let websites link to this page, so it has to be pasted.</p></li>
  <li><h4>Turn on Developer mode</h4>
    <p><span class="only-edge">The switch is in the left pane, near the bottom. If the left pane is hidden, click the ☰ menu first.</span><span class="only-chrome">The switch is at the top right of the page.</span></p></li>
  <li><h4>Click <em>Load unpacked</em></h4>
    <p>Select the folder from step 1, the one that contains <code>manifest.json</code>. ${name} now appears in the list.</p></li>
  <li><h4>Pin it to the toolbar</h4>
    <p><span class="only-edge">Click the Extensions icon (the puzzle piece) in the toolbar, then the eye icon next to ${name}.</span><span class="only-chrome">Click the Extensions icon (the puzzle piece) in the toolbar, then the pin next to ${name}.</span> Optional, but it keeps the icon in reach.</p></li>
  <li><h4>Reload your D365 tabs</h4>
    <p>Press <kbd>F5</kbd> in any D365 tab that was already open, so the extension can start there.</p></li>
</ol>`;
}

function updateSteps(ext) {
  const name = ext ? escapeHtml(ext.name) : 'the extension';
  return `<ol class="steps compact">
  <li><h4>Download the new zip</h4><p>From ${ext ? 'the button above' : "the extension's page"}.</p></li>
  <li><h4>Extract it into the same folder</h4><p>Choose the folder you installed from and let Windows <strong>replace the files</strong>. Keeping the same folder keeps your settings.</p></li>
  <li><h4>Reload the extension</h4><p>Open ${copyField('the extensions page address')} and click the reload icon ↻ on the ${name} card.</p></li>
  <li><h4>Reload your D365 tabs</h4><p>Press <kbd>F5</kbd> in open D365 tabs, so they run the new version.</p></li>
</ol>`;
}

function extensionCard(ext) {
  return `<article class="ext-card">
  <a class="ext-card-link" href="extensions/${ext.slug}/" aria-label="${escapeHtml(ext.name)}: details"></a>
  <div class="ext-card-head">
    <img class="ext-icon" src="extensions/${ext.slug}/icon.png" alt="" width="56" height="56">
    <div>
      <h3>${escapeHtml(ext.name)}</h3>
      <p class="ext-meta">${statusBadge(ext.status)} <span>v${escapeHtml(ext.latest.version)}</span></p>
    </div>
  </div>
  <p class="ext-tagline">${escapeHtml(ext.tagline)}</p>
  ${ext.highlights.length ? `<ul class="chips">${ext.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
  <div class="ext-card-actions">
    <a class="btn btn-primary btn-sm" href="${ext.latest.download}" download data-download="${ext.slug}">${ICONS.download}Download</a>
    <span class="link-arrow">Details ${ICONS.arrow}</span>
  </div>
</article>`;
}

// ---------------------------------------------------------------------------
// Pages

function homePage() {
  const count = extensions.length;
  const body = `
<section class="hero">
  <div class="container hero-inner">
    <p class="eyebrow">For Dynamics 365 Finance &amp; Operations</p>
    <h1>Browser extensions</h1>
    <p class="lead">Small, focused tools that run inside your D365 session in Microsoft Edge or Google Chrome. Download one, install it in under a minute, and get new versions here first.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#extensions">Browse ${count} extension${count === 1 ? '' : 's'}</a>
      <a class="btn btn-ghost" href="install/">How installing works</a>
    </div>
  </div>
</section>

<section class="trust">
  <div class="container trust-grid">
    <div class="trust-item">${ICONS.user}<div><h3>Your own permissions</h3><p>The extensions read D365 through the session you're signed in with, so your security roles apply.</p></div></div>
    <div class="trust-item">${ICONS.shield}<div><h3>No servers, no tracking</h3><p>Data goes only between your browser and your D365 environment. No analytics, no telemetry.</p></div></div>
    <div class="trust-item">${ICONS.browser}<div><h3>Edge and Chrome</h3><p>Built on Manifest V3, the current extension platform of both browsers, on Windows and macOS.</p></div></div>
  </div>
</section>

<section class="section" id="extensions">
  <div class="container">
    <div class="section-head">
      <h2>Extensions</h2>
      <p>Each download is the complete extension. Versions marked <strong>Beta</strong> are new and still being tested; feedback is welcome.</p>
    </div>
    <div class="ext-grid">
      ${extensions.map(extensionCard).join('\n')}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container how">
    <div class="section-head">
      <h2>Installing takes four steps</h2>
      <p>These extensions are installed straight from their download, not through a store. That way new and beta versions reach you the day they are ready.</p>
    </div>
    <ol class="how-steps">
      <li><span class="how-num">1</span><h3>Download</h3><p>Click <strong>Download</strong> on the extension you want.</p></li>
      <li><span class="how-num">2</span><h3>Unzip</h3><p>Extract the zip to a folder that stays, such as <code>Documents\\D365 extensions</code>.</p></li>
      <li><span class="how-num">3</span><h3>Developer mode</h3><p>Open <code>edge://extensions</code> and turn on <strong>Developer mode</strong>.</p></li>
      <li><span class="how-num">4</span><h3>Load unpacked</h3><p>Click <strong>Load unpacked</strong>, pick the folder, and reload D365.</p></li>
    </ol>
    <p class="center"><a class="btn btn-ghost" href="install/">Read the full install guide ${ICONS.arrow}</a></p>
  </div>
</section>`;
  return layout({ title: '', depth: 0, body, nav: 'home' });
}

function extensionPage(ext) {
  const l = ext.latest;
  const r = '../../';
  const store = ext.store.edge
    ? `<a class="btn btn-ghost" href="${escapeHtml(ext.store.edge)}" target="_blank" rel="noopener">${ICONS.store}Get it from Edge Add-ons</a>`
    : '';
  // A thumbnail that becomes the YouTube player on click, so nothing loads from YouTube before that.
  const videos = ext.videos.length
    ? `<section class="block" id="videos"><h2>Video${ext.videos.length === 1 ? '' : 's'}</h2><div class="videos">${ext.videos
        .map(
          (v) =>
            `<figure class="${v.vertical ? 'video-vertical' : 'video-wide'}"><a class="video" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" data-video="${v.id}" aria-label="Play video${v.title ? `: ${escapeHtml(v.title)}` : ''}"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"><span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg></span></a>${v.title ? `<figcaption>${escapeHtml(v.title)}</figcaption>` : ''}</figure>`,
        )
        .join('')}</div></section>`
    : '';
  const shots = ext.screenshots.length
    ? `<section class="block"><h2>Screenshots</h2><div class="gallery">${ext.screenshots
        .map(
          (s) =>
            `<figure><button type="button" class="shot" data-full="screenshots/${escapeHtml(s.file)}" data-caption="${escapeHtml(s.caption || '')}"><img src="screenshots/${escapeHtml(s.file)}" alt="${escapeHtml(s.caption || ext.name)}" loading="lazy" width="1280" height="800"></button>${s.caption ? `<figcaption>${escapeHtml(s.caption)}</figcaption>` : ''}</figure>`,
        )
        .join('')}</div></section>`
    : '';
  const permissions = `<section class="block" id="permissions"><h2>Permissions</h2>
    <p class="muted">What the browser lets ${escapeHtml(ext.name)} do, and why it needs it.</p>
    <div class="table-wrap"><table class="perm-table"><thead><tr><th>Permission</th><th>Used for</th></tr></thead><tbody>${ext.permissions
      .map((p) => `<tr><td><code>${escapeHtml(p.name)}</code>${p.optional ? ' <span class="badge badge-muted">optional</span>' : ''}</td><td>${p.text.includes('<details>') ? p.text : escapeHtml(p.text)}</td></tr>`)
      .join('')}</tbody></table></div></section>`;
  const versions = `<section class="block" id="versions"><h2>All versions</h2>
    <div class="table-wrap"><table class="versions"><thead><tr><th>Version</th><th>Released</th><th>Size</th><th>SHA-256</th><th></th></tr></thead><tbody>${ext.releases
      .map(
        (rel, i) =>
          `<tr><td><strong>${escapeHtml(rel.version)}</strong>${i === 0 ? ' <span class="badge badge-muted">latest</span>' : ''}</td><td>${formatDate(rel.date)}</td><td>${formatSize(rel.size)}</td><td><button type="button" class="hash" data-copy="${rel.sha256}" title="Copy SHA-256">${rel.sha256.slice(0, 12)}…</button></td><td><a href="${r}${rel.download}" download>Download</a></td></tr>`,
      )
      .join('')}</tbody></table></div>
    <p class="hint">To check a download, run <code>Get-FileHash .\\${escapeHtml(l.file)}</code> in PowerShell and compare the hash.</p></section>`;

  const body = `
<div class="container crumbs"><a href="${r}">Extensions</a> <span aria-hidden="true">/</span> ${escapeHtml(ext.name)}</div>

<section class="ext-hero">
  <div class="container ext-hero-inner">
    <img class="ext-icon-lg" src="icon.png" alt="" width="96" height="96">
    <div class="ext-hero-text">
      <h1>${escapeHtml(ext.name)}</h1>
      <p class="lead">${escapeHtml(ext.tagline)}</p>
      <p class="ext-meta">${statusBadge(ext.status)} <span>Version ${escapeHtml(l.version)}</span> <span aria-hidden="true">·</span> <span>${formatDate(l.date)}</span> <span aria-hidden="true">·</span> <span>${formatSize(l.size)}</span></p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${r}${l.download}" download data-download="${ext.slug}">${ICONS.download}Download v${escapeHtml(l.version)}</a>
        ${store}
      </div>
      <p class="hint">For Microsoft Edge and Google Chrome${ext.minimumBrowser ? ` ${escapeHtml(ext.minimumBrowser)} or later` : ''}. Free.</p>
    </div>
  </div>
</section>

<div class="container update-banner" id="update-banner" data-latest="${escapeHtml(l.version)}" hidden>
  <div>${ICONS.refresh}<p><strong>Update available.</strong> You have version <span data-installed></span>; version ${escapeHtml(l.version)} is ready. Download it above, then follow the update steps below.</p></div>
</div>

<div class="container ext-layout">
  <div class="ext-main">
    <section class="block install-block" id="install">
      <div class="download-started" hidden>${ICONS.download}<p><strong>Your download has started.</strong> Now follow these steps to install it.</p></div>
      <h2>Install</h2>
      ${browserTabs()}
      ${installSteps(ext)}
      <details class="update-details" id="update">
        <summary>Updating to a new version</summary>
        ${updateSteps(ext)}
      </details>
    </section>
    ${videos}
    ${shots}
    <section class="block prose">${ext.readme}</section>
    ${ext.changelog ? `<section class="block prose" id="changes"><h2>What's new</h2>${ext.changelog}</section>` : ''}
    ${permissions}
    ${versions}
  </div>
  <aside class="ext-aside">
    <div class="side-card">
      <h2>Details</h2>
      <dl>
        <dt>Version</dt><dd>${escapeHtml(l.version)}</dd>
        <dt>Status</dt><dd>${ext.status === 'beta' ? 'Beta' : 'Stable'}</dd>
        <dt>Released</dt><dd>${formatDate(l.date)}</dd>
        <dt>Download size</dt><dd>${formatSize(l.size)}</dd>
        <dt>Browsers</dt><dd>Edge, Chrome${ext.minimumBrowser ? ` ${escapeHtml(ext.minimumBrowser)}+` : ''}</dd>
        <dt>Permissions</dt><dd><a href="#permissions">${ext.permissions.length} listed</a></dd>
      </dl>
      <a class="btn btn-primary btn-block" href="${r}${l.download}" download data-download="${ext.slug}">${ICONS.download}Download</a>
      <a class="side-link" href="${r}install/">Install guide and FAQ ${ICONS.arrow}</a>
    </div>
  </aside>
</div>`;
  return layout({ title: ext.name, description: ext.tagline, depth: 2, body, nav: 'ext' });
}

function installPage() {
  const faq = [
    ['Why not from the Edge or Chrome store?', 'Store releases go through a review that can take days. Installing from the download means new and beta versions reach you the day they are ready. The extension itself is the same either way.'],
    ['The browser shows a warning about developer mode extensions', 'That is expected for an extension installed this way. Close the message, or choose to keep the extension. Your extensions keep working.'],
    ['<em>Developer mode</em> or <em>Load unpacked</em> is greyed out', 'Your organisation manages browser extensions through a policy. Ask your IT department to allow developer mode, or to install the extension for you.'],
    ['How do I know a new version is out?', "Each extension's page on this site shows its latest version and release date, and the What's new section lists the changes. Bookmark the page of the extensions you use."],
    ['Will I lose my settings when I update?', 'No, as long as you extract the new version into the same folder. A different folder counts as a different extension, with default settings.'],
    ['How do I remove an extension?', `Open ${copyField('the extensions page address')}, click <strong>Remove</strong> on the extension's card, and then delete its folder.`],
    ['Does it work on a Mac?', 'Yes, in Edge and Chrome for macOS. Double-click the zip to unzip it, and move the folder somewhere permanent, such as your Documents folder.'],
    [
      'Does it work in Brave, Opera, Vivaldi or Firefox?',
      'The extensions are made and tested for <strong>Microsoft Edge</strong> and <strong>Google Chrome</strong>. Other browsers built on the same engine, such as Brave, Vivaldi, Opera and Arc, can install them the same way, and most features should work there, but they are not tested. Side panel extensions such as Order X-ray may not work in every one of them. <strong>Firefox and Safari</strong> use a different extension system, so the extensions do not work there. Neither do browsers on phones and tablets.',
    ],
    ['Is my D365 data sent anywhere?', "No. The extensions talk only to the D365 environment in your tab, with your own session. Each extension's page lists exactly what it accesses and why."],
  ];
  const body = `
<section class="page-head">
  <div class="container">
    <p class="eyebrow">Install guide</p>
    <h1>Install, update and remove</h1>
    <p class="lead">Every extension on this site installs the same way. It takes about a minute, and you only do it once per extension.</p>
  </div>
</section>
<div class="container narrow">
  <section class="block">
    <h2 id="install">Install</h2>
    ${browserTabs()}
    <p>First download the zip from the extension's page. Then:</p>
    ${installSteps(null)}
  </section>
  <section class="block">
    <h2 id="update">Update to a new version</h2>
    ${updateSteps(null)}
  </section>
  <section class="block">
    <h2 id="faq">Questions</h2>
    <div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
  </section>
</div>`;
  return layout({ title: 'Install guide', description: 'How to install, update and remove the extensions in Microsoft Edge and Google Chrome.', depth: 1, body, nav: 'install' });
}

function notFoundPage() {
  // GitHub Pages serves 404.html at any depth, so links are absolute to the site URL.
  const body = `<section class="page-head"><div class="container"><h1>Page not found</h1><p class="lead">This page doesn't exist, or has moved.</p><p><a class="btn btn-primary" href="${config.url}">Go to the extensions</a></p></div></section>`;
  return layout({ title: 'Not found', depth: 0, body, nav: '' }).replace(/href="\.\/assets\//g, `href="${config.url}assets/`).replace(/src="\.\/assets\//g, `src="${config.url}assets/`);
}

// ---------------------------------------------------------------------------
// Write the site

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
write(join(out, '.nojekyll'), '');

write(join(out, 'index.html'), homePage());
write(join(out, 'install', 'index.html'), installPage());
write(join(out, '404.html'), notFoundPage());

for (const ext of extensions) {
  const pageDir = join(out, 'extensions', ext.slug);
  write(join(pageDir, 'index.html'), extensionPage(ext));
  if (ext.latest.icon) write(join(pageDir, 'icon.png'), ext.latest.icon);
  else cpSync(join(root, 'site', 'assets', 'logo.svg'), join(pageDir, 'icon.png'));
  for (const s of ext.screenshots) cpSync(join(ext.dir, 'screenshots', s.file), join(pageDir, 'screenshots', s.file));
  for (const rel of ext.releases) cpSync(rel.path, join(out, rel.download));
}

// Read by the extensions' update check. URLs are relative to this file.
const catalog = {
  schema: 1,
  generated: new Date().toISOString(),
  extensions: Object.fromEntries(
    extensions.map((ext) => [
      ext.slug,
      {
        name: ext.name,
        version: ext.latest.version,
        status: ext.status,
        released: ext.latest.date,
        page: `extensions/${ext.slug}/`,
        download: ext.latest.download,
        sha256: ext.latest.sha256,
        minimumBrowserVersion: ext.minimumBrowser || null,
      },
    ]),
  ),
};
write(join(out, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);

for (const ext of extensions) {
  console.log(`  ${ext.slug.padEnd(20)} ${ext.latest.version.padEnd(10)} ${ext.releases.length} release${ext.releases.length === 1 ? '' : 's'}`);
}
console.log(`build: wrote _site/ with ${extensions.length} extension${extensions.length === 1 ? '' : 's'}`);
