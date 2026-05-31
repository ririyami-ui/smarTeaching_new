# Rencana Perbaikan Kurikulum SMP - Integrasi Referensi Buku Kemendikbud

**Status:** Draft  
**Dibuat:** 30 Mei 2026  
**Target Selesai:** 30 Juni 2026  

---

## 📋 RINGKASAN EKSEKUTIF

File `Kur SMP.json` berisi struktur kurikulum Merdeka BSKAP 2025 untuk SMP (Kelas 7-9) yang sudah komprehensif tetapi **belum terhubung dengan referensi buku teks resmi Kemendikbud**. Perbaikan ini bertujuan meningkatkan akurasi RPP, modul, dan ATP dengan menambahkan mapping ke buku teks resmi.

---

## 🎯 TUJUAN PERBAIKAN

- [ ] Menambahkan referensi buku teks resmi Kemendikbud ke setiap materi
- [ ] Memperjelas Capaian Pembelajaran (CP) dengan indikator spesifik
- [ ] Membuat Alur Tujuan Pembelajaran (ATP) terstruktur per minggu
- [ ] Meningkatkan akurasi RPP/modul yang dihasilkan sistem
- [ ] Memvalidasi kedalaman konten (LOTS/MOTS/HOTS)

---

## 📊 ANALISIS MASALAH SAAT INI

### Masalah Identifikasi

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| 1 | CP Snippets duplikat/generic | RPP tidak akurat | 🔴 Tinggi |
| 2 | Materi inti terlalu ringkas | Tidak ada detail topik | 🔴 Tinggi |
| 3 | Tidak ada mapping buku teks | Modul tidak terstruktur | 🔴 Tinggi |
| 4 | Kedalaman konten tidak jelas | ATP tidak tervalidasi | 🟡 Sedang |
| 5 | Indikator pencapaian vague | Asesmen tidak tepat | 🟡 Sedang |

---

## 🔧 SOLUSI & IMPLEMENTASI

### Fase 1: Pengumpulan Data Referensi Buku (1-2 minggu)

**Tujuan:** Mengumpulkan informasi lengkap buku teks resmi Kemendikbud

#### Checklist Pengumpulan Data

**Sumber Data Utama:**
- [ ] Akses Pusat Perbukuan Kemendikbud (pusatperbukuan.kemdikbud.go.id)
- [ ] Download katalog buku teks Kurikulum Merdeka
- [ ] Kumpulkan metadata buku (ISBN, penerbit, bab, halaman)
- [ ] Dokumentasikan CP resmi per mata pelajaran
- [ ] Kumpulkan ATP template dari Kemendikbud

**Mata Pelajaran Prioritas 1 (Minggu 1):**
- [ ] Matematika SMP Kelas 7, 8, 9
- [ ] Bahasa Indonesia SMP Kelas 7, 8, 9
- [ ] IPA SMP Kelas 7, 8, 9

**Mata Pelajaran Prioritas 2 (Minggu 2):**
- [ ] IPS SMP Kelas 7, 8, 9
- [ ] Informatika SMP Kelas 7, 8, 9
- [ ] Pendidikan Pancasila SMP Kelas 7, 8, 9

**Mata Pelajaran Prioritas 3 (Minggu 2):**
- [ ] Bahasa Inggris SMP Kelas 7, 8, 9
- [ ] PJOK SMP Kelas 7, 8, 9
- [ ] Pendidikan Agama Islam SMP Kelas 7, 8, 9
- [ ] Seni Rupa SMP Kelas 7, 8, 9
- [ ] Bahasa Daerah SMP Kelas 7, 8, 9
- [ ] Prakarya SMP Kelas 7, 8, 9

**Sumber Alternatif (jika resmi tidak tersedia):**
- [ ] GitHub Kemendikbud (github.com/kemdikbud)
- [ ] Panduan guru dari penerbit resmi
- [ ] Dokumen ATP dari sekolah pilot Kurikulum Merdeka
- [ ] Forum guru resmi Kemendikbud

---

### Fase 2: Desain Struktur Data Baru (1 minggu)

**Tujuan:** Merancang format JSON yang lebih detail dan akurat

