import {robotsAllowed} from './collector.mjs';
import {adaptDatabase} from './database.mjs';
export const safePhoto = value => typeof value==='string' && /^https:\/\/(cdn\.remax\.com\.ve|cdn\.photos\.sparkplatform\.com)\/[\w/.-]+$/.test(value);
export function parseGallery(html,p){
 const scope=p.sourceId==='rentahouse'?(html.split('id="Fotos"')[1]||'').split('id="Mapa"')[0]:html;
 const photos=[];
 for(const tag of scope.matchAll(/<img\b[^>]*>/gi)){
  const src=p.sourceId==='remax'?tag[0].match(/\bsrc="([^"]+)"/)?.[1]:tag[0].match(/\bdata-src="([^"]+)"/)?.[1]||tag[0].match(/https:\/\/cdn\.photos\.sparkplatform\.com\/ven\/[\w.-]+\.jpg/)?.[0];
  if(!safePhoto(src))continue;
  if(p.sourceId==='remax'&&(!src.includes('/'+p.sourceCode+'/')||/\/OG_/i.test(src)))continue;
  photos.push(src);
 }
 return [...new Set(photos)].slice(0,80);
}
export function gallery(database,options={}){
 const db=adaptDatabase(database);
 const fetcher=options.galleryFetch||fetch, pending=new Map(),next=new Map();
 async function download(url){const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Fuente no disponible');let html='';for await(const chunk of r.body){html+=Buffer.from(chunk).toString();if(html.length>3000000)throw Error('Respuesta demasiado grande');}return html;}
 async function collect(p){
  const u=new URL(p.fuente);const host=p.sourceId==='remax'?'www.remax.com.ve':p.sourceId==='rentahouse'?'rentahouse.com.ve':'';
  if(!host||u.protocol!=='https:'||u.hostname!==host||u.port||u.username||u.password)throw Error('Fuente no compatible');
  const delay=p.sourceId==='remax'?2000:10000;
  const slot=Math.max(Date.now(),next.get(host)||0);next.set(host,slot+delay*2);
  await new Promise(r=>setTimeout(r,Math.max(0,slot-Date.now())));
  const robots=await download(u.origin+'/robots.txt');if(!robotsAllowed(robots,u.href))throw Error('Galería no disponible para captura');
  await new Promise(r=>setTimeout(r,delay));
  const fotos=parseGallery(await download(u.href),p);if(!fotos.length)throw Error('No se encontraron fotos adicionales');
  const current=await db.get("SELECT body FROM records WHERE id=? AND kind='inmuebles'",[p.id]);
  if(current){const record=JSON.parse(current.body);record.fotos=fotos;record.fotosConsultadasEn=new Date().toISOString();await db.run('UPDATE records SET body=? WHERE id=?',[JSON.stringify(record),p.id]);}
  return {fotos};
 }
 return async(req,res,url)=>{
  const match=url.pathname.match(/^\/api\/gallery\/([^/]+)$/);if(!match)return false;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true;};
  if(!req.user)return send(401,{error:'Inicia sesión para ver las fotos'});
  if(req.method!=='GET')return send(405,{error:'Método no permitido'});
  const row=await db.get("SELECT body FROM records WHERE id=? AND kind='inmuebles'",[decodeURIComponent(match[1])]);
  if(!row)return send(404,{error:'Anuncio no encontrado'});const p=JSON.parse(row.body);
  if(req.user.role!=='admin'&&p.estado!=='activo')return send(404,{error:'Anuncio no disponible'});
  if(p.fotos?.length&&Date.now()-Date.parse(p.fotosConsultadasEn)<86400000)return send(200,{fotos:p.fotos.filter(safePhoto)});
  if(!(options.galleryRemoteEnabled ?? process.env.RADAR_GALLERY_REMOTE==='true'))return send(200,{fotos:(p.fotos||[p.foto]).filter(safePhoto),message:'Se muestran las fotos guardadas. La consulta de fotos adicionales está desactivada.'});
  if(!pending.has(p.id))pending.set(p.id,collect(p).catch(()=>({fotos:(p.fotos||[p.foto]).filter(safePhoto),message:'No se pudieron recuperar más fotos. Puedes consultar el anuncio original.'})).finally(()=>pending.delete(p.id)));
  return send(200,await pending.get(p.id));
 };
}
