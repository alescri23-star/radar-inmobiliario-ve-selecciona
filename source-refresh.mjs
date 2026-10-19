import {randomUUID} from 'node:crypto';
import {parseRah,robotsAllowed} from './collector.mjs';
import {parseRemax} from './remax.mjs';

const nowIso=()=>new Date().toISOString();
const decode=value=>String(value||'').replace(/&amp;/g,'&');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function download(fetcher,url,userAgent){
 const response=await fetcher(url,{headers:{'User-Agent':userAgent},redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('La fuente respondió con HTTP '+response.status);
 const text=await response.text();
 if(text.length>5_000_000)throw Error('La respuesta de la fuente es demasiado grande');
 return text;
}

export async function importObservedRecords(db,inputs,metadata={}){
 const existing=(await db.all('SELECT body FROM records WHERE kind=?',['inmuebles'])).map(row=>JSON.parse(row.body));
 const observed=new Set(),now=metadata.now||nowIso();let added=0,updated=0,changes=0,notSeen=0,possibleRemoved=0,run;
 await db.transaction(async tx=>{
  for(const input of inputs){
   const key=input.sourceId+':'+input.sourceCode+':'+input.operacion;observed.add(key);
   const previous=existing.find(item=>item.sourceId===input.sourceId&&item.sourceCode===input.sourceCode&&item.operacion===input.operacion);
   const history=[...(previous?.historial||[])];
   if(!previous||previous.precio!==input.precio){history.push({precio:input.precio,moneda:input.moneda,observadoEn:now});if(previous)changes++;}
   const record={...previous,...input,id:previous?.id||randomUUID(),creadoEn:previous?.creadoEn||now,actualizadoEn:now,ultimaDeteccion:now,primeraDeteccion:previous?.primeraDeteccion||previous?.creadoEn||now,sourceScope:metadata.scopeKey||previous?.sourceScope||'',missingRuns:0,missingSince:'',availabilityReview:'visible',historial:history};
   for(const field of ['latitud','longitud','direccion','municipio','parroquia','calle','ubicacionPrecision','ubicacionFuente','ubicacionConsultadaEn','terrenoClasificacionFuente','terrenoClasificacionEvidencia','terrenoClasificacionConfianza','terrenoClasificacionRevisadaEn'])if(previous?.[field])record[field]=previous[field];
   if(previous?.terrenoClasificacionRevisadaEn)record.tipo=previous.tipo;
   await tx.upsertRecord(record.id,'inmuebles',JSON.stringify(record));
   if(previous)updated++;else{added++;existing.push(record);}
  }
  if(metadata.complete===true&&metadata.scopeKey){
   for(const previous of existing.filter(item=>item.sourceScope===metadata.scopeKey)){
    const key=previous.sourceId+':'+previous.sourceCode+':'+previous.operacion;if(observed.has(key))continue;
    const missingRuns=Number(previous.missingRuns||0)+1,review=missingRuns>=2?'posiblemente_retirado':'no_visto_una_vez';
    const record={...previous,missingRuns,missingSince:previous.missingSince||now,availabilityReview:review,actualizadoEn:now};
    await tx.upsertRecord(record.id,'inmuebles',JSON.stringify(record));notSeen++;if(review==='posiblemente_retirado')possibleRemoved++;
   }
  }
  run={id:randomUUID(),source:metadata.source||'Fuente',fecha:now,added,updated,changes,total:inputs.length,notSeen,possibleRemoved,scope:metadata.scope||'',scopeKey:metadata.scopeKey||'',coverage:metadata.complete===true?'completa':'parcial',status:'completada'};
  await tx.upsertRecord(run.id,'runs',JSON.stringify(run));
 });
 return run;
}

async function failedRun(db,source,error){
 const run={id:randomUUID(),source,fecha:nowIso(),added:0,updated:0,changes:0,total:0,notSeen:0,possibleRemoved:0,scope:'Actualización manual',coverage:'sin completar',status:'fallida',error:String(error?.message||error).slice(0,300)};
 await db.upsertRecord(run.id,'runs',JSON.stringify(run));return run;
}

export async function refreshRentahouse(db,{fetcher=fetch,sleep=wait}={}){
 const source='Rent-A-House';
 try{
  const origin='https://rentahouse.com.ve',robots=await download(fetcher,origin+'/robots.txt','RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)');
  if(!robots.includes('Crawl-delay: 10')||/^Disallow:\s*\/$/m.test(robots))throw Error('Las reglas de acceso requieren revisión; actualización detenida');
  const records=[];
  for(const operation of ['venta','alquiler']){const url=`${origin}/apartamento_en_${operation}_en_barquisimeto.html`;if(!robotsAllowed(robots,url))throw Error('La fuente excluye la ruta de '+operation);await sleep(10000);const batch=parseRah(await download(fetcher,url,'RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)'),operation);if(!batch.length)throw Error('No se reconocen anuncios de '+operation);records.push(...batch);}
  return await importObservedRecords(db,records,{source,scope:'Primera página de apartamentos en venta y alquiler, Barquisimeto',scopeKey:'rentahouse:barquisimeto:apartamentos:primera-pagina',complete:false});
 }catch(error){await failedRun(db,source,error);throw error;}
}

export async function refreshRemax(db,{fetcher=fetch,sleep=wait}={}){
 const source='RE/MAX';
 try{
  const origin='https://www.remax.com.ve',robots=await download(fetcher,origin+'/robots.txt','RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)'),delay=Math.max(2,Number(robots.match(/Crawl-delay:\s*(\d+)/i)?.[1]||2))*1000,records=new Map();
  for(const office of ['express','Galaxy','royal','synergy']){let url=origin+'/'+office;const seen=new Set();while(url){if(seen.has(url)||seen.size>=100)throw Error('Paginación inesperada en '+office);seen.add(url);if(!robotsAllowed(robots,url))throw Error('La fuente excluye la oficina '+office);await sleep(delay);const html=await download(fetcher,url,'RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)');parseRemax(html).forEach(item=>records.set(item.sourceCode+':'+item.operacion,item));const next=html.match(/<a[^>]*href="([^"]+)"[^>]*class="next"/i)?.[1];if(!next){url='';continue;}const target=new URL(decode(next),url);if(target.origin!==origin||target.pathname.toLowerCase()!=='/'+office.toLowerCase()||!/^\?page=\d+$/.test(target.search))throw Error('Enlace de paginación no permitido');url=target.href;}}
  if(!records.size)throw Error('No se encontraron anuncios reconocidos');
  return await importObservedRecords(db,[...records.values()],{source,scope:'Apartamentos y terrenos en Barquisimeto: Express, Galaxy, Royal y Synergy',scopeKey:'remax:barquisimeto:express-galaxy-royal-synergy',complete:true});
 }catch(error){await failedRun(db,source,error);throw error;}
}

export async function refreshSources(db,source='all',options={}){
 const selected=source==='all'?['rentahouse','remax']:[source];if(!selected.every(value=>['rentahouse','remax'].includes(value)))throw Error('Fuente no válida');
 const results=[];for(const value of selected){try{results.push(await (value==='rentahouse'?refreshRentahouse(db,options):refreshRemax(db,options)));}catch(error){results.push({source:value==='rentahouse'?'Rent-A-House':'RE/MAX',status:'fallida',error:error.message});}}
 return results;
}
