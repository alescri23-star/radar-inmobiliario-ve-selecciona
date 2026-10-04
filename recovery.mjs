import {randomBytes,createHash,scryptSync} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function recovery(db,options={}){
 db.exec('CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL)');
 const now=options.now||Date.now,limits=new Map();
 const configured=()=>options.sendReset||process.env.RESEND_API_KEY&&process.env.RADAR_MAIL_FROM&&process.env.RADAR_PUBLIC_URL;
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const message='Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.';
 return async(req,res,url)=>{
  if(!['/api/forgot-password','/api/reset-password'].includes(url.pathname)||req.method!=='POST')return false;
  const key=req.socket.remoteAddress+url.pathname,entry=limits.get(key)||{count:0,until:now()+600000};if(entry.until<now()){entry.count=0;entry.until=now()+600000;}limits.set(key,entry);if(++entry.count>5){send(res,429,{error:'Demasiadas solicitudes. Espera diez minutos.'});return true;}
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Solicitud demasiado grande');}const input=JSON.parse(text||'{}');
   if(url.pathname==='/api/forgot-password'){
    const email=String(input.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Indica un correo válido');
    if(!configured()){send(res,503,{error:'La recuperación por correo aún no está habilitada. Contacta al administrador.'});return true;}
    const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if(user){
     const token=randomBytes(32).toString('hex');const base=new URL(options.publicUrl||process.env.RADAR_PUBLIC_URL);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('URL de recuperación no válida');
     const link=new URL('/',base);link.hash='reset='+token;
     db.prepare('DELETE FROM password_resets WHERE user_id=? OR expires<=?').run(user.id,now());db.prepare('INSERT INTO password_resets VALUES(?,?,?)').run(hash(token),user.id,now()+1800000);
     try{
      if(options.sendReset)await options.sendReset({email,link:link.href});
      else{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({from:process.env.RADAR_MAIL_FROM,to:[email],subject:'Restablece tu contraseña de Radar Venezuela',text:'Abre este enlace para elegir una nueva contraseña. Caduca en 30 minutos y solo funciona una vez:\n'+link.href+'\nSi no solicitaste el cambio, ignora este correo.'})});if(!response.ok)throw Error('Entrega no disponible');}
     }catch{db.prepare('DELETE FROM password_resets WHERE token=?').run(hash(token));/* No revelar si el correo pertenece a una cuenta. */}
    }
    send(res,200,{message});return true;
   }
   const token=String(input.token||''),password=String(input.password||'');if(!/^[a-f0-9]{64}$/.test(token))throw Error('El enlace no es válido o ha caducado');if(password.length<10||password.length>200)throw Error('La contraseña debe tener entre 10 y 200 caracteres');
   const reset=db.prepare('SELECT user_id FROM password_resets WHERE token=? AND expires>?').get(hash(token),now());if(!reset)throw Error('El enlace no es válido o ha caducado');
   const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET salt=?,password=? WHERE id=?').run(salt,passwordHash,reset.user_id);db.prepare('DELETE FROM password_resets WHERE user_id=?').run(reset.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(reset.user_id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
   res.setHeader('Set-Cookie','radar_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(res,200,{message:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'});
  }catch(e){send(res,400,{error:e.message});}return true;
 };
}
