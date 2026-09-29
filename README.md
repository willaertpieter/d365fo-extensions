# D365F&O Browser extensions

The download site for the extensions: <https://willaertpieter.github.io/d365fo-extensions/>

This repository holds only the built packages and the site. The extensions' source lives in their own private repositories.

## Publish a new version

1. Build the release zip in the extension's own repository (`npm run package` or `node scripts/package.js`).
2. Copy the zip into `extensions/<slug>/releases/`. Keep or delete older zips; every zip there is listed under **All versions**, and the highest manifest version is offered as the download.
3. Optionally add the changes to `extensions/<slug>/CHANGELOG.md`.
4. Commit and push to `main`. The **Publish site** workflow builds and deploys the site in about a minute.

The version, name, icon, permissions and minimum browser version all come from the `manifest.json` inside the zip, so nothing else needs editing.

## Add a new extension

Create `extensions/<slug>/` (the slug becomes the page address, for example `extensions/order-x-ray/`):

```
extensions/<slug>/
  extension.json      tagline, status, order, highlights, store links, videos, screenshots, permission texts
  README.md           the description on the extension's page (## headings, lists, tables)
  CHANGELOG.md        optional: "What's new"
  releases/*.zip      the packages
  screenshots/*.png   optional: 1280 x 800, listed in extension.json
```

`extension.json`, all fields optional:

```json
{
  "name": "Order X-ray",
  "tagline": "One sentence for the card and the page header.",
  "status": "beta",
  "order": 3,
  "highlights": ["Read-only", "Sales and purchase orders"],
  "store": { "edge": "https://microsoftedge.microsoft.com/addons/detail/..." },
  "videos": [{ "url": "https://youtu.be/...", "title": "The 5-minute tour" }],
  "screenshots": [{ "file": "shot-1.png", "caption": "What the screenshot shows." }],
  "permissions": { "storage": "What this extension stores, in plain words." }
}
```

Without `status`, versions below 1.0.0 are shown as Beta.

`videos` takes any YouTube address (watch, youtu.be or shorts). Shorts are shown upright; set `"vertical": true` or `false` to override. The page shows a thumbnail and only loads the YouTube player, in privacy-enhanced mode, when the video is clicked.

## Preview locally

```bash
node scripts/build.mjs
```

```bash
node scripts/serve.mjs
```

Then open <http://localhost:4000/d365fo-extensions/>. Node 20 or later, no `npm install` needed.

## catalog.json

The build also writes `catalog.json` at the site root, with the latest version, download and SHA-256 of each extension. The extensions don't use it today; it is there for scripts, or for an update check later. An extension page opened with `?installed=<version>` shows an "Update available" banner when that version is older than the latest.

## One-time GitHub setup

1. Create a public repository named `d365fo-extensions` and push this folder to `main`.
2. In the repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. The first push runs the workflow; the site appears at the address above.

If you use a different repository name, change `url` in `site.config.json` (and the path in `scripts/serve.mjs`).
