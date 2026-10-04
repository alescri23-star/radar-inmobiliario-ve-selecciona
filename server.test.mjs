import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './server.mjs';

test('persistencia, edición, referencias y validación', async () => {
 const dir=mkdtempSync(path.join(tmpdir(),'radar-test-'));
 let server=createApp(dir);
 const start=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 let base=await start();
 const request=(resource,body,method='POST',headers={})=>fetch(base+'/api/'+resource,{method,headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try {
  assert.deepEqual(await (await fetch(base+'/api/inmuebles')).json(),[]);
  const payload={titulo:'Casa piloto',zona:'Barquisimeto',operacion:'venta',precio:'50000',moneda:'USD',estado:'activo',fuente:'Prueba',latitud:'10.067',longitud:'-69.347'};
  const response=await request('inmuebles',payload);assert.equal(response.status,201);const property=await response.json();
  assert.equal((await request('inmuebles',{...payload,precio:'-1'})).status,400);
  assert.equal((await request('inmuebles',{...payload,latitud:'91'})).status,400);
  assert.equal((await request('inmuebles',{...payload,longitud:''})).status,400);
  assert.equal((await request('inmuebles',payload,'POST',{Origin:'https://otro.example'})).status,403);
  assert.equal((await request('leads',{nombre:'Ana',estado:'nuevo',inmuebleId:'no-existe'})).status,400);
  assert.equal((await request('leads',{nombre:'Ana',estado:'nuevo',inmuebleId:property.id})).status,201);
  assert.equal((await request('reformas',{titulo:'Cocina',estado:'detectada',inmuebleId:property.id,importe:'2000',moneda:'USD'})).status,201);
  assert.equal((await request('inmuebles/'+property.id,{...payload,estado:'reservado'},'PUT')).status,200);
  await new Promise(r=>server.close(r));server=createApp(dir);base=await start();
  const restored=await(await fetch(base+'/api/inmuebles')).json();assert.equal(restored.length,1);assert.equal(restored[0].estado,'reservado');assert.equal(restored[0].latitud,'10.067');assert.equal(restored[0].longitud,'-69.347');
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/server.mjs')).status,404);
 } finally {await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
