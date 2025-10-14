// src/utils/logger.js
const ENABLED = process.env.REACT_APP_DEBUG === '1'; // turn on only when you need it

export const log   = (...args) => { if (ENABLED) console.log(...args); };
export const info  = (...args) => { if (ENABLED) console.info(...args); };
export const debug = (...args) => { if (ENABLED) console.debug(...args); };
export const warn  = (...args) => { if (ENABLED) console.warn(...args); };
// keep errors visible in dev/prod:
export const error = (...args) => console.error(...args);
