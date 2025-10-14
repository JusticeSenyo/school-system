// src/setupProxy.js
/* eslint-disable @typescript-eslint/no-var-requires */
const { createProxyMiddleware } = require("http-proxy-middleware");

// Helpful for troubleshooting in the terminal
const COMMON_OPTS = {
  changeOrigin: true,
  secure: true,  // Oracle uses valid certs; if you ever hit TLS issues, set to false
  logLevel: "debug",
};

module.exports = function (app) {
  // Proxy Oracle ORDS through /api/ords -> https://.../ords
  app.use(
    "/api/ords",
    createProxyMiddleware({
      ...COMMON_OPTS,
      target: "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com",
      pathRewrite: { "^/api/ords": "/ords" },
      // Optional: ensure Host header is target’s host (some backends care)
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader(
          "Host",
          "gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com"
        );
      },
    })
  );

  // (Optional) local API if you have one running at :4000
  app.use(
    "/api",
    createProxyMiddleware({
      ...COMMON_OPTS,
      target: "http://localhost:4000",
    })
  );
};
