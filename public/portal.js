function listingPhoto(p){const url=p.foto||'';if(!/^https:\/\/(cdn\.remax\.com\.ve|cdn\.photos\.sparkplatform\.com)\//.test(url))return '<div class="photo-placeholder">Foto no disponible</div>';return '<img class="listing-photo" src="'+esc(url)+'" alt="Foto del anuncio" loading="lazy" decoding="async" referrerpolicy="no-referrer">';}
function photoFallback(){document.querySelectorAll('.listing-photo').forEach(img=>img.onerror=()=>{const box=document.createElement('div');box.className='photo-placeholder';box.textContent='Foto no disponible';img.replaceWith(box);});}
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],user=null,map=null,layer=null,mode='login',selected=null,markers=new Map(),activeListingId=null,capturePoll=null,inventoryFingerprint='',inventorySyncing=false;
const inventorySyncChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('radar-inventory-sync'):null;
let currentMatches=[],currentPage=1;
const pageSize=25;
async function api(url,input){const r=await fetch(url,input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{});const v=await r.json();if(!r.ok){if(r.status===401)lockRadar();throw Error(v.error);}return v;}
let landLabels=new Map(),favoriteItems=new Map(),favoriteOnly=false,interestFilter='',operationView='venta';
const interestLabels={unclassified:'Sin clasificar',green:'Verde · Muy interesante',orange:'Naranja · Interesante',yellow:'Amarillo · Más o menos interesante',red:'Rojo · Nada interesante'};
function favoriteControls(p){
 const box=document.createElement('div');box.className='favorite-controls';
 const button=document.createElement('button');const saved=favoriteItems.has(p.id);
 button.textContent=saved?'★ Favorito':'☆ Añadir a favoritos';button.setAttribute('aria-pressed',String(saved));
 button.onclick=async()=>{button.disabled=true;try{await api('/api/favorites',{id:p.id,interest:'unclassified',remove:saved});if(saved)favoriteItems.delete(p.id);else favoriteItems.set(p.id,'unclassified');refreshFavorites(p.id);}catch(e){$('message').textContent=e.message;button.disabled=false;}};
 box.append(button);
 if(saved){const label=document.createElement('label');label.textContent='Interés';const select=document.createElement('select');select.className='interest-'+favoriteItems.get(p.id);select.setAttribute('aria-label','Clasificar interés de '+p.titulo);
 for(const [value,text] of Object.entries(interestLabels)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=favoriteItems.get(p.id);
 select.onchange=async()=>{select.disabled=true;try{await api('/api/favorites',{id:p.id,interest:select.value});favoriteItems.set(p.id,select.value);refreshFavorites(p.id);}catch(e){$('message').textContent=e.message;select.disabled=false;}};label.append(select);box.append(label);}
 if(p.tipo?.startsWith('Terreno')){
 const label=document.createElement('label');label.textContent='Mi clasificación del terreno';
 const select=document.createElement('select');select.setAttribute('aria-label','Clasificar terreno: '+p.titulo);
 for(const [value,text] of [['auto','Automática: '+(p.autoLandType||p.tipo)],['Terreno rústico','Rústico'],['Terreno urbano','Urbano'],['Terreno sin clasificar','Sin clasificar']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 select.value=landLabels.get(p.id)||'auto';
 const status=document.createElement('small');status.setAttribute('role','status');status.textContent=landLabels.has(p.id)?'Clasificación manual guardada · no verificada catastralmente':'Puedes corregir la etiqueta automática.';
 select.onchange=async()=>{
  select.disabled=true;const value=select.value;const reopen=activeListingId===p.id;
  try{await api('/api/land_labels',{id:p.id,classification:value,remove:value==='auto'});
   if(value==='auto')landLabels.delete(p.id);else landLabels.set(p.id,value);
   p.tipo=value==='auto'?p.autoLandType:value;filters();
   if(reopen)markers.get(p.id)?.open();
   $('message').textContent='Clasificación del terreno guardada.';
  }catch(e){status.textContent=e.message;select.value=landLabels.get(p.id)||'auto';select.disabled=false;}
 };
 label.append(select,status);box.append(label);
 }
 return box;
}
function refreshFavorites(id){
 if(favoriteOnly){draw();return;}
 document.querySelectorAll('[data-favorite-slot]').forEach(slot=>{if(slot.dataset.favoriteSlot===id){const p=items.find(item=>item.id===id);slot.replaceChildren(favoriteControls(p));}});
 updateLaboratoryTabs();
}
function updateLaboratoryTabs(){
 if(!$('sale-tab'))return;
 const saleCount=items.filter(p=>p.operacion==='venta').length,rentCount=items.filter(p=>p.operacion==='alquiler').length;
 const favoriteCount=items.filter(p=>(!operationView||p.operacion===operationView)&&favoriteItems.has(p.id)).length;
 $('all-operations-tab').textContent='Todos ('+items.length+')';$('sale-tab').textContent='En venta ('+saleCount+')';$('rent-tab').textContent='En alquiler ('+rentCount+')';
 $('all-operations-tab').setAttribute('aria-pressed',String(operationView===''));$('sale-tab').setAttribute('aria-pressed',String(operationView==='venta'));$('rent-tab').setAttribute('aria-pressed',String(operationView==='alquiler'));
 $('favorites-tab').setAttribute('aria-pressed',String(favoriteOnly));
 $('favorites-tab').textContent='Favoritos ('+favoriteCount+')';$('interest-filter').hidden=!favoriteOnly;
 if($('capture-tab'))$('capture-tab').hidden=user?.role!=='admin';
}
function captureWorkspace(){
 let dialog=$('capture-dialog');if(dialog)return dialog;
 const captureZones=[...new Set(items.map(item=>item.zona).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 const captureZoneOptions=captureZones.map(zone=>`<option value="${esc(zone)}">${esc(zone)}</option>`).join('');
 dialog=document.createElement('dialog');dialog.id='capture-dialog';dialog.className='capture-dialog';
 dialog.innerHTML=`<div class="capture-shell"><header><div><p class="eyebrow">CENTRO DE CAPTURA</p><h2>Buscar, añadir y actualizar</h2><p>Un único lugar para descubrir oportunidades y mantener el inventario al día.</p></div><button type="button" class="capture-close" aria-label="Cerrar">×</button></header><div class="capture-grid"><form id="web-search-form" class="capture-card"><span class="capture-step">01</span><h3>Descubrir anuncios</h3><p>Busca en portales y agencias inmobiliarias con resultados de Barquisimeto, Lara.</p><label>Palabras clave<input name="keywords" placeholder="Ej.: apartamento zona este" maxlength="120"></label><div class="capture-fields"><label>Fuente<select name="source"><option value="">Todas las fuentes de Barquisimeto</option><optgroup label="Portales inmobiliarios"><option value="site:remax.com.ve">RE/MAX</option><option value="site:rentahouse.com.ve">Rent-A-House</option><option value="site:century21.com.ve">Century 21 Venezuela</option><option value="site:mercadolibre.com.ve">Mercado Libre Inmuebles</option><option value="site:inmuebleya.com.ve">Inmueble Ya</option><option value="site:getajauz.com">Getajauz</option></optgroup><optgroup label="Agencias locales"><option value="site:acinmobiliarias.com">AC Inmobiliarias</option><option value="site:nexthome.inmo.co">Next Home</option><option value="site:genteurbana.inmo.co">Gente Urbana</option><option value="site:zy.inmo.co">ZY Inmobiliaria</option><option value="site:grupoinmverso.com">Grupo Inmverso</option><option value="site:ebienesraices.com.ve">eBienesRaices</option></optgroup></select></label><label>Operación<select name="operation"><option value="">Venta y alquiler</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label><label>Tipo<select name="type"><option value="">Todos</option><option>Apartamento</option><option>Casa</option><option>Terreno</option></select></label><label>Zona<select name="zone"><option value="">Todas las zonas</option>${captureZoneOptions}</select></label></div><button type="submit">Buscar anuncios públicos ↗</button><nav class="capture-portal-links" aria-label="Fuente nueva validada"><a href="https://www.century21.com.ve/v/resultados/en-pais_venezuela/en-estado_lara" target="_blank" rel="noopener noreferrer">Abrir Century 21 Lara ↗</a></nav></form><form id="link-capture-form" class="capture-card capture-card-accent"><span class="capture-step">02</span><h3>Añadir mediante enlace</h3><p>Pega el enlace del anuncio. Se guardará como borrador para revisar sus datos.</p><label>Enlace del anuncio<input name="url" type="url" inputmode="url" placeholder="https://www.remax.com.ve/…" required></label><small>Fuentes compatibles: RE/MAX, Rent-A-House, Century 21, AC Inmobiliarias y eBienesRaices. Mercado Libre se conectará mediante su API oficial.</small><nav class="capture-portal-links" aria-label="Portales inmobiliarios compatibles"><a href="https://www.remax.com.ve/" target="_blank" rel="noopener noreferrer">Abrir RE/MAX ↗</a><a href="https://www.rentahouse.com.ve/" target="_blank" rel="noopener noreferrer">Abrir Rent-A-House ↗</a><a href="https://www.century21.com.ve/v/resultados/en-pais_venezuela/en-estado_lara" target="_blank" rel="noopener noreferrer">Abrir Century 21 Lara ↗</a><a href="https://acinmobiliarias.com/" target="_blank" rel="noopener noreferrer">Abrir AC Inmobiliarias ↗</a><a href="https://www.ebienesraices.com.ve/shop" target="_blank" rel="noopener noreferrer">Abrir eBienesRaices ↗</a></nav><p id="capture-status" class="capture-status" role="status"></p><button type="submit">Analizar y guardar borrador</button><a id="capture-inventory" class="capture-inventory" href="/admin" hidden>Abrir el inventario →</a></form><section class="capture-card capture-update"><div class="capture-update-copy"><span class="capture-step">03</span><div><h3>Actualizar inventario</h3><p>Consulta de nuevo las fuentes conectadas y detecta anuncios nuevos, cambios de precio y posibles retiradas.</p></div></div><div id="capture-source-summary" class="capture-source-summary" aria-live="polite"><span>Cargando estado de las fuentes…</span></div><div class="capture-update-actions"><button type="button" data-refresh-source="all">Actualizar todo</button><button type="button" class="quiet-button" data-refresh-source="rentahouse">Solo Rent-A-House</button><button type="button" class="quiet-button" data-refresh-source="remax">Solo RE/MAX</button><button type="button" class="quiet-button" data-refresh-source="century21">Solo Century 21</button></div><p id="source-refresh-status" class="capture-status" role="status"></p><div class="capture-guardrails"><strong>Nuevas fuentes</strong><span>Cada portal se añade como un conector separado, después de comprobar sus condiciones, límites y estructura. Los resultados nuevos entran en revisión antes de publicarse.</span></div></section></div></div>`;
 document.body.append(dialog);dialog.querySelector('.capture-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(capturePoll){clearTimeout(capturePoll);capturePoll=null;}});
 dialog.querySelector('#web-search-form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget),source=data.get('source'),operation=data.get('operation')||'(venta OR alquiler)',parts=[source,'"Barquisimeto"','Lara','Venezuela',operation,data.get('type'),data.get('zone'),data.get('keywords'),'inmueble'].filter(Boolean);window.open('https://www.google.com/search?q='+encodeURIComponent(parts.join(' ')),'_blank','noopener,noreferrer');};
 dialog.querySelector('#link-capture-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=$('capture-status'),inventory=$('capture-inventory');button.disabled=true;inventory.hidden=true;status.className='capture-status';status.textContent='Analizando el anuncio…';try{const result=await api('/api/captures/link',{url:new FormData(form).get('url')});status.className='capture-status success';status.textContent=(result.created?'Anuncio añadido':'Anuncio actualizado')+' como borrador: '+result.property.titulo;inventory.hidden=false;form.reset();}catch(error){status.className='capture-status error';status.textContent=error.message;}finally{button.disabled=false;}};
 dialog.querySelectorAll('[data-refresh-source]').forEach(button=>button.onclick=async()=>{dialog.querySelectorAll('[data-refresh-source]').forEach(item=>item.disabled=true);$('source-refresh-status').className='capture-status';$('source-refresh-status').textContent='Iniciando actualización…';try{await api('/api/captures/run',{source:button.dataset.refreshSource});dialog.dataset.reload='true';await refreshCaptureSources();}catch(error){$('source-refresh-status').className='capture-status error';$('source-refresh-status').textContent=error.message;dialog.querySelectorAll('[data-refresh-source]').forEach(item=>item.disabled=false);}});
 return dialog;
}
async function refreshCaptureSources(){
 if(capturePoll){clearTimeout(capturePoll);capturePoll=null;}const dialog=$('capture-dialog');if(!dialog?.open)return;
 try{const source=await api('/api/sources'),running=source.capture?.running,summary=$('capture-source-summary'),status=$('source-refresh-status');summary.innerHTML=source.summaries.map(item=>`<div><strong>${esc(item.name)}</strong><span>${item.active} activos · ${item.total} registros históricos · ${item.review} por revisar · ${esc(item.mode==='automatic'?'automática':item.mode==='manual-link'?'por enlace':item.mode==='official-api'?'API oficial pendiente':'en validación')}</span></div>`).join('');dialog.querySelectorAll('[data-refresh-source]').forEach(item=>item.disabled=running);status.className='capture-status '+(running?'':'success');status.textContent=running?'Actualizando las fuentes en segundo plano…':'Inventario actualizado · '+source.activeProperties+' activos en el laboratorio · '+source.properties+' registros históricos.';if(running)capturePoll=setTimeout(refreshCaptureSources,3000);else if(dialog.dataset.reload){delete dialog.dataset.reload;await openRadar();}}
 catch(error){$('source-refresh-status').className='capture-status error';$('source-refresh-status').textContent=error.message;dialog.querySelectorAll('[data-refresh-source]').forEach(item=>item.disabled=false);}
}
function laboratoryTabs(){
 if($('laboratory-tabs'))return;
 const tabs=document.createElement('div');tabs.id='laboratory-tabs';tabs.className='laboratory-tabs';
 const allOperations=document.createElement('button');allOperations.id='all-operations-tab';allOperations.className='operation-tab';
 const sale=document.createElement('button');sale.id='sale-tab';sale.className='operation-tab';
 const rent=document.createElement('button');rent.id='rent-tab';rent.className='operation-tab';
 const fav=document.createElement('button');fav.id='favorites-tab';
 const capture=document.createElement('button');capture.id='capture-tab';capture.className='capture-tab';capture.textContent='＋ Capturar / Actualizar';capture.onclick=()=>{const dialog=captureWorkspace();dialog.showModal();refreshCaptureSources();};
 const filter=document.createElement('select');filter.id='interest-filter';filter.setAttribute('aria-label','Filtrar favoritos por interés');
 filter.innerHTML='<option value="">Todos los niveles de interés</option>'+Object.entries(interestLabels).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
 const chooseOperation=value=>{operationView=value;favoriteOnly=false;interestFilter='';filter.value='';draw();};
 allOperations.onclick=()=>chooseOperation('');sale.onclick=()=>chooseOperation('venta');rent.onclick=()=>chooseOperation('alquiler');
 fav.onclick=()=>{favoriteOnly=true;draw();};filter.onchange=()=>{interestFilter=filter.value;draw();};
 tabs.append(allOperations,sale,rent,fav,filter,capture);$('filters').before(tabs);updateLaboratoryTabs();
}
const filterSpec=[['municipio','Municipio'],['parroquia','Parroquia'],['zona','Sector / urbanización'],['calle','Calle'],['tipo','Tipo']];
const territory={
 'Andrés Eloy Blanco':['Quebrada Honda de Guache','Pío Tamayo','Yacambú'],
 'Crespo':['Freitez','José María Blanco'],
 'Iribarren':['Aguedo Felipe Alvarado','Buena Vista','Catedral','Concepción','El Cují','Guerrera Ana Soto','Juárez','Santa Rosa','Tamaca','Unión'],
 'Jiménez':['Juan Bautista Rodríguez','Cuara','Diego de Lozada','Paraíso de San José','San Miguel','Tintorero','José Bernardo Dorante','Coronel Mariano Peraza'],
 'Morán':['Anzoátegui','Bolívar','Guárico','Hilario Luna y Luna','Humocaro Bajo','Humocaro Alto','La Candelaria','Morán'],
 'Palavecino':['Cabudare','José Gregorio Bastidas','Agua Viva'],
 'Simón Planas':['Buría','Gustavo Vegas León','Sarare'],
 'Torres':['Altagracia','Antonio Díaz','Camacaro','Castañeda','Cecilio Zubillaga','Chiquinquirá','El Blanco','Espinoza de los Monteros','Heriberto Arroyo','Lara','Las Mercedes','Manuel Morillo','Montaña Verde','Montes de Oca','Reyes Vargas','Torres','Trinidad Samuel'],
 'Urdaneta':['Xaguas','Siquisique','San Miguel','Moroturo']
};
const propertyTypes=['Todos los terrenos','Apartamento','Casa','Terreno rústico','Terreno urbano','Terreno sin clasificar','Otro'];
function applyTheme(theme){
 const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';
 const toggle=$('themeToggle');toggle.textContent=dark?'Modo claro':'Modo oscuro';toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'Activar modo claro':'Activar modo oscuro');
 try{localStorage.setItem('radar-theme',dark?'dark':'light');}catch{}
}
function updateAccount(){ $('account').textContent=user?'Cerrar sesión':'Entrar';$('adminLink').hidden=user?.role!=='admin'; }
function filters(){
 $('filters').innerHTML='<label class="lab-search">Buscar<input id="search" type="search" placeholder="Título, zona, referencia o fuente…" autocomplete="off"></label><label>Ordenar<select id="sort"><option value="updated-desc">Actualizados recientemente</option><option value="price-asc">Precio: menor primero</option><option value="price-desc">Precio: mayor primero</option><option value="sqm-asc">Precio/m²: menor primero</option></select></label><label>Estado<select disabled><option>Lara</option></select></label><label>Ciudad<select disabled><option>Barquisimeto</option></select></label>'+filterSpec.map(([k,label])=>`<label>${label}<select id="f-${k}"><option value="">Todos</option></select></label>`).join('')+'<label>Precio mínimo<input id="min" type="number" min="0" placeholder="Sin mínimo"></label><label>Precio máximo<input id="max" type="number" min="0" placeholder="Sin límite"></label><label>Moneda<select id="currency"><option value="">Todas</option><option>USD</option><option>VES</option></select></label>';
 function choices(){
  const municipality=$('f-municipio').value;
  filterSpec.forEach(([k])=>{const el=$('f-'+k),old=el.value;let vals;
   if(k==='municipio')vals=Object.keys(territory);
   else if(k==='parroquia')vals=municipality?(territory[municipality]||[]):Object.values(territory).flat();
   else if(k==='tipo')vals=propertyTypes;
   else vals=items.filter(p=>!municipality||!p.municipio||p.municipio===municipality).map(p=>p[k]).filter(Boolean);
   vals=[...new Set([...vals,...items.filter(p=>!municipality||p.municipio===municipality).map(p=>p[k]).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'es'));
   el.innerHTML='<option value="">Todos</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=vals.includes(old)?old:'';
  });draw(true);
 }

 filterSpec.forEach(([k])=>$('f-'+k).onchange=choices);
 $('search').oninput=()=>draw(true);$('sort').onchange=()=>draw(true);$('min').oninput=()=>draw(true);$('max').oninput=()=>draw(true);$('currency').onchange=()=>draw(true);
 $('clearFilters').onclick=()=>{filterSpec.forEach(([k])=>$('f-'+k).value='');$('search').value='';$('sort').value='updated-desc';$('min').value='';$('max').value='';$('currency').value='';choices();};
 choices();
}
function selectListing(id){
 activeListingId=id;
 if(!document.querySelector(`[data-listing-id="${CSS.escape(id)}"]`)){
  const index=currentMatches.findIndex(item=>item.id===id);
  if(index>=0){currentPage=Math.floor(index/pageSize)+1;renderList();}
 }
 document.querySelectorAll('[data-listing-id]').forEach(card=>{
  const active=card.dataset.listingId===id;card.classList.toggle('listing-selected',active);
  if(active){card.setAttribute('aria-current','true');card.scrollIntoView({behavior:'smooth',block:'nearest'});}
  else card.removeAttribute('aria-current');
 });
}
const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function pricePerSquare(p){const price=Number(p.precio),area=Number(p.superficie);return price>0&&area>0?price/area:null;}
function listingCard(p){
 const unit=pricePerSquare(p);
 return `<article class="listing" data-listing-id="${esc(p.id)}"><div class="listing-media">${listingPhoto(p)}</div><div class="listing-copy"><span class="badge">${esc(p.operacion)} · ${esc(p.tipo||'Inmueble')}</span><h2>${esc(p.titulo)}</h2><div class="listing-value"><strong class="listing-price">${p.precio!==''?esc(p.precio)+' '+esc(p.moneda):'Consultar precio'}</strong>${unit?`<small>${esc(Math.round(unit))} ${esc(p.moneda)}/m²</small>`:''}</div><p class="muted">${esc([p.zona,p.municipio].filter(Boolean).join(' · '))}</p><p>${esc([p.superficie?p.superficie+' m²':'',p.habitaciones?p.habitaciones+' habitaciones':'',p.banos?p.banos+' baños':''].filter(Boolean).join(' · '))}</p><p class="listing-description">${esc((p.descripcion||'').slice(0,170))}</p><div class="listing-actions"><button class="map-link" data-gallery="${p.id}">Ver fotos</button><div data-favorite-slot="${esc(p.id)}"></div>${p.latitud&&p.longitud?`<button class="map-link" data-map="${p.id}">Ver en mapa</button>`:''}</div><p class="muted location-note">${p.latitud&&p.longitud?(p.ubicacionPrecision==='verificada'?'Ubicación verificada':'Ubicación publicada · exactitud por confirmar'):'Ubicación pendiente'}</p>${/^https:\/\//.test(p.fuente)?`<a href="${esc(p.fuente)}" target="_blank" rel="noopener noreferrer">Anuncio original ↗</a>`:''}</div></article>`;
}
function renderList(){
 const totalPages=Math.max(1,Math.ceil(currentMatches.length/pageSize));currentPage=Math.min(Math.max(1,currentPage),totalPages);
 const start=(currentPage-1)*pageSize,pageItems=currentMatches.slice(start,start+pageSize);
 $('listings').innerHTML=pageItems.length?pageItems.map(listingCard).join(''):'<div class="panel"><h2>No hay anuncios para esta selección</h2><p>Prueba a cambiar los filtros o el texto de búsqueda.</p></div>';
 const pager=$('listPagination');
 if(pager){pager.hidden=currentMatches.length<=pageSize;pager.innerHTML=`<button type="button" id="previousPage" ${currentPage===1?'disabled':''}>← Anterior</button><span>Página ${currentPage} de ${totalPages} · ${start+1}–${Math.min(start+pageSize,currentMatches.length)} de ${currentMatches.length}</span><button type="button" id="nextPage" ${currentPage===totalPages?'disabled':''}>Siguiente →</button>`;
  $('previousPage').onclick=()=>{currentPage--;renderList();$('listings').scrollTo({top:0,behavior:'smooth'});};$('nextPage').onclick=()=>{currentPage++;renderList();$('listings').scrollTo({top:0,behavior:'smooth'});};
 }
 photoFallback();
 document.querySelectorAll('[data-gallery]').forEach(b=>b.onclick=()=>RadarGallery.open(items.find(p=>p.id===b.dataset.gallery)));
 document.querySelectorAll('[data-favorite-slot]').forEach(slot=>slot.append(favoriteControls(items.find(p=>p.id===slot.dataset.favoriteSlot))));
 document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{const entry=markers.get(button.dataset.map);if(entry){map.setView(entry.marker.getLatLng(),16);entry.open();}});
 if(activeListingId)selectListing(activeListingId);
}
function draw(resetPage=false){
 activeListingId=null;
 if(resetPage)currentPage=1;
 updateLaboratoryTabs();
 const query=normalized($('search')?.value),minimum=Number($('min')?.value||0),maximum=Number($('max')?.value||0);
 const matches=items.filter(p=>(!operationView||p.operacion===operationView)&&(!favoriteOnly||(favoriteItems.has(p.id)&&(!interestFilter||favoriteItems.get(p.id)===interestFilter)))&&filterSpec.every(([k])=>!$('f-'+k).value||(k==='tipo'&&$('f-'+k).value==='Todos los terrenos'?p.tipo?.startsWith('Terreno'):p[k]===$('f-'+k).value))&&(!$('currency').value||p.moneda===$('currency').value)&&(!minimum||p.precio!==''&&Number(p.precio)>=minimum)&&(!maximum||p.precio!==''&&Number(p.precio)<=maximum)&&(!query||normalized([p.titulo,p.zona,p.municipio,p.parroquia,p.calle,p.tipo,p.fuente].join(' ')).includes(query)));
 const sort=$('sort')?.value||'updated-desc';matches.sort((a,b)=>sort==='price-asc'?(Number(a.precio)||Infinity)-(Number(b.precio)||Infinity):sort==='price-desc'?(Number(b.precio)||-Infinity)-(Number(a.precio)||-Infinity):sort==='sqm-asc'?(pricePerSquare(a)??Infinity)-(pricePerSquare(b)??Infinity):String(b.actualizadoEn||'').localeCompare(String(a.actualizadoEn||'')));
 currentMatches=matches;renderList();
 const operationText=operationView?' en '+operationView:'';
 $('count').textContent=matches.length+' anuncios'+operationText+' · '+matches.filter(p=>!p.latitud||!p.longitud).length+' sin coordenadas · Ubicaciones publicadas: exactitud por confirmar';
 if(map){
  layer.clearLayers();markers.clear();const groups=new Map(),points=[];
  matches.filter(p=>p.latitud!==''&&p.latitud!==undefined&&p.longitud!==''&&p.longitud!==undefined).forEach(p=>{const key=Number(p.latitud).toFixed(6)+','+Number(p.longitud).toFixed(6);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});
  for(const group of groups.values()){
   const pos=[Number(group[0].latitud),Number(group[0].longitud)];points.push(pos);
   const marker=L.circleMarker(pos,{radius:group.length>1?12:8,fillColor:group[0].operacion==='venta'?'#183f78':'#c64b55',color:'#fff',weight:2,fillOpacity:1}).addTo(layer);
   const popup=document.createElement('div');popup.className='property-popup';
   const showProperty=p=>{
    popup.replaceChildren();
    if(group.length>1){
     const label=document.createElement('label');label.textContent=group.length+' anuncios en este punto';
     const chooser=document.createElement('select');chooser.setAttribute('aria-label','Anuncio de esta ubicación');
     group.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.titulo;chooser.append(option);});
     chooser.value=p.id;chooser.onchange=()=>showProperty(group.find(item=>item.id===chooser.value));label.append(chooser);popup.append(label);
    }
    const photo=document.createElement('div');photo.innerHTML=listingPhoto(p);popup.append(photo);
    const title=document.createElement('h3');title.textContent=p.titulo;popup.append(title);
    for(const text of [
     p.precio!==''?p.precio+' '+p.moneda:'Consultar precio',
     [p.operacion,p.tipo,p.zona,p.municipio].filter(Boolean).join(' · '),
     [p.superficie?p.superficie+' m²':'',p.habitaciones?p.habitaciones+' habitaciones':'',p.banos?p.banos+' baños':''].filter(Boolean).join(' · '),
     p.descripcion||'', 'Ubicación publicada: confirma su exactitud.'
    ]){if(text){const line=document.createElement('p');line.textContent=text;popup.append(line);}}
    const photos=document.createElement('button');photos.textContent='Ver fotos';photos.onclick=()=>RadarGallery.open(p);
    const favoriteSlot=document.createElement('div');favoriteSlot.dataset.favoriteSlot=p.id;favoriteSlot.append(favoriteControls(p));
    popup.append(photos,favoriteSlot);photoFallback();selectListing(p.id);
   };
   marker.bindPopup(popup,{maxHeight:350,maxWidth:340,minWidth:230});
   marker.on('click',()=>{showProperty(group[0]);marker.openPopup();});
   group.forEach(p=>markers.set(p.id,{marker,open:()=>{showProperty(p);marker.openPopup();}}));
  }
  if(points.length)map.fitBounds(points,{maxZoom:15,padding:[30,30]});
  document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{const entry=markers.get(button.dataset.map);if(entry){map.setView(entry.marker.getLatLng(),16);entry.open();$('map').scrollIntoView({behavior:'smooth',block:'center'});}});
 }
}
function account(){mode='login';showAccount();}
function showAccount(){ $('submit').hidden=false;$('formTitle').textContent='Entrar a Radar';$('fields').innerHTML='<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Contraseña<input name="password" type="password" minlength="10" autocomplete="current-password" required></label>';const forgot=document.createElement('button');forgot.type='button';forgot.className='map-link';forgot.textContent='¿Olvidaste tu contraseña?';forgot.onclick=showRecovery;$('fields').append(forgot);$('submit').textContent='Continuar';$('formError').textContent='';if(!$('dialog').open)$('dialog').showModal();}
$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;try{const input=Object.fromEntries(new FormData(e.target));if(mode==='forgot'){const result=await api('/api/forgot-password',input);$('fields').replaceChildren();$('formError').textContent=result.message;$('submit').hidden=true;}else if(mode==='reset'){if(input.password!==input.confirm)throw Error('Las contraseñas no coinciden');const result=await api('/api/reset-password',{token:resetToken,password:input.password});resetToken=null;lockRadar();account();$('formError').textContent=result.message;}else{const v=await api('/api/login',input);user=v.user;$('dialog').close();await openRadar();}}catch(e){$('formError').textContent=e.message;}finally{$('submit').disabled=false;}};
$('themeToggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
applyTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');
$('account').onclick=async()=>{if(user){await api('/api/logout',{});lockRadar();try{localStorage.setItem('radar-logout',String(Date.now()));}catch{};}else account();};$('close').onclick=()=>$('dialog').close();
function lockRadar(){window.RadarGallery?.close();
 landLabels.clear();favoriteItems.clear();favoriteOnly=false;interestFilter='';operationView='venta';user=null;items=[];selected=null;activeListingId=null;markers.clear();if(map){map.remove();map=null;layer=null;}$('listings').replaceChildren();$('filters').replaceChildren();$('map').replaceChildren();$('count').textContent='';$('message').textContent='';$('radarContent').hidden=true;$('accessGate').hidden=false;if($('dialog').open)$('dialog').close();updateAccount();
}
const inventorySignature=data=>JSON.stringify(data.map(p=>[p.id,p.actualizadoEn,p.estado,p.precio,p.latitud,p.longitud,p.tipo]));
function laboratoryState(){
 const values={};['search','sort','f-municipio','f-parroquia','f-zona','f-calle','f-tipo','min','max','currency'].forEach(id=>{if($(id))values[id]=$(id).value;});
 return {values,activeListingId,currentPage,center:map?.getCenter(),zoom:map?.getZoom()};
}
function restoreLaboratoryState(state){
 Object.entries(state?.values||{}).forEach(([id,value])=>{const control=$(id);if(control&&([...control.options||[]].some(option=>option.value===value)||!control.options))control.value=value;});
 currentPage=state?.currentPage||1;draw(false);
 if(state?.activeListingId&&items.some(item=>item.id===state.activeListingId))selectListing(state.activeListingId);
 if(state?.center&&Number.isFinite(state.zoom))map?.setView(state.center,state.zoom,{animate:false});
}
async function refreshLaboratoryInventory({force=false,announce=false}={}){
 if(inventorySyncing||!user||$('radarContent').hidden)return false;inventorySyncing=true;
 try{
  const state=laboratoryState();
  const [fresh,savedFavorites,savedLand]=await Promise.all([api('/api/public/inmuebles'),api('/api/favorites'),api('/api/land_labels')]);
  const fingerprint=inventorySignature(fresh);if(!force&&fingerprint===inventoryFingerprint)return false;
  landLabels=new Map(savedLand.map(r=>[r.id,r.classification]));fresh.forEach(p=>{p.autoLandType=p.tipo;if(landLabels.has(p.id)&&p.tipo?.startsWith('Terreno'))p.tipo=landLabels.get(p.id);});favoriteItems=new Map(savedFavorites.map(f=>[f.id,f.interest]));items=fresh;inventoryFingerprint=fingerprint;
  filters();restoreLaboratoryState(state);updateLaboratoryTabs();
  if(announce){$('message').textContent='Laboratorio actualizado: anuncios, resultados y mapa sincronizados.';setTimeout(()=>{if($('message').textContent.startsWith('Laboratorio actualizado'))$('message').textContent='';},5000);}
  return true;
 }finally{inventorySyncing=false;}
}
async function openRadar(){
 laboratoryTabs();if(!user)return;$('accessGate').hidden=true;$('radarContent').hidden=false;
 if(window.L&&!map){map=L.map('map').setView([10.067,-69.347],13);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);layer=L.layerGroup().addTo(map);}else if(!window.L)$('map').textContent='El mapa no pudo cargarse. Comprueba internet.';
 await refreshLaboratoryInventory({force:true});updateAccount();
}
$('enterRadar').onclick=account;
$('recoverRadar').onclick=showRecovery;
$('dialog').addEventListener('close',()=>{$('form').reset();$('fields').replaceChildren();});
async function checkSession(){try{const state=await api('/api/session');if(!state.user){if(user||!radarContent.hidden||accessGate.hidden)lockRadar();return;}user=state.user;updateAccount();if($('radarContent').hidden)await openRadar();}catch{lockRadar();}}
window.addEventListener('pageshow',checkSession);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkSession().then(()=>refreshLaboratoryInventory()).catch(()=>{});});
setInterval(()=>{checkSession().then(()=>document.visibilityState==='visible'&&refreshLaboratoryInventory()).catch(()=>{});},30000);

inventorySyncChannel?.addEventListener('message',event=>{if(event.data?.type==='inventory-updated')refreshLaboratoryInventory({announce:true}).catch(()=>{});});
window.addEventListener('storage',event=>{if(event.key==='radar-logout')lockRadar();if(event.key==='radar-inventory-sync')refreshLaboratoryInventory({announce:true}).catch(()=>{});});

let resetToken=null;
function showRecovery(){mode='forgot';$('formTitle').textContent='Recuperar contraseña';$('fields').innerHTML='<p>Introduce el correo de tu cuenta. Te enviaremos un enlace para elegir una nueva contraseña.</p><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>';$('formError').textContent='';$('submit').hidden=false;$('submit').textContent='Enviar enlace';if(!$('dialog').open)$('dialog').showModal();}
async function showReset(){const token=location.hash.match(/^#reset=([a-f0-9]{64})$/)?.[1];if(!token)return;history.replaceState(null,'',location.pathname);await checkSession();resetToken=token;mode='reset';$('formTitle').textContent='Nueva contraseña';$('fields').innerHTML='<label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label><label>Repite la contraseña<input name="confirm" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label>';$('formError').textContent='';$('submit').hidden=false;$('submit').textContent='Guardar contraseña';$('dialog').showModal();}
window.addEventListener('pageshow',showReset);
