/**
 * Checks a deployed build over HTTP.
 *
 * Everything here is host behaviour that a local build cannot prove: the SPA
 * rewrite, the content types, and whether the PWA files are actually reachable
 * at the paths the page asks for. Run it against the live URL.
 *
 * Usage: node scripts/smoke-deploy.mjs https://example.vercel.app
 */
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/smoke-deploy.mjs <url>');
  process.exit(2);
}

const failures = [];
let passed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { redirect: 'follow' });
  return { res, body: await res.text() };
}

/**
 * Vercel may still be building when CI reaches this, so give it a while.
 * Returns 'ready', 'protected' when the host demands auth, or 'unreachable'.
 */
async function waitForDeploy(attempts = 20, delayMs = 15000) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(`${base}/`, { redirect: 'follow' });
      if (res.ok) return 'ready';
      // Deployment Protection is a hosting setting, not a broken build, so it
      // must not be reported as a failing check.
      if (res.status === 401 || res.status === 403) return 'protected';
      console.log(`  waiting… ${base}/ returned ${res.status} (${i}/${attempts})`);
    } catch (error) {
      console.log(`  waiting… ${String(error)} (${i}/${attempts})`);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return 'unreachable';
}

console.log(`Smoke testing ${base}`);

const state = await waitForDeploy();
if (state === 'protected') {
  console.log(`\n${base}/ requires authentication, so it cannot be checked from here.`);
  console.log('Turn off Deployment Protection for production, or point DEPLOY_URL at a public URL.');
  process.exit(0);
}
if (state === 'unreachable') {
  console.error(`\n${base}/ never returned a success status.`);
  process.exit(1);
}

console.log('\napp shell');
{
  const { res, body } = await get('/');
  check('/ returns 200', res.status === 200, `got ${res.status}`);
  check('/ is HTML', (res.headers.get('content-type') ?? '').includes('text/html'));
  check('/ is the Checkride shell', body.includes('<title>Checkride</title>'));
  check('/ links the web manifest', body.includes('manifest.webmanifest'));
  check('/ registers the service worker', body.includes('serviceWorker'));
  check('/ carries the apple touch icon', body.includes('apple-touch-icon'));
}

// The app ships one HTML file and routes on the client, so a deep link only
// works if the host rewrites unknown paths to it. This is the check that
// catches a missing or misordered rewrite rule.
console.log('\nclient-side routing');
for (const path of ['/aircraft/cessna-152', '/aircraft/cessna-152/preflight', '/settings']) {
  const { res, body } = await get(path);
  check(`${path} returns 200`, res.status === 200, `got ${res.status}`);
  check(`${path} serves the app shell`, body.includes('id="root"'));
}

console.log('\ninstallable web app');
{
  const { res, body } = await get('/manifest.webmanifest');
  check('/manifest.webmanifest returns 200', res.status === 200, `got ${res.status}`);
  let manifest = null;
  try {
    manifest = JSON.parse(body);
  } catch {
    /* reported below */
  }
  check('/manifest.webmanifest is valid JSON', manifest !== null);
  check('manifest installs standalone', manifest?.display === 'standalone', manifest?.display);
  check('manifest declares icons', (manifest?.icons?.length ?? 0) > 0);
}
{
  const { res, body } = await get('/sw.js');
  check('/sw.js returns 200', res.status === 200, `got ${res.status}`);
  check('/sw.js is the Checkride worker', body.includes('checkride-v1'));
  // A stale worker would pin the app to an old build.
  const cacheControl = res.headers.get('cache-control') ?? '';
  check('/sw.js is revalidated', /max-age=0|no-cache|must-revalidate/.test(cacheControl), cacheControl);
}
{
  const { res } = await get('/icon.png');
  check('/icon.png returns 200', res.status === 200, `got ${res.status}`);
  check('/icon.png is a PNG', (res.headers.get('content-type') ?? '').includes('image/png'));
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
