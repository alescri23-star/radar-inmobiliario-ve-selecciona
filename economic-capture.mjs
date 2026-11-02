import {createHash,randomUUID} from 'node:crypto';
import {listEconomicSignals,normalizeEconomicSignal} from './economic-signals.mjs';

export const economicSources=[
 {id:'pnud-venezuela',name:'PNUD Venezuela',url:'https://www.undp.org/es/venezuela/centro-de-prensa',allowedPath:'/es/venezuela/noticias/',channel:'Fuente oficial',trusted:true},
 {id:'caf-venezuela',name:'CAF · Venezuela',url:'https://www.caf.com/es/paises/venezuela/',allowedPath:'/es/actualidad/noticias/',channel:'Fuente oficial',trusted:true}
];

const relevant=/\b(inversi[oó]n|infraestructura|vivienda|empresa|energ[ií]a|petr[oó]leo|electricidad|financia|comercio|empleo|emprend|reconstru|cooperaci[oó]n|transporte|tecnolog[ií]a|producci[oó]n|agricultura|turismo|inmobili|pyme|desarrollo)\b/i;
const strip=value=>String(value||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
const meta=(html,key)=>strip(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i'))?.slice(1).find(Boolean)||'');
const canonical=value=>{try{const url=new URL(value);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);return url.href.replace(/\/$/,'');}catch{return '';}};
const shortHash=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,20);
const isoDate=value=>{const match=String(value||'').match(/(20\d{2})[-/]([01]\d)[-/]([0-3]\d)/);return match?`${match[1]}-${match[2]}-${match[3]}`:new Date().toLocaleDateString('en-CA');};

export function discoverEconomicLinks(html,source){
 const found=new Map(),pattern=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let match;
 while((match=pattern.exec(String(html)))){
  let url;try{url=new URL(match[1],source.url);}catch{continue;}
  if(url.origin!==new URL(source.url).origin||!url.pathname.toLowerCase().startsWith(source.allowedPath.toLowerCase()))continue;
  const title=strip(match[2]);if(title.length<12||!relevant.test(title))continue;
  found.set(canonical(url.href),title);
 }
 return [...found].map(([url,title])=>({url,title})).slice(0,12);
}

export function classifyEconomicItem(item){
 const value=`${item.title} ${item.summary}`.toLowerCase();
 const rules=[
  [/petr[oó]leo|gas|hidrocarburo/,'Petróleo y gas',['Petróleo','Inversión']],
  [/electric|energ[ií]a|solar|generaci[oó]n/,'Energía',['Electricidad','Inversión']],
  [/vivienda|reconstru|infraestructura|obra|transporte/,'Infraestructura',['Inversión','Empresas']],
  [/tecnolog|digital|fintech|inteligencia artificial/,'Tecnología',['Tecnología','Empresas']],
  [/agric|agro|turismo/,'Economía productiva',['Empresas','Inversión']],
  [/financia|inversi[oó]n|comercio|empresa|pyme|empleo/,'Inversión y empresa',['Empresas','Inversión']]
 ];
 const selected=rules.find(([pattern])=>pattern.test(value))||[null,'Entorno económico',['Política','Inversión']];
 return {sector:selected[1],topics:selected[2],impact:/mill[oó]n|acuerdo|fondo|proyecto|inversi[oó]n|infraestructura|reconstru/i.test(value)?'alto':'medio'};
}

