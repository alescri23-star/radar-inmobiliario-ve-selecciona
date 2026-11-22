import {defaultEconomicSignals} from './economic-signals.mjs';
const signals=Object.fromEntries(defaultEconomicSignals.map(signal=>[signal.id,signal]));
const escapeXml=value=>String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
const palettes=[['#082a4d','#18779c','#f2c53d'],['#30145f','#8b42c5','#e8b9ff'],['#4b2505','#bd6418','#ffd06c'],['#073e36','#16856d','#79e2bd'],['#4c1324','#b13f5d','#ff9bb0'],['#102d52','#315fb6','#9bc8ff']];
const paletteFor=signal=>palettes[[...String(signal.id)].reduce((sum,char)=>sum+char.charCodeAt(0),0)%palettes.length];
const fallback=signal=>{const [dark,light,accent]=paletteFor(signal);return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500" viewBox="0 0 900 500"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient><radialGradient id="r"><stop stop-color="${accent}" stop-opacity=".35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="900" height="500" fill="url(#g)"/><circle cx="730" cy="130" r="250" fill="url(#r)"/><g fill="none" stroke="#fff" stroke-opacity=".15"><circle cx="730" cy="130" r="55"/><circle cx="730" cy="130" r="110"/><circle cx="730" cy="130" r="165"/><path d="M0 110C170 20 280 230 445 125S710 15 900 120"/></g><circle cx="730" cy="130" r="9" fill="${accent}"/><text x="60" y="315" fill="${accent}" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">${escapeXml(signal.sector.toUpperCase())}</text><text x="60" y="370" fill="#fff" font-family="Arial,sans-serif" font-size="40" font-weight="700">${escapeXml(signal.source)}</text><text x="60" y="420" fill="#fff" fill-opacity=".72" font-family="Arial,sans-serif" font-size="20">Radar económico · Venezuela</text></svg>`);};

export function createEconomicPreviewService(fetchImpl=fetch,ttlMs=6*60*60*1000,fallbackTtlMs=10*60*1000){
  const cache=new Map();
  return async function loadEconomicPreview(signalOrId,now=Date.now()){
    const signal=typeof signalOrId==='string'?signals[signalOrId]:signalOrId;if(!signal?.id||!signal?.url)return null;
    const cacheKey=signal.id+':'+signal.url, saved=cache.get(cacheKey);if(saved&&now<saved.expiresAt)return saved.value;
    let value;
    try{
      const thumbnail='https://image.thum.io/get/width/900/crop/500/noanimate/'+signal.url;
      const response=await fetchImpl(thumbnail,{headers:{Accept:'image/avif,image/webp,image/png,image/jpeg'},signal:AbortSignal.timeout(20000)});
      const type=String(response.headers.get('content-type')||'').split(';')[0];
      if(!response.ok||!['image/png','image/jpeg','image/webp','image/avif'].includes(type))throw Error('Miniatura no disponible');
      const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length||buffer.length>3_000_000)throw Error('Miniatura inválida');
      value={buffer,contentType:type,fallback:false};
    }catch{value={buffer:fallback(signal),contentType:'image/svg+xml',fallback:true};}
    cache.set(cacheKey,{value,expiresAt:now+(value.fallback?fallbackTtlMs:ttlMs)});return value;
  };
}
