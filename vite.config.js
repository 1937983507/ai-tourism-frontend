import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: '.', // 明确指定根目录
  publicDir: 'public', // 静态资源目录
  build: {
    outDir: 'dist', // 输出目录
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html') // 明确指定入口文件
      }
    }
  },
  server: {
    port: 3001,
    open: true,
    host: true, // 允许外部访问
    allowedHosts: [
      'www.aitrip.chat',     // 域名
      'aitrip.chat',         // 根域名
      'localhost',           // 本地开发
      '127.0.0.1'           // 本地IP
    ]
  }
})