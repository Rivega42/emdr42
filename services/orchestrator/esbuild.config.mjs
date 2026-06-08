// esbuild bundle для production (#208).
// Workspace-пакеты @emdr42/* экспортируют TS-source (main: ./src/index.ts),
// который Node не выполнит в runtime. esbuild инлайнит их в единый bundle,
// оставляя реальные npm-зависимости external (они в node_modules контейнера).
import esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// External = все runtime-зависимости КРОМЕ workspace @emdr42/* (их бандлим).
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (d) => !d.startsWith('@emdr42/'),
);

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/server.js',
  external,
  keepNames: true,
  sourcemap: true,
  logLevel: 'info',
});
