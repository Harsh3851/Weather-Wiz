#!/usr/bin/env node
/**
 * Builds the client for GitHub Pages and writes it to the repository root,
 * which is what Pages serves for this repo. Source stays in client/ and server/.
 *
 *   npm run build:pages                        -> demo mode (no backend)
 *   VITE_API_URL=https://api.example.com npm run build:pages   -> API mode
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Remove the previous Pages output (and the legacy static page) only.
for (const entry of ['index.html', 'assets', 'favicon.svg', '404.html']) {
  const target = join(root, entry);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

const mode = process.env.VITE_API_URL ? 'api' : 'demo';
console.warn(`Building client for GitHub Pages in ${mode} mode...`);

execSync('npx vite build --mode pages --outDir .. --emptyOutDir false', {
  cwd: join(root, 'client'),
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL ?? '' },
});

// Pages must not run Jekyll (it would ignore files starting with "_").
writeFileSync(join(root, '.nojekyll'), '');

const assets = readdirSync(join(root, 'assets'));
console.warn(`Done: index.html + ${assets.length} files in assets/ at the repo root.`);
