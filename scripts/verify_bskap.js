
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'utils', 'bskap_2025_intel.json');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    console.log('Subjects Keys:', Object.keys(json.subjects));

    if (json.subjects.SMA) {
        console.log('SMA Keys:', Object.keys(json.subjects.SMA));
        // Check if there is grade 10
        if (json.subjects.SMA['10']) {
            console.log('SMA 10 Subjects:', Object.keys(json.subjects.SMA['10']));
        }
    }

    if (json.subjects.SMP) {
        console.log('SMP Keys:', Object.keys(json.subjects.SMP));
    }

} catch (err) {
    console.error('Error:', err);
}
