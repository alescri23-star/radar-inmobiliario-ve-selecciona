const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const safePhoto=value=>/^https:\/\/(cdn\.remax\.com\.ve|cdn\.photos\.sparkplatform\.com|cdn\.21online\.lat|images\.wasi\.co)\//i.test(String(value||''))?String(value):'';
const safeSource=value=>/^https:\/\/[a-z0-9.-]+(?:[\/:?#]|$)/i.test(String(value||''))?String(value):'';
let map=null,stateLayer=null;

function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem('radar-theme',theme);$('themeToggle').textContent=theme==='dark'?'Modo claro':'Modo oscuro';$('themeToggle').setAttribute('aria-pressed',String(theme==='dark'));}
function stateStyle(feature){const total=Number(feature.properties.radarTotal)||0;return{color:'#f6f9fc',weight:1.2,fillColor:total?'#2d6fa9':'#9cb2c7',fillOpacity:total?Math.min(.72,.28+Math.log10(total+1)*.19):.2};}
function propertyPopup(listing){
  const card=document.createElement('article');card.className='map-property-card';
  const photo=safePhoto(listing.photo),source=safeSource(listing.source),price=listing.price?`${escape(listing.price)} ${escape(listing.currency)}`:'Precio por consultar';
  card.innerHTML=`${photo?`<img src="${escape(photo)}" alt="Foto de ${escape(listing.title)}" loading="lazy" referrerpolicy="no-referrer">`:'<div class="map-photo-placeholder">Foto no disponible</div>'}<div class="map-property-body"><div class="map-property-badges"><span class="${listing.operation==='alquiler'?'rent':'sale'}">${escape(listing.operation||'anuncio')}</span>${listing.type?`<span>${escape(listing.type)}</span>`:''}</div><h2>${escape(listing.title)}</h2><strong>${price}</strong><p>${escape([listing.zone,listing.address].filter(Boolean).join(' · ')||listing.state)}</p><div class="map-property-actions">${source?`<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">Abrir anuncio ↗</a>`:''}</div></div>`;
  card.querySelector('img')?.addEventListener('error',event=>{const fallback=document.createElement('div');fallback.className='map-photo-placeholder';fallback.textContent='Foto no disponible';event.currentTarget.replaceWith(fallback);});
  card.querySelector('.map-property-actions').append(RadarMaps.streetViewLink(listing.lat,listing.lng,'Ver zona en Street View ↗'));
  return card;
}
function addListings(listings){
  const markerPane=map.createPane('propertyMarkers');markerPane.style.zIndex='650';
  listings.forEach(listing=>{const marker=L.circleMarker([listing.lat,listing.lng],{pane:'propertyMarkers',radius:7,color:'#fff',weight:2,fillColor:listing.operation==='alquiler'?'#c64b55':'#123f78',fillOpacity:1}).addTo(map);marker.bindPopup(propertyPopup(listing),{className:'property-map-popup',maxWidth:340,minWidth:280});marker.bindTooltip(listing.title,{direction:'top',offset:[0,-7],opacity:.92});});
}
function addStates(geojson,report){
  const byName=new Map(report.states.map(row=>[normalize(row.name),row]));
  geojson.features=geojson.features.filter(feature=>byName.has(normalize(feature.properties.Entidad))).map(feature=>{const row=byName.get(normalize(feature.properties.Entidad));feature.properties.radarName=row.name;feature.properties.radarTotal=row.total;feature.properties.sale=row.sale;feature.properties.rent=row.rent;return feature;});
  stateLayer=L.geoJSON(geojson,{style:stateStyle,onEachFeature(feature,layer){const properties=feature.properties;layer.bindTooltip(`<strong>${escape(properties.radarName)}</strong><br>${properties.radarTotal} anuncios · ${properties.sale} venta · ${properties.rent} alquiler`,{sticky:true,className:'state-tooltip'});layer.on({mouseover(){layer.setStyle({fillColor:'#f1c644',fillOpacity:.82,color:'#fff',weight:2.5});layer.bringToFront();},mouseout(){stateLayer.resetStyle(layer);},click(){map.fitBounds(layer.getBounds(),{padding:[40,40],maxZoom:10});}});}}).addTo(map);
  map.fitBounds([[0.5,-73.5],[12.5,-59.4]],{paddingTopLeft:[window.innerWidth>700?410:20,20],paddingBottomRight:[20,20]});
}
async function load(){
  try{
    const session=await fetch('/api/session').then(response=>response.json());if(!session.user){location.href='/';return;}
    const [coverageResponse,geoResponse]=await Promise.all([fetch('/api/coverage'),fetch('/venezuela-states.geojson')]);if(coverageResponse.status===401){location.href='/';return;}if(!coverageResponse.ok||!geoResponse.ok)throw Error('No se pudo cargar el mapa territorial.');
    const [report,geojson]=await Promise.all([coverageResponse.json(),geoResponse.json()]);
    $('saleCount').textContent=report.sale;$('rentCount').textContent=report.rent;$('locatedCount').textContent=report.listings.length;$('missingCount').textContent=`${report.total-report.listings.length} sin coordenadas`;$('coverageMessage').textContent=`${report.total} inmuebles activos en ${report.states.filter(row=>row.total).length} estados.`;
    if(!window.L)throw Error('El mapa no pudo iniciarse.');
    map=L.map('coverageMap',{zoomControl:true,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView([7.8,-66.8],5);RadarMaps.configure(map);map.attributionControl.addAttribution('<a href="https://services3.arcgis.com/yaewiDuOIcucvCmt/ArcGIS/rest/services/DPA_Venezuela/FeatureServer/0" target="_blank" rel="noopener">Límites DPA Venezuela</a>');addStates(geojson,report);addListings(report.listings);
  }catch(error){$('coverageMessage').textContent=error.message;$('coverageMessage').classList.add('error');}
}
$('themeToggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');$('account').onclick=async()=>{await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.href='/';};applyTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');window.addEventListener('load',load,{once:true});
