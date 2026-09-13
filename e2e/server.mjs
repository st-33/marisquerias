// Servidor estático mínimo para servir el build web de Expo (dist/).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = Number(process.argv[2] || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    // SPA fallback: rutas sin archivo -> index.html raíz del subárbol.
    let filePath = normalize(join(DIST, urlPath));
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403).end('forbidden');
      return;
    }

    try {
      await readFile(filePath);
    } catch {
      // Fallback SPA: cualquier ruta sin archivo físico -> index.html (enrutado client-side).
      filePath = join(DIST, 'index.html');
    }

    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(PORT, () => {
  console.log(`[e2e-server] sirviendo dist/ en http://127.0.0.1:${PORT}`);
});
