import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCoverage,propertyMunicipality,propertyState,venezuelaStates} from './coverage.mjs';

test('incluye todos los estados, Distrito Capital y Dependencias Federales',()=>{
  assert.equal(venezuelaStates.length,25);
  assert.equal(propertyState({titulo:'Apartamento en Maracaibo, Zulia'}),'Zulia');
  assert.equal(propertyState({zona:'Barquisimeto centro'}),'Lara');
  assert.equal(propertyState({zona:'Ubicación no reconocida'}),'Sin clasificar');
});

test('normaliza municipios usando municipio, ciudad o zona',()=>{
  assert.equal(propertyMunicipality({municipio:'Municipio Iribarren'}),'Iribarren');
  assert.equal(propertyMunicipality({zona:'Centro de Cabudare'}),'Palavecino');
  assert.equal(propertyMunicipality({titulo:'Casa familiar en Quíbor'}),'Jiménez');
  assert.equal(propertyMunicipality({zona:'Zona desconocida'}),'Sin clasificar');
});

test('resume únicamente inmuebles activos y calcula calidad',()=>{
  const report=buildCoverage([
    {id:'lara-1',estado:'activo',municipio:'Iribarren',titulo:'Apartamento centro',operacion:'venta',precio:'50000',moneda:'USD',foto:'https://example.test/a.jpg',latitud:'10',longitud:'-69'},
    {estado:'activo',municipio:'Cabudare',operacion:'alquiler',foto:'',latitud:'',longitud:''},
    {estado:'archivado',municipio:'Iribarren',operacion:'venta',foto:'x',latitud:'10',longitud:'-69'}
  ]);
  assert.equal(report.total,2);
  assert.equal(report.referenceTotal,13989);
  assert.equal(report.estimatedCoverage,0);
  assert.equal(report.sale,1);
  assert.equal(report.rent,1);
  assert.equal(report.quality,50);
  assert.equal(report.states.find(item=>item.name==='Lara').total,2);
  assert.equal(report.states.find(item=>item.name==='Lara').referenceTotal,432);
  assert.equal(report.municipalities.find(item=>item.name==='Iribarren').total,1);
  assert.equal(report.municipalities.find(item=>item.name==='Palavecino').withoutPhoto,1);
  assert.deepEqual(report.listings,[{id:'lara-1',title:'Apartamento centro',state:'Lara',operation:'venta',type:'',price:'50000',currency:'USD',zone:'Iribarren',address:'',photo:'https://example.test/a.jpg',source:'',lat:10,lng:-69}]);
});
