const numeric = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const segmentType = value => String(value || '').startsWith('Terreno') ? 'Terreno' : String(value || 'Otro');

const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function marketReferences(records = [], minimumSample = 5) {
  const usable = records.map(record => {
    const price = numeric(record.precio), area = numeric(record.superficie);
    return {...record, marketUnitPrice: price && area ? price / area : null, marketSegment: segmentType(record.tipo)};
  });
  const broadGroups = new Map(), localGroups = new Map();
  const keyFor = record => [record.operacion, record.moneda, record.marketSegment].join('|');
  const addToGroup = (groups, key, record) => groups.set(key, [...(groups.get(key) || []), record]);
  for (const record of usable) {
    if (!record.marketUnitPrice) continue;
    const broadKey = keyFor(record);
    addToGroup(broadGroups, broadKey, record);
    if (record.municipio) addToGroup(localGroups, `${broadKey}|${record.municipio}`, record);
  }
  const result = {};
  for (const record of usable) {
    if (!record.id || !record.marketUnitPrice) continue;
    const broadKey = keyFor(record);
    const broad = broadGroups.get(broadKey) || [];
    const local = record.municipio ? localGroups.get(`${broadKey}|${record.municipio}`) || [] : [];
    const sample = local.length >= minimumSample ? local : broad;
    if (sample.length < minimumSample) continue;
    const reference = median(sample.map(candidate => candidate.marketUnitPrice));
    if (!reference) continue;
    const difference = (record.marketUnitPrice - reference) / reference;
    result[record.id] = {
      unitPrice: Math.round(record.marketUnitPrice),
      medianUnitPrice: Math.round(reference),
      differencePercent: Math.round(difference * 100),
      signal: difference <= -0.15 ? 'below' : difference >= 0.15 ? 'above' : 'market',
      sampleSize: sample.length,
      scope: local.length >= minimumSample ? record.municipio : 'Barquisimeto',
      segment: `${record.operacion || ''} · ${record.marketSegment}`
    };
  }
  return result;
}
