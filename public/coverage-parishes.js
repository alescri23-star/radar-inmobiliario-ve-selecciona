(function(){
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const names={
    'aguedo felipe alvarado':'Águedo Felipe Alvarado',
    'buena vista':'Buena Vista',
    'catedral':'Catedral',
    'concepcion':'Concepción',
    'el cuji':'El Cují',
    'juan de villegas':'Guerrera Ana Soto (Juan de Villegas)',
    'juarez':'Juárez',
    'santa rosa':'Santa Rosa',
    'tamaca':'Tamaca',
    'union':'Unión'
  };

  function ringContains([x,y],ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }

  function polygonContains(point,rings){return Boolean(rings?.length&&ringContains(point,rings[0])&&!rings.slice(1).some(ring=>ringContains(point,ring)));}
  function geometryContains(geometry,point){
    if(!geometry)return false;
    if(geometry.type==='Polygon')return polygonContains(point,geometry.coordinates);
    if(geometry.type==='MultiPolygon')return geometry.coordinates.some(polygon=>polygonContains(point,polygon));
    return false;
  }

  function displayName(value){return names[normalize(value)]||String(value||'Parroquia').toLocaleLowerCase('es').replace(/(^|\s)\p{L}/gu,char=>char.toLocaleUpperCase('es'));}

  function prepare(geojson,listings){
    for(const feature of geojson.features||[]){
      const properties=feature.properties||{};
      properties.radarName=displayName(properties.parroquia);
      properties.radarListingIds=[];
    }
    for(const listing of listings||[]){
      const point=[Number(listing.lng),Number(listing.lat)];
      if(!point.every(Number.isFinite))continue;
      const feature=geojson.features.find(item=>geometryContains(item.geometry,point));
      if(!feature)continue;
      listing.parish=feature.properties.radarName;
      feature.properties.radarListingIds.push(String(listing.id));
    }
    for(const feature of geojson.features||[]){
      const ids=new Set(feature.properties.radarListingIds),items=listings.filter(item=>ids.has(String(item.id)));
      feature.properties.radarTotal=items.length;
      feature.properties.sale=items.filter(item=>item.operation==='venta').length;
      feature.properties.rent=items.filter(item=>item.operation==='alquiler').length;
    }
    return geojson;
  }

  window.RadarParishes={displayName,geometryContains,prepare,normalize};
})();
