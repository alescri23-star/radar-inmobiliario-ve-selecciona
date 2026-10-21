import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {adaptDatabase} from './database.mjs';
import {importObservedRecords} from './source-refresh.mjs';

const property=(code,price='50000')=>({sourceId:'remax',sourceCode:code,titulo:'Anuncio '+code,tipo:'Apartamento',operacion:'venta',precio:price,moneda:'USD',fuente:'https://www.remax.com.ve/inmuebles/'+code,estado:'activo'});

test('una captura completa marca ausencias para revisión sin retirar anuncios',async()=>{
 const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,body TEXT)');const db=adaptDatabase(raw),metadata={source:'RE/MAX',scope:'Prueba completa',scopeKey:'remax:test',complete:true};
 const first=await importObservedRecords(db,[property('1'),property('2')],{...metadata,now:'2026-10-19T10:00:00.000Z'});assert.equal(first.added,2);
 const second=await importObservedRecords(db,[property('1','48000')],{...metadata,now:'2026-10-20T10:00:00.000Z'});assert.equal(second.changes,1);assert.equal(second.notSeen,1);assert.equal(second.possibleRemoved,0);
 let missing=JSON.parse(raw.prepare("SELECT body FROM records WHERE kind='inmuebles'").all().map(row=>row.body).find(body=>JSON.parse(body).sourceCode==='2'));assert.equal(missing.availabilityReview,'no_visto_una_vez');assert.equal(missing.estado,'activo');
 const third=await importObservedRecords(db,[property('1','48000')],{...metadata,now:'2026-10-21T10:00:00.000Z'});assert.equal(third.possibleRemoved,1);
 const records=raw.prepare("SELECT body FROM records WHERE kind='inmuebles'").all().map(row=>JSON.parse(row.body));missing=records.find(item=>item.sourceCode==='2');const changed=records.find(item=>item.sourceCode==='1');assert.equal(missing.availabilityReview,'posiblemente_retirado');assert.equal(missing.missingRuns,2);assert.equal(missing.estado,'activo');assert.equal(changed.historial.length,2);raw.close();
});

test('una captura parcial nunca interpreta ausencias como retirada',async()=>{
 const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,body TEXT)');const db=adaptDatabase(raw),metadata={source:'Rent-A-House',scopeKey:'rah:test',complete:false};
 await importObservedRecords(db,[{...property('1'),sourceId:'rentahouse'}],metadata);await importObservedRecords(db,[],metadata);
 const saved=JSON.parse(raw.prepare("SELECT body FROM records WHERE kind='inmuebles'").get().body);assert.equal(saved.availabilityReview,'visible');assert.equal(saved.missingRuns,0);raw.close();
});

test('una actualización conserva la decisión de revisión del administrador',async()=>{
 const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,body TEXT)');const db=adaptDatabase(raw),metadata={source:'Century 21 Venezuela',scopeKey:'century21:lara:resultados',complete:true};
 await importObservedRecords(db,[{...property('1252687'),sourceId:'century21',estado:'borrador'}],metadata);
 const first=JSON.parse(raw.prepare("SELECT body FROM records WHERE kind='inmuebles'").get().body);await db.upsertRecord(first.id,'inmuebles',JSON.stringify({...first,estado:'activo'}));
 await importObservedRecords(db,[{...property('1252687','49000'),sourceId:'century21',estado:'borrador'}],metadata);
 const saved=JSON.parse(raw.prepare("SELECT body FROM records WHERE kind='inmuebles'").get().body);assert.equal(saved.estado,'activo');assert.equal(saved.precio,'49000');raw.close();
});
