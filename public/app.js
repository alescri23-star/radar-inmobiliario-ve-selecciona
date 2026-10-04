const data = { inmuebles: [], leads: [], reformas: [] };
let view = 'dashboard', editing = null;
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states = { inmuebles: ['borrador','activo','reservado','cerrado','archivado'], leads: ['nuevo','contactado','calificado','visita','negociacion','ganado','perdido'], reformas: ['detectada','evaluacion','presupuestada','aprobada','en ejecucion','completada','cancelada'] };
const names = { dashboard:'Dashboard', inmuebles:'Inmuebles', leads:'Leads', reformas:'Reformas' };
const fields = { inmuebles:[['titulo','Título'],['zona','Zona'],['operacion','Operación',['venta','alquiler']],['precio','Precio','number'],['moneda','Moneda',['USD','VES']],['fuente','Fuente o enlace']], leads:[['nombre','Nombre'],['contacto','Teléfono o email'],['inmuebleId','Inmueble','property'],['proximaAccion','Próxima acción'],['fecha','Fecha de seguimiento','date']], reformas:[['titulo','Necesidad de reforma'],['inmuebleId','Inmueble','property'],['importe','Presupuesto estimado','number'],['moneda','Moneda',['USD','VES']]] };
async function api(url, options) { const res = await fetch(url, options); const value = await res.json(); if (!res.ok) throw Error(value.error); return value; }
async function load() { try { const values = await Promise.all(Object.keys(data).map(k=>api('/api/'+k))); Object.keys(data).forEach((k,i)=>data[k]=values[i]); $('message').textContent=''; render(); } catch(e) { $('message').textContent=e.message; } }
function render() {
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
  editing=record; $('formTitle').textContent=record?'Editar registro':'Nuevo registro'; $('formError').textContent='';
  $('fields').innerHTML=[...fields[view],['estado','Estado',states[view]]].map(([key,label,type])=>{
    let control;
    if(type==='property') control=`<select name="${key}"><option value="">Sin vincular</option>${data.inmuebles.map(p=>`<option value="${p.id}" ${record?.[key]===p.id?'selected':''}>${escape(p.titulo)}</option>`).join('')}</select>`;
    else if(Array.isArray(type)) control=`<select name="${key}">${type.map(v=>`<option ${record?.[key]===v?'selected':''}>${escape(v)}</option>`).join('')}</select>`;
    else control=`<input name="${key}" type="${type||'text'}" value="${escape(record?.[key]||'')}" maxlength="2000" ${['titulo','nombre'].includes(key)?'required':''} ${type==='number'?'min="0" step="0.01"':''}>`;
    return `<label>${label}${control}</label>`;
  }).join(''); $('dialog').showModal();
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
$('add').onclick=()=>openForm(); $('close').onclick=()=>$('dialog').close();
$('form').onsubmit=async e=>{e.preventDefault(); const button=e.submitter;button.disabled=true;try {await api('/api/'+view+(editing?'/'+editing.id:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('dialog').close();await load();}catch(err){$('formError').textContent=err.message;}finally{button.disabled=false;}};
load();
