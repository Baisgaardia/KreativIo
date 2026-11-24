import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { handleRoomRequest, MemoryRoomStore } from './shared/roomEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const roomStore = new MemoryRoomStore();

  // Delt /api/room-rute (kører identisk med netlify/functions/room.ts på Netlify)
  app.all('/api/room', async (req, res) => {
    try {
      const query: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.query)) {
        query[k] = typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
      }

      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
      }

      const result = await handleRoomRequest({
        method: req.method,
        query,
        headers,
        body: req.body,
        store: roomStore,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Local room API error:', err);
      res.status(500).json({ error: 'Midlertidig serverfejl i klasserummet.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OECD GeoGuessr server kører på http://0.0.0.0:${PORT}`);
  });
}

startServer();
