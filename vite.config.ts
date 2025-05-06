import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://ms.jr.jd.com/gw/generic/hj/h5/m/',
        rewrite: (path) => path.replace('/api', ''),
        headers: {
          'origin': 'http://localhost:3000',
          'host': 'ms.jr.jd.com',
          'referer': 'http://localhost:3000/'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
