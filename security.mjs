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
  const formConfigured = options.formOrigin ?? process.env.RADAR_FORM_ORIGIN;
  let formOrigin;
  if (formConfigured) {
    const url = new URL(formConfigured);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.protocol !== 'https:') {
      throw Error('RADAR_FORM_ORIGIN debe ser un origen HTTPS sin ruta.');
    }
    formOrigin = url.origin;
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
    allowsFormOrigin(req) {
      return Boolean(formOrigin && req.headers.origin === formOrigin);
    },
    applyFormCors(req, res) {
      if (!this.allowsFormOrigin(req)) return false;
      res.setHeader('Access-Control-Allow-Origin', formOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Vary', 'Origin');
      return true;
    },
    cookie(token = '') {
      return `radar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 86400 : 0}${origin?.startsWith('https://') ? '; Secure' : ''}`;
    }
  };
}
