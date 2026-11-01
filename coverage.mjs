const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export const laraMunicipalities=[
  {name:'Iribarren',capital:'Barquisimeto',lat:10.067,lng:-69.347,aliases:['iribarren','barquisimeto']},
  {name:'Palavecino',capital:'Cabudare',lat:10.026,lng:-69.263,aliases:['palavecino','cabudare']},
  {name:'Crespo',capital:'Duaca',lat:10.285,lng:-69.162,aliases:['crespo','duaca']},
  {name:'Jiménez',capital:'Quíbor',lat:9.929,lng:-69.621,aliases:['jimenez','quibor']},
  {name:'Morán',capital:'El Tocuyo',lat:9.786,lng:-69.793,aliases:['moran','el tocuyo']},
  {name:'Torres',capital:'Carora',lat:10.175,lng:-70.080,aliases:['torres','carora']},
  {name:'Urdaneta',capital:'Siquisique',lat:10.578,lng:-69.702,aliases:['urdaneta','siquisique']},
  {name:'Andrés Eloy Blanco',capital:'Sanare',lat:9.753,lng:-69.652,aliases:['andres eloy blanco','sanare']},
  {name:'Simón Planas',capital:'Sarare',lat:9.781,lng:-69.163,aliases:['simon planas','sarare']}
];

export function propertyMunicipality(property={}){
  const text=normalize([property.municipio,property.zona,property.parroquia,property.calle,property.direccion,property.titulo].filter(Boolean).join(' '));
  return laraMunicipalities.find(item=>item.aliases.some(alias=>text.includes(normalize(alias))))?.name||'Sin clasificar';
}

const recent=value=>{const time=Date.parse(value||'');return Number.isFinite(time)&&Date.now()-time<=30*86400000;};
const withPhoto=property=>Boolean(String(property.foto||'').trim()||(Array.isArray(property.fotos)&&property.fotos.length));
const withCoordinates=property=>Number.isFinite(Number(property.latitud))&&Number.isFinite(Number(property.longitud))&&String(property.latitud)!==''&&String(property.longitud)!=='';

export function buildCoverage(properties=[],referenceTotal=432){
  const active=properties.filter(property=>property.estado==='activo');
  const rows=[...laraMunicipalities.map(item=>({...item,properties:[]})),{name:'Sin clasificar',capital:'Revisar datos',lat:10.067,lng:-69.347,properties:[]}];
  for(const property of active)(rows.find(row=>row.name===propertyMunicipality(property))||rows.at(-1)).properties.push(property);
  const municipalities=rows.map(({properties:items,...municipality})=>({
    ...municipality,total:items.length,
    sale:items.filter(item=>item.operacion==='venta').length,
    rent:items.filter(item=>item.operacion==='alquiler').length,
    withoutPhoto:items.filter(item=>!withPhoto(item)).length,
    withoutCoordinates:items.filter(item=>!withCoordinates(item)).length,
    recentlyUpdated:items.filter(item=>recent(item.actualizadoEn)).length
  })).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
  const total=active.length,withPhotos=active.filter(withPhoto).length,located=active.filter(withCoordinates).length;
  return {generatedAt:new Date().toISOString(),state:'Lara',total,referenceTotal,estimatedCoverage:referenceTotal?Math.min(100,Math.round(total/referenceTotal*100)):null,sale:active.filter(item=>item.operacion==='venta').length,rent:active.filter(item=>item.operacion==='alquiler').length,withPhotos,located,quality:total?Math.round(((withPhotos+located)/(total*2))*100):0,municipalities};
}
