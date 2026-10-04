import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/(Ã[\x80-\xBF]|Â[\x80-\xBF])/g,v=>Buffer.from(v,'latin1').toString('utf8')).replace(/\s+/g,' ').trim();
export function parseRah(html,operation){
 const blocks=html.split('class="card bg-light mb-3 property-list"').slice(1);
 return blocks.map(block=>{
  const url=block.match(/href="(https:\/\/rentahouse\.com\.ve\/[^"\s]+rah-[\d-]+\.html)"/)?.[1];
  const code=block.match(/Código RAH:\s*VE\s*(\d+-\d+)/)?.[1];
  const title=plain(block.match(/<h4 class="card-title">([\s\S]*?)<\/h4>/)?.[1]||'');
  const zone=title.match(/(?:Venta|Alquiler)\s+(.*),\s*Barquisimeto/i)?.[1]||'';
  const price=block.match(/<strong>USD\s*([\d.,]+)/)?.[1]?.replace(/\./g,'').replace(',','.');
  const cell=name=>plain(block.match(new RegExp('<td class="'+name+'"[^>]*>([\\s\\S]*?)<\\/td>'))?.[1]||'');
  return {sourceId:'rentahouse',sourceCode:code,titulo:title,zona:zone,municipio:'',parroquia:'',calle:'',tipo:'Apartamento',operacion:operation,precio:price??'',moneda:'USD',fuente:url,estado:'activo',habitaciones:cell('dormitorio'),banos:cell('baño'),superficie:cell('superficie').replace(/\s*m\s*2$/,''),descripcion:plain(block.match(/class="card-text truncate">([\s\S]*?)<\/div>/)?.[1]||''),latitud:'',longitud:'',direccion:''};
 }).filter(p=>p.sourceCode&&p.fuente&&p.titulo&&p.zona);
}
export function importRah(db,records){
 let added=0,updated=0,changes=0;db.exec('BEGIN IMMEDIATE');
 try{const existing=db.prepare("SELECT body FROM records WHERE kind='inmuebles'").all().map(r=>JSON.parse(r.body));
 for(const input of records){const previous=existing.find(p=>p.sourceId===input.sourceId&&p.sourceCode===input.sourceCode&&p.operacion===input.operacion);const now=new Date().toISOString();const history=previous?.historial||[];if(!previous||previous.precio!==input.precio){history.push({precio:input.precio,moneda:input.moneda,observadoEn:now});if(previous)changes++;}
 const record={...previous,...input,id:previous?.id||randomUUID(),creadoEn:previous?.creadoEn||now,actualizadoEn:now,ultimaDeteccion:now,historial:history};
 for(const key of ['latitud','longitud','direccion','municipio','parroquia','calle'])if(previous?.[key])record[key]=previous[key];
 db.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(record.id,'inmuebles',JSON.stringify(record));if(previous)updated++;else{added++;existing.push(record);}}
 const run={id:randomUUID(),source:'Rent-A-House',fecha:new Date().toISOString(),added,updated,changes,total:records.length,scope:'Primera página de apartamentos, Barquisimeto',status:'completada'};db.prepare('INSERT INTO records VALUES(?,?,?)').run(run.id,'runs',JSON.stringify(run));db.exec('COMMIT');return run;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function robotsAllowed(text,url){
 const pathname=new URL(url).pathname+new URL(url).search;let applies=false,rules=[];
 for(const line of text.split(/\r?\n/)){const match=line.split('#')[0].match(/^\s*(User-agent|Allow|Disallow)\s*:\s*(.*?)\s*$/i);if(!match)continue;const key=match[1].toLowerCase(),value=match[2];if(key==='user-agent'){applies=value==='*';continue;}if(!applies||!value)continue;const pattern=value.split('*').map(part=>RegExp.escape(part)).join('.*');if(new RegExp('^'+pattern).test(pathname))rules.push({allow:key==='allow',length:value.length});}
 rules.sort((a,b)=>b.length-a.length||Number(b.allow)-Number(a.allow));return !rules.length||rules[0].allow;
}
async function download(url){const r=await fetch(url,{headers:{'User-Agent':'RadarVenezuela/0.2 (piloto local; consulta de anuncios publicos)'},signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();if(html.length>5000000)throw Error('Respuesta demasiado grande');return html;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=path.dirname(fileURLToPath(import.meta.url));mkdirSync(path.join(base,'data'),{recursive:true});const db=new DatabaseSync(path.join(base,'data/radar.sqlite'));db.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,body TEXT NOT NULL)');
 try{
  let records=[];
  if(process.argv[2]==='--file'){records=parseRah(readFileSync(process.argv[3],'utf8'),process.argv[4]||'venta');}
  else{
   const robots=await download('https://rentahouse.com.ve/robots.txt');
   if(!robots.includes('Crawl-delay: 10')||/^Disallow:\s*\/$/m.test(robots)||/Disallow:\s*\/apartamento/m.test(robots))throw Error('Las reglas de acceso requieren revisión; capturador detenido');
   for(const operation of ['venta','alquiler']){await wait(10000);const url=`https://rentahouse.com.ve/apartamento_en_${operation}_en_barquisimeto.html`;if(!robotsAllowed(robots,url))throw Error('Ruta excluida por las reglas de la fuente');const html=await download(url);const batch=parseRah(html,operation);if(!batch.length)throw Error('No se reconocen anuncios: revisar fuente, sin interpretar como inventario vacío');records.push(...batch);}
  }
  if(!records.length)throw Error('No hay anuncios reconocidos');console.log(JSON.stringify(importRah(db,records)));
 }catch(e){console.error(e.message);process.exitCode=1;}finally{db.close();}
}
