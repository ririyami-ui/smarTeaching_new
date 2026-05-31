# BLUEPRINT: Fitur Referensi Buku Kurikulum Merdeka (Digital Library Content)

## 1. Pendahuluan
Fitur ini bertujuan untuk menyediakan basis data materi pokok dari buku teks resmi Kemdikbud sebagai pendamping data CP/TP (BSKAP) yang sudah ada. Guru dapat membuat ATP, RPP, dan Soal secara lebih presisi dengan referensi bab dan halaman buku yang nyata.

## 2. Arsitektur Data (Partitioning Strategy)
Untuk menghindari file JSON raksasa yang merusak performa aplikasi, data akan dipecah secara hierarkis:

### A. File Index (`src/utils/data/books/index.json`)
Berisi metadata singkat untuk pencarian awal.
```json
[
  {
    "id": "smp-inf-7",
    "jenjang": "SMP",
    "mapel": "Informatika",
    "kelas": "7",
    "title": "Informatika Kelas VII (Kurikulum Merdeka)",
    "path": "./smp/informatika_7.json"
  }
]
```

### B. File Detail (`src/utils/data/books/smp/informatika_7.json`)
Hanya memuat konten spesifik satu buku.
```json
{
  "bookId": "smp-inf-7",
  "isbn": "978-602-244-503-6",
  "chapters": [
    {
      "no": 1,
      "title": "Berpikir Komputasional",
      "pages": "23-44",
      "sub_topics": ["Algoritma", "Optimasi", "Representasi Data"],
      "key_terms": ["Abstraksi", "Dekomposisi"],
      "cp_mapping": ["E1"]
    }
  ]
}
```

## 3. Strategi Implementasi Teknis

### Tahap 1: Struktur Folder
Buat folder `src/utils/data/books/` dengan sub-folder `sd/`, `smp/`, `sma/`.

### Tahap 2: Dynamic Loading (Lazy Load)
Gunakan fungsi `import()` dinamis agar data tidak masuk ke bundle utama:
```typescript
const loadBookData = async (path: string) => {
  const data = await import(`./books/${path}`);
  return data.default;
};
```

### Tahap 3: AI Integration
Gunakan Gemini untuk mengisi detail konten. Alurnya:
1. Guru pilih Mapel & Kelas.
2. App load JSON Bab Buku (Kecil).
3. Guru pilih Bab 1.
4. AI membuat draft RPP/Soal dengan prompt: *"Berdasarkan Bab 1: Berpikir Komputasional (halaman 23-44) dari Buku Informatika Kelas 7, buatkan kuis 10 soal..."*

## 4. Keunggulan Produksi
- **Ringan**: User hanya men-download data yang mereka ajar.
- **Scalable**: Bisa menampung ribuan buku tanpa memperlambat aplikasi.
- **Reliable**: Data tetap akurat karena bersumber dari buku teks resmi.

## 5. Daftar Tugas (To-Do List)
- [ ] Buat struktur folder data buku.
- [ ] Scrape/Input data Bab untuk 5 Mapel Utama (Indo, Mat, IPA, IPS, Infor).
- [ ] Integrasikan `BookSelector` di halaman `HandoutGeneratorPage` & `QuizGeneratorPage`.
- [ ] Update Prompt AI agar merujuk pada nomor halaman buku.

---
**Catatan:** Simpan file ini sebagai `BLUEPRINT_PENGEMBANGAN_DATA.md` di root folder project.
