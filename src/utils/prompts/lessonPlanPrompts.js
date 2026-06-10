export const getLessonPlanPrompt = (data, BSKAP_DATA, level, cpFullVerbatim, semesterLabel, semesterKey, subjectKey, regionalLanguage) => {
    const basePrompt = `
      
      **OFFICIAL KNOWLEDGE ENGINE (BSKAP_DATA):**
      - Regulasi Dasar: **${BSKAP_DATA.standards.regulation}**
      - Filosofi Operasional: **${BSKAP_DATA.standards.philosophy.name}**
      - Standar Kompetensi: Terlampir dalam elemen per-mata pelajaran di database.
      
      Tugas Anda: Susun RPP/Modul Ajar lengkap yang **OTORITATIF** dan **PRESIISI** dengan parameter ini:
      - Sekolah: ${data.schoolName || '[Nama Sekolah]'}
      - Guru: ${data.teacherName || '[Nama Guru]'}
      - Mapel: ${data.subject}
      - KD/CP: ${data.kd}
      - Materi Pokok: ${data.materi}
      ${data.studentCharacteristics ? `- Karakteristik Peserta Didik (Manual): ${data.studentCharacteristics}` : ''}
      
      **SMART CP EXTRACTION (MANDATORY - BSKAP 46/2025 COMPLIANCE):**
      Berikut adalah CP LENGKAP untuk referensi: 
      ${cpFullVerbatim}
      
      TUGAS ANDA: Dari CP lengkap di atas, ekstrak HANYA bagian/elemen yang RELEVAN dengan Elemen "${data.elemen || 'N/A'}" dan Materi "${data.materi}".
      - **WAJIB gunakan EXACT TEXT** dari CP (verbatim, NO paraphrase, NO summary)
      - Fokus pada kalimat yang benar-benar menggambarkan kompetensi untuk materi ini.
      - Jika tidak yakin elemen mana yang relevan, gunakan elemen yang setara dengan konten "${data.materi}".
      
      **FORMAT CP DI RPP (MANDATORY):**
      - HAPUS nomor elemen (mis. "2.1.", "2.2.", "3.1.") dari teks CP
      - MULAI dengan konteks Fase: "Pada akhir Fase [X], peserta didik mampu..."
      - Gunakan exact text CP tanpa nomor elemen
      - Jika multiple elemen, gabungkan menjadi paragraf natural dengan konektor yang sesuai
      
      Contoh Format yang BENAR:
      "Pada akhir Fase B, peserta didik mampu mengidentifikasi makna sila-sila Pancasila dan penerapannya dalam kehidupan sehari-hari."
      
      Contoh Format yang SALAH:
      "2.1. Pancasila Mengidentifikasi makna sila-sila Pancasila..."
      ${data.profilLulusan ? `
      - **PROFIL LULUSAN (MANDATORY)**: Dimensi yang HARUS digunakan: **${data.profilLulusan}**. DILARANG KERAS berimprovisasi, menambah, atau mengurangi dimensi ini. Gunakan PERSIS seperti tertulis.` : ''}
      ${data.sourceType === 'atp' ? `- **SUMBER UTAMA (ATP)**: RPP ini HARUS diturunkan secara spesifik dari butir Tujuan Pembelajaran (TP) yang tercantum di Alur Tujuan Pembelajaran (ATP). Gunakan Elemen ${data.elemen} sebagai jangkar kompetensi.` : ''}
      
      ${regionalLanguage ? `
      **INSTRUKSI BAHASA DAERAH (${regionalLanguage})**:
      - Karena mata pelajaran ini adalah Bahasa Daerah, Anda **WAJIB** menggunakan **Bahasa ${regionalLanguage}** untuk seluruh isi konten pembelajaran (Tujuan Pembelajaran, Langkah Kegiatan, Materi Ajar, dsb).
      - Gunakan tingkatan bahasa yang sesuai (misal: Ngoko/Kromo untuk Jawa sesuai konteks materi).
      ${(regionalLanguage.toLowerCase().includes('jawa') || regionalLanguage.toLowerCase().includes('madura')) ? `- Sertakan penggunaan **Aksara Hanacaraka (Aksara Jawa/Madura)** pada bagian yang relevan (terutama di bagian Materi Ajar Mendetail dan Latihan LKPD).` : ''}
      - Tetap gunakan Bahasa Indonesia HANYA untuk instruksi struktural dan label header dokumen.
      ` : ''}
      
      **INTELIGENSI SEMESTER (WAJIB):**
      - Semester Aktif: **${semesterLabel}**
      - Fokus: **${BSKAP_DATA.standards.semester_logic[semesterKey].focus}**
      
      **KOMPETENSI MASA DEPAN (STRATEGIS 2026):**
      Integrasikan butir-butir kompetensi industri berikut ke dalam Langkah Pembelajaran atau Asesmen jika relevan:
      ${(BSKAP_DATA.standards.industry_competencies_2025_2026 || []).map(c => `- ${c.name}: ${c.description}`).join('\n      ')}

      **PRINSIP PENYUSUNAN:**
      1. **KESELARASAN KOGNITIF:** Pastikan level KKO (Kata Kerja Operasional) konsisten dari TP hingga KKTP.
      2. **FOKUS MATERI:** Pembahasan harus terpusat pada "${data.materi}" tanpa melebar.
      3. **KESESUAIAN JENJANG:** Sesuaikan bahasa, contoh, dan kegiatan dengan tingkat perkembangan Kelas ${data.gradeLevel}.
      4. **INDIKATOR OPERASIONAL:** Turunkan TP menjadi beberapa IKTP yang spesifik dan terukur.

      **PENTING - OPERASIONALISASI TUJUAN (IKTP):**
      Anda **WAJIB** menurunkan Tujuan Pembelajaran (TP) yang luas menjadi beberapa **Indikator Tujuan Pembelajaran (IKTP)** yang spesifik, operasional, and terukur untuk kegiatan ini.
      - Cantumkan label **"Indikator Tujuan Pembelajaran"** secara eksplisit di bawah bagian Tujuan Pembelajaran.
      - IKTP harus menunjukkan langkah-langkah pencapaian kompetensi secara bertahap (misal: dari mengidentifikasi -> mengklasifikasi -> mensimulasikan).

      **PENTING - KESESUAIAN JENJANG KELAS:**
      Anda HARUS menyesuaikan seluruh konten RPP dengan jenjang kelas "${data.gradeLevel}". Perhatikan hal-hal berikut:

      **Untuk Kelas SD (1-6):**
      - Gunakan bahasa yang sangat sederhana, konkret, and mudah dipahami anak usia 6-12 tahun.
      - Fokus pada pembelajaran berbasis permainan, cerita, and pengalaman langsung.
      - Contoh dan ilustrasi harus dari kehidupan sehari-hari anak (keluarga, sekolah, lingkungan sekitar).
      - Kegiatan harus melibatkan gerakan fisik, visual, and hands-on activities.
      - Durasi fokus: 15-20 menit per aktivitas untuk kelas rendah (1-3), 25-30 menit untuk kelas tinggi (4-6).
      - Hindari konsep abstrak yang terlalu kompleks; gunakan pendekatan konkret-visual.

      **Untuk Kelas SMP (7-9):**
      - Gunakan bahasa yang jelas namun mulai memperkenalkan istilah akademis.
      - Fokus pada pengembangan berpikir kritis dan analitis awal.
      - Contoh dari kehidupan remaja, isu sosial sederhana, dan fenomena yang dapat diamati.
      - Kegiatan berbasis diskusi kelompok, eksperimen sederhana, dan proyek kolaboratif.
      - Mulai memperkenalkan konsep abstrak dengan jembatan dari konkret.
      - Dorong kemandirian dan tanggung jawab dalam belajar.

      **Untuk Kelas SMA/SMK (10-12):**
      - Gunakan bahasa akademis yang tepat dan istilah teknis sesuai bidang.
      - Fokus pada berpikir tingkat tinggi: analisis, evaluasi, kreasi.
      - Contoh dari isu kontemporer, kasus nyata, penelitian, dan aplikasi profesional.
      - Kegiatan berbasis riset, debat, presentasi, dan proyek kompleks.
      - Integrasikan konsep lintas disiplin dan aplikasi dunia nyata.
      - Persiapkan peserta didik untuk pendidikan tinggi atau dunia kerja.

      **PENTING - KEPATUHAN KETAT CAPAIAN PEMBELAJARAN (CP) BERDASARKAN KEPUTUSAN KEPALA BSKAP NO. 046/H/KR/2025:**
      1. **SUMBER KEBENARAN TUNGGAL**: Data berikut adalah EKSTRAKSI RESMI dari **${BSKAP_DATA.standards.regulation}** untuk **${semesterLabel}**.
      2. **VERBATIM CP (HARGA MATI)**: Pada bagian "Capaian Pembelajaran (CP)" di hasil RPP, Anda **WAJIB** menyalin teks hasil ekstraksi yang RELEVAN (dari langkah "SMART CP EXTRACTION") secara **VERBATIM (KATA PER KATA)**. 
      3. **DILARANG KERAS**: Melakukan parafrase, meringkas, atau mengubah satu kata pun dari isi CP yang telah diekstrak tersebut. Redaksi harus sesuai aslinya.
      4. **STRUKTUR DATA RESMI (SEMESTER ${semesterLabel.toUpperCase()}):**
      ${JSON.stringify(
  (BSKAP_DATA.subjects[level]?.[data.gradeLevel]?.[subjectKey] ||
    BSKAP_DATA.subjects[level]?.[subjectKey])?.[semesterKey] || {}
)}
      5. **AKURASI FASE**: Gunakan pemetaan Fase: ${(BSKAP_DATA.standards.phases || []).map(p => `Fase ${p.phase} (Kelas ${p.grades.join('-')} ${p.level})`).join(', ')}.
      6. **FORMAT**: Gunakan format Markdown standar (* atau -).

      **PENTING - REFERENSI BUKU PEMERINTAH (WAJIB):**
      
      Anda WAJIB mereferensikan buku teks resmi yang diterbitkan oleh **Kemendikdasmen (Kementerian Pendidikan Dasar dan Menengah)** sesuai dengan jenjang dan mata pelajaran. Berikut panduan lengkapnya:
      
      **WAJIB HUKUMNYA**: Seluruh konten RPP, materi, dan instrumen harus merujuk pada buku dan pedoman dari Kemendikdasmen.

      **1. SUMBER BUKU RESMI PEMERINTAH:**
      - **Platform Resmi**: Buku Sekolah Elektronik (BSE) - buku.kemdikbud.go.id (Sekarang dikelola Kemendikdasmen)
      - **Penerbit Resmi**: Pusat Kurikulum dan Perbukuan (Puskurbuk) Kemendikdasmen
      - **Status**: Buku yang telah dinilai dan ditetapkan oleh Kemendikbudristek

      **2. IDENTIFIKASI BUKU YANG TEPAT:**
      
      Untuk **${data.subject}** Kelas **${data.gradeLevel}**, Anda harus:
      
      a) **Tentukan Jenjang dengan Benar:**
         - SD/MI: Kelas 1-6
         - SMP/MTs: Kelas 7-9
         - SMA/MA: Kelas 10-12
         - SMK/MAK: Kelas 10-12 (sesuai program keahlian)
      
      **PENTING - PROFIL LULUSAN (8 DIMENSI RESMI):**
      DILARANG KERAS memasukkan "Literasi AI", "Adaptabilitas", atau "EQ" ke dalam daftar Profil Lulusan. Mereka adalah Kompetensi Industri, bukan Dimensi Profil Lulusan.
      ${data.sourceType === 'atp' && data.profilLulusan ? `
      **WAJIB GUNAKAN DIMENSI INI (DARI ATP):**
      Karena RPP ini diturunkan dari ATP, Anda **HARUS** menggunakan dimensi Profil Lulusan yang sama dengan ATP: **${data.profilLulusan}**
      Pastikan TIDAK ADA unsur "Literasi AI" atau "Adaptabilitas" di sini.
      ` : `
      Dalam bagian Profil Lulusan / Karakter, Anda **WAJIB** memilih **minimal 1 dan MAKSIMAL 3 dimensi** paling relevan dari daftar DIMENSI PROFIL LULUSAN 2025.
      `}

      b) **Identifikasi Kurikulum:**
         - **Kurikulum Merdeka** (prioritas utama untuk tahun 2025/2026)
         - Kurikulum 2013 (jika sekolah masih menggunakan)
      
      c) **Nama Buku yang Akurat:**
         - Format: "[Nama Mata Pelajaran] untuk [Jenjang] Kelas [X]"
         - Contoh: "Matematika untuk SMP Kelas VII", "Bahasa Indonesia untuk SD Kelas 4"
         - Untuk Kurikulum Merdeka: Sebutkan "Buku Siswa" atau "Buku Guru"
      
      d) **Penulis dan Tahun Terbit:**
         - Sebutkan nama penulis jika memungkinkan
         - Tahun terbit (prioritas: 2022-2025 untuk Kurikulum Merdeka)
         - Contoh: "Tim Penulis Kemendikdasmen, 2022"
      
      **3. PANDUAN REFERENSI PER MATA PELAJARAN:**
      
      **Untuk Jenjang SD:**
      - **Mata Pelajaran**: Pendidikan Agama dan Budi Pekerti, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPAS (Ilmu Pengetahuan Alam dan Sosial - dimulai Kelas III), PJOK, Seni dan Budaya (Musik, Rupa, Teater, atau Tari), Bahasa Inggris (pilihan/mulok).
      
      **Untuk Jenjang SMP:**
      - **Mata Pelajaran Wajib**: Pendidikan Agama, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPA, IPS, Bahasa Inggris, PJOK, Seni, dan **Informatika** (WAJIB).
      - **Muatan Lokal**: Sesuai potensi daerah.

      **Untuk Jenjang SMA:**
      - **Kelas X (Fase E)**: Mapel umum serupa SMP sebagai fondasi.
      - **Kelas XI & XII (Fase F)**: **TIDAK ADA penjurusan** (IPA, IPS, Bahasa). Siswa memilih mapel pilihan (seperti Biologi, Fisika, Ekonomi, Geografi, dsb) sesuai minat dan rencana karier.

      **4. CARA MENGGUNAKAN REFERENSI DALAM RPP:**
      
      a) **Di Bagian "Buku Sumber" (Kartu Soal/RPP):**
         - Tulis nama lengkap buku
         - Format: "Buku Siswa [Mapel] Kelas [X], Kemendikbudristek, [Tahun]"
         - Contoh: "Buku Siswa Matematika Kelas VII, Kemendikbudristek, 2022"
      
      b) **Di Bagian "Daftar Pustaka":**
         - Format APA atau format standar Indonesia
         - Contoh: Kemendikdasmen. (2022). Buku Siswa Matematika untuk SMP Kelas VII Kurikulum Merdeka. Jakarta: Pusat Kurikulum dan Perbukuan.
      
       c) **Di Bagian "Materi Ajar Mendetail":**
          - Rujuk halaman spesifik jika memungkinkan
          - Contoh: "Sesuai Buku Siswa [Mapel] Kemendikdasmen Halaman..."
         
        **5. VALIDASI KESESUAIAN MATERI:**
        
        Pastikan materi yang Anda ambil:
        - ✅ Sesuai dengan CP yang tercantum di BSKAP 046/2025
        - ✅ Sesuai dengan fase pembelajaran (A-F)
        - ✅ Sesuai dengan tingkat kognitif peserta didik
        - ✅ Menggunakan terminologi yang sama dengan buku teks pemerintah Kemendikdasmen
        - ✅ Tidak bertentangan dengan nilai-nilai Pancasila dan UUD 1945
  
        **6. JIKA BUKU SPESIFIK TIDAK TERSEDIA:**
        
        Jika Anda tidak memiliki akses ke buku spesifik:
        - Gunakan referensi umum: "Buku Siswa [Mapel] Kelas [X] Kurikulum Merdeka, Kemendikdasmen"
        - Tambahkan catatan: "Guru dapat menyesuaikan dengan buku teks yang digunakan di sekolah (Kemendikdasmen)"
        - JANGAN membuat referensi fiktif atau tidak resmi
        - Tetap gunakan materi yang akurat sesuai CP and standar nasional Kemendikdasmen
  
        **7. CONTOH PENERAPAN LENGKAP:**
        
        Untuk Matematika Kelas 7, materi "Bilangan Bulat":
        Buku Sumber:
      - Buku Siswa Matematika untuk SMP Kelas VII Kurikulum Merdeka, Kemendikdasmen, 2022
        - Buku Guru Matematika untuk SMP Kelas VII Kurikulum Merdeka, Kemendikdasmen, 2022
        
        Materi Ajar Mendetail:
        Berdasarkan Buku Siswa Matematika Kelas VII(Bab 2: Bilangan Bulat, hal. 45 - 68):
      [Isi materi yang diambil dari buku tersebut sesuai standar Kemendikdasmen]
        
        Daftar Pustaka:
      Kemendikdasmen. (2022). Buku Siswa Matematika untuk SMP Kelas VII Kurikulum Merdeka.
        Jakarta: Pusat Kurikulum dan Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan.

      **CATATAN SANGAT PENTING (KONTROL KUALITAS MATERI):**
      - **CEK KESESUAIAN KELAS:** Anda **WAJIB** memastikan materi dan KD yang dikembangkan **SANGAT SESUAI** dengan tingkat kelas **${data.gradeLevel}** Kurikulum Merdeka/K13 resmi.
      - **JANGAN SALAH LEVEL:** Jangan memasukkan materi yang terlalu sulit (milik kelas lebih tinggi) atau terlalu mudah (milik kelas lebih rendah).
      - **RUJUKAN RESMI:** Seluruh pengembangan materi, definisi, dan langkah pembelajaran **HARUS MENGACU PADA BUKU TEKS PELAJARAN RESMI KEMDIKBUD** untuk mapel ${data.subject} Kelas ${data.gradeLevel} yang beredar saat ini.
      - **KOREKSI OTOMATIS:** Jika input KD/Materi dari user terasa "kurang pas" dengan kelasnya, **SESUAIKAN** kedalaman dan cakupannya agar cocok untuk siswa kelas ${data.gradeLevel}.
      
      - Referensi buku pemerintah ini WAJIB dicantumkan di bagian "Media Belajar" dan "Daftar Pustaka"
      - Materi yang diambil harus akurat and tidak menyimpang dari buku sumber
      - Jika ada perbedaan antara buku lama dan CP 2025, prioritaskan CP 2025

      **STRUKTUR RPP YANG HARUS DIHASILKAN (Gunakan Format Markdown Ini):**

      # MODUL AJAR DEEP LEARNING (STANDARD 2026)

      ## IDENTIFIKASI PEMBELAJARAN
      | Komponen | Detail Informasi |
      | :--- | :--- |
      | **Satuan Pendidikan** | ${data.schoolName || '-'} |
      | **Mata Pelajaran** | ${data.subject} |
      | **Elemen** | ${data.elemen || '-'} |
      | **Kelas / Semester** | ${data.gradeLevel} / ${semesterLabel} |
      | **Materi Pokok** | ${data.materi} |
      | **Alokasi Waktu** | ${data.jp || '-'} JP (Total: .... menit) (${data.distribution ? data.distribution.length : 1} x tatap muka) |
      ${data.distribution && data.distribution.length > 1 ? `| **Rincian Pertemuan** | ${data.distribution.map((j, i) => `P${i + 1}: ${j} JP`).join(', ')} |` : ''}
      | **Sarana & Prasarana** | [Sebutkan alat, bahan, dan sumber belajar spesifik yang digunakan] |
      | **Model Pembelajaran** | [PILIH MODEL SPESIFIK: PBL/PJBL/DLL] |
      | **Tahun Ajaran** | ${data.academicYear || '-'} |
      | **Guru Pengampu** | ${data.teacherName || '-'} |
      | **NIP Guru** | ${data.teacherNip || '-'} |

      ## I. KOMPETENSI INTI (CP & TP)
      **1. Capaian Pembelajaran (CP):**
      (Tuliskan kompetensi utama yang harus dicapai peserta didik sesuai dengan fase and materi pokok ini).

      **2. Tujuan Pembelajaran (TP):**
      **WAJIB: Buatlah maksimal 3 (tiga) poin Tujuan Pembelajaran yang esensial.**
      DILARANG membuat terlalu banyak TP agar tidak memberatkan "tagihan nilai" (asesmen) di rapor. Fokuslah pada kompetensi utama yang ingin dicapai dalam seluruh rangkaian pertemuan ini.
      **WAJIB MENGGUNAKAN FORMULA A-B-C-D (Audience, Behavior, Condition, Degree)**
      Setiap poin tujuan pembelajaran HARUS memuat 4 unsur ini secara eksplisit namun mengalir.
      
      **3. Kesiapan Peserta Didik:**
      ${data.studentCharacteristics
    ? `(PENTING: Gunakan data manual ini sebagai basis utama: "${data.studentCharacteristics}". Rangkai kata-kata tersebut menjadi narasi yang profesional tentang kesiapan peserta didik.)`
    : `(Analisis secara otomatis pengetahuan awal, minat, latar belakang, dan motivasi peserta didik terkait materi ini sesuai dengan jenjang kelas dan mata pelajarannya).`
  }

      **4. Karakteristik Materi:**
      (Jenis pengetahuan, relevansi dengan kehidupan, struktur materi, serta integrasi nilai & karakter).

      **5. Dimensi Profil Lulusan (8 Dimensi):**
      Tuliskan Dimensi Profil Lulusan yang relevan dan **BERIKAN DESKRIPSI DETAIL** bagaimana dimensi tersebut diwujudkan dalam aktivitas pembelajaran ini.
      
      ## II. LANGKAH-LANGKAH PEMBELAJARAN
      **PENTING - ALOKASI WAKTU:**
      Durasi total menit wajib dicantumkan dalam tabel Identifikasi. Standar Durasi:
${Object.entries(BSKAP_DATA.standards.duration_per_jp || {}).map(([lvl, min]) => `      - ${lvl}: 1 JP = ${min} Menit`).join('\n')}
      
      HITUNGLAH durasi total menit dengan mengalikan total JP (${data.jp}) sesuai jenjang Kelas ${data.gradeLevel}.

      ### PERTEMUAN [X] (Topik Spesifik: ...)
      
      **1. Pendahuluan ([X] Menit):**
      **2. Kegiatan Inti ([X] Menit):**
      **3. Penutup ([X] Menit):**

      ## III. MEDIA BELAJAR
      ## IV. LAMPIRAN (LKPD & ASESMEN)
      
      - Output harus **langsung dalam format Markdown** tanpa komentar pembuka atau penutup dari asisten.
    `;

    const materialPrompt = `
      ## V. MATERI AJAR MENDETAIL (KONSISTENSI TP)
      **WAJIB DIISI DENGAN KONTEN LENGKAP & RELEVAN!**
      - **CEK KONSISTENSI:** Pastikan materi yang ditulis di sini **MENJAWAB** seluruh Tujuan Pembelajaran (TP).
      - Minimal 3-5 paragraf substantif yang mencakup konsep, teori, contoh konkret, and aplikasi nyata materi ini.

      **VISUAL THINKING (WAJIB):**
      Sistem ini mendukung rendering grafis otomatis. Gunakan format blok kode:
      1. **DIAGRAM**: Gunakan format triple-backtick mermaid.
      2. **CHART**: Gunakan format triple-backtick chart.
      3. **MATH**: Gunakan simbol dolar ganda untuk LaTeX.

      ## VI. GLOSARIUM
      **WAJIB DIISI!** Daftar minimal 5-10 istilah penting and definisinya.

      ## VII. DAFTAR PUSTAKA
      **WAJIB DIISI!** Minimal 3-5 referensi kredibel.
      
      ---
      **CATATAN PENTING:**
      1. Langsung mulai dari header "## V. MATERI AJAR MENDETAIL".
      2. Berhenti setelah Daftar Pustaka.
      3. JANGAN mengulang judul modul atau identitas.
    `;

    return { basePrompt, materialPrompt };
};
