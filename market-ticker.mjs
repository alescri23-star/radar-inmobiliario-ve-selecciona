const marketEndpoint = 'https://biquote.io/api/latest?symbols=UKOIL&symbols=XAUUSD&symbols=US500&symbols=BTCUSD';
const definitions = {
  UKOIL: {label: 'Petróleo Brent', unit: 'USD/barril', decimals: 2},
  XAUUSD: {label: 'Oro', unit: 'USD/onza', decimals: 2},
  US500: {label: 'S&P 500', unit: 'puntos', decimals: 2},
  BTCUSD: {label: 'Bitcoin', unit: 'USD', decimals: 2}
};
const validNumber = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

export function createMarketTickerService({fetchImpl = fetch, loadExchangeRates, ttlMs = 15 * 60 * 1000} = {}) {
  let cached = null, expiresAt = 0;
  return async function loadMarketTicker(now = Date.now()) {
    if (cached && now < expiresAt) return cached;
    const items = [];
    let officialError = '', marketError = '';
    try {
      const rates = await loadExchangeRates(now);
      for (const currency of ['USD', 'EUR']) items.push({
        id: `BCV-${currency}`, label: `${currency} / bolívar BCV`, value: validNumber(rates.rates[currency]),
        unit: 'VES', changePercent: null, marketState: 'official', stale: false,
        timestamp: rates.updatedAt || rates.effectiveDate, effectiveDate: rates.effectiveDate,
        source: rates.source, sourceUrl: rates.sourceUrl
      });
    } catch (error) { officialError = error.message; }
    try {
      const response = await fetchImpl(marketEndpoint, {headers: {'Accept': 'application/json'}, signal: AbortSignal.timeout(8000)});
      if (!response.ok) throw Error(`Cotizaciones no disponibles (${response.status})`);
      const payload = await response.json();
      for (const [symbol, definition] of Object.entries(definitions)) {
        const quote = payload[symbol], value = validNumber(quote?.mid), changePercent = validNumber(quote?.dayDiffPercent);
        if (value === null || value <= 0) continue;
        items.push({id: symbol, ...definition, value, changePercent, marketState: quote.marketState || 'unknown', stale: Boolean(quote.stale), timestamp: quote.lastQuoteAt || quote.timestamp || '', source: 'biquote.io', sourceUrl: 'https://biquote.io/'});
      }
    } catch (error) { marketError = error.message; }
    if (!items.length) throw Error('No hay cotizaciones disponibles temporalmente');
    cached = {items, fetchedAt: new Date(now).toISOString(), partial: Boolean(officialError || marketError), warnings: [officialError, marketError].filter(Boolean)};
    expiresAt = now + ttlMs;
    return cached;
  };
}
