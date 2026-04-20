import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function getHtmlInputs() {
  const root = process.cwd();
  const inputs = {};

  for (const file of fs.readdirSync(root)) {
    if (file.endsWith('.html')) {
      const name = file.replace(/\.html$/, '');
      inputs[name] = path.resolve(root, file);
    }
  }

  const biographiesDir = path.resolve(root, 'biographies');
  if (fs.existsSync(biographiesDir)) {
    for (const file of fs.readdirSync(biographiesDir)) {
      if (file.endsWith('.html')) {
        const name = `biographies-${file.replace(/\.html$/, '')}`;
        inputs[name] = path.resolve(biographiesDir, file);
      }
    }
  }

  return inputs;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: getHtmlInputs()
    }
  }
});
