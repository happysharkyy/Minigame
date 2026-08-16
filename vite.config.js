import { defineConfig } from 'vite';

const apiProxy = {
  // 留言板 API 代理到本地 Node 后端
  '/api': 'http://localhost:3001',
};

export default defineConfig({
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
