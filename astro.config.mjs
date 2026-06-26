// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // User Pages repo: served at the domain root, so no base path prefix.
  site: 'https://zmcnellis.github.io',
  base: '/',
  integrations: [react()],
  vite: {
    // Allow importing .glsl shader files as raw strings.
    assetsInclude: ['**/*.glsl'],
  },
});
