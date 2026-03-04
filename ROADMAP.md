# Roadmap Pengembangan Aplikasi Smart Teaching 🚀
*Versi Dokumen: 2026.1*

Dokumen ini merinci rencana pengembangan strategis untuk **Smart Teaching**, mengubahnya dari sekadar alat administrasi menjadi ekosistem pendidikan cerdas yang lengkap.

---

## 🏁 Fase 1: Fondasi & Stabilitas (Q1 2026 - Saat Ini)
**Fokus Utama:** Integritas Data, Perbaikan UX, dan Stabilitas Core Features.

### ✅ Selesai / On-Going
- [x] **Manajemen Kurikulum**: Generator ATP/Prota/Promes berbasis AI dengan validasi lini masa (timeline).
- [x] **Administrasi Kelas**: Absensi, Jurnal Mengajar, dan Sistem Poin Pelanggaran.
- [x] **Analisis Data**: Early Warning System untuk mendeteksi siswa berisiko & Laporan Analisis Kelas.
- [x] **Perbaikan Core**: Pemisahan data Pekan Efektif per jenjang kelas.
- [x] **Generator Konten**: RPP, LKPD, Bahan Ajar, dan Kuis berbasis AI Gemini.

### 🚧 Dalam Pengerjaan
- [ ] Stabilisasi fitur Export dokumen (PDF/Word) agar layout konsisten di berbagai perangkat.
- [ ] Optimasi performa database Firestore untuk memuat data kelas besar dengan lebih cepat.
- [ ] Dokumentasi lengkap (User Guide) yang terintegrasi di dalam aplikasi.

---

## 🚀 Fase 2: Deep AI & Personalisasi (Q2 2026)
**Fokus Utama:** Meningkatkan kecerdasan AI dari "Generatif" menjadi "Analitis & Adaptif".

### Fitur Baru
1.  **AI Auto-Grading (Essay)**
    - Guru memfoto jawaban esai siswa, AI memberikan nilai dan saran perbaikan berdasarkan rubrik.
2.  **Rekomendasi Pembelajaran Adaptif (Remedial & Pengayaan)**
    - Sistem otomatis menyarankan materi remedial untuk siswa dengan nilai di bawah KKM.
    - Generator soal latihan yang disesuaikan dengan tingkat pemahaman per siswa.
3.  **Voice-to-Admin**
    - Input jurnal mengajar atau catatan perilaku hanya dengan perintah suara (Voice Note) saat di kelas, AI yang mengetik dan merapikan bahasanya.
4.  **Bank Soal Pintar**
    - Menyimpan soal-soal ujan sebelumnya dan memungkinkan AI merakit ulang paket soal baru dari arsip soal lama + soal baru.

---

## 🌐 Fase 3: Kolaborasi & Ekosistem (Q3 2026)
**Fokus Utama:** Membuka akses untuk Siswa dan Orang Tua.

### Fitur Baru
1.  **Portal Siswa (Student Dashboard)**
    - Siswa bisa login untuk melihat nilai, tugas, dan poin pelanggaran mereka sendiri.
    - Mengerjakan Kuis/Ujian CBT (Computer Based Test) langsung di aplikasi.
2.  **Portal Orang Tua (Parent Connect)**
    - Notifikasi WhatsApp otomatis yang lebih personal (real-time) saat siswa absen atau mendapat pelanggaran.
    - Laporan perkembangan anak mingguan via PDF otomatis ke WA orang tua.
3.  **Kolaborasi Guru Team Teaching**
    - Fitur "Shared Class" di mana beberapa guru bisa mengelola satu kelas secara bersamaan (misal: Guru Mapel & Wali Kelas).

---

## 📱 Fase 4: Mobilitas & Skala (Q4 2026 & Beyond)
**Fokus Utama:** Aksesibilitas di mana saja dan skalabilitas sekolah besar.

### Fitur Baru
1.  **Mobile App (Android/iOS)**
    - Pengembangan aplikasi native untuk akses lebih cepat dan notifikasi push.
2.  **Offline Mode (PWA)**
    - Memungkinkan input absensi dan jurnal tetap berjalan meskipun internet mati, sinkronisasi otomatis saat online kembali.
3.  **Manajemen Aset & Keuangan Sederhana**
    - Modul tambahan untuk inventaris kelas dan uang kas kelas.
4.  **Integrasi Dapodik**
    - (Eksplorasi) Sinkronisasi data siswa dasar dengan format Excel Dapodik untuk memudahkan administrasi sekolah.
5.  **Manajemen Kenaikan Kelas & Arsip Multi-Semester**
    - Fitur otomatisasi pindah kelas dan pelulusan siswa masal.
    - Akses data historis (Time Machine) tanpa mengubah setting global.
    - *Lihat rincian di [BLUEPRINT_PENGEMBANGAN_DATA.md](./BLUEPRINT_PENGEMBANGAN_DATA.md)*
6.  **Semester Portfolio & Academic Audit Generator**
    - Pembuatan laporan rekapitulasi 1 semester dengan desain premium & analisis SWOT berbasis AI.
    - Otomatisasi 6 Bab laporan untuk pengembangan PKB Guru.
    - *Lihat rincian di [BLUEPRINT_SEMESTER_PORTFOLIO.md](./BLUEPRINT_SEMESTER_PORTFOLIO.md)*

---

## 🛠️ Tech Stack Upgrade Plan
- **Backend**: Migrasi fungsi berat (AI analysis) ke Cloud Functions untuk mengurangi beban client.
- **Frontend**: Implementasi Virtual Scrolling untuk tabel dengan ribuan baris data.
- **Security**: Audit keamanan data siswa dan implementasi Role Based Access Control (RBAC) yang lebih granular (Admin, Kepsek, Guru, Staff).
