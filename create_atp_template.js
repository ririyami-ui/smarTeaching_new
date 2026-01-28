const XLSX = require('xlsx');

// Create workbook
const wb = XLSX.utils.book_new();

// Sample data with headers
const data = [
    ["No", "Elemen", "Lingkup Materi", "Tujuan Pembelajaran", "JP", "Profil Lulusan"],
    [1, "Bilangan", "Bilangan Bulat", "Melalui diskusi kelompok, peserta didik dapat menganalisis operasi bilangan bulat dengan tepat.", 6, "Penalaran Kritis"],
    [2, "Aljabar", "Persamaan Linear", "Peserta didik dapat menyelesaikan persamaan linear satu variabel melalui latihan soal secara mandiri.", 8, "Kemandirian, Penalaran Kritis"],
    [3, "Geometri", "Bangun Datar", "Peserta didik mampu menghitung luas dan keliling bangun datar melalui praktik pengukuran.", 6, "Kreativitas, Kolaborasi"],
    ["", "", "", "Tambahkan baris ATP Anda di bawah ini...", "", ""]
];

// Create worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = [
    { wch: 5 },   // No
    { wch: 20 },  // Elemen
    { wch: 25 },  // Lingkup Materi
    { wch: 60 },  // Tujuan Pembelajaran
    { wch: 8 },   // JP
    { wch: 30 }   // Profil Lulusan
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "ATP");

// Write file
XLSX.writeFile(wb, './template/template_ATP.xlsx');

console.log('Template ATP berhasil dibuat!');
