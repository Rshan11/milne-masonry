// Builds styles.css from the classes used in index.html, then stamps the
// <link> with a hash of the result.
//
// Why the stamp: Cloudflare Pages caches static assets for 4 hours and will
// not honour a shorter Cache-Control from _headers, while index.html
// revalidates on every load. Without a changing URL, a deploy can serve new
// markup against a stale stylesheet, leaving newly added classes unstyled.
// A content hash in the query string makes each build a distinct URL, so the
// long asset cache becomes harmless.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'styles.css');
const htmlPath = join(root, 'index.html');

// Run the CLI's JS entry point directly rather than the .bin shim, which
// Node refuses to spawn on Windows without a shell.
const tailwindCli = join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');

execFileSync(
  process.execPath,
  [tailwindCli, '-i', './src/input.css', '-o', './styles.css', '--minify'],
  { cwd: root, stdio: 'inherit' }
);

const hash = createHash('sha256')
  .update(readFileSync(cssPath))
  .digest('hex')
  .slice(0, 8);

const html = readFileSync(htmlPath, 'utf8');
const pattern = /href="\/styles\.css(?:\?v=[a-f0-9]+)?"/;

if (!pattern.test(html)) {
  console.error('Could not find the styles.css <link> in index.html.');
  process.exit(1);
}

const updated = html.replace(pattern, `href="/styles.css?v=${hash}"`);

if (updated === html) {
  console.log(`styles.css unchanged (v=${hash})`);
} else {
  writeFileSync(htmlPath, updated);
  console.log(`styles.css built and stamped v=${hash}`);
  console.log('Commit index.html and styles.css together.');
}
