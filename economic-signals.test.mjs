import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {adaptDatabase,initializeDatabase} from './database.mjs';
import {defaultEconomicSignals,listEconomicSignals,normalizeEconomicSignal,publicEconomicSignal,seedEconomicSignals} from './economic-signals.mjs';
import {provisionAdmin} from './admin.mjs';
import {createApp} from './server.mjs';

test('siembra señales económicas una sola vez y conserva ediciones',async()=>{
 const raw=new DatabaseSync(':memory:'),db=adaptDatabase(raw);await initializeDatabase(db);
 assert.equal(await seedEconomicSignals(db),defaultEconomicSignals.length);assert.equal(await seedEconomicSignals(db),0);
 const signals=await listEconomicSignals(db);assert.equal(signals.length,defaultEconomicSignals.length);
 const original=signals[0],edited=normalizeEconomicSignal({title:'Una señal económica editada',visibleInWeb:false},original,original.id);
 assert.equal(edited.summary,original.summary);assert.equal(edited.visibleInWeb,false);assert.equal(edited.url,original.url);
 await db.upsertRecord(edited.id,'economic_signals',JSON.stringify(edited));
 assert.equal((await listEconomicSignals(db))[0].title,'Una señal económica editada');raw.close();
});

test('la respuesta pública excluye notas internas y crea una imagen segura',()=>{
 const signal=normalizeEconomicSignal({title:'Nueva oportunidad económica',summary:'Resumen público',sector:'Infraestructura',topics:['Empresas'],source:'Fuente verificada',url:'https://example.com/noticia',date:'2026-11-02',internalNotes:'No publicar esta nota'},null,'economic-1');
 const published=publicEconomicSignal(signal,'https://radar.example');
 assert.equal(published.internalNotes,undefined);assert.equal(published.imageUrl,'https://radar.example/api/public/economic-preview/economic-1');assert.equal(published.title,signal.title);
});

test('guardar en el Radar actualiza inmediatamente la API pública',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'radar-economic-'));await provisionAdmin(directory,{name:'Administrador',email:'admin@example.test',password:'Radar-test-12345'});const server=createApp(directory);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test',password:'Radar-test-12345'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const signals=await (await fetch(base+'/api/economic-signals',{headers:{Cookie:cookie}})).json(),target=signals[0];
  const updated=await fetch(base+'/api/economic-signals/'+encodeURIComponent(target.id),{method:'PUT',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({title:'Señal publicada desde el Radar',internalNotes:'Solo para el administrador'})});assert.equal(updated.status,200);
  const published=await (await fetch(base+'/api/public/economic-signals?limit=100')).json(),publicSignal=published.signals.find(signal=>signal.id===target.id);assert.equal(publicSignal.title,'Señal publicada desde el Radar');assert.equal(publicSignal.internalNotes,undefined);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});