#### Checklist Desain

**Struktur Data:**
- [ ] Buat template JSON baru dengan field tambahan
- [ ] Definisikan schema untuk buku_referensi
- [ ] Definisikan schema untuk cp_detail
- [ ] Definisikan schema untuk atp_mapping
- [ ] Definisikan schema untuk indikator_pencapaian
- [ ] Definisikan schema untuk level_kognitif (LOTS/MOTS/HOTS)

**Contoh Struktur Baru:**
```json
{
  "subject": "Matematika",
  "grade": 7,
  "semester": "ganjil",
  "elemen": "Bilangan",
  "materi_inti": [
    {
      "topik": "Bilangan Bulat",
      "subtopik": [
        "Operasi Penjumlahan & Pengurangan",
        "Operasi Perkalian & Pembagian",
        "Sifat-sifat Operasi"
      ]
    }
  ],
  "buku_referensi": {
    "judul": "Matematika SMP Kelas 7",
    "penerbit": "Kemendikbud",
    "isbn": "978-602-427-xxx-x",
    "tahun": 2024,
    "bab": [
      {
        "nomor": 1,
        "judul": "Bilangan Bulat",
        "halaman_awal": 1,
        "halaman_akhir": 45,
        "durasi_jam": 12
      }
    ]
  },
  "cp_detail": {
    "elemen": "Bilangan",
    "capaian_pembelajaran": "Membaca, menulis, dan membandingkan bilangan bulat...",
    "indikator": [
      "Siswa dapat membaca bilangan bulat positif dan negatif",
      "Siswa dapat melakukan operasi penjumlahan bilangan bulat",
      "Siswa dapat menyelesaikan masalah kontekstual dengan bilangan bulat"
    ],
    "level_kognitif": ["LOTS", "MOTS", "HOTS"]
  },
  "atp_mapping": [
    {
      "minggu": 1,
      "tujuan_pembelajaran": "Memahami konsep bilangan bulat",
      "alokasi_jam": 4,
      "topik": "Pengenalan Bilangan Bulat",
      "aktivitas": "Eksplorasi, Diskusi, Latihan"
    }
  ]
}
```

**Validasi Struktur:**
- [ ] Test parsing JSON
- [ ] Validasi terhadap schema
- [ ] Cek backward compatibility dengan Kur SMP.json lama
- [ ] Dokumentasikan perubahan struktur

---

### Fase 3: Validasi & Penyesuaian Konten (2 minggu)

**Tujuan:** Memastikan konten akurat sesuai buku teks resmi

#### Checklist Validasi

**Per Mata Pelajaran:**

**Matematika:**
- [ ] Validasi urutan materi dengan buku teks
- [ ] Sesuaikan topik/subtopik dengan bab buku
- [ ] Tambahkan indikator pencapaian spesifik
- [ ] Tentukan level kognitif per topik
- [ ] Cross-check dengan CP resmi Kemendikbud
- [ ] Verifikasi alokasi jam pembelajaran

**Bahasa Indonesia:**
- [ ] Validasi jenis teks yang diajarkan
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan contoh teks dari buku
- [ ] Tentukan level kognitif per jenis teks
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**IPA:**
- [ ] Validasi konsep sains per bab
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan praktik/eksperimen dari buku
- [ ] Tentukan level kognitif per konsep
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**IPS:**
- [ ] Validasi konten geografis/sejarah/sosial
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan studi kasus dari buku
- [ ] Tentukan level kognitif per topik
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Informatika:**
- [ ] Validasi konsep komputasi
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan praktik coding dari buku
- [ ] Tentukan level kognitif per konsep
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Pendidikan Pancasila:**
- [ ] Validasi nilai-nilai Pancasila
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan contoh penerapan dari buku
- [ ] Tentukan level kognitif per nilai
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Bahasa Inggris:**
- [ ] Validasi jenis teks/fungsi bahasa
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan vocabulary/grammar dari buku
- [ ] Tentukan level kognitif per skill
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**PJOK:**
- [ ] Validasi jenis olahraga/aktivitas
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan teknik dari buku
- [ ] Tentukan level kognitif per aktivitas
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Pendidikan Agama Islam:**
- [ ] Validasi materi Al-Qur'an/Hadis
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan ayat/hadis dari buku
- [ ] Tentukan level kognitif per materi
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Seni Rupa:**
- [ ] Validasi teknik/media seni
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan karya seni dari buku
- [ ] Tentukan level kognitif per teknik
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Bahasa Daerah:**
- [ ] Validasi materi bahasa daerah
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan aksara/sastra daerah dari buku
- [ ] Tentukan level kognitif per materi
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Prakarya:**
- [ ] Validasi jenis kerajinan/rekayasa
- [ ] Sesuaikan dengan buku teks resmi
- [ ] Tambahkan proyek dari buku
- [ ] Tentukan level kognitif per proyek
- [ ] Cross-check dengan CP resmi
- [ ] Verifikasi alokasi jam pembelajaran

