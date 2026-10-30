import test from 'node:test';
import assert from 'node:assert/strict';
import {marketReferences} from './market-analysis.mjs';

test('compara por operación, moneda y tipo sin mezclar alquiler con venta', () => {
  const records = [
    ['a', 70000, 100, 'venta'], ['b', 80000, 100, 'venta'], ['c', 90000, 100, 'venta'],
    ['d', 100000, 100, 'venta'], ['e', 110000, 100, 'venta'], ['rent', 500, 100, 'alquiler']
  ].map(([id, precio, superficie, operacion]) => ({id, precio, superficie, operacion, moneda:'USD', tipo:'Apartamento', municipio:'Iribarren'}));
  const references = marketReferences(records);
  assert.equal(references.a.medianUnitPrice, 900);
  assert.equal(references.a.signal, 'below');
  assert.equal(references.c.signal, 'market');
  assert.equal(references.e.signal, 'above');
  assert.equal(references.rent, undefined);
});

test('agrupa las clasificaciones de terreno y exige una muestra mínima', () => {
  const records = ['rústico','urbano','sin clasificar','urbano','rústico'].map((kind,index)=>({id:String(index),precio:10000+index*1000,superficie:1000,operacion:'venta',moneda:'USD',tipo:'Terreno '+kind,municipio:''}));
  const references = marketReferences(records);
  assert.equal(references['0'].sampleSize, 5);
  assert.equal(references['0'].segment, 'venta · Terreno');
  assert.equal(marketReferences(records.slice(0,4))['0'], undefined);
});
