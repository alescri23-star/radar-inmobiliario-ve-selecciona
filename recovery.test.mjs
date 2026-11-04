import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createApp} from './server.mjs';import {sendResetEmail} from './recovery.mjs';import {provisionAdmin} from './admin.mjs';
test('recuperación: entrega segura al webhook configurado',async()=>{
 let request;await sendResetEmail({email:'cliente@example.test',link:'https://radar.example/#reset=abc'},{resetWebhookUrl:'https://hook.eu2.make.com/privado',resetWebhookSecret:'secreto',fetch:async(url,options)=>{request={url:String(url),options};return {ok:true};}});
 assert.equal(request.url,'https://hook.eu2.make.com/privado');assert.equal(request.options.headers.Authorization,'Bearer secreto');assert.deepEqual(JSON.parse(request.options.body),{email:'cliente@example.test',link:'https://radar.example/#reset=abc',subject:'Restablece tu contraseña de Radar Venezuela'});
 await assert.rejects(()=>sendResetEmail({email:'a@b.test',link:'https://radar.example/'},{resetWebhookUrl:'http://inseguro.test',fetch:async()=>({ok:true})}),/no válido/);
});
test('recuperación: expiración, uso único, contraseña y revocación de sesiones',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'radar-reset-'));let clock=Date.now(),mail;const email='reset@example.test';await provisionAdmin(dir,{name:'Administrador',email,password:'Anterior-12345'});const server=createApp(dir,{now:()=>clock,publicUrl:'http://127.0.0.1:3000',sendReset:async m=>{mail=m;}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(route,body)=>fetch(base+'/api/'+route,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json'},body:JSON.stringify(body)});const token=()=>new URL(mail.link).hash.slice(7);
 try{
  const registered=await post('login',{email,password:'Anterior-12345'});const cookie=registered.headers.get('set-cookie').split(';')[0];
  const known=await post('forgot-password',{email});const first=token();const unknown=await post('forgot-password',{email:'nadie@example.test'});assert.deepEqual(await known.json(),await unknown.json());
  await post('forgot-password',{email});assert.equal((await post('reset-password',{token:first,password:'Nueva-123456'})).status,400);const expired=token();clock+=1800001;assert.equal((await post('reset-password',{token:expired,password:'Nueva-123456'})).status,400);
  await post('forgot-password',{email});const valid=token();assert.equal((await post('reset-password',{token:valid,password:'Nueva-123456'})).status,200);
  assert.equal((await fetch(base+'/api/public/inmuebles',{headers:{Cookie:cookie}})).status,401);assert.equal((await post('reset-password',{token:valid,password:'Otra-123456'})).status,400);
  assert.equal((await post('login',{email,password:'Anterior-12345'})).status,400);assert.equal((await post('login',{email,password:'Nueva-123456'})).status,200);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
