// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // 1) Proxy for Oracle APEX/ORDS (external)
  app.use(
    '/api/ords',
    createProxyMiddleware({
      target: 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/api/ords': '/ords' },
    })
  );

  // 2) Proxy for your local Express API (send-email, etc.)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
    })
  );
};
