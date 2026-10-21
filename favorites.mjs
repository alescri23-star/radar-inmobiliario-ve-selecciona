import {adaptDatabase} from './database.mjs';
export function favorites(database){
 const db=adaptDatabase(database);
 const ready=db.exec(db.dialect==='mysql'?'CREATE TABLE IF NOT EXISTS favorites(user_id VARCHAR(64) NOT NULL,property_id VARCHAR(191) NOT NULL,interest VARCHAR(30) NOT NULL,PRIMARY KEY(user_id,property_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4':'CREATE TABLE IF NOT EXISTS favorites(user_id TEXT NOT NULL,property_id TEXT NOT NULL,interest TEXT NOT NULL,PRIMARY KEY(user_id,property_id))');
 return async(req,res,url)=>{
  await ready;
  if(url.pathname!=='/api/favorites')return false;
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));return true;};
  if(!req.user)return send(401,{error:'Inicia sesión para consultar tus favoritos'});
  if(req.method==='GET')return send(200,await db.all('SELECT property_id AS id,interest FROM favorites WHERE user_id=?',[req.user.id]));
  if(req.method!=='POST')return send(405,{error:'Método no permitido'});
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)return send(413,{error:'Solicitud demasiado grande'});}
   const {id,interest,remove}=JSON.parse(text);
   if(typeof id!=='string'||id.length>200)return send(400,{error:'Anuncio no válido'});
   if(remove===true){await db.run('DELETE FROM favorites WHERE user_id=? AND property_id=?',[req.user.id,id]);return send(200,{ok:true});}
   if(!['unclassified','green','orange','yellow','red'].includes(interest))return send(400,{error:'Etiqueta no válida'});
   const row=await db.get("SELECT body FROM records WHERE kind='inmuebles' AND id=?",[id]);
   if(!row||JSON.parse(row.body).estado!=='activo')return send(404,{error:'Anuncio no disponible'});
   await db.upsertFavorite(req.user.id,id,interest);
   return send(200,{ok:true});
  }catch{return send(400,{error:'No se pudo guardar el favorito'});}
 };
}
