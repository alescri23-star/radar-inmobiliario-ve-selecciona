import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createApp} from './server.mjs';
test('recuperación: expiración, uso único, contraseña y revocación de sesiones',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'radar-reset-'));let clock=Date.now(),mail;const server=createApp(dir,{now:()=>clock,publicUrl:'http://127.0.0.1:3000',sendReset:async m=>{mail=m;}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(route,body)=>fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const email='reset@example.test';const token=()=>new URL(mail.link).hash.slice(7);
 try{
  const registered=await post('register',{name:'Prueba',email,password:'Anterior-12345'});const cookie=registered.headers.get('set-cookie').split(';')[0];
  const known=await post('forgot-password',{email});const first=token();const unknown=await post('forgot-password',{email:'nadie@example.test'});assert.deepEqual(await known.json(),await unknown.json());
  await post('forgot-password',{email});assert.equal((await post('reset-password',{token:first,password:'Nueva-123456'})).status,400);const expired=token();clock+=1800001;assert.equal((await post('reset-password',{token:expired,password:'Nueva-123456'})).status,400);
  await post('forgot-password',{email});const valid=token();assert.equal((await post('reset-password',{token:valid,password:'Nueva-123456'})).status,200);
  assert.equal((await fetch(base+'/api/public/inmuebles',{headers:{Cookie:cookie}})).status,401);assert.equal((await post('reset-password',{token:valid,password:'Otra-123456'})).status,400);
  assert.equal((await post('login',{email,password:'Anterior-12345'})).status,400);assert.equal((await post('login',{email,password:'Nueva-123456'})).status,200);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
