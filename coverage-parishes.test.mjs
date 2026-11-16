import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./public/coverage-parishes.js',import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(source,context);
const {displayName,geometryContains,prepare}=context.window.RadarParishes;

test('normaliza los nombres actuales de las parroquias de Iribarren',()=>{
  assert.equal(displayName('JUAN DE VILLEGAS'),'Guerrera Ana Soto (Juan de Villegas)');
  assert.equal(displayName('EL CUJI'),'El Cují');
  assert.equal(displayName('AGUEDO FELIPE ALVARADO'),'Águedo Felipe Alvarado');
});

test('ubica anuncios dentro de polígonos y calcula sus totales',()=>{
  const geojson={type:'FeatureCollection',features:[{type:'Feature',properties:{parroquia:'CATEDRAL'},geometry:{type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]}}]};
  const listings=[{id:'1',lat:1,lng:1,operation:'venta'},{id:'2',lat:3,lng:3,operation:'alquiler'}];
  assert.equal(geometryContains(geojson.features[0].geometry,[1,1]),true);
  prepare(geojson,listings);
  assert.equal(listings[0].parish,'Catedral');
  assert.equal(listings[1].parish,undefined);
  assert.equal(geojson.features[0].properties.radarTotal,1);
  assert.equal(geojson.features[0].properties.sale,1);
  assert.equal(geojson.features[0].properties.rent,0);
});
