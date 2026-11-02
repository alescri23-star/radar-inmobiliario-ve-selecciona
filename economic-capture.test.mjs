import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {adaptDatabase,initializeDatabase} from './database.mjs';
import {captureEconomicSignals,classifyEconomicItem,createEconomicCaptureService,discoverEconomicLinks,parseEconomicDetail} from './economic-capture.mjs';

const source={id:'official',name:'Fuente oficial',url:'https://example.com/noticias',allowedPath:'/economia/',channel:'Fuente oficial',trusted:true};

test('descubre solo enlaces económicos permitidos de la fuente',()=>{
 const html='<a href="/economia/nueva-inversion">Nueva inversión en infraestructura y vivienda</a><a href="https://otro.test/economia/fuera">Inversión fuera</a><a href="/deportes/partido">Partido amistoso</a>';
 assert.deepEqual(discoverEconomicLinks(html,source),[{url:'https://example.com/economia/nueva-inversion',title:'Nueva inversión en infraestructura y vivienda'}]);
});

test('lee titulares relevantes desde una fuente RSS',()=>{
 const rss={...source,format:'rss'},xml='<rss><channel><item><title><![CDATA[Empresas anuncian inversión en tecnología]]></title><link>https://example.com/economia/plan</link></item><item><title>Resultado deportivo</title><link>https://example.com/deportes/uno</link></item></channel></rss>';
 assert.deepEqual(discoverEconomicLinks(xml,rss),[{url:'https://example.com/economia/plan',title:'Empresas anuncian inversión en tecnología'}]);
});

test('extrae metadatos y clasifica la señal',()=>{
 const detail=parseEconomicDetail('<meta property="og:title" content="Nueva planta de energía"><meta property="og:description" content="Proyecto de generación eléctrica"><meta property="article:published_time" content="2026-10-31T10:00:00Z"><meta property="og:image" content="https://example.com/foto.jpg">');
 assert.equal(detail.date,'2026-10-31');assert.equal(detail.imageUrl,'https://example.com/foto.jpg');
 assert.deepEqual(classifyEconomicItem(detail),{sector:'Energía',topics:['Electricidad','Inversión'],impact:'alto'});
});

test('guarda una sola vez y registra duplicados en la siguiente captura',async()=>{
 const raw=new DatabaseSync(':memory:'),db=adaptDatabase(raw);await initializeDatabase(db);
 const pages=new Map([
  [source.url,'<a href="/economia/nueva-inversion">Nueva inversión en infraestructura y vivienda</a>'],
  ['https://example.com/economia/nueva-inversion','<meta property="og:title" content="Nueva inversión en infraestructura y vivienda"><meta property="og:description" content="Se financiará una nueva obra de infraestructura"><meta property="article:published_time" content="2026-11-01">']
 ]);
 const fetcher=async url=>new Response(pages.get(url),{status:pages.has(url)?200:404});
 const first=await captureEconomicSignals(db,{fetcher,sources:[source]}),second=await captureEconomicSignals(db,{fetcher,sources:[source]});
 assert.equal(first.added,1);assert.equal(second.added,0);assert.equal(second.duplicates,1);
 const saved=(await db.all('SELECT body FROM records WHERE kind=?',['economic_signals'])).map(row=>JSON.parse(row.body));assert.equal(saved.length,1);assert.equal(saved[0].visibleInWeb,true);assert.equal(saved[0].order,0);raw.close();
});

test('avisa cuando una fuente externa termina con error',async()=>{
 const raw=new DatabaseSync(':memory:'),db=adaptDatabase(raw);await initializeDatabase(db);
 const service=createEconomicCaptureService(db,{sources:[source],fetcher:async()=>new Response('',{status:503})});
 const result=await service.run();assert.equal(result.failed,1);assert.match(service.status().phase,/parcial/i);assert.match(service.status().error,/HTTP 503/);raw.close();
});
