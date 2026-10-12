function listingPhoto(p){const url=p.foto||'';if(!/^https:\/\/(cdn\.remax\.com\.ve|cdn\.photos\.sparkplatform\.com)\//.test(url))return '<div class="photo-placeholder">Foto no disponible</div>';return '<img class="listing-photo" src="'+esc(url)+'" alt="Foto del anuncio" loading="lazy" decoding="async" referrerpolicy="no-referrer">';}
function photoFallback(){document.querySelectorAll('.listing-photo').forEach(img=>img.onerror=()=>{const box=document.createElement('div');box.className='photo-placeholder';box.textContent='Foto no disponible';img.replaceWith(box);});}
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],user=null,map=null,layer=null,mode='login',selected=null,markers=new Map(),activeListingId=null;
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
}
function laboratoryTabs(){
 if($('laboratory-tabs'))return;
 const tabs=document.createElement('div');tabs.id='laboratory-tabs';tabs.className='laboratory-tabs';
 const allOperations=document.createElement('button');allOperations.id='all-operations-tab';allOperations.className='operation-tab';
 const sale=document.createElement('button');sale.id='sale-tab';sale.className='operation-tab';
 const rent=document.createElement('button');rent.id='rent-tab';rent.className='operation-tab';
 const fav=document.createElement('button');fav.id='favorites-tab';
 const filter=document.createElement('select');filter.id='interest-filter';filter.setAttribute('aria-label','Filtrar favoritos por interés');
 filter.innerHTML='<option value="">Todos los niveles de interés</option>'+Object.entries(interestLabels).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
 const chooseOperation=value=>{operationView=value;favoriteOnly=false;interestFilter='';filter.value='';draw();};
 allOperations.onclick=()=>chooseOperation('');sale.onclick=()=>chooseOperation('venta');rent.onclick=()=>chooseOperation('alquiler');
 fav.onclick=()=>{favoriteOnly=true;draw();};filter.onchange=()=>{interestFilter=filter.value;draw();};
 tabs.append(allOperations,sale,rent,fav,filter);$('filters').before(tabs);updateLaboratoryTabs();
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
function updateAccount(){ $('account').textContent=user?'Cerrar sesión · '+user.name:'Registrarse / Entrar';$('adminLink').hidden=user?.role!=='admin'; }
function filters(){
 $('filters').innerHTML='<label>Estado<select disabled><option>Lara</option></select></label><label>Ciudad<select disabled><option>Barquisimeto</option></select></label>'+filterSpec.map(([k,label])=>`<label>${label}<select id="f-${k}"><option value="">Todos</option></select></label>`).join('')+'<label>Precio máximo<input id="max" type="number" min="0" placeholder="Sin límite"></label><label>Moneda<select id="currency"><option value="">Todas</option><option>USD</option><option>VES</option></select></label>';
 function choices(){
  const municipality=$('f-municipio').value;
  filterSpec.forEach(([k])=>{const el=$('f-'+k),old=el.value;let vals;
   if(k==='municipio')vals=Object.keys(territory);
   else if(k==='parroquia')vals=municipality?(territory[municipality]||[]):Object.values(territory).flat();
   else if(k==='tipo')vals=propertyTypes;
   else vals=items.filter(p=>!municipality||!p.municipio||p.municipio===municipality).map(p=>p[k]).filter(Boolean);
   vals=[...new Set([...vals,...items.filter(p=>!municipality||p.municipio===municipality).map(p=>p[k]).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'es'));
   el.innerHTML='<option value="">Todos</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=vals.includes(old)?old:'';
  });draw();
 }

 filterSpec.forEach(([k])=>$('f-'+k).onchange=choices);$('max').oninput=draw;$('currency').onchange=draw;choices();
}
function selectListing(id){
 activeListingId=id;
 document.querySelectorAll('[data-listing-id]').forEach(card=>{
  const active=card.dataset.listingId===id;card.classList.toggle('listing-selected',active);
  if(active){card.setAttribute('aria-current','true');const list=$('listings');list.scrollTo({top:card.offsetTop,behavior:'smooth'});}
  else card.removeAttribute('aria-current');
 });
}
function draw(){
 activeListingId=null;
 updateLaboratoryTabs();
 const matches=items.filter(p=>(!operationView||p.operacion===operationView)&&(!favoriteOnly||(favoriteItems.has(p.id)&&(!interestFilter||favoriteItems.get(p.id)===interestFilter)))&&filterSpec.every(([k])=>!$('f-'+k).value||(k==='tipo'&&$('f-'+k).value==='Todos los terrenos'?p.tipo?.startsWith('Terreno'):p[k]===$('f-'+k).value))&&(!$('currency').value||p.moneda===$('currency').value)&&(!$('max').value||p.precio!==''&&Number(p.precio)<=Number($('max').value)));
 const operationText=operationView?' en '+operationView:'';
 $('count').textContent=matches.length+' anuncios'+operationText+' · '+matches.filter(p=>!p.latitud||!p.longitud).length+' sin coordenadas · Ubicaciones publicadas: exactitud por confirmar';
 $('listings').innerHTML=matches.length?matches.map(p=>`<article class="listing" data-listing-id="${esc(p.id)}">${listingPhoto(p)}<span class="badge">${esc(p.operacion)} · ${esc(p.tipo||'Inmueble')}</span><h2>${esc(p.titulo)}</h2><strong class="listing-price">${p.precio!==''?esc(p.precio)+' '+esc(p.moneda):'Consultar precio'}</strong><p class="muted">${esc([p.zona,p.municipio].filter(Boolean).join(' · '))}</p><p>${esc([p.superficie?p.superficie+' m²':'',p.habitaciones?p.habitaciones+' habitaciones':'',p.banos?p.banos+' baños':''].filter(Boolean).join(' · '))}</p><p>${esc((p.descripcion||'').slice(0,230))}</p><button class="map-link" data-gallery="${p.id}">Ver fotos</button> <div data-favorite-slot="${esc(p.id)}"></div> ${p.latitud&&p.longitud?`<button class="map-link" data-map="${p.id}">Ver en mapa</button>`:''}<p class="muted location-note">${p.latitud&&p.longitud?(p.ubicacionPrecision==='verificada'?'Ubicación verificada':'Ubicación publicada · exactitud por confirmar'):'Ubicación pendiente'}</p> ${/^https:\/\//.test(p.fuente)?`<a href="${esc(p.fuente)}" target="_blank" rel="noopener noreferrer">Anuncio original ↗</a>`:''}</article>`).join(''):'<div class="panel"><h2>No hay anuncios para esta selección</h2><p>Todavía no tenemos anuncios clasificados para esta combinación. Prueba otro municipio, parroquia, sector o tipo.</p></div>';
 photoFallback();
 document.querySelectorAll("[data-gallery]").forEach(b=>b.onclick=()=>RadarGallery.open(items.find(p=>p.id===b.dataset.gallery)));
 document.querySelectorAll('[data-favorite-slot]').forEach(slot=>slot.append(favoriteControls(items.find(p=>p.id===slot.dataset.favoriteSlot))));
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
function showAccount(){ $('submit').hidden=false; $('formTitle').textContent=mode==='register'?'Crea tu cuenta':'Entrar a Radar';$('fields').innerHTML=(mode==='register'?'<label>Nombre<input name="name" autocomplete="name" required></label>':'')+'<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Contraseña<input name="password" type="password" minlength="10" autocomplete="'+(mode==='register'?'new-password':'current-password')+'" required></label><button type="button" id="switch">'+(mode==='register'?'Ya tengo cuenta':'Crear una cuenta')+'</button>';$('switch').onclick=()=>{mode=mode==='login'?'register':'login';showAccount();};if(mode==='login'){const forgot=document.createElement('button');forgot.type='button';forgot.className='map-link';forgot.textContent='¿Olvidaste tu contraseña?';forgot.onclick=showRecovery;$('fields').append(forgot);}$('submit').textContent='Continuar';$('formError').textContent='';if(!$('dialog').open)$('dialog').showModal();}
function inquire(p){selected=p;if(!user){account();$('formError').textContent='Entra o crea tu cuenta para consultar este inmueble.';return;}mode='inquiry';$('formTitle').textContent='Pedir información';$('fields').innerHTML=`<p>${esc(p.titulo)}</p><label>Teléfono o email de contacto<input name="contacto" value="${esc(user.email)}" required maxlength="200"></label><label>¿Qué quieres saber?<textarea name="mensaje" rows="3" maxlength="2000"></textarea></label><label class="consent"><input name="consent" type="checkbox" required> Acepto que Radar me contacte sobre esta consulta.</label>`;$('formError').textContent='';$('dialog').showModal();}
$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;try{const input=Object.fromEntries(new FormData(e.target));if(mode==='forgot'){const result=await api('/api/forgot-password',input);$('fields').replaceChildren();$('formError').textContent=result.message;$('submit').hidden=true;}else if(mode==='reset'){if(input.password!==input.confirm)throw Error('Las contraseñas no coinciden');const result=await api('/api/reset-password',{token:resetToken,password:input.password});resetToken=null;lockRadar();account();$('formError').textContent=result.message;}else if(mode==='inquiry'){await api('/api/inquiries',{...input,inmuebleId:selected.id,consent:input.consent==='on'});$('dialog').close();$('message').textContent='Consulta recibida. El equipo podrá contactarte sobre este inmueble.';selected=null;}else{const v=await api('/api/'+mode,input);user=v.user;$('dialog').close();await openRadar();if(selected)inquire(selected);}}catch(e){$('formError').textContent=e.message;}finally{$('submit').disabled=false;}};
$('account').onclick=async()=>{if(user){await api('/api/logout',{});lockRadar();try{localStorage.setItem('radar-logout',String(Date.now()));}catch{};}else account();};$('close').onclick=()=>$('dialog').close();
function lockRadar(){window.RadarGallery?.close();
 landLabels.clear();favoriteItems.clear();favoriteOnly=false;interestFilter='';operationView='venta';user=null;items=[];selected=null;activeListingId=null;markers.clear();if(map){map.remove();map=null;layer=null;}$('listings').replaceChildren();$('filters').replaceChildren();$('map').replaceChildren();$('count').textContent='';$('message').textContent='';$('radarContent').hidden=true;$('accessGate').hidden=false;if($('dialog').open)$('dialog').close();updateAccount();
}
async function openRadar(){
 const [data,savedFavorites,savedLand]=await Promise.all([api('/api/public/inmuebles'),api('/api/favorites'),api('/api/land_labels')]);landLabels=new Map(savedLand.map(r=>[r.id,r.classification]));data.forEach(p=>{p.autoLandType=p.tipo;if(landLabels.has(p.id)&&p.tipo?.startsWith('Terreno'))p.tipo=landLabels.get(p.id);});favoriteItems=new Map(savedFavorites.map(f=>[f.id,f.interest]));laboratoryTabs();if(!user)return;items=data;$('accessGate').hidden=true;$('radarContent').hidden=false;
 if(window.L&&!map){map=L.map('map').setView([10.067,-69.347],13);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);layer=L.layerGroup().addTo(map);}else if(!window.L)$('map').textContent='El mapa no pudo cargarse. Comprueba internet.';filters();updateAccount();
}
$('enterRadar').onclick=account;
$('dialog').addEventListener('close',()=>{$('form').reset();$('fields').replaceChildren();});
async function checkSession(){try{const state=await api('/api/session');if(!state.user){if(user||!radarContent.hidden||accessGate.hidden)lockRadar();return;}user=state.user;updateAccount();if($('radarContent').hidden)await openRadar();}catch{lockRadar();}}
window.addEventListener('pageshow',checkSession);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkSession();});
setInterval(checkSession,30000);

window.addEventListener('storage',event=>{if(event.key==='radar-logout')lockRadar();});

let resetToken=null;
function showRecovery(){mode='forgot';$('formTitle').textContent='Recuperar contraseña';$('fields').innerHTML='<p>Introduce el correo de tu cuenta. Te enviaremos un enlace para elegir una nueva contraseña.</p><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>';$('formError').textContent='';$('submit').hidden=false;$('submit').textContent='Enviar enlace';if(!$('dialog').open)$('dialog').showModal();}
async function showReset(){const token=location.hash.match(/^#reset=([a-f0-9]{64})$/)?.[1];if(!token)return;history.replaceState(null,'',location.pathname);await checkSession();resetToken=token;mode='reset';$('formTitle').textContent='Nueva contraseña';$('fields').innerHTML='<label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label><label>Repite la contraseña<input name="confirm" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label>';$('formError').textContent='';$('submit').hidden=false;$('submit').textContent='Guardar contraseña';$('dialog').showModal();}
window.addEventListener('pageshow',showReset);
