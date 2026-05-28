const fs = require('fs');
const c = fs.readFileSync('src/utils/ai/asistenGuruService.ts','utf8');
console.log('Length:', c.length);
