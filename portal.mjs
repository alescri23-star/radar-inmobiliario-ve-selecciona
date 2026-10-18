import {security} from './security.mjs';
import {adaptDatabase} from './database.mjs';
import {landLabels} from './land-labels.mjs';
import {classifyLand} from './land.mjs';
import {favorites} from './favorites.mjs';
import {gallery} from './gallery.mjs';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
const hash = v => createHash('sha256').update(v).digest('hex');
import { recovery } from './recovery.mjs';
export function portal(database,options={}) {
 const db=adaptDatabase(database);
 const policy=options.security||security(options);
 const handleLandLabels=landLabels(db);
 const handleFavorites=favorites(db);
 const handleRecovery=recovery(db,options);const handleGallery=gallery(db,options);
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const body=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>32768)throw Error('Solicitud demasiado grande');}return JSON.parse(text||'{}');};
 const records=async kind=>(await db.all('SELECT body FROM records WHERE kind=?',[kind])).map(r=>classifyLand(JSON.parse(r.body)));
 const attempts=new Map();
 const professionalAttempts=new Map();
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
  if(['/api/register','/api/login'].includes(url.pathname) && req.method==='POST'){
   try{
    const address=req.socket.remoteAddress;const entry=attempts.get(address)||{count:0,until:Date.now()+600000};if(entry.until<Date.now()){entry.count=0;entry.until=Date.now()+600000;}if(++entry.count>20){send(res,429,{error:'Demasiados intentos. Espera unos minutos.'});return true;}attempts.set(address,entry);
    const input=await body(req), email=String(input.email||'').trim().toLowerCase(), password=String(input.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>200)throw Error('Usa un email válido y una contraseña de 10 a 200 caracteres');
    let user;
    if(url.pathname==='/api/login'){
     user=await db.get('SELECT * FROM users WHERE email=?',[email]);
     if(!user||!timingSafeEqual(scryptSync(password,user.salt,64),Buffer.from(user.password,'hex')))throw Error('Email o contraseña incorrectos');
    }else{
     const name=String(input.name||'').trim().slice(0,100);if(!name)throw Error('Indica tu nombre');
     const salt=randomBytes(16).toString('hex');user={id:randomBytes(16).toString('hex'),email,name,role:'cliente'};
     await db.run('INSERT INTO users VALUES(?,?,?,?,?,?)',[user.id,email,name,user.role,salt,scryptSync(password,salt,64).toString('hex')]);
    }
    const token=randomBytes(32).toString('hex');await db.run('INSERT INTO sessions VALUES(?,?,?)',[hash(token),user.id,Date.now()+86400000]);
    res.setHeader('Set-Cookie',policy.cookie(token));send(res,200,{user:{id:user.id,email:user.email,name:user.name,role:user.role}});
   }catch(e){send(res,400,{error:e.code==='ER_DUP_ENTRY'||e.message.includes('UNIQUE')?'Ese email ya está registrado':e.message});}return true;
  }
  if(url.pathname==='/api/logout' && req.method==='POST'){const token=req.headers.cookie?.match(/radar_session=([a-f0-9]+)/)?.[1];if(token)await db.run('DELETE FROM sessions WHERE token=?',[hash(token)]);res.setHeader('Set-Cookie',policy.cookie());send(res,200,{ok:true});return true;}
  if(url.pathname==='/api/public/inmuebles' && req.method==='GET'){
   if(!req.user){send(res,401,{error:'Inicia sesión para acceder al radar'});return true;}
   send(res,200,(await records('inmuebles')).filter(r=>r.estado==='activo').map(r=>Object.fromEntries(['id','titulo','foto','zona','operacion','precio','moneda','latitud','longitud','municipio','parroquia','calle','tipo','habitaciones','banos','superficie','descripcion','fuente','actualizadoEn','ubicacionPrecision','ubicacionFuente','ubicacionConsultadaEn'].map(k=>[k,r[k]??'']))));return true;
  }
  if(url.pathname==='/api/inquiries' && req.method==='POST'){
   if(!req.user){send(res,401,{error:'Regístrate o inicia sesión para pedir información'});return true;}
   try{const input=await body(req);if(input.consent!==true)throw Error('Acepta que te contactemos sobre esta consulta');if(!(await records('inmuebles')).some(p=>p.id===input.inmuebleId&&p.estado==='activo'))throw Error('El anuncio no está disponible');
    const contact=String(input.contacto||'').trim();if(!contact||contact.length>200)throw Error('Indica un teléfono o email de contacto');
     const r={id:randomBytes(16).toString('hex'),nombre:req.user.name,contacto:contact,inmuebleId:input.inmuebleId,estado:'nuevo',proximaAccion:String(input.mensaje||'Solicitud de información').slice(0,2000),fecha:'',origen:'formulario',userId:req.user.id,consent:true,creadoEn:new Date().toISOString()};await db.run('INSERT INTO records VALUES(?,?,?)',[r.id,'leads',JSON.stringify(r)]);send(res,201,{ok:true});
   }catch(e){send(res,400,{error:e.message});}return true;
  }
  if(url.pathname==='/api/professional-applications' && req.method==='POST'){
   try{
    const address=req.socket.remoteAddress||'unknown',now=Date.now(),entry=professionalAttempts.get(address)||{count:0,until:now+900000};
    if(entry.until<now){entry.count=0;entry.until=now+900000;}
    if(++entry.count>5){send(res,429,{error:'Demasiados envíos. Espera unos minutos antes de intentarlo de nuevo.'});return true;}professionalAttempts.set(address,entry);
    const input=await body(req);
    if(String(input.websiteConfirm||'').trim()){send(res,201,{ok:true});return true;}
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
  if(url.pathname==='/api/sources'&&req.method==='GET'){const [runs,properties]=await Promise.all([records('runs'),records('inmuebles')]);send(res,200,{runs,properties:properties.filter(p=>p.sourceId).length,changes:properties.filter(p=>(p.historial||[]).length>1).length});return true;}
  return false;
 };
}
