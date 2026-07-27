import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Env vars are read through src/config/env.js, not here — Vite loads .env,
// .env.[mode] and .env.[mode].local automatically and inlines every VITE_*
// variable at build time.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: { port: 5173 },
  preview: { port: 4173 },

  build: {
    outDir: 'dist',
    // Readable production stack traces. Set to false if the source must stay
    // opaque — the maps are served publicly.
    sourcemap: true,
    // Vendor code changes rarely; splitting it keeps it cached across deploys
    // instead of invalidating one 600 kB bundle on every release.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