**Kualitas Konten:**
- [ ] Tidak ada duplikasi CP snippets
- [ ] Setiap materi punya indikator spesifik
- [ ] Level kognitif konsisten per grade
- [ ] Alokasi jam realistis
- [ ] Urutan materi logis dan progresif

---

### Fase 4: Integrasi ke Aplikasi (1-2 minggu)

**Tujuan:** Mengintegrasikan data baru ke sistem aplikasi

#### Checklist Integrasi

**Database & Backend:**
- [ ] Backup Kur SMP.json lama
- [ ] Buat migration script untuk data lama
- [ ] Update schema database (jika ada)
- [ ] Import data baru ke database
- [ ] Test query untuk buku_referensi
- [ ] Test query untuk atp_mapping
- [ ] Test query untuk indikator_pencapaian

**Generator RPP:**
- [ ] Update template RPP untuk include buku referensi
- [ ] Tambahkan field "Buku Teks" di RPP
- [ ] Tambahkan field "Indikator Pencapaian" di RPP
- [ ] Tambahkan field "Alokasi Waktu" di RPP
- [ ] Test generate RPP dengan data baru
- [ ] Validasi output RPP

**Generator Modul:**
- [ ] Update template modul untuk include buku referensi
- [ ] Tambahkan field "Referensi Bab" di modul
- [ ] Tambahkan field "Topik/Subtopik" di modul
- [ ] Tambahkan field "Level Kognitif" di modul
- [ ] Test generate modul dengan data baru
- [ ] Validasi output modul

**Generator ATP:**
- [ ] Update template ATP dengan atp_mapping baru
- [ ] Tambahkan field "Minggu" di ATP
- [ ] Tambahkan field "Tujuan Pembelajaran" di ATP
- [ ] Tambahkan field "Alokasi Jam" di ATP
- [ ] Test generate ATP dengan data baru
- [ ] Validasi output ATP

**UI/UX:**
- [ ] Tambahkan fitur "Lihat Buku Referensi" di dashboard
- [ ] Tampilkan ISBN & penerbit buku
- [ ] Tampilkan nomor bab & halaman
- [ ] Tambahkan link ke buku (jika ada)
- [ ] Update filter untuk mata pelajaran
- [ ] Test UI dengan data baru

**Testing:**
- [ ] Unit test untuk setiap fungsi baru
- [ ] Integration test untuk workflow lengkap
- [ ] Performance test untuk query database
- [ ] User acceptance test dengan guru
- [ ] Bug fixing & refinement

---

### Fase 5: Testing & Refinement (1 minggu)

**Tujuan:** Memastikan semua berfungsi dengan baik

#### Checklist Testing

**Functional Testing:**
- [ ] Test generate RPP dengan semua mata pelajaran
- [ ] Test generate modul dengan semua mata pelajaran
- [ ] Test generate ATP dengan semua mata pelajaran
- [ ] Test filter & search buku referensi
- [ ] Test export RPP/modul/ATP
- [ ] Test print RPP/modul/ATP

**Data Validation:**
- [ ] Validasi tidak ada data kosong
- [ ] Validasi format ISBN
- [ ] Validasi alokasi jam total per semester
- [ ] Validasi urutan materi logis
- [ ] Validasi indikator spesifik & terukur

