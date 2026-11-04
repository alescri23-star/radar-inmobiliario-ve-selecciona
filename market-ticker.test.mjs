import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketTickerService} from './market-ticker.mjs';

test('combina cambios BCV y referencias internacionales y reutiliza la caché', async () => {
  let calls = 0;
  const load = createMarketTickerService({
    loadExchangeRates: async () => ({rates:{USD:900,EUR:1000},effectiveDate:'2026-11-01',updatedAt:'2026-11-01T12:00:00Z',source:'BCV',sourceUrl:'https://www.bcv.org.ve/'}),
    fetchImpl: async () => ({ok:true,json:async()=>{calls++;return {UKOIL:{mid:70.25,dayDiffPercent:1.2,marketState:'open',stale:false,lastQuoteAt:'2026-11-01T12:00:00Z'},XAUUSD:{mid:2800,dayDiffPercent:-.4,marketState:'closed',stale:true}};}}),
    ttlMs: 1000
  });
  const first=await load(100),second=await load(500);
  assert.equal(first.items.length,4);
  assert.equal(first.items.find(item=>item.id==='BCV-USD').value,900);
  assert.equal(first.items.find(item=>item.id==='UKOIL').changePercent,1.2);
  assert.equal(second,first);
  assert.equal(calls,1);
});

test('mantiene el cambio BCV cuando falla el mercado internacional', async () => {
  const load=createMarketTickerService({loadExchangeRates:async()=>({rates:{USD:900,EUR:1000},effectiveDate:'2026-11-01',source:'BCV'}),fetchImpl:async()=>{throw Error('sin conexión');}});
  const result=await load(100);
  assert.equal(result.items.length,2);
  assert.equal(result.partial,true);
});
