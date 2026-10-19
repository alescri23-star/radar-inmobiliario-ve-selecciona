import {security} from './security.mjs';
import {adaptDatabase} from './database.mjs';
import {randomBytes,createHash,scryptSync} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function sendResetEmail({email,link},options={}){
 if(options.sendReset)return options.sendReset({email,link});
 const webhookUrl=options.resetWebhookUrl||process.env.RADAR_RESET_WEBHOOK_URL;
 if(webhookUrl){
  const endpoint=new URL(webhookUrl);if(endpoint.protocol!=='https:')throw Error('Webhook de recuperación no válido');
  const headers={'Content-Type':'application/json'};const secret=options.resetWebhookSecret||process.env.RADAR_RESET_WEBHOOK_SECRET;if(secret)headers.Authorization='Bearer '+secret;
  const response=await (options.fetch||fetch)(endpoint,{method:'POST',headers,signal:AbortSignal.timeout(15000),body:JSON.stringify({email,link,subject:'Restablece tu contraseña de Radar Venezuela'})});
  if(!response.ok)throw Error('Entrega no disponible');return;
 }
 const response=await (options.fetch||fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({from:process.env.RADAR_MAIL_FROM,to:[email],subject:'Restablece tu contraseña de Radar Venezuela',text:'Abre este enlace para elegir una nueva contraseña. Caduca en 30 minutos y solo funciona una vez:\n'+link+'\nSi no solicitaste el cambio, ignora este correo.'})});
 if(!response.ok)throw Error('Entrega no disponible');
}
export function recovery(database,options={}){
 const db=adaptDatabase(database);
 const ready=db.exec(db.dialect==='mysql'?'CREATE TABLE IF NOT EXISTS password_resets(token VARCHAR(64) PRIMARY KEY,user_id VARCHAR(64) NOT NULL,expires BIGINT NOT NULL,INDEX resets_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4':'CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL)');
 const policy=options.security||security(options);
 const now=options.now||Date.now,limits=new Map();
 const configured=()=>options.sendReset||(options.resetWebhookUrl||process.env.RADAR_RESET_WEBHOOK_URL)&&(options.publicUrl||process.env.RADAR_PUBLIC_URL)||process.env.RESEND_API_KEY&&process.env.RADAR_MAIL_FROM&&process.env.RADAR_PUBLIC_URL;
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const message='Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.';
 return async(req,res,url)=>{
  await ready;
  if(!['/api/forgot-password','/api/reset-password'].includes(url.pathname)||req.method!=='POST')return false;
  const key=req.socket.remoteAddress+url.pathname,entry=limits.get(key)||{count:0,until:now()+600000};if(entry.until<now()){entry.count=0;entry.until=now()+600000;}limits.set(key,entry);if(++entry.count>5){send(res,429,{error:'Demasiadas solicitudes. Espera diez minutos.'});return true;}
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Solicitud demasiado grande');}const input=JSON.parse(text||'{}');
   if(url.pathname==='/api/forgot-password'){
    const email=String(input.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Indica un correo válido');
    if(!configured()){send(res,503,{error:'La recuperación por correo aún no está habilitada. Contacta al administrador.'});return true;}
    const user=await db.get('SELECT id FROM users WHERE email=?',[email]);
    if(user){
     const token=randomBytes(32).toString('hex');const base=new URL(options.publicUrl||process.env.RADAR_PUBLIC_URL);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('URL de recuperación no válida');
     const link=new URL('/',base);link.hash='reset='+token;
     await db.run('DELETE FROM password_resets WHERE user_id=? OR expires<=?',[user.id,now()]);await db.run('INSERT INTO password_resets VALUES(?,?,?)',[hash(token),user.id,now()+1800000]);
     try{
      await sendResetEmail({email,link:link.href},options);
     }catch{await db.run('DELETE FROM password_resets WHERE token=?',[hash(token)]);/* No revelar si el correo pertenece a una cuenta. */}
    }
    send(res,200,{message});return true;
   }
   const token=String(input.token||''),password=String(input.password||'');if(!/^[a-f0-9]{64}$/.test(token))throw Error('El enlace no es válido o ha caducado');if(password.length<10||password.length>200)throw Error('La contraseña debe tener entre 10 y 200 caracteres');
   const reset=await db.get('SELECT user_id FROM password_resets WHERE token=? AND expires>?',[hash(token),now()]);if(!reset)throw Error('El enlace no es válido o ha caducado');
   const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');await db.transaction(async tx=>{await tx.run('UPDATE users SET salt=?,password=? WHERE id=?',[salt,passwordHash,reset.user_id]);await tx.run('DELETE FROM password_resets WHERE user_id=?',[reset.user_id]);await tx.run('DELETE FROM sessions WHERE user_id=?',[reset.user_id]);});
   res.setHeader('Set-Cookie',policy.cookie());send(res,200,{message:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'});
  }catch(e){send(res,400,{error:e.message});}return true;
 };
}
