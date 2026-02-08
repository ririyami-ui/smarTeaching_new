import fs from 'fs';

const bskapTxtPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/bskap_extracted.txt';

function debugHeaders() {
    const content = fs.readFileSync(bskapTxtPath, 'utf8');
    const lines = content.split(/\r?\n/);
    console.log(`Analyzing ${lines.length} lines...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/CAPAIAN PEMBELAJARAN/i)) {
            console.log(`Line ${i + 1}: ${line}`);
            // Print next 2 lines as well
            if (lines[i + 1]) console.log(`  Next1: ${lines[i + 1].trim()}`);
            if (lines[i + 2]) console.log(`  Next2: ${lines[i + 2].trim()}`);
        }
    }
}

debugHeaders();
