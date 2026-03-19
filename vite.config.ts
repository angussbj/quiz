import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/quiz/',
  plugins: [
    react(),
    {
      name: 'redirect-root',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== undefined && !req.url.startsWith('/quiz/')) {
            res.writeHead(302, { Location: '/quiz/' });
            res.end();
          } else {
            next();
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
