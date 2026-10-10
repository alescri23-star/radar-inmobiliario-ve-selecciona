function listingPhoto(p){const url=p.foto||'';if(!/^https:\/\/(cdn\.remax\.com\.ve|cdn\.photos\.sparkplatform\.com)\//.test(url))return '<div class="photo-placeholder">Foto no disponible</div>';return '<img class="listing-photo" src="'+escape(url)+'" alt="Foto del anuncio" loading="lazy" decoding="async" referrerpolicy="no-referrer">';}
function photoFallback(){document.querySelectorAll('.listing-photo').forEach(img=>img.onerror=()=>{const box=document.createElement('div');box.className='photo-placeholder';box.textContent='Foto no disponible';img.replaceWith(box);});}
const data = { inmuebles: [], leads: [], reformas: [] };
let view = 'mapa', editing = null, map = null;
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states = { inmuebles: ['borrador','activo','reservado','cerrado','archivado'], leads: ['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'], reformas: ['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'] };
const names = { fuentes:'Fuentes del radar', mapa:'Mapa de inmuebles', dashboard:'Dashboard', inmuebles:'Inmuebles', leads:'Leads', reformas:'Reformas' };
const fields = { inmuebles:[['titulo','Título'],['zona','Sector / urbanización'],['municipio','Municipio'],['parroquia','Parroquia'],['calle','Calle'],['tipo','Tipo',['Apartamento','Casa','Terreno rústico','Terreno urbano','Terreno sin clasificar','Otro']],['direccion','Dirección o referencia'],['latitud','Latitud','coordinate'],['longitud','Longitud','coordinate'],['ubicacionPrecision','Precisión de la ubicación',['publicada','aproximada','verificada']],['operacion','Operación',['venta','alquiler']],['precio','Precio','number'],['moneda','Moneda',['USD','VES']],['fuente','Fuente o enlace']], leads:[['nombre','Nombre'],['contacto','Teléfono o email'],['inmuebleId','Inmueble','property'],['proximaAccion','Próxima acción'],['fecha','Fecha de seguimiento','date']], reformas:[['titulo','Necesidad de reforma'],['inmuebleId','Inmueble','property'],['importe','Presupuesto estimado','number'],['moneda','Moneda',['USD','VES']]] };
async function api(url, options) { const res = await fetch(url, options); const value = await res.json(); if (!res.ok) throw Error(value.error); return value; }
async function load() { try { const values = await Promise.all(Object.keys(data).map(k=>api('/api/'+k))); Object.keys(data).forEach((k,i)=>data[k]=values[i]); $('message').textContent=''; render(); } catch(e) { $('message').textContent=e.message; } }
async function render() {
  if(view==='fuentes'){
    if(map){map.remove();map=null;}$('title').textContent=names[view];$('add').hidden=true;
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    try{const source=await api('/api/sources');$('content').innerHTML='<div class="panel"><h2>Fuentes · Barquisimeto</h2><p>Rent-A-House y RE/MAX: apartamentos de venta y alquiler. Conserva enlaces, detecta repeticiones por fuente y código y registra cambios de precio. Cada captura indica su alcance.</p><p>'+source.properties+' anuncios rastreados · '+source.changes+' con cambios de precio</p><p class="muted">Las calles, parroquias y coordenadas que el anuncio no proporciona quedan pendientes de verificar. La captura se ejecuta desde el servidor; todavía no tiene programación automática.</p></div><div class="panel"><h2>Últimas capturas</h2>'+source.runs.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>'<p class="source-run">'+escape(r.source)+' · '+escape(r.fecha)+' · '+r.added+' nuevos / '+r.updated+' revisados / '+r.changes+' cambios</p>').join('')+'</div>';}catch(e){$('message').textContent=e.message;}return;
  }
  if (map) { map.remove(); map = null; }
  if (view === 'mapa') {
    $('title').textContent=names[view]; $('add').hidden=false;
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const located=data.inmuebles.filter(p=>p.latitud!==undefined && p.latitud!=='' && p.longitud!==undefined && p.longitud!=='');
    $('content').innerHTML='<p class="muted">Las ubicaciones publicadas por la fuente requieren confirmar exactitud. Barquisimeto · '+located.length+' inmuebles ubicados · '+(data.inmuebles.length-located.length)+' sin ubicación. Pulsa un punto para consultar el inmueble.</p><div id="map" aria-label="Mapa de inmuebles de Barquisimeto"></div><p id="mapHint" class="muted">Pulsa sobre el mapa para registrar un inmueble en esa ubicación.</p>';
    if (!window.L) { $('map').textContent='No se pudo cargar el mapa. Comprueba la conexión a internet y recarga. Puedes registrar coordenadas desde Inmuebles.'; return; }
    map=L.map('map').setView([10.067,-69.347],13);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    tiles.on('tileerror',()=>{$('mapHint').textContent='No se pudieron cargar algunas calles. Revisa la conexión a internet.';});
    const bounds=[];
    located.forEach(p=>{
      const position=[Number(p.latitud),Number(p.longitud)];bounds.push(position);
      const popup=document.createElement('div');
      const title=document.createElement('strong');title.textContent=p.titulo;popup.append(title);
      const detail=document.createElement('p');detail.textContent=[p.zona,p.direccion,p.precio ? p.precio+' '+p.moneda : '',p.estado,p.ubicacionPrecision==='verificada'?'Ubicación verificada':'Ubicación publicada: exactitud por confirmar'].filter(Boolean).join(' · ');popup.append(detail);
      const button=document.createElement('button');button.textContent='Abrir ficha';button.onclick=()=>{view='inmuebles';render();openForm(p);};popup.append(button);
      L.circleMarker(position,{radius:9,color:'#fff',weight:2,fillColor:p.operacion==='alquiler'?'#c64b55':'#183f78',fillOpacity:1}).addTo(map).bindPopup(popup);
    });
    if(bounds.length) map.fitBounds(bounds,{padding:[40,40],maxZoom:15});
    map.on('click',e=>{view='inmuebles';render();openForm({latitud:e.latlng.lat.toFixed(6),longitud:e.latlng.lng.toFixed(6)});});
    return;
  }
  $('title').textContent=names[view]; $('add').hidden=view==='dashboard';
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(view==='dashboard') {
    const today = new Date().toLocaleDateString('en-CA');
    const pending=data.leads.filter(l=>l.fecha && l.fecha<today && !['ganado','perdido'].includes(l.estado));
    $('content').innerHTML=`<div class="cards">${[['Inmuebles activos',data.inmuebles.filter(p=>p.estado==='activo').length],['Leads abiertos',data.leads.filter(l=>!['ganado','perdido'].includes(l.estado)).length],['Reformas pendientes',data.reformas.filter(r=>!['completada','cancelada'].includes(r.estado)).length],['Seguimientos vencidos',pending.length]].map(([name,total])=>`<div class="card"><span>${name}</span><strong>${total}</strong></div>`).join('')}</div><div class="panel"><h2>Próximos pasos</h2><p class="muted">Consulta las fuentes del radar y atiende las solicitudes de información. El registro manual se reserva para corregir o completar anuncios.</p><button id="first">Corregir / añadir anuncio</button></div><div class="panel"><h2>Seguimiento pendiente</h2>${pending.length?pending.map(l=>`<p><strong>${escape(l.nombre)}</strong> · ${escape(l.proximaAccion || 'Sin acción indicada')} · ${escape(l.fecha)}</p>`).join(''):'<p class="muted">No hay seguimientos vencidos.</p>'}</div>`;
    $('first').onclick=()=>{view='inmuebles';render();openForm();}; return;
  }
  $('content').innerHTML='<div class="toolbar"><input id="search" aria-label="Buscar registros" placeholder="Buscar por nombre, zona o contacto…"><select id="status" aria-label="Filtrar por estado"><option value="">Todos los estados</option>'+states[view].map(s=>`<option>${s}</option>`).join('')+'</select>'+(view==='inmuebles'?'<select id="propertyType" aria-label="Filtrar por tipo"><option value="">Todos los tipos</option><option>Todos los terrenos</option><option>Apartamento</option><option>Casa</option><option>Terreno rústico</option><option>Terreno urbano</option><option>Terreno sin clasificar</option></select>':'')+'</div><div class="panel tablewrap" id="rows"></div>';
  $('search').oninput=rows; $('status').onchange=rows;if($('propertyType'))$('propertyType').onchange=rows; rows();
}
function rows() {
  const query=$('search').value.toLocaleLowerCase(); const type=$('propertyType')?.value||''; const filtered=data[view].filter(r=>(!type||(type==='Todos los terrenos'?r.tipo?.startsWith('Terreno'):r.tipo===type)) && JSON.stringify(r).toLocaleLowerCase().includes(query) && (!$('status').value || r.estado===$('status').value));
  $('rows').innerHTML=filtered.length?`<table><thead><tr><th>Registro</th><th>${view==='inmuebles'?'Zona':'Inmueble'}</th><th>${view==='leads'?'Contacto':'Importe'}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${filtered.map(r=>`<tr><td>${view==='inmuebles'?listingPhoto(r):''}${escape(r.titulo||r.nombre)}${view==='inmuebles'?'<br><small>'+escape(r.tipo||'Sin tipo')+'</small>':''}</td><td>${escape(view==='inmuebles'?r.zona:data.inmuebles.find(p=>p.id===r.inmuebleId)?.titulo||'Sin vincular')}</td><td>${escape(view==='leads'?r.contacto:(r.precio||r.importe)?`${r.precio||r.importe} ${r.moneda}`:'Sin estimación')}</td><td><span class="badge">${escape(r.estado)}</span></td><td>${view==='inmuebles'?`<button data-gallery="${r.id}">Ver fotos</button> `:''}<button data-edit="${r.id}">Editar</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No hay registros para mostrar. Añade el primero o ajusta los filtros.</div>';
  photoFallback();
  document.querySelectorAll("[data-gallery]").forEach(b=>b.onclick=()=>RadarGallery.open(data.inmuebles.find(p=>p.id===b.dataset.gallery)));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(data[view].find(r=>r.id===b.dataset.edit)));
}
function openForm(record=null) {
  editing=record?.id ? record : null; $('formTitle').textContent=record?.id?'Editar registro':'Nuevo registro'; $('formError').textContent='';
  $('fields').innerHTML=[...fields[view],['estado','Estado',states[view]]].map(([key,label,type])=>{
    let control;
    if(type==='property') control=`<select name="${key}"><option value="">Sin vincular</option>${data.inmuebles.map(p=>`<option value="${p.id}" ${record?.[key]===p.id?'selected':''}>${escape(p.titulo)}</option>`).join('')}</select>`;
    else if(Array.isArray(type)) control=`<select name="${key}">${type.map(v=>`<option ${record?.[key]===v?'selected':''}>${escape(v)}</option>`).join('')}</select>`;
    else control=`<input name="${key}" type="${type==='coordinate'?'number':type||'text'}" value="${escape(record?.[key]||'')}" maxlength="2000" ${['titulo','nombre'].includes(key)?'required':''} ${type==='number'?'min="0" step="0.01"':type==='coordinate'?'step="any"':''}>`;
    return `<label>${label}${control}</label>`;
  }).join(''); $('dialog').showModal();
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
$('add').onclick=()=>{if(view==='mapa'){view='inmuebles';render();}openForm();}; $('close').onclick=()=>$('dialog').close();
$('form').onsubmit=async e=>{e.preventDefault(); const button=e.submitter;button.disabled=true;try {await api('/api/'+view+(editing?'/'+editing.id:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('dialog').close();await load();}catch(err){$('formError').textContent=err.message;}finally{button.disabled=false;}};
async function boot(){
 const session=await api('/api/session');
 $('logout').hidden=!session.user;
 document.querySelector('nav').hidden=session.user?.role!=='admin';
 if(session.user?.role==='admin'){load();return;}
 if(session.setupRequired){$('title').textContent='Configuración pendiente';$('add').hidden=true;document.querySelector('nav').hidden=true;$('content').innerHTML='<section class="panel"><h2>Administrador pendiente</h2><p>El responsable del servicio debe habilitar la cuenta de administración. Contacta con él para continuar.</p><a href="/">Volver al inicio</a></section>';return;}
 $('title').textContent='Acceso al dashboard';$('add').hidden=true;
 $('content').innerHTML='<form class="panel admin-login" id="access"><h2>Entrar como administrador</h2><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Contraseña<input name="password" type="password" minlength="10" required autocomplete="current-password"></label><p>Usa al menos 10 caracteres.</p><button>Entrar</button><p id="accessError" role="alert"></p><a href="/">Volver a buscar inmuebles</a></form>';
 document.querySelector('nav').hidden=true;
 $('access').onsubmit=async e=>{e.preventDefault();try{const r=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});if(r.user.role!=='admin')throw Error('Esta cuenta es de cliente. Usa la web de búsqueda.');document.querySelector('nav').hidden=false;$('logout').hidden=false;load();}catch(e){$('accessError').textContent=e.message;}};
}
$('logout').onclick=async()=>{const button=$('logout');button.disabled=true;try{await api('/api/logout',{method:'POST'});window.RadarGallery?.close();if(map){map.remove();map=null;}Object.keys(data).forEach(key=>data[key]=[]);if($('dialog').open)$('dialog').close();$('message').textContent='';try{localStorage.setItem('radar-logout',String(Date.now()));}catch{}await boot();}catch(error){$('message').textContent=error.message;}finally{button.disabled=false;}};
boot().catch(e=>$('message').textContent=e.message);