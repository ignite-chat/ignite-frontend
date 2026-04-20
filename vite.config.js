// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'events', 'net', 'os', 'path', 'string_decoder'],
      globals: { Buffer: true },
    }),
  ],
  base: '/',  // 🔑 Relative paths for Electron file:// URLs
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      // Redirect the `sonner` package to our in-tree toaster. The subset of
      // sonner's API we use (toast.success / error / info / dismiss with an
      // optional `duration`) is re-implemented there so call sites don't
      // need to change. Uses an absolute path so Vite's module resolver
      // treats it unambiguously as a file path, not a package specifier.
      sonner: path.resolve(__dirname, 'src/components/ui/toast.tsx'),
    },
  },
})
