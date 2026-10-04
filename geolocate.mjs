import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {robotsAllowed} from './collector.mjs';
export function coordinates(html){
 const lat=html.match(/data-latitude\s*=\s*["']\s*(-?[\d.]+)\s*["']/i)?.[1];
 const lng=html.match(/data-longitude\s*=\s*["']\s*(-?[\d.]+)\s*["']/i)?.[1];
 if(!lat||!lng||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))return null;
 // Rechazar puntos claramente fuera del área del piloto; nunca sustituirlos por el centro.
 if(Number(lat)<9.7||Number(lat)>10.6||Number(lng)<-70||Number(lng)>-69)return null;
 return {latitud:lat,longitud:lng,ubicacionPrecision:'publicada',ubicacionFuente:'Rent-A-House: mapa del anuncio',ubicacionVerificada:false};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function download(url){const r=await fetch(url,{headers:{'User-Agent':'RadarVenezuela/0.2 (piloto local; consulta de ubicaciones publicadas)'},signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();if(html.length>5000000)throw Error('Respuesta demasiado grande');return html;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const db=new DatabaseSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'data/radar.sqlite'));
 try{
  const robots=await download('https://rentahouse.com.ve/robots.txt');
  const delay=Math.max(10,Number(robots.match(/Crawl-delay:\s*(\d+)/i)?.[1]||10))*1000;
  const rows=db.prepare("SELECT id,body FROM records WHERE kind='inmuebles'").all().map(row=>JSON.parse(row.body)).filter(p=>p.sourceId==='rentahouse'&&(!p.latitud||!p.longitud));
  let located=0,pending=0;
  for(let i=0;i<rows.length;i++){
   const record=rows[i];const url=new URL(record.fuente);
   if(url.hostname!=='rentahouse.com.ve'||url.protocol!=='https:'||!robotsAllowed(robots,url.href)){console.log('Omitido por reglas de acceso: '+record.sourceCode);pending++;continue;}
   await wait(delay);
   try{
    const location=coordinates(await download(url.href));
    const current=JSON.parse(db.prepare('SELECT body FROM records WHERE id=?').get(record.id).body);
    if(current.latitud&&current.longitud){console.log('Conservada ubicación corregida: '+record.sourceCode);continue;}
    if(location){Object.assign(current,location,{ubicacionConsultadaEn:new Date().toISOString()});db.prepare('UPDATE records SET body=? WHERE id=?').run(JSON.stringify(current),current.id);located++;}
    else pending++;
    console.log(JSON.stringify({avance:i+1,total:rows.length,codigo:record.sourceCode,ubicado:!!location,located,pending}));
   }catch(e){pending++;console.log(JSON.stringify({avance:i+1,total:rows.length,codigo:record.sourceCode,error:e.message}));}
  }
  console.log(JSON.stringify({completado:true,located,pending}));
 }catch(e){console.error(e.message);process.exitCode=1;}finally{db.close();}
}
