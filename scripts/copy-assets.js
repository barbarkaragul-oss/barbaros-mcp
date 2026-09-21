// Copies non-.ts assets (static docs, fallback data snapshots) into dist/
// after tsc compiles. Portable: runs the same on Windows dev and the Linux VPS.
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// this file lives in <project-root>/scripts/, so its parent is the project root
const root = fileURLToPath(new URL('..', import.meta.url));
const pairs = [
  ['src/connectors/privacymatrix/static', 'dist/connectors/privacymatrix/static'],
  ['src/connectors/privacymatrix/fallback', 'dist/connectors/privacymatrix/fallback'],
];

for (const [from, to] of pairs) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!existsSync(src)) {
    console.error(`copy-assets: missing source ${src}`);
    process.exit(1);
  }
  cpSync(src, dest, { recursive: true });
  console.log(`copy-assets: ${from} -> ${to}`);
}
