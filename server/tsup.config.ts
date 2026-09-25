import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // The shared workspace package ships TypeScript source, so bundle it in.
  noExternal: ['@weatherwiz/shared'],
  // Dev-only fallback database; never bundled into the production build.
  external: ['mongodb-memory-server'],
});
