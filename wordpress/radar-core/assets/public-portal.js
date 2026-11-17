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

  function initialize(root) {
    const elements = {
      search: root.querySelector('[data-search]'), type: root.querySelector('[data-type]'), zone: root.querySelector('[data-zone]'),
      bedrooms: root.querySelector('[data-bedrooms]'), minPrice: root.querySelector('[data-min-price]'), maxPrice: root.querySelector('[data-max-price]'),
      sort: root.querySelector('[data-sort]'), list: root.querySelector('[data-list]'), count: root.querySelector('[data-count]'),
      mapCount: root.querySelector('[data-map-count]'), map: root.querySelector('[data-map]'), mapPanel: root.querySelector('[data-map-panel]'),
      filters: root.querySelector('[data-filters]'), filterToggle: root.querySelector('[data-filter-toggle]')
    };
    let all = [];
    let filtered = [];
    let activeOperation = '';
    let map;
    let markerLayer;
    const markers = new Map();

    const card = item => {
      const facts = [item.type, item.bedrooms ? `${item.bedrooms} hab.` : '', item.bathrooms ? `${item.bathrooms} baños` : '', item.area ? `${number(item.area).toLocaleString('es-ES')} m²` : ''].filter(Boolean);
      const image = item.photo ? `<img src="${escapeHtml(item.photo)}" alt="" loading="lazy" decoding="async" data-photo>` : '<span class="radar-portal-placeholder">Foto pendiente</span>';
      const locate = validCoordinates(item) ? `<button type="button" data-locate="${escapeHtml(item.id)}">⌖ Ver en mapa</button>` : '<span class="radar-portal-no-map">Ubicación aproximada</span>';
      return `<article class="radar-portal-card" data-property="${escapeHtml(item.id)}">
        <a class="radar-portal-card-photo" href="${escapeHtml(detailUrl(item))}" target="_blank" rel="noopener">${image}<span class="radar-portal-badge is-${escapeHtml(item.operation)}">${escapeHtml(item.operation || 'inmueble')}</span></a>
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
        return (!query || haystack.includes(query)) && (!activeOperation || item.operation === activeOperation) && (!type || normalize(item.type) === type) && (!zone || normalize(item.location).includes(zone)) && (!bedrooms || item.bedrooms >= bedrooms) && (!min || item.price >= min) && (!max || (item.price > 0 && item.price <= max));
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
      elements.list.innerHTML = filtered.length ? filtered.slice(0, 100).map(card).join('') + (filtered.length > 100 ? '<p class="radar-portal-limit">Mostrando los primeros 100 resultados. Usa los filtros para precisar la búsqueda.</p>' : '') : '<div class="radar-portal-empty"><strong>No encontramos inmuebles con esos filtros.</strong><span>Prueba ampliando la zona o el precio.</span></div>';
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
        root.querySelectorAll('[data-operation]').forEach(button => button.classList.toggle('is-active', button.dataset.operation === ''));
        applyFilters();
      }
      if (event.target.closest('[data-filter-toggle]')) {
        const open = !elements.filters.classList.toggle('is-collapsed');
        elements.filterToggle.setAttribute('aria-expanded', String(open));
      }
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
      all = (Array.isArray(payload.properties) ? payload.properties : []).map((item, index) => ({
        ...item, id: String(item.id || index), originalType: item.type, type: propertyType(item), price: number(item.price), area: number(item.area), bedrooms: number(item.bedrooms), bathrooms: number(item.bathrooms),
        latitude: number(item.latitude), longitude: number(item.longitude), operation: operation(item.operation), location: location(item)
      }));
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
