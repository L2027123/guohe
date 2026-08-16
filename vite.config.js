import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    host: true,
    allowedHosts: true
  },
  
  // 生产构建配置
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    minify: 'esbuild',
    target: 'es2018',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'zustand': ['zustand'],
          'lucide': ['lucide-react']
        }
      }
    }
  },
  
  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify('3.0.0-beta'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    open: true
  }
}))