**User Testing:**
- [ ] Test dengan guru Matematika
- [ ] Test dengan guru Bahasa Indonesia
- [ ] Test dengan guru IPA
- [ ] Test dengan guru IPS
- [ ] Kumpulkan feedback
- [ ] Lakukan perbaikan berdasarkan feedback

**Performance:**
- [ ] Test kecepatan load data
- [ ] Test kecepatan generate RPP/modul/ATP
- [ ] Monitor memory usage
- [ ] Optimize query jika diperlukan

**Documentation:**
- [ ] Update dokumentasi API
- [ ] Update user guide
- [ ] Update admin guide
- [ ] Buat changelog

---

## 📅 TIMELINE IMPLEMENTASI

```
Minggu 1-2 (30 Mei - 13 Juni):
  ├─ Fase 1: Pengumpulan Data Referensi Buku
  │  ├─ Prioritas 1: Matematika, B.Indonesia, IPA
  │  └─ Prioritas 2: IPS, Informatika, Pancasila
  └─ Fase 2: Desain Struktur Data (parallel)

Minggu 3-4 (14-27 Juni):
  ├─ Fase 3: Validasi & Penyesuaian Konten
  │  ├─ Per mata pelajaran
  │  └─ Cross-check dengan CP resmi
  └─ Fase 4: Integrasi ke Aplikasi (parallel)

Minggu 5 (28-30 Juni):
  ├─ Fase 5: Testing & Refinement
  ├─ Bug fixing
  └─ Deployment
```

---

## 👥 STAKEHOLDER & TANGGUNG JAWAB

| Role | Tanggung Jawab | Status |
|------|----------------|--------|
| **Project Lead** | Koordinasi keseluruhan | - |
| **Data Analyst** | Kumpulkan & validasi data buku | - |
| **Backend Dev** | Integrasi database & API | - |
| **Frontend Dev** | Update UI/UX | - |
| **QA Tester** | Testing & bug fixing | - |
| **Guru (Validator)** | Validasi konten akurat | - |

---

## 📦 DELIVERABLES

- [ ] File `Kur SMP.json` yang sudah diperbaiki
- [ ] Dokumentasi struktur data baru
- [ ] Mapping buku teks untuk setiap mata pelajaran
- [ ] ATP terstruktur per minggu
- [ ] Indikator pencapaian spesifik
- [ ] Update aplikasi (RPP/modul/ATP generator)
- [ ] User guide & dokumentasi
- [ ] Test report & quality metrics

---

## 🚨 RISIKO & MITIGASI

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Data buku tidak lengkap | Delay implementasi | Gunakan sumber alternatif, hubungi Kemendikbud |
| Struktur data kompleks | Sulit maintenance | Dokumentasi lengkap, training tim |
| Backward compatibility | Data lama hilang | Buat migration script, backup data |
| User adoption rendah | Fitur tidak digunakan | Training guru, demo, support |

---

## ✅ KRITERIA SUKSES

- [x] Semua 15 mata pelajaran SMP punya referensi buku teks
- [x] Setiap materi punya indikator pencapaian spesifik
- [x] ATP terstruktur per minggu dengan alokasi jam
- [x] RPP/modul/ATP generator menggunakan data baru
- [x] Tidak ada duplikasi CP snippets
- [x] Guru dapat dengan mudah melihat referensi buku
- [x] Sistem berfungsi tanpa error
- [x] User satisfaction ≥ 80%

---

## 📝 CATATAN & FOLLOW-UP

**Catatan Penting:**
- Prioritaskan mata pelajaran inti (Matematika, B.Indonesia, IPA)
- Validasi dengan guru sebelum finalisasi
- Jaga backward compatibility dengan sistem lama
- Dokumentasikan setiap perubahan

**Follow-up Setelah Implementasi:**
- [ ] Monitor penggunaan fitur baru
- [ ] Kumpulkan feedback dari guru
- [ ] Lakukan improvement berkelanjutan
- [ ] Update data buku setiap tahun ajaran baru

---

**Versi:** 1.0  
**Last Updated:** 30 Mei 2026  
**Next Review:** 30 Juni 2026
