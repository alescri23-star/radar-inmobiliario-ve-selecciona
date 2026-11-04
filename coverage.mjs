const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export const venezuelaStates=[
  {name:'Distrito Capital',capital:'Caracas',lat:10.49,lng:-66.90,referenceTotal:8571,aliases:['distrito capital','caracas']},
  {name:'Miranda',capital:'Los Teques',lat:10.34,lng:-67.04,referenceTotal:1571,aliases:['miranda','los teques']},
  {name:'Carabobo',capital:'Valencia',lat:10.18,lng:-68.00,referenceTotal:1180,aliases:['carabobo','valencia']},
  {name:'Zulia',capital:'Maracaibo',lat:10.65,lng:-71.64,referenceTotal:1016,aliases:['zulia','maracaibo']},
  {name:'Lara',capital:'Barquisimeto',lat:10.067,lng:-69.347,referenceTotal:432,aliases:['lara','barquisimeto','iribarren','cabudare','palavecino','duaca','crespo','quibor','jimenez','el tocuyo','moran','carora','torres','siquisique','urdaneta','sanare','andres eloy blanco','sarare','simon planas']},
  {name:'Aragua',capital:'Maracay',lat:10.24,lng:-67.60,referenceTotal:246,aliases:['aragua','maracay']},
  {name:'Nueva Esparta',capital:'La Asunción',lat:11.03,lng:-63.86,referenceTotal:187,aliases:['nueva esparta','la asuncion','margarita','porlamar']},
  {name:'Monagas',capital:'Maturín',lat:9.75,lng:-63.18,referenceTotal:170,aliases:['monagas','maturin']},
  {name:'Falcón',capital:'Coro',lat:11.18,lng:-69.86,referenceTotal:154,aliases:['falcon','coro','punto fijo']},
  {name:'La Guaira',capital:'La Guaira',lat:10.60,lng:-66.93,referenceTotal:146,aliases:['la guaira','vargas','maiquetia']},
  {name:'Mérida',capital:'Mérida',lat:8.59,lng:-71.15,referenceTotal:136,aliases:['merida']},
  {name:'Anzoátegui',capital:'Barcelona',lat:10.13,lng:-64.69,referenceTotal:61,aliases:['anzoategui','barcelona','puerto la cruz','lecheria']},
  {name:'Cojedes',capital:'San Carlos',lat:9.66,lng:-68.59,referenceTotal:40,aliases:['cojedes','san carlos']},
  {name:'Yaracuy',capital:'San Felipe',lat:10.34,lng:-68.74,referenceTotal:35,aliases:['yaracuy','san felipe']},
  {name:'Portuguesa',capital:'Guanare',lat:9.04,lng:-69.75,referenceTotal:11,aliases:['portuguesa','guanare','acarigua','araure']},
  {name:'Sucre',capital:'Cumaná',lat:10.46,lng:-64.17,referenceTotal:9,aliases:['sucre','cumana','carupano']},
  {name:'Trujillo',capital:'Trujillo',lat:9.36,lng:-70.43,referenceTotal:9,aliases:['trujillo','valera']},
  {name:'Bolívar',capital:'Ciudad Bolívar',lat:8.13,lng:-63.55,referenceTotal:4,aliases:['bolivar','ciudad bolivar','puerto ordaz','ciudad guayana']},
  {name:'Guárico',capital:'San Juan de los Morros',lat:9.91,lng:-67.35,referenceTotal:3,aliases:['guarico','san juan de los morros','calabozo']},
  {name:'Táchira',capital:'San Cristóbal',lat:7.77,lng:-72.23,referenceTotal:3,aliases:['tachira','san cristobal']},
  {name:'Barinas',capital:'Barinas',lat:8.62,lng:-70.21,referenceTotal:2,aliases:['barinas']},
  {name:'Amazonas',capital:'Puerto Ayacucho',lat:5.66,lng:-67.62,referenceTotal:1,aliases:['amazonas','puerto ayacucho']},
  {name:'Apure',capital:'San Fernando de Apure',lat:7.89,lng:-67.47,referenceTotal:1,aliases:['apure','san fernando de apure']},
  {name:'Delta Amacuro',capital:'Tucupita',lat:9.06,lng:-62.05,referenceTotal:1,aliases:['delta amacuro','tucupita']},
  {name:'Dependencias Federales',capital:'Territorio insular',lat:11.50,lng:-66.30,referenceTotal:0,aliases:['dependencias federales','territorio insular']}
];

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

