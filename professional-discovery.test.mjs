import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parseInfoguia,parseSearchRss} from './professional-discovery.mjs';
import {provisionAdmin} from './admin.mjs';
import {createApp} from './server.mjs';

const infoguia='<div class="box-announce"><a class="ads-text-link fw-semibold" href="/is.asp?emp=grupo-prueba&amp;clte=123&amp;ciud=53">Grupo Prueba</a><section aria-labelledby="direccion-empresa0"><h5 id="direccion-empresa0">Dirección</h5><span>Zona Este, Barquisimeto</span></section><span class="telefono-desktop d-none">(0412)555.1234</span><p class="desc desc-truncate">Remodelación, pintura y electricidad.</p></div>';
const rss='<rss><channel><item><title>Arquitectura Lara | Instagram</title><link>https://www.instagram.com/arquitecturalara/</link><description>Diseño y remodelación en Barquisimeto. Teléfono 0414-555-7788.</description></item></channel></rss>';

test('convierte directorios y resultados web en candidatos verificables',()=>{
 const directory=parseInfoguia(infoguia,{specialty:'Reformas integrales',zone:'Barquisimeto'});
 assert.equal(directory.length,1);assert.equal(directory[0].nombre,'Grupo Prueba');assert.equal(directory[0].contacto,'(0412)555.1234');assert.match(directory[0].sitioWeb,/infoguia\.com\/is\.asp/);
 const social=parseSearchRss(rss,{specialty:'Arquitectura y diseño',zone:'Barquisimeto',source:'instagram'});
 assert.equal(social.length,1);assert.equal(social[0].nombre,'Arquitectura Lara');assert.equal(social[0].contacto,'0414-555-7788');assert.equal(social[0].fuente,'Instagram');
});

test('el administrador genera un listado, añade un candidato y detecta el duplicado',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'radar-professional-discovery-'));await provisionAdmin(dir,{name:'Administrador',email:'admin@example.test',password:'Radar-test-12345'});
 const server=createApp(dir,{professionalSearchFetch:async()=>new Response(infoguia,{status:200})});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`,headers={Origin:base,'Content-Type':'application/json'};
 try{
  assert.equal((await fetch(base+'/api/professional-discovery?source=infoguia')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({email:'admin@example.test',password:'Radar-test-12345'})}),cookie=login.headers.get('set-cookie').split(';')[0];
  const first=await(await fetch(base+'/api/professional-discovery?source=infoguia&specialty=Reformas%20integrales&zone=Barquisimeto',{headers:{Cookie:cookie}})).json();assert.equal(first.results.length,1);assert.equal(first.results[0].alreadyExists,false);
  const created=await fetch(base+'/api/profesionales',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(first.results[0])});assert.equal(created.status,201);assert.equal((await created.json()).origen,'descubrimiento');
  const second=await(await fetch(base+'/api/professional-discovery?source=infoguia',{headers:{Cookie:cookie}})).json();assert.equal(second.results[0].alreadyExists,true);assert.ok(second.results[0].existingId);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
