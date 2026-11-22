export const sourceRegistry = Object.freeze({
  rentahouse: {
    id: 'rentahouse', name: 'Rent-A-House', mode: 'automatic', status: 'operativa',
    hosts: ['rentahouse.com.ve'], photoHosts: ['cdn.photos.sparkplatform.com'],
    home: 'https://rentahouse.com.ve/'
  },
  remax: {
    id: 'remax', name: 'RE/MAX', mode: 'automatic', status: 'operativa',
    hosts: ['www.remax.com.ve'], photoHosts: ['cdn.remax.com.ve'],
    home: 'https://www.remax.com.ve/'
  },
  acinmobiliarias: {
    id: 'acinmobiliarias', name: 'AC Inmobiliarias', mode: 'manual-link', status: 'piloto',
    hosts: ['acinmobiliarias.com', 'www.acinmobiliarias.com'], photoHosts: ['images.wasi.co'],
    home: 'https://acinmobiliarias.com/'
  },
  ebienesraices: {
    id: 'ebienesraices', name: 'eBienesRaices', mode: 'manual-link', status: 'piloto',
    hosts: ['www.ebienesraices.com.ve', 'ebienesraices.com.ve'], photoHosts: ['www.ebienesraices.com.ve', 'ebienesraices.com.ve'],
    home: 'https://www.ebienesraices.com.ve/shop'
  },
  mercadolibre: {
    id: 'mercadolibre', name: 'Mercado Libre Inmuebles', mode: 'official-api', status: 'requiere_configuracion',
    hosts: ['listado.mercadolibre.com.ve', 'inmueble.mercadolibre.com.ve'], photoHosts: [],
    home: 'https://listado.mercadolibre.com.ve/inmuebles/lara/barquisimeto/barquisimeto/'
  },
  century21: {
    id: 'century21', name: 'Century 21 Venezuela', mode: 'automatic', status: 'piloto',
    hosts: ['www.century21.com.ve'], photoHosts: ['cdn.21online.lat'],
    home: 'https://www.century21.com.ve/v/resultados/en-pais_venezuela/en-estado_lara'
  }
});

export const automaticSourceIds = Object.values(sourceRegistry).filter(source => source.mode === 'automatic').map(source => source.id);
export const manualLinkSourceIds = Object.values(sourceRegistry).filter(source => source.mode === 'automatic' || source.mode === 'manual-link').map(source => source.id);

export function sourceByHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return Object.values(sourceRegistry).find(source => source.hosts.includes(host));
}

export function publicSource(source) {
  return {id: source.id, name: source.name, mode: source.mode, status: source.status, home: source.home};
}