const locationText=property=>normalize([property.estadoUbicacion,property.estadoGeografico,property.ciudad,property.municipio,property.zona,property.parroquia,property.calle,property.direccion,property.titulo].filter(Boolean).join(' '));
export function propertyState(property={}){const text=locationText(property);return venezuelaStates.find(item=>item.aliases.some(alias=>text.includes(normalize(alias))))?.name||'Sin clasificar';}
export function propertyMunicipality(property={}){const text=locationText(property);return laraMunicipalities.find(item=>item.aliases.some(alias=>text.includes(normalize(alias))))?.name||'Sin clasificar';}

const recent=value=>{const time=Date.parse(value||'');return Number.isFinite(time)&&Date.now()-time<=30*86400000;};
const withPhoto=property=>Boolean(String(property.foto||'').trim()||(Array.isArray(property.fotos)&&property.fotos.length));
const withCoordinates=property=>Number.isFinite(Number(property.latitud))&&Number.isFinite(Number(property.longitud))&&String(property.latitud)!==''&&String(property.longitud)!=='';
const summarize=items=>({total:items.length,sale:items.filter(item=>item.operacion==='venta').length,rent:items.filter(item=>item.operacion==='alquiler').length,withoutPhoto:items.filter(item=>!withPhoto(item)).length,withoutCoordinates:items.filter(item=>!withCoordinates(item)).length,recentlyUpdated:items.filter(item=>recent(item.actualizadoEn)).length});
const mapListing=property=>({id:property.id||'',title:property.titulo||'Inmueble',state:propertyState(property),operation:property.operacion||'',type:property.tipo||'',price:property.precio||'',currency:property.moneda||'',zone:property.zona||property.municipio||'',address:property.direccion||property.calle||'',photo:property.foto||property.fotos?.[0]||'',source:property.fuente||'',lat:Number(property.latitud),lng:Number(property.longitud)});

export function buildCoverage(properties=[]){
  const active=properties.filter(property=>property.estado==='activo');
  const stateRows=[...venezuelaStates.map(item=>({...item,properties:[]})),{name:'Sin clasificar',capital:'Revisar datos',lat:7.2,lng:-66.5,referenceTotal:0,properties:[]}];
  for(const property of active)(stateRows.find(row=>row.name===propertyState(property))||stateRows.at(-1)).properties.push(property);
  const states=stateRows.map(({properties:items,...state})=>({...state,...summarize(items),estimatedCoverage:state.referenceTotal?Math.min(100,Math.round(items.length/state.referenceTotal*100)):null})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
  const lara=active.filter(property=>propertyState(property)==='Lara');
  const municipalityRows=[...laraMunicipalities.map(item=>({...item,properties:[]})),{name:'Sin clasificar',capital:'Revisar datos',lat:10.067,lng:-69.347,properties:[]}];
  for(const property of lara)(municipalityRows.find(row=>row.name===propertyMunicipality(property))||municipalityRows.at(-1)).properties.push(property);
  const municipalities=municipalityRows.map(({properties:items,...municipality})=>({...municipality,referenceTotal:null,estimatedCoverage:null,...summarize(items)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
  const total=active.length,withPhotos=active.filter(withPhoto).length,located=active.filter(withCoordinates).length,referenceTotal=venezuelaStates.reduce((sum,state)=>sum+state.referenceTotal,0);
  return {generatedAt:new Date().toISOString(),scope:'Venezuela',total,referenceTotal,referenceReviewedAt:'2026-11-01',estimatedCoverage:referenceTotal?Math.min(100,Math.round(total/referenceTotal*100)):null,sale:active.filter(item=>item.operacion==='venta').length,rent:active.filter(item=>item.operacion==='alquiler').length,withPhotos,located,quality:total?Math.round(((withPhotos+located)/(total*2))*100):0,states,municipalities,listings:active.filter(withCoordinates).map(mapListing)};
}
