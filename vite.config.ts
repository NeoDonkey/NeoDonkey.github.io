import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The ERP the site is demonstrating, as a build-time constant. The app shows it, so a visitor
// looking at the demo can tell which version of the product they are looking at — and so can we,
// from a screenshot, without asking when it was taken.
const pin = JSON.parse(readFileSync(new URL('./erp.pin.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: '/',
  // No single-page fallback. The ERP asks for `release.json` and treats a 200 as "there is a
  // manifest here" — served an index.html instead, it concludes the runtime was signed by
  // somebody else and refuses to boot, which is exactly what it should do. This site is one
  // page and has no routes to fall back for, so the fallback only ever lied.
  appType: 'mpa',
  define: {
    __ERP_REF__: JSON.stringify(String(pin.ref).slice(0, 7)),
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
