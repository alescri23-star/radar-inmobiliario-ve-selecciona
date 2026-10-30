import {createHash} from 'node:crypto';

const allowedSources=new Set(['all','web','maps','instagram','facebook','linkedin','tiktok','infoguia']);
const siteFilters={maps:'site:google.com/maps',instagram:'site:instagram.com',facebook:'site:facebook.com',linkedin:'site:linkedin.com',tiktok:'site:tiktok.com'};
const infoguiaCategories={
 'Construcción y obra civil':'https://infoguia.com/ct.asp?cat=1294&ciud=53&key=constructoras-barquisimeto',
 'Plomería':'https://infoguia.com/ct.asp?cat=110&ciud=53&key=servicio-de-plomeria-fontanero-barquisimeto',
 'Impermeabilización y techos':'https://infoguia.com/ct.asp?cat=450&ciud=53&key=impermeabilizacion-barquisimeto',
 'Arquitectura y diseño':'https://infoguia.com/ct.asp?cat=1331&ciud=53&key=decoracion-decoraciones-barquisimeto'
};
const defaultInfoguia='https://infoguia.com/ct.asp?cat=1656&ciud=53&key=remodelaciones-servicios-de-remodelacion-barquisimeto';

const decode=value=>String(value||'').replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number))).replace(/&#x([0-9a-f]+);/gi,(_,number)=>String.fromCodePoint(parseInt(number,16))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,name)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[name]));
const text=value=>decode(String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
const first=(value,expression)=>text(value.match(expression)?.[1]||'');
const safeUrl=value=>{try{const url=new URL(decode(value),'https://infoguia.com');return url.protocol==='https:'?url.href:'';}catch{return '';}};
const identity=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
const typeFor=specialty=>specialty==='Construcción y obra civil'?'Constructora':specialty==='Arquitectura y diseño'?'Arquitectura y diseño':'Empresa de reformas';
const phoneFrom=value=>String(value||'').match(/(?:\+?58\s*)?\(?0?(?:2\d{2}|4\d{2})\)?[\s.-]*\d{3}[\s.-]*\d{4}/)?.[0]?.trim()||'';
const cleanTitle=value=>text(value).replace(/\s+(?:[-|·]\s*)?(?:Instagram|Facebook|LinkedIn|TikTok|Infoguia Venezuela)$/i,'').replace(/\s+[-|·]\s+(?:Barquisimeto|Lara).*$/i,'').slice(0,120);

function candidate({name,description,url,contact='',address='',source,specialty,zone}){
 const sitioWeb=safeUrl(url),nombre=cleanTitle(name),servicios=text(description).slice(0,1000),contacto=contact||phoneFrom(servicios);
 if(!nombre||!sitioWeb)return null;
 return {resultId:identity(sitioWeb),nombre,personaContacto:'',email:'',tipoEmpresa:typeFor(specialty),servicios:servicios||specialty||'Servicios por comprobar',contacto,whatsapp:'',sitioWeb,direccion:text(address).slice(0,300),cobertura:text(zone||'Barquisimeto, Lara').slice(0,300),experiencia:'',rif:'',responsableTecnico:'',fuente:source||new URL(sitioWeb).hostname,observaciones:'Resultado público pendiente de verificar.',fechaRevision:new Date().toLocaleDateString('en-CA'),estado:'candidato',origen:'descubrimiento'};
}

export function parseInfoguia(html,{specialty='',zone='Barquisimeto'}={}){
 return String(html).split(/<div class="box-announce[^>]*>/i).slice(1).map(block=>{
  const anchor=block.match(/<a[^>]*class="[^"]*ads-text-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if(!anchor)return null;
  const phones=[...block.matchAll(/class="telefono-desktop[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map(match=>text(match[1])).filter(Boolean);
  return candidate({name:anchor[2],url:anchor[1],description:first(block,/<p[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i),contact:phones.join(' · '),address:first(block,/id="direccion-empresa\d+"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i),source:'Infoguía',specialty,zone});
 }).filter(Boolean);
}

export function parseSearchRss(xml,{specialty='',zone='Barquisimeto',source='web'}={}){
 return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match=>{const item=match[1];return candidate({name:first(item,/<title>([\s\S]*?)<\/title>/i),url:first(item,/<link>([\s\S]*?)<\/link>/i),description:first(item,/<description>([\s\S]*?)<\/description>/i),source:source==='web'?'Web':source[0].toUpperCase()+source.slice(1),specialty,zone});}).filter(Boolean);
}

async function fetchText(url,fetchImpl){
 const response=await fetchImpl(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; RadarVenezuela/0.1; +https://white-shrew-789999.hostingersite.com/)','Accept-Language':'es-VE,es;q=0.9'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('La fuente respondió con estado '+response.status);
 const value=await response.text();if(value.length>2_000_000)throw Error('La respuesta de la fuente es demasiado grande');return value;
}

export async function discoverProfessionals(input={},fetchImpl=fetch){
 const source=String(input.source||'all').toLowerCase(),specialty=text(input.specialty).slice(0,80),zone=text(input.zone||'Barquisimeto').slice(0,80),keywords=text(input.keywords).slice(0,120);
 if(!allowedSources.has(source))throw Error('Fuente de búsqueda no válida');
 const jobs=[];
 if(['all','infoguia'].includes(source)&&!/cabudare|palavecino/i.test(zone))jobs.push(fetchText(infoguiaCategories[specialty]||defaultInfoguia,fetchImpl).then(html=>parseInfoguia(html,{specialty,zone})).catch(()=>[]));
 if(source!=='infoguia'){
  const selected=source==='all'?'web':source,filter=siteFilters[selected]||'',terms=[filter,'"'+zone+'"','Lara Venezuela',specialty||'(reformas OR construcción OR mantenimiento)',keywords,'(empresa OR profesional OR servicios)'].filter(Boolean).join(' ');
  jobs.push(fetchText('https://www.bing.com/search?format=rss&count=20&q='+encodeURIComponent(terms),fetchImpl).then(xml=>parseSearchRss(xml,{specialty,zone,source:selected})).catch(()=>[]));
 }
 const found=(await Promise.all(jobs)).flat(),seen=new Set();return found.filter(item=>{const key=item.sitioWeb.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,30);
}

export function professionalMatchKey(record={}){
 const website=String(record.sitioWeb||'').toLowerCase().replace(/^https?:\/\/(?:www\.)?/,'').replace(/\/$/,'');
 const phone=String(record.contacto||record.whatsapp||'').replace(/\D/g,'');
 const name=text(record.nombre).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return {website,phone,name};
}
