const endpoint = 'https://bcv.today/api/v1/rate.json';

const validRate = value => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 && rate < 1_000_000 ? rate : null;
};

export function createExchangeRateService(fetchImpl = fetch, ttlMs = 6 * 60 * 60 * 1000) {
  let cached = null, expiresAt = 0;
  return async function loadExchangeRates(now = Date.now()) {
    if (cached && now < expiresAt) return cached;
    const response = await fetchImpl(endpoint, {headers: {'Accept': 'application/json'}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw Error(`No se pudo consultar el cambio oficial (${response.status})`);
    const data = await response.json(), usd = validRate(data.USD), eur = validRate(data.EUR);
    if (!usd || !eur) throw Error('La fuente de cambio devolvió tasas inválidas');
    cached = {
      base: 'VES',
      rates: {VES: 1, USD: usd, EUR: eur},
      effectiveDate: String(data.effective_date || data.date || '').slice(0, 10),
      updatedAt: String(data.updated_at || ''),
      source: 'BCV',
      sourceUrl: 'https://www.bcv.org.ve/'
    };
    expiresAt = now + ttlMs;
    return cached;
  };
}
