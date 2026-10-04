// Purpose: Build the JavaScript package and compiler-owned Tea libraries. The generated reference is committed; `npm run docs:generate` refreshes it and `docs:check:generated` keeps it current.

import {copyFileSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

rmSync('dist', {force: true, recursive: true});
execFileSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve('typescript/bin/tsc')),
    '-p',
    'tsconfig.package.json',
  ],
  {stdio: 'inherit'},
);
await build({
  entryPoints: {
    'loader/index': 'src/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    compiler: 'src/compiler.ts',
    'lsp/index': 'src/lsp/index.ts',
    'reference/index': 'src/reference/index.ts',
  },
  outdir: 'dist',
  splitting: true,
  // Shared loader chunks resolve compiler-owned libraries relative to ../tea-lib.
  chunkNames: 'loader/[name]-[hash]',
  bundle: true,
  format: 'esm',
  packages: 'external',
  platform: 'node',
  target: 'node20.19',
});

mkdirSync('dist/tea-lib', {recursive: true});
for (const filename of readdirSync('src/tea-lib')) {
  if (filename.endsWith('.tea')) {
    copyFileSync(`src/tea-lib/${filename}`, `dist/tea-lib/${filename}`);
  }
}
