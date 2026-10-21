import {landType} from './land.mjs';

const origin='https://www.century21.com.ve';
export const century21LaraUrl=origin+'/v/resultados/en-pais_venezuela/en-estado_lara';

function assignedData(html){
 const marker='window.REP_LOG_APP_PROPS',assignment=html.indexOf(marker);
 if(assignment<0)throw Error('Estructura de Century 21 no reconocida');
 const dataKey=html.indexOf('data:',assignment),start=html.indexOf('{',dataKey);
 if(dataKey<0||start<0)throw Error('Datos de Century 21 no encontrados');
 let depth=0,inString=false,escaped=false;
 for(let index=start;index<html.length;index++){
  const char=html[index];
  if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;continue;}
  if(char==='"'){inString=true;continue;}
  if(char==='{')depth++;
  if(char==='}'&&--depth===0)return JSON.parse(html.slice(start,index+1));
 }
 throw Error('Datos de Century 21 incompletos');
}

const text=value=>String(value??'').trim();
function propertyType(item){
 const raw=text(item.tipoPropiedadTrans||item.tipoPropiedad).toLowerCase(),title=text(item.encabezado);
 if(/terreno|parcela|lote|finca/.test(raw+' '+title.toLowerCase()))return landType(title,'');
 if(/apartamento|departamento/.test(raw))return 'Apartamento';
 if(/casa|town house|townhouse/.test(raw))return 'Casa';
 return raw?raw.charAt(0).toUpperCase()+raw.slice(1):'Otro';
}

export function parseCentury21(html){
 const data=assignedData(String(html||'')),items=Array.isArray(data.results)?data.results:[],total=Number(data.totalHits);
 if(!items.length)throw Error('Century 21 no devolvió anuncios reconocibles');
 if(!Number.isInteger(total)||total!==items.length)throw Error(`Captura incompleta de Century 21: ${items.length} de ${Number.isFinite(total)?total:'?'} anuncios`);
 return items.map(item=>{
  const code=text(item.idOriginal||item.id),path=text(item.urlCorrectaPropiedad),url=new URL(path,origin);
  if(!/^\d+$/.test(code)||url.origin!==origin||!url.pathname.startsWith('/propiedad/'))throw Error('Anuncio Century 21 incompleto');
  const lat=Number(item.lat),lng=Number(item.lon),located=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=0&&lat<=15&&lng>=-75&&lng<=-59;
  const hiddenStreet=item.ocultarCalleInternet===true,street=hiddenStreet?'':text(item.calle),zone=text(item.colonia),municipality=text(item.municipio),state=text(item.estado);
  const address=[street,zone,municipality,state].filter(Boolean).join(', '),operation=/alquiler|renta/.test(text(item.tipoOperacionTrans||item.tipoOperacion).toLowerCase())?'alquiler':'venta';
  const images=Array.isArray(item.fotos?.propiedadThumbnail)?item.fotos.propiedadThumbnail:[],photo=images.find(value=>{try{return new URL(value).hostname==='cdn.21online.lat';}catch{return false;}})||'';
  return {sourceId:'century21',sourceCode:code,titulo:text(item.encabezado)||text(item.tipoPropiedadEnTipoOperacion)||`Anuncio Century 21 ${code}`,foto:photo,tipo:propertyType(item),operacion:operation,precio:text(item.precio),moneda:text(item.moneda).toUpperCase()==='VES'?'VES':'USD',fuente:url.href,estado:'borrador',municipio:municipality,parroquia:'',zona:zone,calle:street,direccion:address,habitaciones:text(item.recamaras),banos:text(item.banos),superficie:text(item.m2T||item.m2C),descripcion:'',latitud:located?String(lat):'',longitud:located?String(lng):'',ubicacionPrecision:located?'publicada':'',ubicacionFuente:located?'Century 21 Venezuela: mapa del anuncio':'',ubicacionConsultadaEn:new Date().toISOString(),fechaPublicacion:text(item.fechaAlta),fechaFuenteActualizada:text(item.fechaModificacion)};
 });
}
