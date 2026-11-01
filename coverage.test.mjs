import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCoverage,propertyMunicipality} from './coverage.mjs';

test('normaliza municipios usando municipio, ciudad o zona',()=>{
  assert.equal(propertyMunicipality({municipio:'Municipio Iribarren'}),'Iribarren');
  assert.equal(propertyMunicipality({zona:'Centro de Cabudare'}),'Palavecino');
  assert.equal(propertyMunicipality({titulo:'Casa familiar en Quíbor'}),'Jiménez');
  assert.equal(propertyMunicipality({zona:'Zona desconocida'}),'Sin clasificar');
});

test('resume únicamente inmuebles activos y calcula calidad',()=>{
  const report=buildCoverage([
    {estado:'activo',municipio:'Iribarren',operacion:'venta',foto:'https://example.test/a.jpg',latitud:'10',longitud:'-69'},
    {estado:'activo',municipio:'Cabudare',operacion:'alquiler',foto:'',latitud:'',longitud:''},
    {estado:'archivado',municipio:'Iribarren',operacion:'venta',foto:'x',latitud:'10',longitud:'-69'}
  ],4);
  assert.equal(report.total,2);
  assert.equal(report.estimatedCoverage,50);
  assert.equal(report.sale,1);
  assert.equal(report.rent,1);
  assert.equal(report.quality,50);
  assert.equal(report.municipalities.find(item=>item.name==='Iribarren').total,1);
  assert.equal(report.municipalities.find(item=>item.name==='Palavecino').withoutPhoto,1);
});
