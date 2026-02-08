const fs = require('fs');
const path = require('path');

const bskapTxtPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/bskap_extracted.txt';

try {
    console.log('Testing access to:', bskapTxtPath);
    const stats = fs.statSync(bskapTxtPath);
    console.log('File size:', stats.size);
    const head = fs.readFileSync(bskapTxtPath, { encoding: 'utf8', flag: 'r' }).substring(0, 100);
    console.log('File head:', head);
} catch (err) {
    console.error('Test failed:', err);
}
