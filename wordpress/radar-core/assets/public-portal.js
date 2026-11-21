(function () {
  const config = window.RadarPublicPortal || {};
  const roots = document.querySelectorAll('[data-radar-portal]');
  if (!roots.length || !config.restUrl) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const number = value => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const operation = value => normalize(value).includes('alquil') ? 'alquiler' : (normalize(value).includes('vent') ? 'venta' : normalize(value));
  const propertyType = item => {
    const raw = normalize(item.type);
    const title = normalize(item.title);
    const combined = `${raw} ${title}`;
    if (raw.includes('apart') || raw === 'apto' || raw.includes('penthouse')) return 'Apartamento';
    if (raw.includes('galpon')) return 'Galpón';
    if (raw.includes('local') || raw.includes('oficina')) return 'Local comercial';
    if (raw.includes('casa') || raw.includes('quinta') || raw.includes('townhouse') || raw.includes('villa')) return 'Casa';
    if (raw.includes('terreno') || raw.includes('parcela') || raw.includes('lote') || raw.includes('finca') || raw.includes('hacienda')) {
      return /rustic|rural|agricol|finca|hacienda|campo/.test(combined) ? 'Terreno rústico' : 'Terreno urbano';
    }
    if (/galpon/.test(title)) return 'Galpón';
    if (/apartamento|\bapto\b|penthouse/.test(title)) return 'Apartamento';
    if (/\blocal\b|\boficina\b/.test(title)) return 'Local comercial';
    if (/\bcasa\b|\bquinta\b|townhouse|\bvilla\b|chalet/.test(title)) return 'Casa';
    if (/terreno|parcela|\blote\b|finca|hacienda/.test(title)) {
      return /rustic|rural|agricol|finca|hacienda|campo/.test(title) ? 'Terreno rústico' : 'Terreno urbano';
    }
    return item.type || '';
  };
  const location = item => [...new Set([item.zone, item.parish, item.municipality].filter(Boolean))].join(', ');
  const money = item => item.price ? `${number(item.price).toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${escapeHtml(item.currency || 'USD')}` : 'Consultar precio';
  const detailUrl = item => item.source || config.contactUrl || '#contacto';
  const validCoordinates = item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && item.latitude !== 0 && item.longitude !== 0;
  const median = values => {
    const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const formatUsd = value => value ? `${Math.round(value).toLocaleString('es-ES')} USD` : 'Sin datos suficientes';
  const timestamp = value => {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function initialize(root) {
    const elements = {
      search: root.querySelector('[data-search]'), type: root.querySelector('[data-type]'), zone: root.querySelector('[data-zone]'),
      bedrooms: root.querySelector('[data-bedrooms]'), minPrice: root.querySelector('[data-min-price]'), maxPrice: root.querySelector('[data-max-price]'),
      sort: root.querySelector('[data-sort]'), list: root.querySelector('[data-list]'), count: root.querySelector('[data-count]'),
      mapCount: root.querySelector('[data-map-count]'), map: root.querySelector('[data-map]'), mapPanel: root.querySelector('[data-map-panel]'),
      filters: root.querySelector('[data-filters]'), filterToggle: root.querySelector('[data-filter-toggle]'),
      intelligence: document.querySelector('[data-market-intelligence]')
    };
    let all = [];
    let filtered = [];
    let activeOperation = '';
    let smartFilter = '';
    let map;
    let markerLayer;
    const markers = new Map();

    const card = item => {
      const facts = [item.type, item.bedrooms ? `${item.bedrooms} hab.` : '', item.bathrooms ? `${item.bathrooms} baños` : '', item.area ? `${number(item.area).toLocaleString('es-ES')} m²` : ''].filter(Boolean);
      const image = item.photo ? `<img src="${escapeHtml(item.photo)}" alt="" loading="lazy" decoding="async" data-photo>` : '<span class="radar-portal-placeholder">Foto pendiente</span>';
      const locate = validCoordinates(item) ? `<button type="button" data-locate="${escapeHtml(item.id)}">⌖ Ver en mapa</button>` : '<span class="radar-portal-no-map">Ubicación aproximada</span>';
      const marketTags = [
        item.isOpportunity ? '<span class="radar-market-tag is-opportunity">✦ Oportunidad</span>' : '',
        item.hasPriceDrop ? `<span class="radar-market-tag is-drop">↓ ${item.dropPercent}%</span>` : '',
        item.isNew ? '<span class="radar-market-tag is-new">Nuevo</span>' : ''
      ].filter(Boolean).join('');
      return `<article class="radar-portal-card" data-property="${escapeHtml(item.id)}">
        <a class="radar-portal-card-photo" href="${escapeHtml(detailUrl(item))}" target="_blank" rel="noopener">${image}<span class="radar-portal-badge is-${escapeHtml(item.operation)}">${escapeHtml(item.operation || 'inmueble')}</span>${marketTags ? `<span class="radar-market-tags">${marketTags}</span>` : ''}</a>
        <div class="radar-portal-card-copy"><p class="radar-portal-location">⌖ ${escapeHtml(location(item) || 'Venezuela')}</p><h3><a href="${escapeHtml(detailUrl(item))}" target="_blank" rel="noopener">${escapeHtml(item.title || 'Inmueble')}</a></h3><strong>${money(item)}</strong><p class="radar-portal-facts">${escapeHtml(facts.join(' · ') || 'Datos por confirmar')}</p><div class="radar-portal-card-actions">${locate}<a href="${escapeHtml(detailUrl(item))}" target="_blank" rel="noopener">Ver ficha →</a></div></div>
      </article>`;
    };

    const popup = item => `<div class="radar-map-popup">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="">` : ''}<span>${escapeHtml(item.operation || item.type || 'Inmueble')}</span><strong>${escapeHtml(item.title)}</strong><b>${money(item)}</b><small>${escapeHtml(location(item))}</small><a href="${escapeHtml(detailUrl(item))}" target="_blank" rel="noopener">Abrir ficha →</a></div>`;

    function ensureMap() {
      if (map || !window.L) return;
      map = L.map(elements.map, { scrollWheelZoom: true, zoomControl: true }).setView([10.0678, -69.3474], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }

    function renderMap() {
      ensureMap();
      if (!map || !markerLayer) return;
      markerLayer.clearLayers();
      markers.clear();
      const bounds = [];
      filtered.filter(validCoordinates).forEach(item => {
        const color = item.operation === 'alquiler' ? '#cb4f5a' : '#174f87';
        const marker = L.circleMarker([item.latitude, item.longitude], { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: .95 })
          .bindPopup(popup(item), { maxWidth: 270 }).addTo(markerLayer);
        markers.set(String(item.id), marker);
        bounds.push([item.latitude, item.longitude]);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      else if (bounds.length === 1) map.setView(bounds[0], 14);
      else map.setView([10.0678, -69.3474], 10);
      setTimeout(() => map.invalidateSize(), 80);
    }

    function applyFilters() {
      const query = normalize(elements.search.value);
      const type = normalize(elements.type.value);
      const zone = normalize(elements.zone.value);
      const bedrooms = number(elements.bedrooms.value);
      const min = number(elements.minPrice.value);
      const max = number(elements.maxPrice.value);
      filtered = all.filter(item => {
        const haystack = normalize([item.title, item.type, item.originalType, item.zone, item.parish, item.municipality].join(' '));
        const matchesSignal = !smartFilter || (smartFilter === 'opportunities' && item.isOpportunity) || (smartFilter === 'new' && item.isNew) || (smartFilter === 'drops' && item.hasPriceDrop);
        return matchesSignal && (!query || haystack.includes(query)) && (!activeOperation || item.operation === activeOperation) && (!type || normalize(item.type) === type) && (!zone || normalize(item.location).includes(zone)) && (!bedrooms || item.bedrooms >= bedrooms) && (!min || item.price >= min) && (!max || (item.price > 0 && item.price <= max));
      });
      const sort = elements.sort.value;
      if (sort === 'price-asc') filtered.sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
      if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      if (sort === 'area-desc') filtered.sort((a, b) => b.area - a.area);
      render();
    }

    function render() {
      elements.count.textContent = filtered.length.toLocaleString('es-ES');
      const mapped = filtered.filter(validCoordinates).length;
      elements.mapCount.textContent = mapped ? ` · ${mapped.toLocaleString('es-ES')} ubicados en el mapa` : ' · sin coordenadas disponibles';
      elements.list.innerHTML = filtered.length ? filtered.map(card).join('') : '<div class="radar-portal-empty"><strong>No encontramos inmuebles con esos filtros.</strong><span>Prueba ampliando la zona o el precio.</span></div>';
      renderMap();
    }

    function fillOptions(select, values) {
      const first = select.options[0].outerHTML;
      select.innerHTML = first + [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')).map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    }

    root.addEventListener('click', event => {
      const operationButton = event.target.closest('[data-operation]');
      if (operationButton) {
        activeOperation = operationButton.dataset.operation;
        root.querySelectorAll('[data-operation]').forEach(button => button.classList.toggle('is-active', button === operationButton));
        applyFilters();
      }
      const locateButton = event.target.closest('[data-locate]');
      if (locateButton) {
        const marker = markers.get(String(locateButton.dataset.locate));
        if (marker && map) {
          root.classList.add('show-map');
          root.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === 'map'));
          setTimeout(() => { map.invalidateSize(); map.setView(marker.getLatLng(), 15); marker.openPopup(); }, 80);
        }
      }
      const viewButton = event.target.closest('[data-view]');
      if (viewButton) {
        root.classList.toggle('show-map', viewButton.dataset.view === 'map');
        root.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button === viewButton));
        if (map) setTimeout(() => map.invalidateSize(), 80);
      }
      if (event.target.closest('[data-reset]')) {
        [elements.search, elements.minPrice, elements.maxPrice].forEach(input => { input.value = ''; });
        [elements.type, elements.zone, elements.bedrooms, elements.sort].forEach(select => { select.selectedIndex = 0; });
        activeOperation = '';
        smartFilter = '';
        elements.intelligence?.querySelectorAll('[data-market-filter]').forEach(button => button.classList.remove('is-active'));
        root.querySelectorAll('[data-operation]').forEach(button => button.classList.toggle('is-active', button.dataset.operation === ''));
        applyFilters();
      }
      if (event.target.closest('[data-filter-toggle]')) {
        const open = !elements.filters.classList.toggle('is-collapsed');
        elements.filterToggle.setAttribute('aria-expanded', String(open));
      }
    });

    elements.intelligence?.addEventListener('click', event => {
      const button = event.target.closest('[data-market-filter]');
      if (!button) return;
      smartFilter = smartFilter === button.dataset.marketFilter ? '' : button.dataset.marketFilter;
      elements.intelligence.querySelectorAll('[data-market-filter]').forEach(candidate => candidate.classList.toggle('is-active', candidate.dataset.marketFilter === smartFilter));
      applyFilters();
    });

    root.addEventListener('error', event => {
      if (event.target.matches('[data-photo]')) {
        const placeholder = document.createElement('span');
        placeholder.className = 'radar-portal-placeholder';
        placeholder.textContent = 'Foto pendiente';
        event.target.replaceWith(placeholder);
      }
    }, true);

    let inputTimer;
    [elements.search, elements.minPrice, elements.maxPrice].forEach(input => input.addEventListener('input', () => { clearTimeout(inputTimer); inputTimer = setTimeout(applyFilters, 180); }));
    [elements.type, elements.zone, elements.bedrooms, elements.sort].forEach(select => select.addEventListener('change', applyFilters));

    fetch(config.restUrl, { headers: { Accept: 'application/json' } }).then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el inventario.');
      return response.json();
    }).then(payload => {
      const now = Date.now();
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      all = (Array.isArray(payload.properties) ? payload.properties : []).map((item, index) => ({
        ...item, id: String(item.id || index), originalType: item.type, type: propertyType(item), price: number(item.price), area: number(item.area), bedrooms: number(item.bedrooms), bathrooms: number(item.bathrooms),
        latitude: number(item.latitude), longitude: number(item.longitude), operation: operation(item.operation), location: location(item), previousPrice: number(item.previousPrice),
        isNew: timestamp(item.firstSeenAt) >= weekAgo, hasPriceDrop: number(item.previousPrice) > number(item.price) && number(item.price) > 0,
        dropPercent: number(item.previousPrice) > number(item.price) && number(item.price) > 0 ? Math.round((number(item.previousPrice) - number(item.price)) / number(item.previousPrice) * 100) : 0
      }));
      const comparableGroups = new Map();
      all.filter(item => item.operation === 'venta' && item.price > 0 && item.area > 0).forEach(item => {
        const unitPrice = item.price / item.area;
        const key = `${normalize(item.type)}|${normalize(item.zone || item.parish || item.municipality)}`;
        const typeKey = `${normalize(item.type)}|*`;
        comparableGroups.set(key, [...(comparableGroups.get(key) || []), unitPrice]);
        comparableGroups.set(typeKey, [...(comparableGroups.get(typeKey) || []), unitPrice]);
      });
      all.forEach(item => {
        if (item.operation !== 'venta' || item.price <= 0 || item.area <= 0) { item.isOpportunity = false; return; }
        const key = `${normalize(item.type)}|${normalize(item.zone || item.parish || item.municipality)}`;
        const typeKey = `${normalize(item.type)}|*`;
        const local = comparableGroups.get(key) || [];
        const wider = comparableGroups.get(typeKey) || [];
        const benchmark = local.length >= 4 ? median(local) : (wider.length >= 5 ? median(wider) : 0);
        item.isOpportunity = benchmark > 0 && (item.price / item.area) <= benchmark * .85;
      });
      if (elements.intelligence) {
        const saleMedian = median(all.filter(item => item.operation === 'venta').map(item => item.price));
        const rentMedian = median(all.filter(item => item.operation === 'alquiler').map(item => item.price));
        const unitMedian = median(all.filter(item => item.operation === 'venta' && item.price > 0 && item.area > 0).map(item => item.price / item.area));
        const newCount = all.filter(item => item.isNew).length;
        const dropCount = all.filter(item => item.hasPriceDrop).length;
        const opportunityCount = all.filter(item => item.isOpportunity).length;
        const setText = (selector, value) => { const node = elements.intelligence.querySelector(selector); if (node) node.textContent = value; };
        setText('[data-intel-total]', all.length.toLocaleString('es-ES'));
        setText('[data-intel-mapped]', `${all.filter(validCoordinates).length.toLocaleString('es-ES')} ubicados en el mapa`);
        setText('[data-intel-sale]', formatUsd(saleMedian));
        setText('[data-intel-rent]', formatUsd(rentMedian));
        setText('[data-intel-unit]', unitMedian ? `${Math.round(unitMedian).toLocaleString('es-ES')} USD/m²` : 'Sin datos suficientes');
        setText('[data-intel-new]', newCount.toLocaleString('es-ES'));
        setText('[data-intel-drops]', dropCount.toLocaleString('es-ES'));
        setText('[data-intel-updated]', payload.updatedAt && timestamp(payload.updatedAt) ? `Actualizado ${new Date(payload.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : 'Inventario sincronizado');
        setText('[data-intel-insight]', opportunityCount ? `${opportunityCount} inmuebles están al menos un 15 % por debajo del precio/m² de comparables.` : (dropCount ? `${dropCount} inmuebles registran una bajada de precio.` : `${newCount} inmuebles se incorporaron durante los últimos 7 días.`));
      }
      fillOptions(elements.zone, all.flatMap(item => [item.municipality, item.parish, item.zone]));
      filtered = [...all];
      render();
    }).catch(error => {
      elements.list.innerHTML = `<div class="radar-portal-empty"><strong>${escapeHtml(error.message)}</strong><span>Inténtalo de nuevo en unos minutos.</span></div>`;
      elements.mapCount.textContent = '';
    });
  }

  roots.forEach(initialize);
})();
