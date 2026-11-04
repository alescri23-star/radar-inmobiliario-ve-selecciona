import test from 'node:test';
import assert from 'node:assert/strict';
import {createExchangeRateService} from './exchange-rates.mjs';

test('normaliza las tasas oficiales y reutiliza la caché', async () => {
  let calls = 0;
  const load = createExchangeRateService(async () => ({
    ok: true,
    json: async () => { calls++; return {USD: 889.25, EUR: 992.8, effective_date: '2026-10-30', updated_at: '2026-10-29T23:28:16Z'}; }
  }), 1000);
  const first = await load(100), second = await load(500);
  assert.deepEqual(first.rates, {VES: 1, USD: 889.25, EUR: 992.8});
  assert.equal(first.effectiveDate, '2026-10-30');
  assert.equal(second, first);
  assert.equal(calls, 1);
});

test('rechaza tasas ausentes o imposibles', async () => {
  const load = createExchangeRateService(async () => ({ok: true, json: async () => ({USD: 0, EUR: 'texto'})}));
  await assert.rejects(load(), /tasas inválidas/);
});
