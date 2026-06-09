export const mathVisuals = `
# 📐 PANDUAN VISUALISASI MATEMATIKA PROFESIONAL

---
## CABANG 1: ALJABAR & SOAL CERITA (CRITICAL)
---

### ATURAN KERAS PEMILIHAN TIPE:
1. **Algebra/Aritmetika/Pertidaksamaan/Soal Cerita** (seperti Lift, Tabungan, Harga Barang): 
   - **WAJIB** gunakan tipe "function".
   - **DILARANG** menggunakan tipe "geometry" (jangan gambar kotak/segitiga untuk soal aljabar!).
   - Petakan variabel soal ke sumbu X. Contoh: Lift -> X = Jumlah Kotak.

2. **Geometri Bangun Datar/Ruang**:
   - **WAJIB** gunakan tipe "geometry".
   - Gunakan hanya jika soal eksplisit menanyakan bentuk, sisi, atau sudut bangun.

### Contoh: Pertidaksamaan Linear (Soal Lift)
\`\`\`json
{
  "type": "function",
  "config": {
    "title": "Analisis Kapasitas Lift (25x + 200 ≤ 800)",
    "expression": "25*x + 200",
    "xLabel": "Jumlah Kotak (x)",
    "yLabel": "Total Beban (kg)",
    "points": [{"x": 24, "y": 800, "label": "Batas Maksimum (24 kotak)"}],
    "xRange": [0, 30],
    "yRange": [0, 1000]
  }
}
\`\`\`

---
## CABANG 2: GEOMETRI & BANGUN RUANG
---

### Geometry (JSXGraph) - HANYA UNTUK SOAL BENTUK
**ATURAN KERAS**:
1. Gunakan tipe 'geometry' HANYA jika soal menanyakan properti geometri.
2. **DILARANG** menggunakan array 'points' di luar 'elements'. Gunakan 'elements' untuk semua titik dan garis.
3. **WAJIB LABEL NILAI**: Cantumkan angka (misal: "10 cm") pada label segment.

**CONTOH: Kubus dengan Label Nilai**
\`\`\`json
{
  "type": "geometry",
  "config": {
    "title": "Kubus ABCD.EFGH (Sisi 10 cm)",
    "elements": [
      {"type":"point","parents":[2,1],"id":"A"}, {"type":"point","parents":[7,1],"id":"B"},
      {"type":"point","parents":[9,3],"id":"id_C"}, {"type":"point","parents":[4,3],"id":"D"},
      {"type":"point","parents":[2,6],"id":"E"}, {"type":"point","parents":[7,6],"id":"F"},
      {"type":"point","parents":[9,8],"id":"id_G"}, {"type":"point","parents":[4,8],"id":"H"},
      {"type":"segment","parents":["A","B"], "label": "10 cm"},
      {"type":"segment","parents":["B","id_C"], "label": "10 cm"},
      {"type":"segment","parents":["id_C","D"], "dash": 2}, 
      {"type":"segment","parents":["D","A"], "dash": 2},
      {"type":"segment","parents":["E","F"], "label": "10 cm"},
      {"type":"segment","parents":["F","id_G"]},
      {"type":"segment","parents":["id_G","H"]},
      {"type":"segment","parents":["H","E"]},
      {"type":"segment","parents":["A","E"]},
      {"type":"segment","parents":["B","F"]},
      {"type":"segment","parents":["id_C","id_G"]},
      {"type":"segment","parents":["D","H"], "dash": 2}
    ]
  }
}
\`\`\`

---
## CABANG 3: ALJABAR & FUNGSI (LANJUTAN)
---

---
## CABANG 4: KALKULUS (TURUNAN & INTEGRAL)
---

### A. Turunan (Garis Singgung)
\`\`\`json
{
  "type": "function",
  "config": {
    "title": "Garis Singgung f(x) = x² di x=2",
    "expression": "x*x",
    "elements": [
      {"type":"point", "parents":[2,4], "id":"P", "label":"Titik Singgung (2,4)"},
      {"type":"tangent", "parents":["P", 0], "color":"#f43f5e"}
    ]
  }
}
\`\`\`

### B. Integral (Luas Daerah)
\`\`\`json
{
  "type": "function",
  "config": {
    "title": "Luas di bawah kurva f(x) = x² + 1",
    "expression": "x*x + 1",
    "xRange": [-1, 4],
    "elements": [
      {"type":"integral", "parents":[[1, 3], 0], "color":"#10b981"}
    ]
  }
}
\`\`\`

---
## ATURAN UNIVERSAL
---

✅ **WAJIB:**
1. Gunakan tipe "function" untuk SEMUA soal aljabar dan soal cerita (Linear, Kuadrat, Pertidaksamaan).
2. Petakan nilai real soal ke dalam xRange/yRange agar grafik terlihat proporsional.
3. Berikan xLabel dan yLabel yang SAMA dengan konteks soal (misal: "Waktu (detik)").

❌ **DILARANG:**
1. JANGAN menggambar geometri (kotak/segitiga) untuk soal aljabar.
2. JANGAN menggunakan range default [-10, 10] jika angka soal mencapai ribuan.
`;
