import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        cookiePathRewrite: { '/auth': '/api/auth' },
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
