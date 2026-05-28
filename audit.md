# Audit Detail

## Perubahan yang Diterapkan
- Menambahkan import `indonesianHolidays` ke **AnalisisKelasPage.tsx** dan **AbsensiPage.tsx**.
- Menerapkan logika filtrasi hari libur:
  - Pada **AnalisisKelasPage** perhitungan kehadiran kini mengecualikan tanggal yang ada di `indonesianHolidays`.
  - Pada **AbsensiPage** dicek lebih awal agar tidak memuat atau menyimpan kehadiran pada tanggal libur.
- Memperbarui rutinitas penyimpanan kehadiran untuk menolak penyimpanan pada hari libur dengan toast error.
- Menyesuaikan import untuk menyertakan `indonesianHolidays` dari `src/utils/holidayData`.

## Dampak
- Statistik kehadiran (analisis kelas, rekap, dasbor) tidak lagi menghitung hari libur, memperbaiki persentase kehadiran yang berlebih selama periode libur.
- UI akan mengosongkan tampilan kehadiran pada hari libur, mencegah entri data yang tidak disengaja.
- Tidak ada regresi fungsional yang diharapkan; hanya penambahan pengecekan libur.

## File yang Diubah
- `src/pages/AnalisisKelasPage.tsx` (import & filter statistik)
- `src/pages/AbsensiPage.tsx` (import, guard libur awal, guard penyimpanan libur)

## Langkah Verifikasi
1. Buka tanggal libur (mis., `2025-01-01`).
2. Buka halaman **Absensi** – seharusnya tidak ada jadwal aktif, daftar siswa kosong, dan tidak ada bidang kehadiran.
3. Buat laporan **Analisis Kelas** – persentase kehadiran harus mengabaikan libur.
4. Pastikan toast muncul saat mencoba menyimpan kehadiran pada hari libur.

Semua perubahan mengikuti gaya kode yang ada dan tidak mengubah logika bisnis selain pengecualian hari libur.
