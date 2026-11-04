// Clasificación textual del anuncio; no acredita condición urbanística o catastral.
export function landType(title='',description=''){
 const text=[title,description].filter(v=>typeof v==='string').join('. ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const pattern=/\b(?:terreno|parcela|suelo|lote)\s+(?:(?:de\s+)?(?:tipo|caracter|clasificacion)\s+)?(?:es\s+)?(rustic[oa]|urban[oa])\b/g;
 const found=new Set();
 for(const match of text.matchAll(pattern)){
  const prefix=text.slice(Math.max(0,match.index-30),match.index);
  if(/\b(?:no|sin|posible|posiblemente|potencial|convertir(?:se)?\s+en)\s+(?:es\s+|un\s+|una\s+)*$/.test(prefix))continue;
  found.add(match[1].startsWith('rustic')?'Terreno rústico':'Terreno urbano');
 }
 return found.size===1?[...found][0]:'Terreno sin clasificar';
}
export function classifyLand(record){
 if(!String(record.tipo||'').startsWith('Terreno'))return record;
 // Mantener clasificaciones ya asignadas; analizar los pendientes.
 if(['Terreno rústico','Terreno urbano'].includes(record.tipo))return record;
 return {...record,tipo:landType(record.titulo,record.descripcion)};
}
