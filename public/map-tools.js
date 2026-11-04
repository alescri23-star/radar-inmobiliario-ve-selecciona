(function(){
  const streetUrl='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteUrl='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const roadsUrl='https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
  const labelsUrl='https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
  function configure(map){
    map.scrollWheelZoom.enable();
    const street=L.tileLayer(streetUrl,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
    const satellite=L.tileLayer(satelliteUrl,{maxZoom:19,attribution:'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'});
    const hybrid=L.layerGroup([
      L.tileLayer(satelliteUrl,{maxZoom:19,attribution:'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'}),
      L.tileLayer(roadsUrl,{maxZoom:19,opacity:.9,attribution:'Roads &copy; Esri'}),
      L.tileLayer(labelsUrl,{maxZoom:19,opacity:1,attribution:'Labels &copy; Esri'})
    ]);
    street.addTo(map);
    L.control.layers({'Mapa de calles':street,'Satélite':satellite,'Satélite + calles':hybrid},null,{position:'topright',collapsed:true}).addTo(map);
    return {street,satellite,hybrid};
  }
  function streetViewUrl(lat,lng){
    const point=`${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(point)}`;
  }
  function streetViewLink(lat,lng,label='Street View ↗'){
    const link=document.createElement('a');
    link.href=streetViewUrl(lat,lng);link.target='_blank';link.rel='noopener noreferrer';link.className='street-view-link';link.textContent=label;
    return link;
  }
  window.RadarMaps=Object.freeze({configure,streetViewUrl,streetViewLink});
})();
