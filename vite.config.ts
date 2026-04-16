import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

let baseName = '/';
if (process.env.GITHUB_REPOSITORY) {
  baseName = `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`;
} else if (pkg.repository?.url) {
  const match = pkg.repository.url.match(/github\.com\/[^\/]+\/([^\/]+?)(?:\.git)?$/);
  if (match) {
    baseName = `/${match[1]}/`;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: baseName,
})
