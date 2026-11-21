import {createHash} from 'node:crypto';

const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(?:venta|alquiler|inmueble|barquisimeto|lara|venezuela|oportunidad|se|ofrece|en|de|del|la|el|un|una|con)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// Es una pista para revisión; nunca fusiona o elimina anuncios automáticamente.
export function listingFingerprint(record) {
  const title = normalized(record.titulo).split(' ').filter(word => word.length > 2).sort().slice(0, 10).join(' ');
  const parts = [record.operacion, record.tipo, record.precio, record.moneda, record.superficie, record.habitaciones, record.banos, record.municipio || record.zona, title].map(normalized);
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}
