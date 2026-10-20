import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './server.mjs';
import {provisionAdmin} from './admin.mjs';
import {security} from './security.mjs';

test('configuración HTTPS y Host local: rechaza orígenes no fiables',()=>{
  for(const publicUrl of ['http://radar.example.test','https://user:pass@radar.example.test','https://radar.example.test/path']) assert.throws(()=>security({publicUrl}));
  const local=security({publicUrl:''});
  const req={method:'POST',socket:{localPort:3000},headers:{host:'localhost:3000',origin:'http://localhost:3000'}};
  assert.equal(local.allows(req),true);
  assert.equal(local.allows({...req,headers:{host:'attacker.test:3000',origin:'http://attacker.test:3000'}}),false);
  assert.equal(local.allows({...req,headers:{host:'localhost:3000','x-forwarded-proto':'https',origin:'https://localhost:3000'}}),false);
  assert.doesNotMatch(local.cookie('abc'),/Secure/);
});

test('administrador local, permisos de galería y ciclo de sesiones HTTPS',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'radar-security-'));
  const origin='https://radar.example.test';let mail,externalCalls=0;
  const server=createApp(dir,{publicUrl:origin,sendReset:async value=>{mail=value;},galleryFetch:async()=>{externalCalls++;throw Error('No se permite red en estas pruebas');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(route,body={},cookie='',extra={})=>fetch(base+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(body)});
  const credentials={name:'Administrador de prueba',email:'admin@example.test',password:'Prueba-admin-12345'};
  try{
    assert.equal((await post('setup',credentials)).status,403);
    assert.equal((await(await fetch(base+'/api/session')).json()).setupRequired,true);
    await provisionAdmin(dir,credentials);
    await assert.rejects(()=>provisionAdmin(dir,{...credentials,email:'otro@example.test'}),/Ya existe/);
    const login=await post('login',credentials,'',{'X-Forwarded-Proto':'http'});
    assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/; Secure/);
    const adminCookie=login.headers.get('set-cookie').split(';')[0];
    assert.equal((await post('login',credentials,'',{Origin:'http://radar.example.test'})).status,403);
    assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)})).status,403);
    assert.equal((await post('setup',credentials,adminCookie)).status,403);
    assert.equal((await post('register',{name:'Cliente',email:'cliente@example.test',password:'Prueba-cliente-12345'})).status,404);
    const db=new DatabaseSync(path.join(dir,'radar.sqlite'));
    const photos=['https://cdn.remax.com.ve/test/1.jpg','https://attacker.test/private.jpg'];
    try{for(const estado of ['activo','reservado'])db.prepare('INSERT INTO records VALUES(?,?,?)').run(estado,'inmuebles',JSON.stringify({id:estado,estado,titulo:'Inmueble ficticio de prueba',foto:photos[0],fotos:photos,fotosConsultadasEn:new Date().toISOString(),sourceId:'remax',fuente:'https://www.remax.com.ve/test'}));}finally{db.close();}
    const gallery=(id,cookie='')=>fetch(base+'/api/gallery/'+id,{headers:{Cookie:cookie}});
    assert.equal((await gallery('activo')).status,401);
    assert.deepEqual((await(await gallery('activo',adminCookie)).json()).fotos,[photos[0]]);
    assert.equal((await gallery('reservado',adminCookie)).status,200);
    assert.equal((await gallery('missing',adminCookie)).status,404);
    const edit=await post('inmuebles',{titulo:'Prueba sin galería',estado:'activo',operacion:'venta',moneda:'USD',precio:'1'},adminCookie);
    assert.equal(edit.status,201);const property=await edit.json();
    assert.deepEqual((await(await gallery(property.id,adminCookie)).json()).fotos,[]);
    assert.equal(externalCalls,0);
    for(const route of ['/','/admin','/gallery.js','/favicon.svg'])assert.equal((await fetch(base+route)).status,200);
    assert.match(await(await fetch(base+'/admin')).text(),/gallery.js/);
    const extraLogin=await post('login',credentials);const extraCookie=extraLogin.headers.get('set-cookie').split(';')[0];
    const logout=await post('logout',{},extraCookie);assert.match(logout.headers.get('set-cookie'),/Max-Age=0; Secure/);
    assert.equal((await gallery('activo',extraCookie)).status,401);
    assert.equal((await post('forgot-password',{email:credentials.email})).status,200);
    assert.equal(new URL(mail.link).origin,origin);
    const reset=await post('reset-password',{token:new URL(mail.link).hash.slice(7),password:'Nueva-prueba-12345'});
    assert.equal(reset.status,200);assert.match(reset.headers.get('set-cookie'),/Max-Age=0; Secure/);
    assert.equal((await gallery('activo',adminCookie)).status,401);
  }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});

test('formulario WordPress acepta solo el origen configurado',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'radar-form-origin-'));
  const formOrigin='https://orangered-cod-348216.hostingersite.com';
  const server=createApp(dir,{publicUrl:'https://radar.example.test',formOrigin});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const payload={nombre:'Reformas Prueba',personaContacto:'Persona Prueba',email:'prueba@example.test',contacto:'+58 412 000 0000',tipoEmpresa:'Empresa de reformas',servicios:'Reformas integrales',cobertura:'Barquisimeto',consent:true};
  try{
    const allowed=await fetch(base+'/api/professional-applications',{method:'POST',headers:{Origin:formOrigin,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    assert.equal(allowed.status,201);assert.equal(allowed.headers.get('access-control-allow-origin'),formOrigin);
    const denied=await fetch(base+'/api/professional-applications',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify({...payload,email:'otro@example.test'})});
    assert.equal(denied.status,403);
    const preflight=await fetch(base+'/api/professional-applications',{method:'OPTIONS',headers:{Origin:formOrigin,'Access-Control-Request-Method':'POST'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),formOrigin);
  }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
