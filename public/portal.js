const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],user=null,map=null,layer=null,mode='login',selected=null,markers=new Map();
async function api(url,input){const r=await fetch(url,input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{});const v=await r.json();if(!r.ok){if(r.status===401)lockRadar();throw Error(v.error);}return v;}
const filterSpec=[['operacion','Operación'],['municipio','Municipio'],['parroquia','Parroquia'],['zona','Sector / urbanización'],['calle','Calle'],['tipo','Tipo']];
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
const propertyTypes=['Apartamento','Casa','Terreno rústico','Terreno urbano','Otro'];
function updateAccount(){ $('account').textContent=user?'Cerrar sesión · '+user.name:'Registrarse / Entrar';$('adminLink').hidden=user?.role!=='admin'; }
function filters(){
 $('filters').innerHTML='<label>Estado<select disabled><option>Lara</option></select></label><label>Ciudad<select disabled><option>Barquisimeto</option></select></label>'+filterSpec.map(([k,label])=>`<label>${label}<select id="f-${k}"><option value="">Todos</option></select></label>`).join('')+'<label>Precio máximo<input id="max" type="number" min="0" placeholder="Sin límite"></label><label>Moneda<select id="currency"><option value="">Todas</option><option>USD</option><option>VES</option></select></label>';
 function choices(){
  const municipality=$('f-municipio').value;
  filterSpec.forEach(([k])=>{const el=$('f-'+k),old=el.value;let vals;
   if(k==='municipio')vals=Object.keys(territory);
   else if(k==='parroquia')vals=municipality?(territory[municipality]||[]):Object.values(territory).flat();
   else if(k==='tipo')vals=propertyTypes;
   else if(k==='operacion')vals=['venta','alquiler'];
   else vals=items.filter(p=>!municipality||!p.municipio||p.municipio===municipality).map(p=>p[k]).filter(Boolean);
   vals=[...new Set([...vals,...items.filter(p=>!municipality||p.municipio===municipality).map(p=>p[k]).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'es'));
   el.innerHTML='<option value="">Todos</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=vals.includes(old)?old:'';
  });draw();
 }

 filterSpec.forEach(([k])=>$('f-'+k).onchange=choices);$('max').oninput=draw;$('currency').onchange=draw;choices();
}
function draw(){
 const matches=items.filter(p=>filterSpec.every(([k])=>!$('f-'+k).value||p[k]===$('f-'+k).value)&&(!$('currency').value||p.moneda===$('currency').value)&&(!$('max').value||p.precio!==''&&Number(p.precio)<=Number($('max').value)));
 $('count').textContent=matches.length+' anuncios · '+matches.filter(p=>!p.latitud||!p.longitud).length+' sin coordenadas · Ubicaciones publicadas: exactitud por confirmar';
 $('listings').innerHTML=matches.length?matches.map(p=>`<article class="listing"><span class="badge">${esc(p.operacion)} · ${esc(p.tipo||'Inmueble')}</span><h2>${esc(p.titulo)}</h2><strong class="listing-price">${p.precio!==''?esc(p.precio)+' '+esc(p.moneda):'Consultar precio'}</strong><p class="muted">${esc([p.zona,p.municipio].filter(Boolean).join(' · '))}</p><p>${esc([p.superficie?p.superficie+' m²':'',p.habitaciones?p.habitaciones+' habitaciones':'',p.banos?p.banos+' baños':''].filter(Boolean).join(' · '))}</p><p>${esc((p.descripcion||'').slice(0,230))}</p><button data-interest="${p.id}">Pedir información</button> ${p.latitud&&p.longitud?`<button class="map-link" data-map="${p.id}">Ver en mapa</button>`:''}<p class="muted location-note">${p.latitud&&p.longitud?(p.ubicacionPrecision==='verificada'?'Ubicación verificada':'Ubicación publicada · exactitud por confirmar'):'Ubicación pendiente'}</p> ${/^https:\/\//.test(p.fuente)?`<a href="${esc(p.fuente)}" target="_blank" rel="noopener noreferrer">Anuncio original ↗</a>`:''}</article>`).join(''):'<div class="panel"><h2>No hay anuncios para esta selección</h2><p>Todavía no tenemos anuncios clasificados para esta combinación. Prueba otro municipio, parroquia, sector o tipo.</p></div>';
 document.querySelectorAll('[data-interest]').forEach(b=>b.onclick=()=>inquire(items.find(p=>p.id===b.dataset.interest)));
 if(map){
  layer.clearLayers();markers.clear();const groups=new Map(),points=[];
  matches.filter(p=>p.latitud!==''&&p.latitud!==undefined&&p.longitud!==''&&p.longitud!==undefined).forEach(p=>{const key=Number(p.latitud).toFixed(6)+','+Number(p.longitud).toFixed(6);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});
  for(const group of groups.values()){
   const pos=[Number(group[0].latitud),Number(group[0].longitud)];points.push(pos);
   const popup=document.createElement('div');
   const note=document.createElement('p');note.textContent=group.length>1?group.length+' anuncios comparten esta ubicación publicada. Confirma la dirección exacta.':'Ubicación publicada por la fuente. Confirma su exactitud.';popup.append(note);
   for(const p of group){const title=document.createElement('strong'),detail=document.createElement('p'),button=document.createElement('button');title.textContent=p.titulo;detail.textContent=[p.precio+' '+p.moneda,p.zona].join(' · ');button.textContent='Pedir información';button.onclick=()=>inquire(p);popup.append(title,detail,button,document.createElement('hr'));}
   const marker=L.circleMarker(pos,{radius:group.length>1?12:8,fillColor:group[0].operacion==='venta'?'#183f78':'#c64b55',color:'#fff',weight:2,fillOpacity:1}).bindPopup(popup,{maxHeight:260}).addTo(layer);group.forEach(p=>markers.set(p.id,marker));
  }
  if(points.length)map.fitBounds(points,{maxZoom:15,padding:[30,30]});
  document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{const marker=markers.get(button.dataset.map);if(marker){map.setView(marker.getLatLng(),16);marker.openPopup();$('map').scrollIntoView({behavior:'smooth',block:'center'});}});
 }
}
function account(){mode='login';showAccount();}
function showAccount(){ $('submit').hidden=false; $('formTitle').textContent=mode==='register'?'Crea tu cuenta':'Entrar a Radar';$('fields').innerHTML=(mode==='register'?'<label>Nombre<input name="name" autocomplete="name" required></label>':'')+'<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Contraseña<input name="password" type="password" minlength="10" autocomplete="'+(mode==='register'?'new-password':'current-password')+'" required></label><button type="button" id="switch">'+(mode==='register'?'Ya tengo cuenta':'Crear una cuenta')+'</button>';$('switch').onclick=()=>{mode=mode==='login'?'register':'login';showAccount();};if(mode==='login'){const forgot=document.createElement('button');forgot.type='button';forgot.className='map-link';forgot.textContent='¿Olvidaste tu contraseña?';forgot.onclick=showRecovery;$('fields').append(forgot);}$('submit').textContent='Continuar';$('formError').textContent='';if(!$('dialog').open)$('dialog').showModal();}
function inquire(p){selected=p;if(!user){account();$('formError').textContent='Entra o crea tu cuenta para consultar este inmueble.';return;}mode='inquiry';$('formTitle').textContent='Pedir información';$('fields').innerHTML=`<p>${esc(p.titulo)}</p><label>Teléfono o email de contacto<input name="contacto" value="${esc(user.email)}" required maxlength="200"></label><label>¿Qué quieres saber?<textarea name="mensaje" rows="3" maxlength="2000"></textarea></label><label class="consent"><input name="consent" type="checkbox" required> Acepto que Radar me contacte sobre esta consulta.</label>`;$('formError').textContent='';$('dialog').showModal();}
$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;try{const input=Object.fromEntries(new FormData(e.target));if(mode==='forgot'){const result=await api('/api/forgot-password',input);$('fields').replaceChildren();$('formError').textContent=result.message;$('submit').hidden=true;}else if(mode==='reset'){if(input.password!==input.confirm)throw Error('Las contraseñas no coinciden');const result=await api('/api/reset-password',{token:resetToken,password:input.password});resetToken=null;lockRadar();account();$('formError').textContent=result.message;}else if(mode==='inquiry'){await api('/api/inquiries',{...input,inmuebleId:selected.id,consent:input.consent==='on'});$('dialog').close();$('message').textContent='Consulta recibida. El equipo podrá contactarte sobre este inmueble.';selected=null;}else{const v=await api('/api/'+mode,input);user=v.user;$('dialog').close();await openRadar();if(selected)inquire(selected);}}catch(e){$('formError').textContent=e.message;}finally{$('submit').disabled=false;}};
$('account').onclick=async()=>{if(user){await api('/api/logout',{});lockRadar();try{localStorage.setItem('radar-logout',String(Date.now()));}catch{};}else account();};$('close').onclick=()=>$('dialog').close();
function lockRadar(){
 user=null;items=[];selected=null;markers.clear();if(map){map.remove();map=null;layer=null;}$('listings').replaceChildren();$('filters').replaceChildren();$('map').replaceChildren();$('count').textContent='';$('message').textContent='';$('radarContent').hidden=true;$('accessGate').hidden=false;if($('dialog').open)$('dialog').close();updateAccount();
}
async function openRadar(){
 const data=await api('/api/public/inmuebles');if(!user)return;items=data;$('accessGate').hidden=true;$('radarContent').hidden=false;
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
