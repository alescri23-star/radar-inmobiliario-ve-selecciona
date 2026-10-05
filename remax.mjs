import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {importRah,robotsAllowed} from './collector.mjs';
const decode=s=>s.replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&apos;/g,"'");
export function parseRemax(html){
 const records=[];let recognized=false;
 for(const m of html.matchAll(/data-props="([^"]*)"/g)){
  const json=JSON.parse(decode(m[1]));if(!Array.isArray(json.inmuebles))continue;recognized=true;
  for(const p of json.inmuebles){
   if(p.localidad?.trim().toLowerCase()!=='barquisimeto'||p.region?.trim().toLowerCase()!=='lara'||!['Apartamento','Terreno y Parcela'].includes(p.tipoInmueble)||!['Venta','Alquiler'].includes(p.operacion))continue;
   const url=new URL(p.urlNew||p.url);if(url.protocol!=='https:'||url.hostname!=='www.remax.com.ve'||!p.idInmueble||!p.nombre)throw Error('Anuncio RE/MAX incompleto');
   const match=p.precioReferencial?.match(/^([\d.,]+)\s*USD/);const price=match?.[1].replace(/\./g,'').replace(',','.');
   if(price!==undefined&&!Number.isFinite(Number(price)))throw Error('Precio RE/MAX inválido');
   const lat=Number(p.latitud),lng=Number(p.longitud),located=!!p.latitud&&!!p.longitud&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=9.7&&lat<=10.6&&lng>=-70&&lng<=-69;
   const land=p.tipoInmueble==='Terreno y Parcela';const title=p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const rural=/\bterreno\s+rustico\b/.test(title),urban=/\bterreno\s+urbano\b/.test(title);const type=land?(rural&&!urban?'Terreno rústico':urban&&!rural?'Terreno urbano':'Terreno sin clasificar'):'Apartamento';
   records.push({sourceId:'remax',sourceCode:String(p.idInmueble),titulo:p.nombre.trim(),tipo:type,operacion:p.operacion.toLowerCase(),precio:price??'',moneda:'USD',fuente:url.href,estado:'activo',municipio:p.subRegion||'',parroquia:'',zona:'',calle:'',direccion:p.detalleUbicacion||'',habitaciones:String(p.nroHabitaciones??''),banos:String(p.nroBanios??''),superficie:String((land?p.areaTerreno:p.areaConstruccion)??''),descripcion:'',latitud:located?String(lat):'',longitud:located?String(lng):'',ubicacionPrecision:located?'publicada':'',ubicacionFuente:located?'RE/MAX: mapa del listado':'',ubicacionConsultadaEn:new Date().toISOString()});
  }
 }
 if(!recognized)throw Error('Estructura RE/MAX no reconocida; no se importa un inventario vacío');
 return records;
}
async function download(url){const r=await fetch(url,{headers:{'User-Agent':'RadarVenezuela/0.2 (consulta de anuncios publicos)'},redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);const text=await r.text();if(text.length>5000000)throw Error('Respuesta demasiado grande');return text;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let db;
 try{
  const robots=await download('https://www.remax.com.ve/robots.txt');const delay=Math.max(2,Number(robots.match(/Crawl-delay:\s*(\d+)/i)?.[1]||2))*1000;const records=new Map();
  for(const office of ['express','Galaxy','royal','synergy']){
   let url='https://www.remax.com.ve/'+office;const seen=new Set();
   while(url){if(seen.has(url)||seen.size>=100)throw Error('Paginación inesperada: '+office);seen.add(url);if(!robotsAllowed(robots,url))throw Error('Ruta excluida: '+office);await new Promise(r=>setTimeout(r,delay));const html=await download(url),batch=parseRemax(html);console.log(JSON.stringify({oficina:office,pagina:seen.size,anuncios:batch.length}));batch.forEach(p=>records.set(p.sourceCode+':'+p.operacion,p));
    const next=html.match(/<a[^>]*href="([^"]+)"[^>]*class="next"/i)?.[1];if(!next){url=null;continue;}const target=new URL(decode(next),url);if(target.origin!=='https://www.remax.com.ve'||target.pathname.toLowerCase()!=='/'+office.toLowerCase()||!/^\?page=\d+$/.test(target.search))throw Error('Enlace de paginación no permitido');url=target.href;
   }
  }
  if(!records.size)throw Error('No se encontraron anuncios reconocidos; revisar la fuente');
  db=new DatabaseSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'data/radar.sqlite'));db.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,body TEXT NOT NULL)');
  console.log(JSON.stringify(importRah(db,[...records.values()],{source:'RE/MAX',scope:'Apartamentos y terrenos Barquisimeto: páginas de Express, Galaxy, Royal y Synergy'})));
 }catch(e){console.error(e.message);process.exitCode=1;}finally{db?.close();}
}
