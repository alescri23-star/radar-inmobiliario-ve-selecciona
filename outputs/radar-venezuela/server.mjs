import http from 'node:http';
import { portal } from './portal.mjs';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp(directory = path.join(root, 'data'), options = {}) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, 'radar.sqlite'));
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, body TEXT NOT NULL)');
  const handlePortal=portal(db,options);
  const kinds = ['inmuebles', 'leads', 'reformas'];
  const list = kind => db.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r => JSON.parse(r.body));
  const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if(await handlePortal(req,res,url))return;
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origen no permitido' });
        const [, , kind, id] = url.pathname.split('/');
        if (!kinds.includes(kind)) return send(res, 404, { error: 'Recurso no encontrado' });
        if (req.method === 'GET' && !id) return send(res, 200, list(kind));
        if (req.method === 'POST' && !id || req.method === 'PUT' && id) {
          let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 32768) return send(res, 413, { error: 'Registro demasiado grande' }); }
          let input; try { input = JSON.parse(body); } catch { return send(res, 400, { error: 'JSON inválido' }); }
          const fields = kind === 'inmuebles' ? ['titulo', 'zona', 'operacion', 'precio', 'moneda', 'fuente', 'estado', 'latitud', 'longitud', 'direccion', 'municipio', 'parroquia', 'calle', 'tipo', 'habitaciones', 'banos', 'superficie', 'ubicacionPrecision'] : kind === 'leads' ? ['nombre', 'contacto', 'inmuebleId', 'estado', 'proximaAccion', 'fecha'] : ['titulo', 'inmuebleId', 'importe', 'moneda', 'estado'];
          const record = Object.fromEntries(fields.map(f => [f, String(input?.[f] ?? '').trim()]));
          if (!(record.titulo || record.nombre)) return send(res, 400, { error: 'Falta el título o nombre' });
          if (Object.values(record).some(v => v.length > 2000)) return send(res, 400, { error: 'Campo demasiado largo' });
          const states = { inmuebles: ['borrador','activo','reservado','cerrado','archivado'], leads: ['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'], reformas: ['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'] };
          if (!states[kind].includes(record.estado)) return send(res, 400, { error: 'Estado inválido' });
          if (kind === 'inmuebles' && !['venta','alquiler'].includes(record.operacion)) return send(res, 400, { error: 'Operación inválida' });
          if (record.moneda && !['USD','VES'].includes(record.moneda)) return send(res, 400, { error: 'Moneda inválida' });
          if (kind === 'inmuebles') {
            if (record.ubicacionPrecision && !['publicada','aproximada','verificada'].includes(record.ubicacionPrecision)) return send(res, 400, { error: 'Precisión de ubicación inválida' });
            const hasLat = record.latitud !== '', hasLng = record.longitud !== '';
            if (hasLat !== hasLng || hasLat && (!Number.isFinite(Number(record.latitud)) || !Number.isFinite(Number(record.longitud)) || Math.abs(Number(record.latitud)) > 90 || Math.abs(Number(record.longitud)) > 180)) return send(res, 400, { error: 'Indica latitud y longitud válidas, o deja ambas vacías' });
          }
          const amount = kind === 'inmuebles' ? 'precio' : 'importe';
          if (record[amount] !== undefined && record[amount] !== '' && (!Number.isFinite(Number(record[amount])) || Number(record[amount]) < 0)) return send(res, 400, { error: 'Importe inválido' });
          if (record.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(record.fecha)) return send(res, 400, { error: 'Fecha inválida' });
          if (record.inmuebleId && !list('inmuebles').some(p => p.id === record.inmuebleId)) return send(res, 400, { error: 'Inmueble no encontrado' });
          const previous = id ? list(kind).find(r => r.id === id) : null;
          if (id && !previous) return send(res, 404, { error: 'Registro no encontrado' });
          Object.assign(record, previous ? Object.fromEntries(Object.entries(previous).filter(([k])=>!fields.includes(k))) : {});
          record.id = id || randomUUID(); record.creadoEn = previous?.creadoEn || new Date().toISOString(); record.actualizadoEn = new Date().toISOString();
          db.prepare('INSERT OR REPLACE INTO records VALUES (?, ?, ?)').run(record.id, kind, JSON.stringify(record));
          return send(res, id ? 200 : 201, record);
        }
        return send(res, 405, { error: 'Método no permitido' });
      }
      const files = { '/gallery.js':['gallery.js','text/javascript'], '/favicon.svg': ['favicon.svg','image/svg+xml'], '/': ['portal.html','text/html'], '/admin': ['index.html','text/html'], '/portal.js': ['portal.js','text/javascript'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'] };
      if (!files[url.pathname] || req.method !== 'GET') return send(res, 404, { error: 'Página no encontrada' });
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com; img-src 'self' https://cdn.remax.com.ve https://cdn.photos.sparkplatform.com data: https://tile.openstreetmap.org https://unpkg.com; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
      res.end(readFileSync(path.join(root, 'public', file)));
    } catch (err) { console.error(err); send(res, 500, { error: 'No se pudo completar la operación' }); }
  });
  server.on('close', () => db.close());
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Radar Venezuela: http://127.0.0.1:3000'));
}
