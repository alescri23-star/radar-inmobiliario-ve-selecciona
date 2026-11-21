import {test} from 'node:test';
import assert from 'node:assert/strict';
import {landType,classifyLand} from './land.mjs';
test('etiqueta textual de terrenos, sin inferir por ubicación o uso',()=>{
 assert.equal(landType('PARCELA RÚSTICA en venta'),'Terreno rústico');
 assert.equal(landType('Lote disponible','Se ofrece un terreno urbano de 500 m².'),'Terreno urbano');
 for(const text of ['Parcela en urbanización','Terreno comercial en el centro','Finca cerca de la ciudad','No es terreno urbano','Posible terreno urbano','Terreno rústico con otra parcela urbana'])assert.equal(landType(text),'Terreno sin clasificar');
 assert.equal(classifyLand({tipo:'Apartamento',titulo:'junto a terreno urbano'}).tipo,'Apartamento');
 assert.equal(classifyLand({tipo:'Terreno sin clasificar',descripcion:'Suelo urbano'}).tipo,'Terreno urbano');
 assert.equal(classifyLand({tipo:'Terreno rústico',titulo:'Parcela'}).tipo,'Terreno rústico');
});
