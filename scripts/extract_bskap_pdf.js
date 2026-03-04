// Script untuk mengekstrak teks dari PDF BSKAP 046/2025
// Menggunakan createRequire untuk import CommonJS module

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractPDF() {
    try {
        // Import pdf-parse menggunakan require
        const pdfParse = require('pdf-parse');

        const pdfPath = path.join(__dirname, 'Lampiran keputusan', 'Kepka_BSKAP_No_01k17e8396ajn15j3hcw0k773b.pdf');

        console.log('🚀 Memulai ekstraksi PDF...');
        console.log(`📄 File: ${pdfPath}`);
        console.log('⏳ Mohon tunggu, proses ini mungkin memakan waktu beberapa menit...\n');

        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);

        console.log(`\n✅ EKSTRAKSI BERHASIL!`);
        console.log(`   Total halaman: ${data.numpages}`);
        console.log(`   Total karakter: ${data.text.length.toLocaleString()}`);

        // Simpan ke file text
        const outputPath = path.join(__dirname, 'bskap_extracted.txt');
        fs.writeFileSync(outputPath, data.text, 'utf8');

        console.log(`\n📁 File berhasil disimpan di:`);
        console.log(`   ${outputPath}`);
        console.log('\n💡 Langkah selanjutnya:');
        console.log('   1. Buka file bskap_extracted.txt');
        console.log('   2. Gunakan Ctrl+F untuk mencari mata pelajaran');
        console.log('   3. Copy bagian yang relevan dan kirim ke chat\n');

        // Contoh: Cari bagian Matematika
        const searchTerms = ['matematika', 'bahasa indonesia', 'ipa', 'fase a', 'fase d'];
        console.log('📚 Mencari preview dari beberapa mata pelajaran...\n');

        for (const term of searchTerms) {
            const index = data.text.toLowerCase().indexOf(term);
            if (index !== -1) {
                const preview = data.text.substring(index, index + 200).replace(/\n/g, ' ').trim();
                console.log(`� "${term.toUpperCase()}" ditemukan di posisi ${index}:`);
                console.log(`   ${preview.substring(0, 150)}...`);
                console.log('');
            }
        }

        return data.text;
    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.code === 'ENOENT') {
            console.log('\n📁 File PDF tidak ditemukan. Pastikan path sudah benar.');
        } else if (error.message.includes('MODULE_NOT_FOUND')) {
            console.log('\n📦 Library pdf-parse belum terinstall. Jalankan:');
            console.log('   npm install pdf-parse');
        } else {
            console.error('Stack:', error.stack);
        }
    }
}

// Jalankan ekstraksi
console.log('════════════════════════════════════════════════');
console.log('  EKSTRAKSI PDF BSKAP 046/2025');
console.log('════════════════════════════════════════════════\n');

extractPDF().catch(console.error);
