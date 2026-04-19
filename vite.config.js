import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署时如果是 username.github.io/repo-name 格式，
  // 需要设置 base 为 '/repo-name/'
  // 如果是自定义域名或 username.github.io，设为 '/'
  base: '/vocab-daily/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
})
