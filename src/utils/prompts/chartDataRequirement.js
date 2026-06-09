/**
 * CHART DATA REQUIREMENT - Mandatory Completeness Rule
 * Fixes empty chart visualizations by enforcing complete data arrays
 */

export const chartDataRequirement = `
**⚠️ MANDATORY DATA REQUIREMENT (HARGA MATI):**

Visualisasi chart HARUS memiliki data yang lengkap dan IDENTIK dengan angka di teks soal.

1. **Data Array HARUS Diisi Lengkap**:
   - Jika soal menyebutkan: "Senin: 20, Selasa: 35, Rabu: 30, Kamis: 25, Jumat: 40"
   - Maka data array HARUS: [{"x": "Senin", "y": 20}, {"x": "Selasa", "y": 35}, {"x": "Rabu", "y": 30}, {"x": "Kamis", "y": 25}, {"x": "Jumat", "y": 40}]
   
2. **Format WAJIB untuk Chart Type**:
   \`\`\`json
   {
     "type": "chart",
     "config": {
       "type": "bar",
       "title": "Judul Grafik (bukan formula, bukan jawaban)",
       "xLabel": "Label X Axis",
       "yLabel": "Label Y Axis",
       "data": [
         {"x": "Label 1", "y": 20},
         {"x": "Label 2", "y": 35},
         {"x": "Label 3", "y": 30}
       ]
     }
   }
   \`\`\`

3. **DILARANG KERAS**:
   ❌ Buat data array kosong []
   ❌ Buat config tanpa "data" property
   ❌ Omit angka karena takut bocor jawaban (jika angka ada di soal, HARUS ada di visualization)
   ❌ Ubah urutan atau nama label dari soal original
   
4. **Kapan TIDAK Buat Chart**:
   ✓ Kalau soal tidak punya data numerik = set visualization: null
   ✓ Kalau soal tentang skala/peta = set visualization: null
   ✓ Kalau soal tentang konversi satuan = set visualization: null
   
5. **Data Synchronization Examples**:
   
   SOAL: "Grafik menunjukkan penjualan buku: Januari 50, Februari 75, Maret 60"
   ✅ BENAR:
   {
     "type": "chart",
     "config": {
       "type": "bar",
       "title": "Penjualan Buku per Bulan",
       "xLabel": "Bulan",
       "yLabel": "Jumlah Buku",
       "data": [
         {"x": "Januari", "y": 50},
         {"x": "Februari", "y": 75},
         {"x": "Maret", "y": 60}
       ]
     }
   }
   
   ❌ SALAH (EMPTY DATA):
   {
     "type": "chart",
     "config": {
       "type": "bar",
       "title": "Penjualan Buku per Bulan",
       "data": []  ← KOSONG! INI KESALAHAN!
     }
   }
`;

export function validateChartData(visualization) {
  if (!visualization || visualization.type !== 'chart') {
    return { valid: true, reason: 'Not a chart' };
  }
  
  const config = visualization.config;
  if (!config) {
    return { valid: false, error: 'Chart config missing' };
  }
  
  const data = config.data;
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Data must be an array' };
  }
  
  if (data.length === 0) {
    return { valid: false, error: 'Chart data array is EMPTY - must contain data from question' };
  }
  
  // Check data structure
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    if (!point.hasOwnProperty('x') || !point.hasOwnProperty('y')) {
      return { valid: false, error: `Data point ${i} missing 'x' or 'y' property` };
    }
  }
  
  return { valid: true, reason: 'Chart data is complete and valid' };
}
