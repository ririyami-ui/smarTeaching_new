# 🏗️ Blueprint Pengembangan: Manajemen Data Berkelanjutan & Kenaikan Kelas

Dokumen ini merinci teknis dan rencana taktis untuk mengimplementasikan fitur **Kenaikan Kelas** dan **Arsip Data Multi-Semester** pada Smart Teaching.

---

## 1. Visi Utama
Menjadikan Smart Teaching sebagai database sekolah yang "abadi" (long-term), di mana setiap rekam jejak siswa tersimpan rapi dari tahun ke tahun tanpa mengganggu kinerja harian guru.

---

## 2. Arsitektur Data Berkelanjutan (Multi-Semester)

### A. Mekanisme Penyimpanan
Semua data (Absensi, Nilai, Jurnal, Tugas) akan tetap menggunakan filter `semester` dan `academicYear` yang saat ini sudah ada.
- **Data Historis**: Data tidak dihapus saat Tahun Ajaran berakhir.
- **Indexing**: Optimasi index Firestore agar pencarian data tahun-tahun sebelumnya tetap instan.

### B. Fitur "Time Machine" (Baru)
Fitur yang memungkinkan guru untuk "melihat ke belakang" tanpa mengganti setting global.
- **UI Element**: Tombol "Lihat Arsip" di setiap halaman Rekapitulasi.
- **Fungsionalitas**: Membuka modal yang menampilkan data berdasarkan filter Tahun Ajaran lampau.

---

## 3. Sistem Kenaikan Kelas Otomatis (Auto-Promote)

Fitur ini dirancang untuk mempermudah transisi Tahun Ajaran Baru.

### A. Algoritma Kenaikan Kelas
| Asal Kelas | Status Baru | Tindakan Sistem |
| :--- | :--- | :--- |
| Kelas 7 | Kelas 8 | Update `rombel` siswa, reset data absen/nilai untuk tahun baru. |
| Kelas 8 | Kelas 9 | Update `rombel` siswa, reset data absen/nilai untuk tahun baru. |
| Kelas 9 | **Lulus/Alumni** | Ubah status `isActive` menjadi `false`, pindah ke kategori Alumni. |

### B. Alur Kerja (Workflow)
1. **Verifikasi**: Guru memilih menu "Proses Kenaikan Kelas".
2. **Pemetaan (Mapping)**: Sistem menampilkan daftar siswa dan tujuan kelas barunya (bisa diubah manual jika ada siswa yang tinggal kelas).
3. **Eksekusi**: Sistem melakukan pembaruan massal pada database `students`.
4. **Log**: Menyimpan riwayat perubahan kelas siswa sebagai arsip.

---

## 4. Efisiensi Input Data Baru
Guru hanya perlu fokus pada satu rute input:
- **Siswa Baru**: Upload Excel khusus untuk Kelas 7 saja.
- **Siswa Lama**: Sudah otomatis dipindahkan kelasnya oleh sistem dari proses Kenaikan Kelas di atas.

---

## 5. Roadmap Implementasi

### 📅 Fase A: Persiapan (Target: Q2 2026)
- [ ] Penambahan properti `status` (Aktif/Lulus/Pindah) pada koleksi `students`.
- [ ] Pembuatan UI sederhana untuk pemilihan "Arsip Tahun Ajaran" di halaman Rekapitulasi.

### 📅 Fase B: Core Logic (Target: Q3 2026 - Awal Tahun Ajaran Baru)
- [ ] Pengembangan modul "Kenaikan Kelas" di bawah menu Master Data.
- [ ] Implementasi validasi untuk mencegah data duplikat saat proses promosi.
- [ ] Fitur "Lulus Massal" untuk kelas tingkat akhir.

### 📅 Fase C: Integrasi Alumni (Target: Q4 2026)
- [ ] Modul pencarian Alumni untuk me-review rekam jejak siswa yang sudah lulus.
- [ ] Export Ijazah/Rapor manual dari data historis yang tersimpan.

---
*Dokumen ini merupakan bagian dari perencanaan strategis Smart Teaching untuk efisiensi administrasi sekolah tingkat lanjut.*
