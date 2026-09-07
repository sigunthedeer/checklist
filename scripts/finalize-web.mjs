/**
 * Post-processes the web export into an installable PWA.
 *
 * Expo generates index.html itself when `web.output` is "single", and `+html.tsx`
 * only applies to static rendering, so the head tags are injected here instead.
 * Keeping "single" means the whole app is client-routed from one file, which
 * works on any static host with no rewrite rules.
 *
 * Usage: node scripts/finalize-web.mjs <export-dir>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const indexPath = join(dir, 'index.html');

if (!existsSync(indexPath)) {
  console.error(`No index.html in ${dir}. Run the export first.`);
  process.exit(1);
}

const HEAD = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="description" content="Aircraft checklists for Microsoft Flight Simulator. Simulator use only." />
    <meta name="theme-color" content="#0B1017" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Checkride" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <style>
      html, body, #root { background-color: #0B1017; }
      body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

let html = readFileSync(indexPath, 'utf8');

if (html.includes('manifest.webmanifest')) {
  console.log('index.html already finalized, nothing to do.');
  process.exit(0);
}

// Expo's default viewport blocks the safe-area insets we need on a tablet.
html = html.replace(
  /\s*<meta name="viewport"[^>]*\/>/,
  '',
);
html = html.replace('</head>', `${HEAD}  </head>`);

writeFileSync(indexPath, html);
console.log(`Finalized ${indexPath}: PWA manifest, icons, theme colour and service worker.`);
