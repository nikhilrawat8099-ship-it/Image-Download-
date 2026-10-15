import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const gi = require('google-imgs');
console.log(gi);
gi.searchImage('cyberpunk').then(x => console.log(x.slice(0, 3))).catch(console.error);
