import {randomUUID} from 'node:crypto';
import {parseRah,robotsAllowed} from './collector.mjs';
import {parseRemax} from './remax.mjs';
import {listingFingerprint} from './listing-fingerprint.mjs';
import {automaticSourceIds} from './source-registry.mjs';
import {century21LaraUrl,parseCentury21} from './century21.mjs';

const nowIso=()=>new Date().toISOString();
const decode=value=>String(value||'').replace(/&amp;/g,'&');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stoppedError=()=>Object.assign(Error('Actualización detenida por el administrador'),{code:'CAPTURE_STOPPED'});
const checkControl=async options=>{
 if(options.signal?.aborted)throw stoppedError();
 if(options.checkpoint)await options.checkpoint();
 if(options.signal?.aborted)throw stoppedError();
};
const controlledWait=async(ms,options)=>{
 await checkControl(options);
 if(options.sleep!==wait){await options.sleep(ms);await checkControl(options);return;}
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(done,ms);function done(){options.signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(stoppedError());}
  options.signal?.addEventListener('abort',abort,{once:true});
 });
 await checkControl(options);
};
const report=(options,progress,phase)=>options.onSourceProgress?.(Math.max(0,Math.min(100,Math.round(progress))),phase);

async function download(fetcher,url,userAgent,options={}){
 await checkControl(options);
 const timeout=AbortSignal.timeout(25000),signal=options.signal?AbortSignal.any([timeout,options.signal]):timeout;
 const response=await fetcher(url,{headers:{'User-Agent':userAgent},redirect:'error',signal});
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
   const record={...previous,...input,id:previous?.id||randomUUID(),estado:previous?.estado||input.estado,creadoEn:previous?.creadoEn||now,actualizadoEn:now,ultimaDeteccion:now,primeraDeteccion:previous?.primeraDeteccion||previous?.creadoEn||now,sourceScope:metadata.scopeKey||previous?.sourceScope||'',missingRuns:0,missingSince:'',availabilityReview:'visible',historial:history};
   record.dedupeKey=listingFingerprint(record);record.dedupeStatus=previous?.dedupeStatus||'pendiente_revision';
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

export async function refreshRentahouse(db,options={}){
 const {fetcher=fetch,sleep=wait}=options;
 const source='Rent-A-House';
 try{
  report(options,5,'Comprobando permisos');
  const origin='https://rentahouse.com.ve',robots=await download(fetcher,origin+'/robots.txt','RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)',options);
  if(!robots.includes('Crawl-delay: 10')||/^Disallow:\s*\/$/m.test(robots))throw Error('Las reglas de acceso requieren revisión; actualización detenida');
  const records=[];
  for(const [index,operation] of ['venta','alquiler'].entries()){const url=`${origin}/apartamento_en_${operation}_en_barquisimeto.html`;if(!robotsAllowed(robots,url))throw Error('La fuente excluye la ruta de '+operation);report(options,15+index*36,'Esperando acceso a '+operation);await controlledWait(10000,{...options,sleep});report(options,27+index*36,'Leyendo anuncios de '+operation);const batch=parseRah(await download(fetcher,url,'RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)',options),operation);if(!batch.length)throw Error('No se reconocen anuncios de '+operation);records.push(...batch);}
  report(options,94,'Guardando resultados');
  return await importObservedRecords(db,records,{source,scope:'Primera página de apartamentos en venta y alquiler, Barquisimeto',scopeKey:'rentahouse:barquisimeto:apartamentos:primera-pagina',complete:false});
 }catch(error){if(error.code==='CAPTURE_STOPPED'||options.signal?.aborted)throw stoppedError();await failedRun(db,source,error);throw error;}
}

export async function refreshRemax(db,options={}){
 const {fetcher=fetch,sleep=wait}=options;
 const source='RE/MAX';
 try{
  report(options,5,'Comprobando permisos');
  const origin='https://www.remax.com.ve',robots=await download(fetcher,origin+'/robots.txt','RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)',options),delay=Math.max(2,Number(robots.match(/Crawl-delay:\s*(\d+)/i)?.[1]||2))*1000,records=new Map(),offices=['express','Galaxy','royal','synergy'];
  for(const [officeIndex,office] of offices.entries()){let url=origin+'/'+office;const seen=new Set();report(options,10+officeIndex*20,'Revisando oficina '+office);while(url){if(seen.has(url)||seen.size>=100)throw Error('Paginación inesperada en '+office);seen.add(url);if(!robotsAllowed(robots,url))throw Error('La fuente excluye la oficina '+office);await controlledWait(delay,{...options,sleep});const html=await download(fetcher,url,'RadarVenezuela/0.3 (actualizacion manual; anuncios publicos)',options);parseRemax(html).forEach(item=>records.set(item.sourceCode+':'+item.operacion,item));const next=html.match(/<a[^>]*href="([^"]+)"[^>]*class="next"/i)?.[1];if(!next){url='';continue;}const target=new URL(decode(next),url);if(target.origin!==origin||target.pathname.toLowerCase()!=='/'+office.toLowerCase()||!/^\?page=\d+$/.test(target.search))throw Error('Enlace de paginación no permitido');url=target.href;}}
  if(!records.size)throw Error('No se encontraron anuncios reconocidos');
  report(options,94,'Guardando resultados');
  return await importObservedRecords(db,[...records.values()],{source,scope:'Apartamentos y terrenos en Barquisimeto: Express, Galaxy, Royal y Synergy',scopeKey:'remax:barquisimeto:express-galaxy-royal-synergy',complete:true});
 }catch(error){if(error.code==='CAPTURE_STOPPED'||options.signal?.aborted)throw stoppedError();await failedRun(db,source,error);throw error;}
}

export async function refreshCentury21(db,options={}){
 const {fetcher=fetch,sleep=wait}=options;
 const source='Century 21 Venezuela',origin=new URL(century21LaraUrl).origin;
 try{
  report(options,5,'Comprobando permisos');
  const robots=await download(fetcher,origin+'/robots.txt','RadarVenezuela/0.3 (piloto interno; anuncios publicos)',options);
  if(!robotsAllowed(robots,century21LaraUrl))throw Error('Century 21 excluye la búsqueda pública de Lara');
  report(options,25,'Esperando acceso');await controlledWait(3000,{...options,sleep});
  report(options,55,'Leyendo anuncios de Lara');const records=parseCentury21(await download(fetcher,century21LaraUrl,'RadarVenezuela/0.3 (piloto interno; anuncios publicos)',options));
  report(options,94,'Guardando resultados');
  return await importObservedRecords(db,records,{source,scope:'Inventario público completo del estado Lara',scopeKey:'century21:lara:resultados',complete:true});
 }catch(error){if(error.code==='CAPTURE_STOPPED'||options.signal?.aborted)throw stoppedError();await failedRun(db,source,error);throw error;}
}

export async function refreshSources(db,source='all',options={}){
 const selected=source==='all'?automaticSourceIds:[source];if(!selected.every(value=>automaticSourceIds.includes(value)))throw Error('Fuente no válida');
 const runners={rentahouse:refreshRentahouse,remax:refreshRemax,century21:refreshCentury21},names={rentahouse:'Rent-A-House',remax:'RE/MAX',century21:'Century 21 Venezuela'};
 const results=[];for(const [index,value] of selected.entries()){
  await checkControl(options);options.onProgress?.({source:value,sourceProgress:0,progress:Math.round(index/selected.length*100),phase:'Iniciando '+names[value]});
  const sourceOptions={...options,onSourceProgress:(sourceProgress,phase)=>options.onProgress?.({source:value,sourceProgress,progress:Math.round((index+sourceProgress/100)/selected.length*100),phase})};
  try{results.push(await runners[value](db,sourceOptions));options.onProgress?.({source:value,sourceProgress:100,progress:Math.round((index+1)/selected.length*100),phase:names[value]+' actualizada'});}catch(error){if(error.code==='CAPTURE_STOPPED'||options.signal?.aborted)throw stoppedError();results.push({source:names[value],status:'fallida',error:error.message});options.onProgress?.({source:value,sourceProgress:100,progress:Math.round((index+1)/selected.length*100),phase:names[value]+' terminó con errores',failed:true});}
 }
 return results;
}
