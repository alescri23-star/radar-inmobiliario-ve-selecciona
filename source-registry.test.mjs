import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceRegistry,automaticSourceIds,manualLinkSourceIds,sourceByHost,publicSource} from './source-registry.mjs';

test('separa fuentes automáticas, manuales y APIs pendientes',()=>{
 assert.deepEqual(automaticSourceIds,['rentahouse','remax']);
 assert.ok(manualLinkSourceIds.includes('acinmobiliarias'));
 assert.equal(sourceByHost('www.ebienesraices.com.ve').id,'ebienesraices');
 assert.equal(sourceRegistry.mercadolibre.mode,'official-api');
 assert.equal(sourceRegistry.mercadolibre.status,'requiere_configuracion');
 assert.equal('hosts' in publicSource(sourceRegistry.remax),false);
});
