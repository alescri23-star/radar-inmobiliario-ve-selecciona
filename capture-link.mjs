import {createHash,randomUUID} from 'node:crypto';
import {robotsAllowed} from './collector.mjs';
import {landType} from './land.mjs';
import {parseRemax} from './remax.mjs';

const sources={
 'www.remax.com.ve':{id:'remax',name:'RE/MAX',photo:/^https:\/\/cdn\.remax\.com\.ve\//},
 'rentahouse.com.ve':{id:'rentahouse',name:'Rent-A-House',photo:/^https:\/\/cdn\.photos\.sparkplatform\.com\/ven\//}
};
const entities=value=>String(value||'').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const meta=(html,key)=>entities(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,'i'))?.[1]||html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,'i'))?.[1]||'');
const number=value=>{const raw=String(value??'').replace(/[^\d.,-]/g,'');if(!raw)return'';const normalized=raw.includes(',')&&raw.includes('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(',','.');return Number.isFinite(Number(normalized))?String(Number(normalized)):'';};
function jsonLd(html){
 const entries=[];
 for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{const value=JSON.parse(match[1]);entries.push(...(Array.isArray(value)?value:[value]));}catch{}
 return entries.flatMap(value=>Array.isArray(value?.['@graph'])?value['@graph']:[value]).find(value=>value&&typeof value==='object'&&(value.name||value.offers))||{};
}
export function validateListingUrl(raw){
 let url;try{url=new URL(String(raw||'').trim());}catch{throw Error('Pega un enlace completo y válido');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!sources[url.hostname])throw Error('Admitimos enlaces HTTPS de RE/MAX Venezuela y Rent-A-House Venezuela');
 url.hash='';return {url,source:sources[url.hostname]};
}
export function parseListingPage(html,rawUrl){
 const {url,source}=validateListingUrl(rawUrl);
 if(source.id==='remax')try{const records=parseRemax(html);const code=url.pathname.match(/(\d{4,})\/?$/)?.[1];const found=records.find(item=>item.sourceCode===code)||records[0];if(found)return {...found,fuente:url.href,estado:'borrador'};}catch{}
 const ld=jsonLd(html),offer=Array.isArray(ld.offers)?ld.offers[0]||{}:ld.offers||{};
 const title=entities(ld.name||meta(html,'og:title')||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
 if(!title)throw Error('No se pudo reconocer el título del anuncio');
 const description=entities(ld.description||meta(html,'og:description'));
 const pathText=decodeURIComponent(url.pathname).toLowerCase(),allText=(title+' '+description+' '+pathText).toLowerCase();
 const operation=pathText.includes('/alquiler')||/\balquiler\b/.test(allText)?'alquiler':'venta';
 const isLand=/terreno|parcela|lote|finca/.test(allText),type=isLand?landType(title,description):/\bcasa\b/.test(allText)?'Casa':/apartamento|apto\.?/.test(allText)?'Apartamento':'Otro';
 const image=typeof ld.image==='string'?ld.image:Array.isArray(ld.image)?ld.image[0]:ld.image?.url||meta(html,'og:image');
 const photo=source.photo.test(String(image||''))?String(image):'';
 const geo=ld.geo||{},lat=Number(geo.latitude),lng=Number(geo.longitude),located=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
 const sourceCode=url.pathname.match(/([0-9]+(?:-[0-9]+)*)(?:\.html)?\/?$/i)?.[1]||createHash('sha256').update(url.href).digest('hex').slice(0,24);
 return {sourceId:source.id,sourceCode,titulo:title,foto:photo,tipo:type,operacion:operation,precio:number(offer.price||meta(html,'product:price:amount')),moneda:String(offer.priceCurrency||meta(html,'product:price:currency')||'USD').toUpperCase()==='VES'?'VES':'USD',fuente:url.href,estado:'borrador',municipio:'',parroquia:'',zona:'',calle:'',direccion:entities(ld.address?.streetAddress||''),habitaciones:'',banos:'',superficie:'',descripcion:description,latitud:located?String(lat):'',longitud:located?String(lng):'',ubicacionPrecision:located?'publicada':'',ubicacionFuente:located?source.name+': datos del anuncio':'',ubicacionConsultadaEn:new Date().toISOString()};
}
async function download(fetcher,url){const response=await fetcher(url,{headers:{'User-Agent':'RadarVenezuela/0.3 (captura manual de anuncio publico)'},redirect:'error',signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('La fuente respondió con HTTP '+response.status);const text=await response.text();if(text.length>5_000_000)throw Error('La página del anuncio es demasiado grande');return text;}
export async function captureListing(db,rawUrl,fetcher=fetch){
 const {url,source}=validateListingUrl(rawUrl),robots=await download(fetcher,url.origin+'/robots.txt');
 if(!robotsAllowed(robots,url.href))throw Error('La fuente no permite capturar ese enlace');
 const record=parseListingPage(await download(fetcher,url.href),url.href),rows=(await db.all('SELECT body FROM records WHERE kind=?',['inmuebles'])).map(row=>JSON.parse(row.body));
 const previous=rows.find(item=>item.fuente===url.href||(item.sourceId===record.sourceId&&item.sourceCode===record.sourceCode)),now=new Date().toISOString(),history=previous?.historial||[];
 if(!previous||previous.precio!==record.precio)history.push({precio:record.precio,moneda:record.moneda,observadoEn:now});
 const saved={...previous,...record,id:previous?.id||randomUUID(),estado:previous?.estado||'borrador',creadoEn:previous?.creadoEn||now,actualizadoEn:now,ultimaDeteccion:now,historial:history};
 const run={id:randomUUID(),source:source.name,fecha:now,added:previous?0:1,updated:previous?1:0,changes:previous&&previous.precio!==record.precio?1:0,total:1,scope:'Captura manual mediante enlace',status:'completada'};
 await db.transaction(async tx=>{await tx.upsertRecord(saved.id,'inmuebles',JSON.stringify(saved));await tx.upsertRecord(run.id,'runs',JSON.stringify(run));});
 return {property:saved,run,created:!previous};
}
