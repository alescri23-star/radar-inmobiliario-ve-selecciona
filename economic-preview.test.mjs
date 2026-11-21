import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomicPreviewService} from './economic-preview.mjs';

test('sirve y almacena miniaturas solo para señales conocidas',async()=>{
 let calls=0;const load=createEconomicPreviewService(async()=>({ok:true,headers:new Headers({'content-type':'image/png'}),arrayBuffer:async()=>{calls++;return Uint8Array.from([1,2,3]).buffer;}}),1000);
 const first=await load('undp-macro-2026',100),second=await load('undp-macro-2026',500);
 assert.equal(first.contentType,'image/png');assert.equal(second,first);assert.equal(calls,1);assert.equal(await load('desconocida'),null);
 const linkedin=await load('pdvsa-chevron-eni-2026',600);assert.equal(linkedin.contentType,'image/png');assert.equal(calls,2);
});

test('genera una portada segura cuando la fuente de miniaturas falla',async()=>{
 const load=createEconomicPreviewService(async()=>{throw Error('sin conexión');});const result=await load('conapri-sectors');
 assert.equal(result.contentType,'image/svg+xml');assert.equal(result.fallback,true);assert.match(result.buffer.toString(),/CONAPRI/);
});
