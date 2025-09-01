const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/ords',
    createProxyMiddleware({
      target: 'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/api/ords': '/ords' },
    })
  );
};
