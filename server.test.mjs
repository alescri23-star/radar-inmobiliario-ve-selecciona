import {provisionAdmin} from './admin.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './server.mjs';

test('persistencia, edición, referencias y validación', async () => {
 const dir=mkdtempSync(path.join(tmpdir(),'radar-test-'));
 provisionAdmin(dir,{name:'Administrador',email:'admin@example.test',password:'Radar-test-12345'});
 let server=createApp(dir);
 const start=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 let base=await start();
 const professionalApplication={nombre:'Reformas Lara',personaContacto:'María Pérez',email:'maria@example.test',contacto:'+58 412 123 4567',whatsapp:'+58 412 123 4567',tipoEmpresa:'Empresa de reformas',servicios:'Reformas residenciales',cobertura:'Barquisimeto',experiencia:'8 años',sitioWeb:'https://example.test',consent:true};
 assert.equal((await fetch(base+'/api/professional-applications',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({...professionalApplication,consent:false})})).status,400);
 assert.equal((await fetch(base+'/api/professional-applications',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(professionalApplication)})).status,201);
 assert.equal((await fetch(base+'/api/leads')).status,401);
 const setup=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Administrador',email:'admin@example.test',password:'Radar-test-12345'})});assert.equal(setup.status,200);const cookie=setup.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(base+'/api/leads')).status,401);
 assert.equal((await fetch(base+'/api/public/inmuebles')).status,401);
 const request=(resource,body,method='POST',headers={})=>fetch(base+'/api/'+resource,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify(body)});
 try {
  assert.deepEqual(await (await fetch(base+'/api/inmuebles',{headers:{Cookie:cookie}})).json(),[]);
  const payload={titulo:'Casa piloto',zona:'Barquisimeto',operacion:'venta',precio:'50000',moneda:'USD',estado:'activo',fuente:'Prueba',latitud:'10.067',longitud:'-69.347'};
  const response=await request('inmuebles',payload);assert.equal(response.status,201);const property=await response.json();
  assert.equal((await request('inmuebles',{...payload,precio:'-1'})).status,400);
  assert.equal((await request('inmuebles',{...payload,latitud:'91'})).status,400);
  assert.equal((await request('inmuebles',{...payload,longitud:''})).status,400);
  assert.equal((await request('inmuebles',{...payload,latitud:'91'})).status,400);
  assert.equal((await request('inmuebles',{...payload,longitud:''})).status,400);
  assert.equal((await request('inmuebles',payload,'POST',{Origin:'https://otro.example'})).status,403);
  assert.equal((await request('leads',{nombre:'Ana',estado:'nuevo',inmuebleId:'no-existe'})).status,400);
  const manualLead=await request('leads',{nombre:'Ana',contacto:'ana@example.test',telefono:'+58 412 000 0000',whatsapp:'584120000000',estado:'nuevo',interes:'alto',inmuebleId:property.id,proximaAccion:'Llamar',fecha:'2026-10-20',ultimaActividad:'2026-10-18',responsable:'Equipo Radar',notas:'Prefiere contacto por WhatsApp'});assert.equal(manualLead.status,201);const savedLead=await manualLead.json();assert.equal(savedLead.origen,'manual');assert.equal(savedLead.interes,'alto');assert.equal(savedLead.whatsapp,'584120000000');assert.equal(savedLead.responsable,'Equipo Radar');
  assert.equal((await request('reformas',{titulo:'Cocina',estado:'detectada',inmuebleId:property.id,importe:'2000',moneda:'USD'})).status,201);
  const professional=await request('profesionales',{nombre:'Empresa candidata',tipoEmpresa:'Empresa de reformas',servicios:'Reforma integral',contacto:'contacto público',whatsapp:'WhatsApp público',sitioWeb:'https://example.test',cobertura:'Barquisimeto',fuente:'https://example.test',fechaRevision:'2026-10-15',estado:'candidato'});assert.equal(professional.status,201);
  assert.equal((await request('profesionales',{nombre:'Estado inválido',estado:'verificado'})).status,400);
  assert.equal((await request('inmuebles/'+property.id,{...payload,estado:'reservado'},'PUT')).status,200);
  await new Promise(r=>server.close(r));server=createApp(dir);base=await start();
  const restored=await(await fetch(base+'/api/inmuebles',{headers:{Cookie:cookie}})).json();assert.equal(restored.length,1);assert.equal(restored[0].estado,'reservado');assert.equal(restored[0].latitud,'10.067');assert.equal(restored[0].longitud,'-69.347');assert.equal(restored[0].latitud,'10.067');assert.equal(restored[0].longitud,'-69.347');
  const professionals=await(await fetch(base+'/api/profesionales',{headers:{Cookie:cookie}})).json();assert.equal(professionals.length,2);assert.equal(professionals.find(item=>item.nombre==='Empresa candidata').whatsapp,'WhatsApp público');const application=professionals.find(item=>item.nombre==='Reformas Lara');assert.equal(application.origen,'formulario');assert.equal(application.estado,'candidato');assert.equal(application.email,'maria@example.test');
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/server.mjs')).status,404);
  const customer=await fetch(base+'/api/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Cliente',email:'cliente@example.test',password:'Cliente-test-12345'})});assert.equal(customer.status,200);const clientCookie=customer.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base+'/api/leads',{headers:{Cookie:clientCookie}})).status,401);
  assert.equal((await fetch(base+'/api/profesionales',{headers:{Cookie:clientCookie}})).status,401);
  await request('inmuebles/'+property.id,payload,'PUT');
  const publicItems=await(await fetch(base+'/api/public/inmuebles',{headers:{Cookie:clientCookie}})).json();assert.equal(publicItems.length,1);assert.equal(publicItems[0].historial,undefined);
  const inquiry=await fetch(base+'/api/inquiries',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:clientCookie},body:JSON.stringify({inmuebleId:property.id,contacto:'cliente@example.test',consent:true})});assert.equal(inquiry.status,201);const leads=await(await fetch(base+'/api/leads',{headers:{Cookie:cookie}})).json();assert.equal(leads.find(lead=>lead.userId)?.origen,'formulario');
  assert.equal((await fetch(base+'/api/setup',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Otro',email:'otro@example.test',password:'Otro-test-12345'})})).status,403);
  assert.equal((await fetch(base+'/api/leads',{headers:{Cookie:clientCookie}})).status,401);
  await request('inmuebles/'+property.id,payload,'PUT');
  assert.equal((await fetch(base+'/api/logout',{method:'POST',headers:{Origin:base,Cookie:clientCookie}})).status,200);
  assert.equal((await fetch(base+'/api/public/inmuebles',{headers:{Cookie:clientCookie}})).status,401);
  assert.equal((await fetch(base+'/api/inquiries',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:clientCookie},body:JSON.stringify({inmuebleId:property.id,contacto:'x',consent:true})})).status,401);
  assert.equal((await fetch(base+'/api/setup',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Otro',email:'otro@example.test',password:'Otro-test-12345'})})).status,403);
 } finally {await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});

