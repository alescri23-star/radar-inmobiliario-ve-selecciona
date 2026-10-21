import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCentury21} from './century21.mjs';

const listing=item=>`<script>window.REP_LOG_APP_PROPS={isLoggedIn:false,data:${JSON.stringify({totalHits:'1',results:[item]})},locale:'es'};</script>`;

test('Century 21 convierte el inventario de Lara en borradores internos',()=>{
 const [record]=parseCentury21(listing({id:'1252687',urlCorrectaPropiedad:'/propiedad/1252687_apartamento',encabezado:'Apartamento en Barquisimeto',tipoOperacionTrans:'venta',tipoPropiedadTrans:'apartamento',precio:'220000',moneda:'USD',calle:'Calle Bolivia',colonia:'Iribarren',municipio:'Barquisimeto',estado:'Lara',lat:10.0684597,lon:-69.2906045,m2T:174,recamaras:4,banos:3,fechaAlta:'2026-10-10',fechaModificacion:'2026-10-12',fotos:{propiedadThumbnail:['https://cdn.21online.lat/venezuela/propiedad.jpg']}}));
 assert.equal(record.sourceId,'century21');assert.equal(record.sourceCode,'1252687');assert.equal(record.estado,'borrador');assert.equal(record.tipo,'Apartamento');assert.equal(record.operacion,'venta');assert.equal(record.precio,'220000');assert.equal(record.zona,'Iribarren');assert.equal(record.latitud,'10.0684597');assert.match(record.fuente,/\/propiedad\/1252687_/);assert.match(record.foto,/cdn\.21online\.lat/);
});

test('Century 21 detiene una captura parcial y respeta calles ocultas',()=>{
 assert.throws(()=>parseCentury21(`<script>window.REP_LOG_APP_PROPS={data:${JSON.stringify({totalHits:'2',results:[{id:'1'}]})}}</script>`),/incompleta/);
 const [record]=parseCentury21(listing({id:'9',urlCorrectaPropiedad:'/propiedad/9_terreno',encabezado:'Terreno urbano',tipoOperacionTrans:'alquiler',tipoPropiedadTrans:'terreno',precio:'500',moneda:'USD',calle:'Dirección privada',ocultarCalleInternet:true,colonia:'Centro',municipio:'Barquisimeto',estado:'Lara'}));
 assert.equal(record.calle,'');assert.doesNotMatch(record.direccion,/privada/i);assert.equal(record.operacion,'alquiler');assert.match(record.tipo,/Terreno/);
});
