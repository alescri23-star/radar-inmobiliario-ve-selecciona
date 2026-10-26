import {security} from './security.mjs';
import {classifyLand} from './land.mjs';
import http from 'node:http';
import { portal } from './portal.mjs';
import {connectDatabase,initializeDatabase} from './database.mjs';
import {bootstrapAdminFromEnvironment} from './admin.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {discoverProfessionals,professionalMatchKey} from './professional-discovery.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp(directory = path.join(root, 'data'), options = {}) {
  options={...options,security:security(options)};
  const db = options.database || connectDatabase(directory);
  const ready = initializeDatabase(db).then(()=>bootstrapAdminFromEnvironment(db));
  const handlePortal=portal(db,options);
  const kinds = ['inmuebles', 'leads', 'reformas', 'profesionales'];
  const list = async kind => (await db.all('SELECT body FROM records WHERE kind=?',[kind])).map(r => classifyLand(JSON.parse(r.body)));
  const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const server = http.createServer(async (req, res) => {
    try {
      await ready;
      const url = new URL(req.url, 'http://localhost');
      if(await handlePortal(req,res,url))return;
      if (url.pathname.startsWith('/api/')) {
        if(url.pathname==='/api/professional-discovery'&&req.method==='GET'){
          if(req.user?.role!=='admin')return send(res,401,{error:'Acceso reservado al administrador'});
          const results=await discoverProfessionals(Object.fromEntries(url.searchParams),options.professionalSearchFetch||fetch),existing=await list('profesionales'),keys=existing.map(professionalMatchKey);
          return send(res,200,{results:results.map(result=>{const key=professionalMatchKey(result),duplicate=keys.findIndex(saved=>key.website&&key.website===saved.website||key.phone.length>=10&&key.phone===saved.phone||key.name.length>=5&&key.name===saved.name);return {...result,alreadyExists:duplicate>=0,existingId:duplicate>=0?existing[duplicate].id:''};})});
        }
        const activityMatch=url.pathname.match(/^\/api\/profesionales\/([^/]+)\/actividades$/);
        if(activityMatch){
          const professional=(await list('profesionales')).find(record=>record.id===activityMatch[1]);
          if(!professional)return send(res,404,{error:'Profesional no encontrado'});
          if(req.method==='GET')return send(res,200,Array.isArray(professional.actividades)?professional.actividades:[]);
          if(req.method==='POST'){
            let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)return send(res,413,{error:'Actividad demasiado grande'});}
            let input;try{input=JSON.parse(body);}catch{return send(res,400,{error:'JSON inválido'});}
            const allowedTypes=['llamada','WhatsApp','correo','reunión','nota','presupuesto'];
            const tipo=String(input.tipo||'nota').trim(),resumen=String(input.resumen||'').trim();
            if(!allowedTypes.includes(tipo))return send(res,400,{error:'Tipo de actividad inválido'});
            if(!resumen||resumen.length>1000)return send(res,400,{error:'Escribe un resumen de hasta 1000 caracteres'});
            const activity={id:randomUUID(),tipo,resumen,fecha:new Date().toISOString()};
            const actividades=[activity,...(Array.isArray(professional.actividades)?professional.actividades:[])].slice(0,200);
            const updated={...professional,actividades,ultimaActividadCrm:activity.fecha,actualizadoEn:new Date().toISOString()};
            await db.upsertRecord(updated.id,'profesionales',JSON.stringify(updated));
            return send(res,201,{activity,record:updated});
          }
          return send(res,405,{error:'Método no permitido'});
        }
        const [, , kind, id] = url.pathname.split('/');
        if (!kinds.includes(kind)) return send(res, 404, { error: 'Recurso no encontrado' });
        if (req.method === 'GET' && !id) return send(res, 200, await list(kind));
        if (req.method === 'DELETE' && id && kind === 'profesionales') {
          if (!(await list(kind)).some(record=>record.id===id)) return send(res,404,{error:'Profesional no encontrado'});
          await db.deleteRecord(id,kind);
          return send(res,200,{deleted:id});
        }
        if (req.method === 'POST' && !id || req.method === 'PUT' && id) {
          let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 32768) return send(res, 413, { error: 'Registro demasiado grande' }); }
          let input; try { input = JSON.parse(body); } catch { return send(res, 400, { error: 'JSON inválido' }); }
          const fields = kind === 'inmuebles' ? ['titulo', 'zona', 'operacion', 'precio', 'moneda', 'fuente', 'estado', 'latitud', 'longitud', 'direccion', 'municipio', 'parroquia', 'calle', 'tipo', 'habitaciones', 'banos', 'superficie', 'ubicacionPrecision'] : kind === 'leads' ? ['nombre', 'contacto', 'telefono', 'whatsapp', 'inmuebleId', 'interes', 'estado', 'proximaAccion', 'fecha', 'ultimaActividad', 'responsable', 'notas'] : kind === 'reformas' ? ['titulo', 'inmuebleId', 'importe', 'moneda', 'estado'] : ['nombre', 'personaContacto', 'email', 'tipoEmpresa', 'categoria', 'servicios', 'contacto', 'whatsapp', 'sitioWeb', 'direccion', 'cobertura', 'experiencia', 'rif', 'responsableTecnico', 'fuente', 'observaciones', 'fechaRevision', 'prioridad', 'proximaAccion', 'fechaSeguimiento', 'inmuebleId', 'reformaId', 'valoracion', 'estado'];
          const previous = id ? (await list(kind)).find(r => r.id === id) : null;
          if (id && !previous) return send(res, 404, { error: 'Registro no encontrado' });
          const submitted = Object.fromEntries(fields.filter(f => Object.hasOwn(input, f)).map(f => [f, String(input[f] ?? '').trim()]));
          const record = id ? { ...previous, ...submitted } : Object.fromEntries(fields.map(f => [f, String(input?.[f] ?? '').trim()]));
          if (!(record.titulo || record.nombre)) return send(res, 400, { error: 'Falta el título o nombre' });
          if (Object.values(record).some(v => v.length > 2000)) return send(res, 400, { error: 'Campo demasiado largo' });
          const states = { inmuebles: ['borrador','activo','reservado','cerrado','archivado'], leads: ['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'], reformas: ['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'], profesionales: ['candidato','contactado','documentación pendiente','evaluado','aprobado','descartado'] };
          if (!states[kind].includes(record.estado)) return send(res, 400, { error: 'Estado inválido' });
          if (kind === 'inmuebles' && !['venta','alquiler'].includes(record.operacion)) return send(res, 400, { error: 'Operación inválida' });
          if (record.moneda && !['USD','VES'].includes(record.moneda)) return send(res, 400, { error: 'Moneda inválida' });
          if (kind === 'leads' && record.interes && !['alto','medio','bajo'].includes(record.interes)) return send(res, 400, { error: 'Nivel de interés inválido' });
          if (kind === 'profesionales' && record.categoria && (record.categoria.length>40||/[<>\u0000-\u001f]/.test(record.categoria))) return send(res, 400, { error: 'La etiqueta debe tener entre 1 y 40 caracteres' });
          if (kind === 'profesionales' && record.prioridad && !['alta','media','baja'].includes(record.prioridad)) return send(res,400,{error:'Prioridad inválida'});
          if (kind === 'profesionales' && record.valoracion && (!/^\d$/.test(record.valoracion)||Number(record.valoracion)<1||Number(record.valoracion)>5)) return send(res,400,{error:'Valoración inválida'});
          if (kind === 'inmuebles') {
            if (record.ubicacionPrecision && !['publicada','aproximada','verificada'].includes(record.ubicacionPrecision)) return send(res, 400, { error: 'Precisión de ubicación inválida' });
            const hasLat = record.latitud !== '', hasLng = record.longitud !== '';
            if (hasLat !== hasLng || hasLat && (!Number.isFinite(Number(record.latitud)) || !Number.isFinite(Number(record.longitud)) || Math.abs(Number(record.latitud)) > 90 || Math.abs(Number(record.longitud)) > 180)) return send(res, 400, { error: 'Indica latitud y longitud válidas, o deja ambas vacías' });
          }
          const amount = kind === 'inmuebles' ? 'precio' : 'importe';
          if (record[amount] !== undefined && record[amount] !== '' && (!Number.isFinite(Number(record[amount])) || Number(record[amount]) < 0)) return send(res, 400, { error: 'Importe inválido' });
          if ([record.fecha, record.fechaRevision, record.ultimaActividad, record.fechaSeguimiento].filter(Boolean).some(value=>!/^\d{4}-\d{2}-\d{2}$/.test(value))) return send(res, 400, { error: 'Fecha inválida' });
          if (record.inmuebleId && !(await list('inmuebles')).some(p => p.id === record.inmuebleId)) return send(res, 400, { error: 'Inmueble no encontrado' });
          if (record.reformaId && !(await list('reformas')).some(item=>item.id===record.reformaId)) return send(res,400,{error:'Reforma no encontrada'});
           if (kind === 'leads') record.origen = previous?.origen || (previous?.userId ? 'formulario' : 'manual');
           if (kind === 'profesionales') record.origen = previous?.origen || (input.origen==='descubrimiento'?'descubrimiento':'manual');
          record.id = id || randomUUID(); record.creadoEn = previous?.creadoEn || new Date().toISOString(); record.actualizadoEn = new Date().toISOString();
          await db.upsertRecord(record.id, kind, JSON.stringify(record));
          return send(res, id ? 200 : 201, record);
        }
        return send(res, 405, { error: 'Método no permitido' });
      }
      const files = { '/gallery.js':['gallery.js','text/javascript'], '/favicon.svg': ['favicon.svg','image/svg+xml'], '/logo-radar.svg': ['logo-radar.svg','image/svg+xml'], '/': ['portal.html','text/html'], '/red-profesional': ['professional-form.html','text/html'], '/professional-form.js': ['professional-form.js','text/javascript'], '/admin': ['index.html','text/html'], '/portal.js': ['portal.js','text/javascript'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'] };
      if (!files[url.pathname] || req.method !== 'GET') return send(res, 404, { error: 'Página no encontrada' });
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com; img-src 'self' https://cdn.remax.com.ve https://cdn.photos.sparkplatform.com data: https://tile.openstreetmap.org https://unpkg.com; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
      res.end(readFileSync(path.join(root, 'public', file)));
    } catch (err) { console.error(err); send(res, 500, { error: 'No se pudo completar la operación' }); }
  });
  server.on('close', () => { db.close().catch(error=>console.error('No se pudo cerrar la base de datos',error)); });
  return server;
}
const isDirectStart = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
// Hostinger loads the configured entry file through its process supervisor, so
// process.argv[1] is not always server.mjs even though this is the production entry.
if (process.env.RADAR_HOSTINGER === 'true' || isDirectStart) {
  const port=Number(process.env.PORT || 3000);
  const host=process.env.HOST || (process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1');
  createApp().listen(port, host, () => console.log(`Radar Venezuela iniciado en ${host}:${port}`));
}
