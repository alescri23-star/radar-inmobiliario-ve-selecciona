import {adaptDatabase} from './database.mjs';
export function landLabels(database){
 const db=adaptDatabase(database);
 const ready=db.exec(db.dialect==='mysql'?'CREATE TABLE IF NOT EXISTS land_labels(user_id VARCHAR(64) NOT NULL,property_id VARCHAR(191) NOT NULL,classification VARCHAR(60) NOT NULL,PRIMARY KEY(user_id,property_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4':'CREATE TABLE IF NOT EXISTS land_labels(user_id TEXT NOT NULL,property_id TEXT NOT NULL,classification TEXT NOT NULL,PRIMARY KEY(user_id,property_id))');
 return async(req,res,url)=>{
  await ready;
  if(url.pathname!=='/api/land_labels')return false;
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));return true;};
  if(!req.user)return send(401,{error:'Inicia sesión para consultar tus clasificaciones'});
  if(req.method==='GET')return send(200,await db.all('SELECT property_id AS id,classification FROM land_labels WHERE user_id=?',[req.user.id]));
  if(req.method!=='POST')return send(405,{error:'Método no permitido'});
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)return send(413,{error:'Solicitud demasiado grande'});}
   const {id,classification,remove}=JSON.parse(text);
   if(typeof id!=='string'||id.length>200)return send(400,{error:'Anuncio no válido'});
   if(remove===true){await db.run('DELETE FROM land_labels WHERE user_id=? AND property_id=?',[req.user.id,id]);return send(200,{ok:true});}
   if(!['Terreno rústico','Terreno urbano','Terreno sin clasificar'].includes(classification))return send(400,{error:'Etiqueta no válida'});
   const row=await db.get("SELECT body FROM records WHERE kind='inmuebles' AND id=?",[id]);
   if(!row||JSON.parse(row.body).estado!=='activo'||!String(JSON.parse(row.body).tipo||'').startsWith('Terreno'))return send(404,{error:'Anuncio no disponible'});
   await db.upsertLandLabel(req.user.id,id,classification);
   return send(200,{ok:true});
  }catch{return send(400,{error:'No se pudo guardar la clasificación'});}
 };
}
