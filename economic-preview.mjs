const signals = {
  'undp-macro-2026': {url:'https://www.undp.org/es/venezuela/publicaciones/desempeno-macroeconomico-de-venezuela-primer-semestre-de-2026',source:'PNUD Venezuela',sector:'Macroeconomía'},
  'grant-investment-2026': {url:'https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2026/hacer-negocios-en-venezuela-2026.pdf',source:'Grant Thornton Venezuela',sector:'Inversión'},
  'mppre-agreements-2026': {url:'https://mppre.gob.ve/publicacion/8447-venezuela-impulsa-105-acuerdos-estrategicos-y-estima-captar-12-mil-millones-de-dolares-en-financiamiento',source:'MPPRE',sector:'Infraestructura'},
  'ciged-fintech-2026': {url:'https://ciged.org/noticias',source:'CIGED',sector:'Tecnología'},
  'conapri-sectors': {url:'https://conapri.org/entorno/',source:'CONAPRI',sector:'Turismo y agricultura'}
};
const escapeXml=value=>String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
const fallback=signal=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500" viewBox="0 0 900 500"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#092746"/><stop offset="1" stop-color="#17638b"/></linearGradient><radialGradient id="r"><stop stop-color="#ffffff" stop-opacity=".18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="900" height="500" fill="url(#g)"/><circle cx="730" cy="130" r="230" fill="url(#r)"/><g fill="none" stroke="#fff" stroke-opacity=".16"><circle cx="730" cy="130" r="55"/><circle cx="730" cy="130" r="110"/><circle cx="730" cy="130" r="165"/></g><circle cx="730" cy="130" r="9" fill="#f2c53d"/><text x="60" y="315" fill="#f2c53d" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">${escapeXml(signal.sector.toUpperCase())}</text><text x="60" y="370" fill="#fff" font-family="Arial,sans-serif" font-size="40" font-weight="700">${escapeXml(signal.source)}</text><text x="60" y="420" fill="#bcd2e5" font-family="Arial,sans-serif" font-size="20">Radar económico · Venezuela</text></svg>`);

export function createEconomicPreviewService(fetchImpl=fetch,ttlMs=6*60*60*1000){
  const cache=new Map();
  return async function loadEconomicPreview(id,now=Date.now()){
    const signal=signals[id];if(!signal)return null;
    const saved=cache.get(id);if(saved&&now<saved.expiresAt)return saved.value;
    let value;
    try{
      const thumbnail='https://image.thum.io/get/width/900/crop/500/noanimate/'+signal.url;
      const response=await fetchImpl(thumbnail,{headers:{Accept:'image/avif,image/webp,image/png,image/jpeg'},signal:AbortSignal.timeout(20000)});
      const type=String(response.headers.get('content-type')||'').split(';')[0];
      if(!response.ok||!['image/png','image/jpeg','image/webp','image/avif'].includes(type))throw Error('Miniatura no disponible');
      const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length||buffer.length>3_000_000)throw Error('Miniatura inválida');
      value={buffer,contentType:type,fallback:false};
    }catch{value={buffer:fallback(signal),contentType:'image/svg+xml',fallback:true};}
    cache.set(id,{value,expiresAt:now+ttlMs});return value;
  };
}
