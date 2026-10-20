import {security} from './security.mjs';
import {adaptDatabase} from './database.mjs';
import {landLabels} from './land-labels.mjs';
import {classifyLand} from './land.mjs';
import {favorites} from './favorites.mjs';
import {gallery} from './gallery.mjs';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
const hash = v => createHash('sha256').update(v).digest('hex');
import { recovery } from './recovery.mjs';
import {captureListing} from './capture-link.mjs';
import {refreshSources} from './source-refresh.mjs';
import {sourceRegistry,automaticSourceIds,publicSource} from './source-registry.mjs';
export function portal(database,options={}) {
 const db=adaptDatabase(database);
 const policy=options.security||security(options);
 const handleLandLabels=landLabels(db);
 const handleFavorites=favorites(db);
 const handleRecovery=recovery(db,options);const handleGallery=gallery(db,options);
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const body=async(req,limit=32768)=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>limit)throw Error('Solicitud demasiado grande');}return JSON.parse(text||'{}');};
 const records=async kind=>(await db.all('SELECT body FROM records WHERE kind=?',[kind])).map(r=>classifyLand(JSON.parse(r.body)));
 const attempts=new Map();
 const professionalAttempts=new Map();
 let captureJob={running:false,startedAt:'',finishedAt:'',source:'',error:''};
 const session=async req=>{const token=req.headers.cookie?.match(/(?:^|;\s*)radar_session=([a-f0-9]+)/)?.[1];return token?db.get('SELECT users.id, email, name, role FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?',[hash(token),Date.now()]):null;};
 return async(req,res,url)=>{
  req.user=await session(req);
  if(!url.pathname.startsWith('/api/'))return false;
  const isProfessionalForm=url.pathname==='/api/professional-applications';
  const externalForm=isProfessionalForm&&['POST','OPTIONS'].includes(req.method)&&policy.applyFormCors(req,res);
  if(isProfessionalForm&&req.method==='OPTIONS'){
   if(!externalForm&&!policy.allows(req)){send(res,403,{error:'Origen no permitido'});return true;}
   res.writeHead(204,{'Cache-Control':'no-store'});res.end();return true;
  }
  if(!policy.allows(req)&&!externalForm){send(res,403,{error:'Origen no permitido'});return true;}
  if(url.pathname==='/api/setup'){send(res,403,{error:'La creación de administradores solo está disponible para el operador del servidor.'});return true;}
  if(await handleLandLabels(req,res,url))return true;
  if(await handleFavorites(req,res,url))return true;
  if(await handleRecovery(req,res,url))return true;
  if(await handleGallery(req,res,url))return true;
  if(url.pathname==='/api/session' && req.method==='GET'){send(res,200,{user:req.user||null,setupRequired:!await db.get("SELECT id FROM users WHERE role='admin'")});return true;}
  if(['/api/register','/api/inquiries'].includes(url.pathname)){
   send(res,404,{error:'Recurso no disponible'});return true;
  }
  if(url.pathname==='/api/login' && req.method==='POST'){
   try{
    const input=await body(req), email=String(input.email||'').trim().toLowerCase(), password=String(input.password||'');
    const limitKey='login:'+hash(email),entry=attempts.get(limitKey)||{count:0,until:Date.now()+600000};if(entry.until<Date.now()){entry.count=0;entry.until=Date.now()+600000;}if(++entry.count>20){send(res,429,{error:'Demasiados intentos. Espera unos minutos.'});return true;}attempts.set(limitKey,entry);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>200)throw Error('Usa un email válido y una contraseña de 10 a 200 caracteres');
    const user=await db.get('SELECT * FROM users WHERE email=?',[email]);
    if(!user||user.role!=='admin'||!timingSafeEqual(scryptSync(password,user.salt,64),Buffer.from(user.password,'hex')))throw Error('Email o contraseña incorrectos');
    const token=randomBytes(32).toString('hex');await db.run('INSERT INTO sessions VALUES(?,?,?)',[hash(token),user.id,Date.now()+86400000]);
    res.setHeader('Set-Cookie',policy.cookie(token));send(res,200,{user:{id:user.id,email:user.email,name:user.name,role:user.role}});
   }catch(e){send(res,400,{error:e.code==='ER_DUP_ENTRY'||e.message.includes('UNIQUE')?'Ese email ya está registrado':e.message});}return true;
  }
  if(url.pathname==='/api/logout' && req.method==='POST'){const token=req.headers.cookie?.match(/radar_session=([a-f0-9]+)/)?.[1];if(token)await db.run('DELETE FROM sessions WHERE token=?',[hash(token)]);res.setHeader('Set-Cookie',policy.cookie());send(res,200,{ok:true});return true;}
  if(url.pathname==='/api/public/inmuebles' && req.method==='GET'){
   if(req.user?.role!=='admin'){send(res,401,{error:'Acceso reservado al administrador'});return true;}
   send(res,200,(await records('inmuebles')).filter(r=>r.estado==='activo').map(r=>Object.fromEntries(['id','titulo','foto','zona','operacion','precio','moneda','latitud','longitud','municipio','parroquia','calle','tipo','habitaciones','banos','superficie','descripcion','fuente','actualizadoEn','ubicacionPrecision','ubicacionFuente','ubicacionConsultadaEn'].map(k=>[k,r[k]??'']))));return true;
  }
  if(url.pathname==='/api/professional-applications' && req.method==='POST'){
   try{
    const input=await body(req);
    if(String(input.websiteConfirm||'').trim()){send(res,201,{ok:true});return true;}
    const now=Date.now(),applicantKey='professional:'+hash(String(input.email||'').trim().toLowerCase()+':'+String(input.contacto||'').replace(/\D/g,'')),entry=professionalAttempts.get(applicantKey)||{count:0,until:now+900000};
    if(entry.until<now){entry.count=0;entry.until=now+900000;}
    if(++entry.count>5){send(res,429,{error:'Demasiados envíos. Espera unos minutos antes de intentarlo de nuevo.'});return true;}professionalAttempts.set(applicantKey,entry);
    if(input.consent!==true)throw Error('Debes aceptar el tratamiento de tus datos para enviar la solicitud');
    const clean=(key,max=200)=>String(input[key]||'').trim().slice(0,max);
    const nombre=clean('nombre',120),personaContacto=clean('personaContacto',120),email=clean('email',200).toLowerCase(),contacto=clean('contacto',80),whatsapp=clean('whatsapp',80),tipoEmpresa=clean('tipoEmpresa',80),servicios=clean('servicios',2000),cobertura=clean('cobertura',300),experiencia=clean('experiencia',300),sitioWeb=clean('sitioWeb',500),observaciones=clean('observaciones',2000);
    if(!nombre||!personaContacto||!email||!contacto||!servicios||!cobertura)throw Error('Completa todos los campos obligatorios');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Indica un correo electrónico válido');
    const phoneDigits=contacto.replace(/\D/g,'');if(phoneDigits.length<10||phoneDigits.length>15)throw Error('Indica un teléfono válido con prefijo');
    const allowedTypes=['Empresa de reformas','Constructora','Arquitectura y diseño','Profesional independiente','Proveedor especializado','Otro'];if(!allowedTypes.includes(tipoEmpresa))throw Error('Selecciona un tipo de profesional válido');
    if(sitioWeb&&!/^https:\/\/[a-z0-9.-]+(?:[\/:?#]|$)/i.test(sitioWeb))throw Error('El sitio web debe comenzar por https://');
    const duplicate=(await records('profesionales')).some(item=>item.email===email&&now-Date.parse(item.creadoEn||0)<86400000);if(duplicate)throw Error('Ya recibimos una solicitud reciente con este correo');
    const record={id:randomBytes(16).toString('hex'),nombre,personaContacto,email,tipoEmpresa,servicios,contacto,whatsapp,sitioWeb,direccion:'',cobertura,experiencia,rif:'',responsableTecnico:'',fuente:'Formulario público',observaciones,fechaRevision:new Date().toLocaleDateString('en-CA'),estado:'candidato',origen:'formulario',consent:true,creadoEn:new Date().toISOString(),actualizadoEn:new Date().toISOString()};
    await db.run('INSERT INTO records VALUES(?,?,?)',[record.id,'profesionales',JSON.stringify(record)]);send(res,201,{ok:true,message:'Solicitud recibida. Revisaremos la información antes de contactar contigo.'});
   }catch(e){send(res,400,{error:e.message});}return true;
  }
  if(req.user?.role!=='admin'){send(res,401,{error:'Acceso reservado al administrador'});return true;}
  if(url.pathname==='/api/admin/import'&&req.method==='POST'){
   try{
    const input=await body(req,5_000_000),items=input.records;
    if(!Array.isArray(items)||items.length<1||items.length>5000)throw Error('El archivo de importación no es válido');
    const allowedKinds=new Set(['inmuebles','leads','reformas','profesionales','runs']);
    const allowedStates={inmuebles:['borrador','activo','reservado','cerrado','archivado'],leads:['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'],reformas:['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'],profesionales:['candidato','contactado','documentación pendiente','evaluado','aprobado','descartado'],runs:['completada','fallida']};
    const clean=[];
    for(const item of items){
     const kind=String(item?.kind||''),record=item?.record;
     if(!allowedKinds.has(kind)||!record||typeof record!=='object'||Array.isArray(record))throw Error('Hay un registro no válido en la importación');
     const id=String(record.id||'').trim();if(!id||id.length>191)throw Error('Hay un registro sin identificador válido');
     const title=String(record.titulo||record.nombre||'').trim();if(kind!=='runs'&&!title)throw Error('Hay un registro sin título o nombre');
     if(!allowedStates[kind].includes(String(record.estado||record.status||'')))throw Error('Hay un registro con estado no válido');
     if(kind==='inmuebles'&&!['venta','alquiler'].includes(record.operacion))throw Error('Hay un inmueble con operación no válida');
     if(record.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(record.email)))throw Error('Hay un registro con correo no válido');
     for(const field of ['precio','importe'])if(record[field]!==undefined&&record[field]!==''&&(!Number.isFinite(Number(record[field]))||Number(record[field])<0))throw Error('Hay un registro con importe no válido');
     const hasLat=record.latitud!==undefined&&record.latitud!=='',hasLng=record.longitud!==undefined&&record.longitud!=='';if(hasLat!==hasLng||hasLat&&(!Number.isFinite(Number(record.latitud))||!Number.isFinite(Number(record.longitud))||Math.abs(Number(record.latitud))>90||Math.abs(Number(record.longitud))>180))throw Error('Hay un registro con coordenadas no válidas');
     const existing=await db.get('SELECT kind FROM records WHERE id=?',[id]);if(existing&&!input.overwrite)throw Error('Ya existe un registro con el identificador '+id+'; confirma overwrite para reemplazarlo');if(existing&&existing.kind!==kind)throw Error('El identificador '+id+' pertenece a otro tipo de registro');
     const serialized=JSON.stringify(record);if(serialized.length>100_000)throw Error('Hay un registro demasiado grande');
     clean.push({id,kind,serialized});
    }
    await db.transaction(async tx=>{for(const item of clean)await tx.upsertRecord(item.id,item.kind,item.serialized);});
    const imported=clean.reduce((total,item)=>({...total,[item.kind]:(total[item.kind]||0)+1}),{});
    send(res,200,{ok:true,total:clean.length,imported});
   }catch(e){send(res,400,{error:e.message});}return true;
  }
  if(url.pathname==='/api/captures/link'&&req.method==='POST'){
   try{const input=await body(req);const result=await captureListing(db,input.url,options.captureFetch||fetch);send(res,result.created?201:200,result);}catch(e){send(res,400,{error:e.message});}return true;
  }
  if(url.pathname==='/api/captures/run'&&req.method==='POST'){
   if(captureJob.running){send(res,409,{error:'Ya hay una actualización en curso',capture:captureJob});return true;}
   try{
    const input=await body(req),source=String(input.source||'all');if(source!=='all'&&!automaticSourceIds.includes(source))throw Error('Fuente no válida');
    captureJob={running:true,startedAt:new Date().toISOString(),finishedAt:'',source,error:''};
    const runner=options.refreshSources||refreshSources;
    Promise.resolve().then(()=>runner(db,source)).then(results=>{
     const failures=Array.isArray(results)?results.filter(result=>result?.status==='fallida'):[];
     const completed=Array.isArray(results)?results.filter(result=>result?.status!=='fallida'):[];
     const error=failures.length?(completed.length?'Actualización parcial: ':'No se pudo actualizar ninguna fuente: ')+failures.map(result=>result.source+': '+result.error).join(' · '):'';
     captureJob={...captureJob,running:false,finishedAt:new Date().toISOString(),error:error.slice(0,300),status:failures.length?(completed.length?'parcial':'fallida'):'completada',results:Array.isArray(results)?results:[]};
    }).catch(error=>{captureJob={...captureJob,running:false,finishedAt:new Date().toISOString(),status:'fallida',error:String(error?.message||error).slice(0,300)};});
    send(res,202,{ok:true,capture:captureJob});
   }catch(e){send(res,400,{error:e.message});}return true;
  }
  if(url.pathname==='/api/sources'&&req.method==='GET'){
   const [runs,properties]=await Promise.all([records('runs'),records('inmuebles')]),tracked=properties.filter(p=>p.sourceId),sourceNames=Object.fromEntries(Object.values(sourceRegistry).map(source=>[source.id,source.name]));
   const summaries=Object.values(sourceRegistry).map(source=>{const {id,name}=source,items=tracked.filter(p=>p.sourceId===id),latest=runs.filter(run=>run.source===name).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))[0];return {...publicSource(source),total:items.length,visible:items.filter(p=>!p.availabilityReview||p.availabilityReview==='visible').length,review:items.filter(p=>p.availabilityReview==='posiblemente_retirado').length,lastRun:latest||null};});
   const recentChanges=tracked.filter(p=>(p.historial||[]).length>1).map(p=>{const history=p.historial,last=history[history.length-1],previous=history[history.length-2],before=Number(previous.precio),after=Number(last.precio);return {id:p.id,titulo:p.titulo,source:sourceNames[p.sourceId]||p.sourceId,previous:previous.precio,current:last.precio,moneda:last.moneda||p.moneda,changedAt:last.observadoEn,delta:Number.isFinite(before)&&Number.isFinite(after)?after-before:null};}).sort((a,b)=>String(b.changedAt).localeCompare(String(a.changedAt))).slice(0,20);
   const duplicateGroups=Object.values(Object.groupBy(tracked.filter(p=>p.dedupeKey),p=>p.dedupeKey)).filter(group=>new Set(group.map(p=>p.sourceId)).size>1).map(group=>group.map(p=>({id:p.id,titulo:p.titulo,source:sourceNames[p.sourceId]||p.sourceId}))).slice(0,50);
   send(res,200,{runs:runs.sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,30),properties:tracked.length,changes:tracked.filter(p=>(p.historial||[]).length>1).length,possibleRemoved:tracked.filter(p=>p.availabilityReview==='posiblemente_retirado').map(p=>({id:p.id,titulo:p.titulo,source:sourceNames[p.sourceId]||p.sourceId,missingSince:p.missingSince,missingRuns:p.missingRuns})),notSeenOnce:tracked.filter(p=>p.availabilityReview==='no_visto_una_vez').length,summaries,recentChanges,duplicateGroups,capture:captureJob});return true;
  }
  return false;
 };
}
