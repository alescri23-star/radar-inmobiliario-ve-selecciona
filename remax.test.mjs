import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {parseRemax} from './remax.mjs';
import {importRah} from './collector.mjs';
test('RE/MAX filtra ciudad y tipo, conserva origen e historial sin duplicar',()=>{
 const p={idInmueble:123,foto:'https://cdn.remax.com.ve/api/foto.jpg',nombre:'Apartamento centro',localidad:'Barquisimeto',region:'Lara',subRegion:'Iribarren',tipoInmueble:'Apartamento',operacion:'Venta',precioReferencial:'98.000,00 USD $',url:'https://www.remax.com.ve/inmuebles/apartamento/venta/centro-123',latitud:'10.06',longitud:'-69.34',detalleUbicacion:'Carrera 21',nroHabitaciones:3};
 const html='<div data-props="'+JSON.stringify({inmuebles:[p,{...p,localidad:'Cabudare'},{...p,tipoInmueble:'Local Comercial'}]}).replace(/"/g,'&quot;')+'"></div>';
 const records=parseRemax(html);assert.equal(records.length,1);assert.equal(records[0].foto,'https://cdn.remax.com.ve/api/foto.jpg');assert.equal(records[0].precio,'98000.00');assert.equal(records[0].latitud,'10.06');assert.equal(records[0].ubicacionPrecision,'publicada');assert.equal(records[0].direccion,'Carrera 21');
 assert.throws(()=>parseRemax('<html>bloqueo</html>'),/no reconocida/);
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,body TEXT)');
 assert.equal(importRah(db,records,{source:'RE/MAX'}).source,'RE/MAX');assert.equal(importRah(db,records).added,0);assert.equal(importRah(db,[{...records[0],precio:'95000.00'}]).changes,1);
 assert.equal(db.prepare("SELECT count(*) n FROM records WHERE kind='inmuebles'").get().n,1);db.close();
});
