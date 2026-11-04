import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parseListingPage,validateListingUrl} from './capture-link.mjs';
import {provisionAdmin} from './admin.mjs';
import {createApp} from './server.mjs';

const url='https://www.remax.com.ve/inmuebles/apartamento/venta/apartamento-prueba-987654';
const html='<html><head><meta property="og:title" content="Apartamento de prueba en Barquisimeto"><meta property="og:description" content="Ficha pública para revisión"><meta property="og:image" content="https://cdn.remax.com.ve/api/novus/inmuebles_usados/987654/a.webp"><meta property="product:price:amount" content="65000"><meta property="product:price:currency" content="USD"></head></html>';

test('analiza enlaces permitidos y bloquea destinos no compatibles',()=>{
 const record=parseListingPage(html,url);assert.equal(record.titulo,'Apartamento de prueba en Barquisimeto');assert.equal(record.precio,'65000');assert.equal(record.operacion,'venta');assert.equal(record.estado,'borrador');assert.equal(record.sourceCode,'987654');
 assert.throws(()=>validateListingUrl('http://www.remax.com.ve/test'),/Admitimos enlaces HTTPS/);
 assert.throws(()=>validateListingUrl('https://remax.com.ve.evil.test/test'),/Admitimos enlaces HTTPS/);
});

test('acepta agencias locales validadas y mantiene sus anuncios en revisión',()=>{
 const localHtml='<html><head><meta property="og:title" content="VENTA | Terreno urbano en Cabudare"><meta property="og:description" content="Parcela de 500 m² en Lara"><meta property="og:image" content="https://images.wasi.co/inmuebles/prueba.jpg"><meta property="product:price:amount" content="25000"></head></html>';
 const ac=parseListingPage(localHtml,'https://acinmobiliarias.com/inmueble/terreno-urbano-12345');
 assert.equal(ac.sourceId,'acinmobiliarias');assert.equal(ac.operacion,'venta');assert.equal(ac.tipo,'Terreno urbano');assert.equal(ac.estado,'borrador');assert.equal(ac.dedupeStatus,'pendiente_revision');assert.match(ac.dedupeKey,/^[a-f0-9]{24}$/);
 const ebienes=parseListingPage(localHtml,'https://www.ebienesraices.com.ve/shop/terreno-urbano-123');
 assert.equal(ebienes.sourceId,'ebienesraices');assert.equal(ebienes.foto,'');
 const century=parseListingPage(localHtml,'https://www.century21.com.ve/propiedad/1252687_apartamento-en-venta');assert.equal(century.sourceId,'century21');assert.equal(century.sourceCode,'1252687');assert.equal(century.estado,'borrador');
 assert.throws(()=>validateListingUrl('https://listado.mercadolibre.com.ve/inmuebles/test'),/Admitimos enlaces HTTPS/);
});

test('solo el administrador puede capturar un enlace y se guarda como borrador',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'radar-capture-'));provisionAdmin(dir,{name:'Administrador',email:'admin@example.test',password:'Radar-test-12345'});
 const captureFetch=async target=>new Response(String(target).endsWith('/robots.txt')?'User-agent: *\nAllow: /':html,{status:200});
 const server=createApp(dir,{captureFetch});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const headers={Origin:base,'Content-Type':'application/json'},payload=JSON.stringify({url});
  assert.equal((await fetch(base+'/api/captures/link',{method:'POST',headers,body:payload})).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({email:'admin@example.test',password:'Radar-test-12345'})}),cookie=login.headers.get('set-cookie').split(';')[0];
  const first=await fetch(base+'/api/captures/link',{method:'POST',headers:{...headers,Cookie:cookie},body:payload});assert.equal(first.status,201);assert.equal((await first.json()).property.estado,'borrador');
  const second=await fetch(base+'/api/captures/link',{method:'POST',headers:{...headers,Cookie:cookie},body:payload});assert.equal(second.status,200);
  const inventory=await(await fetch(base+'/api/inmuebles',{headers:{Cookie:cookie}})).json();assert.equal(inventory.length,1);assert.equal(inventory[0].titulo,'Apartamento de prueba en Barquisimeto');
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
