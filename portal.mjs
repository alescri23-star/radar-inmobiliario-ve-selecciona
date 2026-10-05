import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
const hash = v => createHash('sha256').update(v).digest('hex');
import { recovery } from './recovery.mjs';
export function portal(db,options={}) {
 const handleRecovery=recovery(db,options);
 db.exec('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,salt TEXT,password TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER)');
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const body=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>32768)throw Error('Solicitud demasiado grande');}return JSON.parse(text||'{}');};
 const records=kind=>db.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body));
 const attempts=new Map();
 const session=req=>{const token=req.headers.cookie?.match(/(?:^|;\s*)radar_session=([a-f0-9]+)/)?.[1];return token?db.prepare('SELECT users.id, email, name, role FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now()):null;};
 return async(req,res,url)=>{
  req.user=session(req);
  if(!url.pathname.startsWith('/api/'))return false;
  if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`){send(res,403,{error:'Origen no permitido'});return true;}
  if(await handleRecovery(req,res,url))return true;
  if(url.pathname==='/api/session' && req.method==='GET'){send(res,200,{user:req.user||null,setupRequired:!db.prepare("SELECT id FROM users WHERE role='admin'").get()});return true;}
  if(['/api/register','/api/login','/api/setup'].includes(url.pathname) && req.method==='POST'){
   try{
    const address=req.socket.remoteAddress;const entry=attempts.get(address)||{count:0,until:Date.now()+600000};if(entry.until<Date.now()){entry.count=0;entry.until=Date.now()+600000;}if(++entry.count>20){send(res,429,{error:'Demasiados intentos. Espera unos minutos.'});return true;}attempts.set(address,entry);
    const input=await body(req), email=String(input.email||'').trim().toLowerCase(), password=String(input.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>200)throw Error('Usa un email válido y una contraseña de 10 a 200 caracteres');
    let user;
    if(url.pathname==='/api/login'){
     user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
     if(!user||!timingSafeEqual(scryptSync(password,user.salt,64),Buffer.from(user.password,'hex')))throw Error('Email o contraseña incorrectos');
    }else{
     const admin=url.pathname==='/api/setup';
     if(admin&&db.prepare("SELECT id FROM users WHERE role='admin'").get())throw Error('El administrador ya está configurado');
     const name=String(input.name||'').trim().slice(0,100);if(!name)throw Error('Indica tu nombre');
     const salt=randomBytes(16).toString('hex');user={id:randomBytes(16).toString('hex'),email,name,role:admin?'admin':'cliente'};
     db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,email,name,user.role,salt,scryptSync(password,salt,64).toString('hex'));
    }
    const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+86400000);
    res.setHeader('Set-Cookie',`radar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);send(res,200,{user:{id:user.id,email:user.email,name:user.name,role:user.role}});
   }catch(e){send(res,400,{error:e.message.includes('UNIQUE')?'Ese email ya está registrado':e.message});}return true;
  }
  if(url.pathname==='/api/logout' && req.method==='POST'){const token=req.headers.cookie?.match(/radar_session=([a-f0-9]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.setHeader('Set-Cookie','radar_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(res,200,{ok:true});return true;}
  if(url.pathname==='/api/public/inmuebles' && req.method==='GET'){
   if(!req.user){send(res,401,{error:'Inicia sesión para acceder al radar'});return true;}
   send(res,200,records('inmuebles').filter(r=>r.estado==='activo').map(r=>Object.fromEntries(['id','titulo','foto','zona','operacion','precio','moneda','latitud','longitud','municipio','parroquia','calle','tipo','habitaciones','banos','superficie','descripcion','fuente','actualizadoEn','ubicacionPrecision','ubicacionFuente','ubicacionConsultadaEn'].map(k=>[k,r[k]??'']))));return true;
  }
  if(url.pathname==='/api/inquiries' && req.method==='POST'){
   if(!req.user){send(res,401,{error:'Regístrate o inicia sesión para pedir información'});return true;}
   try{const input=await body(req);if(input.consent!==true)throw Error('Acepta que te contactemos sobre esta consulta');if(!records('inmuebles').some(p=>p.id===input.inmuebleId&&p.estado==='activo'))throw Error('El anuncio no está disponible');
    const contact=String(input.contacto||'').trim();if(!contact||contact.length>200)throw Error('Indica un teléfono o email de contacto');
    const r={id:randomBytes(16).toString('hex'),nombre:req.user.name,contacto:contact,inmuebleId:input.inmuebleId,estado:'nuevo',proximaAccion:String(input.mensaje||'Solicitud de información').slice(0,2000),fecha:'',userId:req.user.id,consent:true,creadoEn:new Date().toISOString()};db.prepare('INSERT INTO records VALUES(?,?,?)').run(r.id,'leads',JSON.stringify(r));send(res,201,{ok:true});
   }catch(e){send(res,400,{error:e.message});}return true;
  }
  if(req.user?.role!=='admin'){send(res,401,{error:'Acceso reservado al administrador'});return true;}
  if(url.pathname==='/api/sources'&&req.method==='GET'){send(res,200,{runs:records('runs'),properties:records('inmuebles').filter(p=>p.sourceId).length,changes:records('inmuebles').filter(p=>(p.historial||[]).length>1).length});return true;}
  return false;
 };
}
