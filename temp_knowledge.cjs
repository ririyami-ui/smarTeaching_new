const fs = require("fs");
let c = fs.readFileSync("src/utils/prompts/smarttyPrompts.js","utf8");

// Find the end of SMARTTY_BRAIN by looking for the unique closing pattern
const marker = "saat disuruh bikin dokumen!";
const endIdx = c.indexOf(marker);
if (endIdx < 0) { console.log("MARKER NOT FOUND"); process.exit(1); }

// Find the backtick-semicolon that closes SMARTTY_BRAIN (after the marker)
const closeIdx = c.indexOf("`;", endIdx);
if (closeIdx < 0) { console.log("CLOSE NOT FOUND"); process.exit(1); }

const newKnowledge = `

### 7. Pengetahuan Detail Aplikasi (APP FEATURES COMPLETE)
Anda hafal SELURUH fitur aplikasi ini beserta lokasi menunya:

**NAVIGASI CEPAT:**
- **Dashboard** (\`/\`) - Ringkasan kelas hari ini, statistik cepat, jadwal hari ini
- **Jadwal Mengajar** (\`/jadwal\`) - Manajemen jadwal mingguan, deteksi otomatis jam mengajar
- **Absensi Siswa** (\`/absensi\`) - Presensi per kelas per jam, status H/S/I/A, auto-save draft
- **Input Nilai** (\`/nilai\`) - Input nilai Formatif & Sumatif per materi, kategori nilai
- **Jurnal Mengajar** (\`/jurnal\`) - Catatan harian, integrasi Promes, voice typing, analisis sentimen AI
- **Rekapitulasi** (\`/rekapitulasi\`) - Rekap nilai, absensi, pelanggaran, jurnal per semester, export Excel
- **Rekap Individu** (\`/rekap-individu\`) - Detail rapor tiap siswa, Radar Chart 8 dimensi, grafik nilai
- **Master Data** (\`/master-data\`) - Manajemen Kelas, Siswa (impor Excel), Mata Pelajaran, Jadwal, template jam
- **Analisis Kelas** (\`/analisis-kelas\`) - AI menganalisis performa kelas, beri rekomendasi remedial/pengayaan
- **Sistem Peringatan Dini** (\`/sistem-peringatan\`) - Deteksi otomatis siswa risiko (nilai <65, absensi >3, pelanggaran >80)
- **Poin & Bintang** (\`/pelanggaran\`) - Catat poin pelanggaran & bintang apresiasi untuk siswa
- **Leaderboard** (\`/leaderboard\`) - Peringkat siswa berdasarkan bintang total per kelas
- **Program Mengajar** (\`/program-mengajar\`) - Generator ATP, Prota, Promes berbasis AI
- **Penyusunan RPP** (\`/rpp\`) - RPP AI standar BSKAP 046/2025, metode Deep Learning, download Word
- **Generator LKPD** (\`/lkpd-generator\`) - LKPD interaktif dengan diagram Mermaid, download Word/PDF
- **Generator Bahan Ajar** (\`/handout-generator\`) - Bahan ajar mandiri dengan diagram & materi
- **Generator Quiz & Soal** (\`/quiz-generator\`) - Soal HOTS/LOTS, stimulus AKM, essay/multple choice
- **Penugasan Siswa** (\`/penugasan\`) - Manajemen tugas, deadline, status pengumpulan
- **Penilaian KKTP** (\`/penilaian-kktp\`) - Input nilai KKTP, tracking ketercapaian tujuan pembelajaran
- **Portofolio & Audit** (\`/portfolio\`) - Generate laporan portofolio 1 semester + analisis SWOT AI
- **Database Cleanup** (\`/database-cleanup\`) - Hapus data duplikat, bersihkan storage
- **Tentang Aplikasi** (\`/about\`) - Info versi, install PWA, donasi

### 8. Model Data (FIRESTORE SCHEMA)
\`\`\`
users/{userId}          -> name, email, nip, schoolName, schoolLevel, role, activeSemester, academicYear, geminiModel
students/{studentId}    -> nis, nisn, name, gender, rombel, absenNumber, birthPlace, birthDate, isActive, status
attendance/{id}         -> date, semester, academicYear, rombel, subjectId, students[{studentId, name, status}]
grades/{gradeId}        -> studentId, studentName, rombel, subject, semester, materi, category(Formatif/Sumatif), score, kktp
journals/{journalId}    -> date, rombel, subject, materi, tujuan, refleksi, sentiment, sentimentScore
infractions/{id}        -> studentId, studentName, rombel, points, reason, date, category, resolved
weeklySchedules/{id}    -> day, startTime, endTime, rombel, subject, teacherName
classAgreements/{id}    -> rombel, semester, knowledgeWeight, practiceWeight, attitudeWeight, finalGrades[]
\`\`\`

### 9. Pedoman Asesmen & KKTP
- **Formatif**: Penilaian proses, bisa beberapa kali per materi.
- **Sumatif**: Penilaian akhir bab/topik. Siswa harus mencapai KKTP.
- **KKTP Default**: 70 (bisa diubah per sekolah/mapel).
- **Remedial**: Jika nilai < KKTP, beri pembelajaran ulang + asesmen ulang maksimal 2x.
- **Pengayaan**: Jika nilai >= KKTP, beri pengayaan (proyek mandiri, eksplorasi lanjutan).
- **Bobot Nilai Akhir**: (knowledgeWeight x Pengetahuan) + (practiceWeight x Keterampilan) + (attitudeWeight x Sikap).

### 10. Manajemen Kelas & Disiplin
- **Deteksi dini**: nilai <65 (red flag), absensi tanpa keterangan >3x/bulan, poin pelanggaran >80.
- **Intervensi bertahap**: Teguran lisan, Catatan jurnal, Poin pelanggaran, Peringatan tertulis, Panggilan orang tua.
- **Apresiasi positif**: Beri bintang (Stars) untuk perilaku baik, peningkatan nilai, partisipasi aktif.
- **Peer teaching**: Siswa paham materi ajarkan teman yang belum paham.
- **Ice breaking**: Tebak kata, Two Truths One Lie, Simon Says, kuis kilat 5 menit.

### 11. Teknik Pembelajaran
- **Deep Learning (BSKAP 2025)**: Mindful (sadar penuh) -> Meaningful (bermakna) -> Joyful (menyenangkan).
- **5M (Saintifik)**: Mengamati, Menanya, Mengumpulkan Informasi, Menalar, Mengomunikasikan.
- **PBL**: Tentukan masalah nyata -> Rencanakan solusi -> Buat jadwal -> Monitor -> Uji hasil -> Evaluasi.
- **Inquiry Learning**: Pertanyaan pemantik -> Investigasi -> Presentasi -> Refleksi.
- **Gamifikasi**: Poin, level, badge untuk motivasi. Leaderboard untuk kompetisi sehat.
- **Diferensiasi**: Bedakan konten, proses, atau produk sesuai kesiapan siswa (visual/auditori/kinestetik).

### 12. Siklus Akademik Tahunan
- **Juli**: Awal TA - Prota/Promes, Asesmen Diagnostik, MPLS
- **Agustus**: HUT RI - Kegiatan proyek kebangsaan
- **September**: PTS/STS Ganjil, refleksi tengah semester
- **Desember**: PAS/SAS Ganjil, pengolahan & pembagian rapor
- **Januari**: Libur semester, awal semester genap
- **Maret**: PTS/STS Genap
- **Juni**: PAS/SAS Genap, kenaikan kelas, rapor akhir

### 13. Analisis Portofolio Semester
Portofolio terdiri dari 6 Bab: 1) Pendahuluan, 2) Pelaksanaan Pembelajaran, 3) Capaian & Analisis, 4) Refleksi & Tindak Lanjut, 5) Kesimpulan, 6) Lampiran. Dilengkapi SWOT Analysis per kelas. Output PDF siap cetak untuk PKB Guru.
`;

// Insert new knowledge before the closing backtick+semicolon
c = c.substring(0, closeIdx) + newKnowledge + c.substring(closeIdx);
fs.writeFileSync("src/utils/prompts/smarttyPrompts.js",c,"utf8");
console.log("Smartty knowledge enriched successfully");
