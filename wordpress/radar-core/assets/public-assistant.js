(function () {
  const root = document.querySelector('.radar-public-assistant');
  if (!root || !window.RadarPublicAssistant) return;
  const form = root.querySelector('.radar-public-search');
  const input = root.querySelector('#radar-public-question');
  const response = root.querySelector('.radar-public-response');
  const answer = response.querySelector('p');
  const results = response.querySelector('.radar-public-results');
  const submit = form.querySelector('button');

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = item => item.price ? `${Number(item.price).toLocaleString('es-ES')} ${escape(item.currency || 'USD')}` : 'Consultar precio';
  const card = item => `<article class="radar-public-result">${item.image ? `<img src="${escape(item.image)}" alt="" loading="lazy" decoding="async">` : '<span class="radar-public-result-placeholder">Foto pendiente</span>'}<div><span>${escape(item.operation || item.type || 'Inmueble')}</span><h3>${escape(item.title)}</h3><strong>${money(item)}</strong><p>${escape([item.zone, item.area ? `${item.area} m²` : '', item.bedrooms ? `${item.bedrooms} hab.` : ''].filter(Boolean).join(' · '))}</p>${item.unitPrice ? `<small>${Number(item.unitPrice).toLocaleString('es-ES')} ${escape(item.currency || 'USD')}/m²</small>` : ''}<a href="${escape(item.url)}">Ver inmueble →</a></div></article>`;

  async function search(question) {
    response.hidden = false;
    answer.textContent = 'Radar está revisando los inmuebles publicados…';
    results.innerHTML = '';
    submit.disabled = true;
    try {
      const request = await fetch(RadarPublicAssistant.restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const payload = await request.json();
      if (!request.ok) throw new Error(payload.message || 'No pudimos completar la búsqueda.');
      answer.textContent = payload.answer;
      results.innerHTML = Array.isArray(payload.results) ? payload.results.map(card).join('') : '';
      response.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      answer.textContent = error.message || 'Radar no está disponible en este momento. Inténtalo de nuevo.';
    } finally {
      submit.disabled = false;
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const question = input.value.trim();
    if (question) search(question);
  });
  root.querySelectorAll('[data-radar-example]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.radarExample;
    search(input.value);
  }));
})();
