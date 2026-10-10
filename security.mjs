const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export function security(options = {}) {
  const configured = options.publicUrl ?? process.env.RADAR_PUBLIC_URL;
  let origin;
  if (configured) {
    const url = new URL(configured);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !(url.protocol === 'https:' || url.protocol === 'http:' && loopback.has(url.hostname))) {
      throw Error('RADAR_PUBLIC_URL debe ser un origen HTTPS (HTTP solo para localhost).');
    }
    origin = url.origin;
  }
  if (process.env.NODE_ENV === 'production' && !origin?.startsWith('https://')) {
    throw Error('Producción requiere RADAR_PUBLIC_URL con HTTPS.');
  }
  return {
    allows(req) {
      let expected = origin;
      if (!expected) {
        // Development only: bind the accepted Host to this server's loopback port.
        const host = req.headers.host;
        if (!host || !['localhost', '127.0.0.1', '[::1]'].some(h => host === `${h}:${req.socket.localPort}`)) return false;
        expected = `http://${host}`;
      }
      if (req.headers.origin && req.headers.origin !== expected) return false;
      // Cookie-authenticated browser writes require an explicit matching Origin.
      return ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.headers.origin === expected;
    },
    cookie(token = '') {
      return `radar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 86400 : 0}${origin?.startsWith('https://') ? '; Secure' : ''}`;
    }
  };
}