async function download(fetcher,url){
 const response=await fetcher(url,{headers:{'User-Agent':'RadarVenezuela/0.4 (monitor interno; fuentes publicas)'},redirect:'follow',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const text=await response.text();if(text.length>4_000_000)throw Error('Respuesta demasiado grande');return text;
}

export function parseEconomicDetail(html,fallback={}){
 const title=meta(html,'og:title')||strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])||fallback.title;
 const summary=meta(html,'og:description')||meta(html,'description')||`Actualización publicada por ${fallback.source||'la fuente original'}. Requiere lectura y comprobación antes de tomar decisiones.`;
 const date=meta(html,'article:published_time')||html.match(/<time[^>]+datetime=["']([^"']+)/i)?.[1]||'';
 return {title:strip(title).slice(0,180),summary:strip(summary).slice(0,1200),date:isoDate(date),imageUrl:canonical(meta(html,'og:image'))};
}

export async function captureEconomicSignals(db,options={}){
 const fetcher=options.fetcher||fetch,sources=options.sources||economicSources,existing=await listEconomicSignals(db),urls=new Set(existing.map(item=>canonical(item.url)).filter(Boolean)),titles=new Set(existing.map(item=>shortHash(strip(item.title).toLowerCase())));
 let discovered=0,added=0,duplicates=0,failed=0;const errors=[];
 for(const source of sources){
  try{
   options.onProgress?.({source:source.id,phase:`Revisando ${source.name}`});
   const links=discoverEconomicLinks(await download(fetcher,source.url),source);discovered+=links.length;
   for(const link of links){
    if(urls.has(link.url)||titles.has(shortHash(link.title.toLowerCase()))){duplicates++;continue;}
    try{
     const detail=parseEconomicDetail(await download(fetcher,link.url),{title:link.title,source:source.name}),classification=classifyEconomicItem(detail),now=new Date().toISOString();
     if(urls.has(link.url)||titles.has(shortHash(detail.title.toLowerCase()))){duplicates++;continue;}
     const record=normalizeEconomicSignal({...detail,...classification,source:source.name,channel:source.channel,url:link.url,state:'Nacional',confidence:source.trusted?'fuente oficial':'por verificar',opportunity:`Revisar si esta señal genera demanda de inmuebles, suelo, proveedores o servicios profesionales y vincularla con el territorio afectado.`,risk:'La publicación confirma una novedad, pero su impacto económico e inmobiliario debe comprobarse con ubicación, presupuesto, responsables y calendario.',visibleInWeb:Boolean(source.trusted),featured:false,order:500},null,randomUUID());
     record.captureSourceId=source.id;record.capturedAt=now;record.automatic=true;
     await db.upsertRecord(record.id,'economic_signals',JSON.stringify(record));urls.add(link.url);titles.add(shortHash(detail.title.toLowerCase()));added++;
    }catch(error){failed++;errors.push(`${source.name}: ${error.message}`);}
   }
  }catch(error){failed++;errors.push(`${source.name}: ${error.message}`);}
 }
 const run={id:randomUUID(),kind:'economic',startedAt:options.startedAt||new Date().toISOString(),finishedAt:new Date().toISOString(),discovered,added,duplicates,failed,errors:errors.slice(0,10)};
 await db.upsertRecord(run.id,'economic_capture_runs',JSON.stringify(run));return run;
}

export function createEconomicCaptureService(db,options={}){
 let timer=null,status={running:false,startedAt:'',finishedAt:'',phase:'Sin actualizar',lastRun:null,error:''};
 const run=async()=>{
  if(status.running)throw Error('La actualización económica ya está en curso');
  status={...status,running:true,startedAt:new Date().toISOString(),phase:'Buscando novedades',error:''};
  try{const lastRun=await captureEconomicSignals(db,{...options,startedAt:status.startedAt,onProgress:event=>{status={...status,phase:event.phase};}}),partial=lastRun.failed>0;status={running:false,startedAt:status.startedAt,finishedAt:lastRun.finishedAt,phase:partial?'Actualización parcial · revisar fuentes':'Radar económico actualizado',lastRun,error:partial?lastRun.errors.join(' · ').slice(0,300):''};return lastRun;}
  catch(error){status={...status,running:false,finishedAt:new Date().toISOString(),phase:'Actualización incompleta',error:String(error.message||error).slice(0,300)};throw error;}
 };
 const start=intervalMs=>{if(timer)return;const interval=Math.max(900000,Number(intervalMs)||21600000);timer=setInterval(()=>run().catch(()=>{}),interval);timer.unref?.();setTimeout(()=>run().catch(()=>{}),15000).unref?.();};
 const stop=()=>{if(timer)clearInterval(timer);timer=null;};
 return {run,status:()=>({...status}),start,stop};
}
