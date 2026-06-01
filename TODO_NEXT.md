# TODO: Lanjutan Pekerjaan

## ✅ Data Buku SD (Selesai)
- [x] Buat folder `src/utils/data/books/sd/`
- [x] Buat 60 file JSON (10 mapel × 6 kelas)
  - Mapel: Matematika, Bahasa Indonesia, Pendidikan Pancasila, IPAS, PJOK, Seni Rupa, PAI, Bahasa Inggris, Bahasa Daerah, Prakarya
- [x] Update `src/utils/data/books/index.json` (60 entri SD)
- [x] Setiap bab lengkapi `sub_topics` + `key_terms`
- [x] Plotting semester (Ganjil/Genap)

## ✅ Data Buku SMA (Selesai)
- [x] Buat folder `src/utils/data/books/sma/`
- [x] Buat +42 file JSON (14 mapel × 3 kelas + Sejarah)
  - Wajib: Matematika, Bhs Indonesia, Bhs Inggris, PKN, PJOK, PAI
  - Peminatan MIPA: MTK Lanjut, Fisika, Kimia, Biologi
  - Peminatan IPS: Ekonomi, Geografi, Sosiologi
  - Lainnya: Sejarah
- [x] Update `index.json` (42 entri SMA)
- [x] Setiap bab lengkapi `sub_topics` + `key_terms`
- [x] Plotting semester

## ✅ Data Buku SMP (Tambahan)
- [x] Fix 4 buku Seni (sub_topics + key_terms) — `seni_rupa_7`, `seni_musik_7`, `seni_tari_7`, `seni_teater_7`
- [x] Fix 14 SMP files missing sub_topics + key_terms (PAI, Daerah, PJOK, Prakarya, Seni Rupa 8-9)
- [x] Fix 21 SMP files missing key_terms only (Indo, Informatika, Inggris, IPA, IPS, Matematika, PKN)
- [x] Tambah 15 file Agama varian (Kristen, Katolik, Hindu, Buddha, Khonghucu) — Kelas 7-9

## ✅ Audit & Perbaikan Sistem
- [x] Subject name normalization (`normalizeSubjectName` di `base.ts`) — 18+ alias
- [x] `findAutoMatchingBook` pakai normalized name
- [x] Rebuild `index.json` (total 156 entries: SD=60, SMP=54, SMA=42)
- [x] Hapus duplikasi index

## 🧪 Testing (Selesai)
- [x] Generate ATP untuk mapel SMP/ SD/ SMA
- [x] Generate RPP untuk mapel SMP
- [x] Generate Handout untuk mapel SMP
- [x] Verifikasi AI tidak keluar dari pagar sub_topics

---

## 🔴 Remaining (1 item — very low priority)
- [ ] Buku untuk `Pendidikan Kepercayaan terhadap Tuhan YME` — ada di BSKAP SMP tapi belum punya buku. Butuh konten expert untuk validitas.
  - Solusi sementara: `normalizeSubjectName()` bisa mapping ke `Pendidikan Agama Islam`? Tidak tepat secara teologis. Lebih baik dibuat buku terpisah jika ada permintaan.

---

**Semua selesai ✅ — ~100%**
