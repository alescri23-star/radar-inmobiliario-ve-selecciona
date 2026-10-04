const data = { inmuebles: [], leads: [], reformas: [] };
let view = 'mapa', editing = null, map = null;
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states = { inmuebles: ['borrador','activo','reservado','cerrado','archivado'], leads: ['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'], reformas: ['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'] };
const names = { mapa:'Mapa de inmuebles', dashboard:'Dashboard', inmuebles:'Inmuebles', leads:'Leads', reformas:'Reformas' };
const fields = { inmuebles:[['titulo','Título'],['zona','Zona'],['direccion','Dirección o referencia'],['latitud','Latitud','coordinate'],['longitud','Longitud','coordinate'],['operacion','Operación',['venta','alquiler']],['precio','Precio','number'],['moneda','Moneda',['USD','VES']],['fuente','Fuente o enlace']], leads:[['nombre','Nombre'],['contacto','Teléfono o email'],['inmuebleId','Inmueble','property'],['proximaAccion','Próxima acción'],['fecha','Fecha de seguimiento','date']], reformas:[['titulo','Necesidad de reforma'],['inmuebleId','Inmueble','property'],['importe','Presupuesto estimado','number'],['moneda','Moneda',['USD','VES']]] };
async function api(url, options) { const res = await fetch(url, options); const value = await res.json(); if (!res.ok) throw Error(value.error); return value; }
async function load() { try { const values = await Promise.all(Object.keys(data).map(k=>api('/api/'+k))); Object.keys(data).forEach((k,i)=>data[k]=values[i]); $('message').textContent=''; render(); } catch(e) { $('message').textContent=e.message; } }
function render() {
  if (map) { map.remove(); map = null; }
  if (view === 'mapa') {
    $('title').textContent=names[view]; $('add').hidden=false;
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const located=data.inmuebles.filter(p=>p.latitud!==undefined && p.latitud!=='' && p.longitud!==undefined && p.longitud!=='');
    $('content').innerHTML='<p class="muted">Barquisimeto · '+located.length+' inmuebles ubicados · '+(data.inmuebles.length-located.length)+' sin ubicación. Pulsa un punto para consultar el inmueble.</p><div id="map" aria-label="Mapa de inmuebles de Barquisimeto"></div><p id="mapHint" class="muted">Pulsa sobre el mapa para registrar un inmueble en esa ubicación.</p>';
    if (!window.L) { $('map').textContent='No se pudo cargar el mapa. Comprueba la conexión a internet y recarga. Puedes registrar coordenadas desde Inmuebles.'; return; }
    map=L.map('map').setView([10.067,-69.347],13);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    tiles.on('tileerror',()=>{$('mapHint').textContent='No se pudieron cargar algunas calles. Revisa la conexión a internet.';});
    const bounds=[];
    located.forEach(p=>{
      const position=[Number(p.latitud),Number(p.longitud)];bounds.push(position);
      const popup=document.createElement('div');
      const title=document.createElement('strong');title.textContent=p.titulo;popup.append(title);
      const detail=document.createElement('p');detail.textContent=[p.zona,p.direccion,p.precio ? p.precio+' '+p.moneda : '',p.estado].filter(Boolean).join(' · ');popup.append(detail);
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
    $('content').innerHTML=`<div class="cards">${[['Inmuebles activos',data.inmuebles.filter(p=>p.estado==='activo').length],['Leads abiertos',data.leads.filter(l=>!['ganado','perdido'].includes(l.estado)).length],['Reformas pendientes',data.reformas.filter(r=>!['completada','cancelada'].includes(r.estado)).length],['Seguimientos vencidos',pending.length]].map(([name,total])=>`<div class="card"><span>${name}</span><strong>${total}</strong></div>`).join('')}</div><div class="panel"><h2>Próximos pasos</h2><p class="muted">Registra los primeros inmuebles de Barquisimeto con su fuente. Después vincula leads y necesidades de reforma.</p><button id="first">Registrar inmueble</button></div><div class="panel"><h2>Seguimiento pendiente</h2>${pending.length?pending.map(l=>`<p><strong>${escape(l.nombre)}</strong> · ${escape(l.proximaAccion || 'Sin acción indicada')} · ${escape(l.fecha)}</p>`).join(''):'<p class="muted">No hay seguimientos vencidos.</p>'}</div>`;
    $('first').onclick=()=>{view='inmuebles';render();openForm();}; return;
  }
  $('content').innerHTML='<div class="toolbar"><input id="search" aria-label="Buscar registros" placeholder="Buscar por nombre, zona o contacto…"><select id="status" aria-label="Filtrar por estado"><option value="">Todos los estados</option>'+states[view].map(s=>`<option>${s}</option>`).join('')+'</select></div><div class="panel tablewrap" id="rows"></div>';
  $('search').oninput=rows; $('status').onchange=rows; rows();
}
function rows() {
  const query=$('search').value.toLocaleLowerCase(); const filtered=data[view].filter(r=>JSON.stringify(r).toLocaleLowerCase().includes(query) && (!$('status').value || r.estado===$('status').value));
  $('rows').innerHTML=filtered.length?`<table><thead><tr><th>Registro</th><th>${view==='inmuebles'?'Zona':'Inmueble'}</th><th>${view==='leads'?'Contacto':'Importe'}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${filtered.map(r=>`<tr><td>${escape(r.titulo||r.nombre)}</td><td>${escape(view==='inmuebles'?r.zona:data.inmuebles.find(p=>p.id===r.inmuebleId)?.titulo||'Sin vincular')}</td><td>${escape(view==='leads'?r.contacto:(r.precio||r.importe)?`${r.precio||r.importe} ${r.moneda}`:'Sin estimación')}</td><td><span class="badge">${escape(r.estado)}</span></td><td><button data-edit="${r.id}">Editar</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No hay registros para mostrar. Añade el primero o ajusta los filtros.</div>';
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
load();
