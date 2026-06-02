export const getStimulusModeInstruction = (stimulusMode, batchSize) => {
    if (stimulusMode === 'with_stimulus') {
        return `**ATURAN STIMULUS (MODE: WAJIB ADA STIMULUS)**:
        - SETIAP soal dalam batch ini WAJIB memiliki teks stimulus di field "stimulus".
        - Stimulus berupa: wacana ilmiah, narasi studi kasus, data/tabel, kutipan teks, atau skenario nyata.
        - Field "stimulus" DILARANG kosong ("") atau null untuk semua soal.
        - Pertanyaan harus mengacu pada stimulus yang diberikan ("Berdasarkan wacana di atas...", "Perhatikan data berikut...", dst).`;
    }
    if (stimulusMode === 'no_stimulus') {
        return `**ATURAN STIMULUS (MODE: TANPA STIMULUS)**:
        - SEMUA soal dalam batch ini WAJIB mengosongkan field "stimulus" (isi dengan string kosong: "").
        - Soal harus dirumuskan secara langsung tanpa teks pendahuluan/wacana.
        - DILARANG menyertakan narasi atau wacana apapun sebelum pertanyaan.`;
    }
    // 'auto' mode: strictly controlled 50/50 split
    const withStimulusCount = Math.ceil(batchSize / 2);
    const noStimulusCount = batchSize - withStimulusCount;
    return `**ATURAN STIMULUS (MODE: CAMPURAN TERKONTROL)**:
        - Distribusi WAJIB: tepat ${withStimulusCount} soal HARUS memiliki stimulus, tepat ${noStimulusCount} soal HARUS tanpa stimulus.
        - Pola distribusi WAJIB bergantian: soal ganjil (1, 3, 5, ...) ADA stimulus, soal genap (2, 4, 6, ...) TANPA stimulus.
        - Soal dengan stimulus: field "stimulus" berisi wacana/narasi/data konkret.
        - Soal tanpa stimulus: field "stimulus" HARUS berupa string kosong "".
        - DILARANG memberikan semua soal stimulus atau semua soal tanpa stimulus.`;
};

export const getAdvancedQuizPrompt = ({ topic, context, bookContext, BSKAP_DATA, gradeLevel, subject, batchNum, batches, allQuestions, batchInstructions, optionCount, optionLabel, difficulty, stimulusMode = 'auto' }) => `
        LANDASAN REGULASI: **${BSKAP_DATA?.standards?.regulation || 'BSKAP No. 46 Tahun 2025'}** (Standar Nasional Kurikulum Merdeka).
        STANDAR PEDAGOGIS: **${BSKAP_DATA?.standards?.philosophy?.name || 'Deep Learning'}** (${BSKAP_DATA?.standards?.philosophy?.pillars?.map(p => p.name).join(', ') || 'Mindful, Meaningful, Joyful'}).
        
        TUGAS: Buatlah ${batchInstructions.split('\n').length} butir soal untuk:
        - Mapel: ${subject} | Kelas: ${gradeLevel} | Topik: ${topic}
        
        ${bookContext ? `**SUMBER KEBENARAN MATERI (SOURCE OF TRUTH) DARI BUKU TEKS UTAMA KEMENDIKBUDRISTEK:**\n${bookContext}` : ''}
        
        - Konteks Tambahan: "${context || 'INPUT MANUAL/MINIM'}" 
        ${!context && !bookContext ? '(WAJIB: Gunakan Database Internal Kurikulum Merdeka & BSKAP 46/2025 Anda untuk menentukan CP/Kompetensi yang relevan secara mandiri)' : '(WAJIB JADIKAN SUMBER UTAMA)'}
        - HOTS Meter: ${difficulty}% (Proporsi tingkat kesulitan. ${difficulty}% dari total soal WAJIB berlevel kognitif HOTS yakni L4, L5, atau L6. Sisanya adalah LOTS/MOTS yakni L1, L2, atau L3.)
        - Status: Batch ${batchNum} dari ${batches.length}
        ${allQuestions.length > 0 ? `- SOAL SEBELUMNYA (DILARANG DITIRU FORMATNYA):
${allQuestions.map((q, i) => `  ${i+1}. [${q.pedagogical_materi}] ${q.question}`).join('\n')}
(ATURAN KETAT: Anda DILARANG KERAS membuat soal baru yang mirip secara kalimat/struktur dengan soal-soal di atas. Jangan hanya sekadar mengganti angka, nama, atau besaran fisis. Gunakan sudut pandang, konsep turunan, stimulus, dan gaya bertanya yang 100% berbeda!)` : ''}

        TUGAS UTAMA: 
        1. Analisis SELURUH materi dalam "Konteks".
        2. Buatlah soal yang **BERIMBANG** dan mencakup berbagai sub-inti materi agar tidak menumpuk di satu bagian saja.
        ${batchInstructions}

        STRICT RULES:
        1. Gunakan Bahasa Indonesia akademis formal (PUEBI).
        2. **REFERENSI MATERI (STRICT)**: Gunakan isi dari "Konteks" atau "RINGKASAN MATERI" sebagai sumber utama soal. Abaikan instruksi teknis guru jika ada; fokuslah pada konsep, fakta, dan data materi.
        3. ${getStimulusModeInstruction(stimulusMode, batchInstructions.split('\n').length)}
        4. **VARIASI POSISI JAWABAN (MANDATORY)**: Pastikan posisi jawaban benar (untuk PG/Complex) selalu berpindah-pindah. Khusus soal "matching" (menjodohkan), urutan pada array "right_side" WAJIB diacak agar tidak lurus sejajar dengan "left_side" (Contoh pasangan variatif, bukan A-1, B-2).
        5. **PRINSIP DEEP LEARNING (WAJIB)**:
           - **Kontekstual**: Hubungkan soal dengan kehidupan sehari-hari siswa agar bermakna.
           - **Reflektif**: Ajak siswa melihat kembali apa yang dipelajari dan proses belajarnya.
           - **Eksploratif**: Berikan ruang untuk berbagai kemungkinan jawaban atau solusi kreatif.
        6. Pilihan jawaban (untuk PG) wajib ${optionCount} opsi (${optionLabel}).
            - **indicator**: Indikator soal (Format: Disajikan [konteks/stimulus], siswa dapat [KKO] [materi]). Harus SINGKAT dan PADAT.
         7. **IMAGE HINT (OPTIONAL)**: Jika soal sangat membutuhkan dukungan visual (seperti diagram, grafik, peta, anatomi, atau ilustrasi situasi), Anda WAJIB menyertakan field **"image_hint"**. 
            - Isi dengan instruksi spesifik: "[Tempatkan Gambar: {deskripsi visual}]".
            - Tambahkan referensi pencarian: "Referensi: {keyword pencarian gambar yang akurat}".
            - Jika soal bisa dipahami tanpa gambar, kosongkan ("").
         8. **VISUALIZATION (OPTIONAL - 5% SOAL)**: Hanya 5% dari total soal yang PERLU visualisasi. Jika soal membutuhkan grafik/diagram/infografis, tambahkan field **"visualization"**:
             - **Function (grafik fungsi matematika)**: WAJIB digunakan jika soal menyebutkan fungsi matematis seperti h(t)=-t²+4t+5, f(x)=2x+1, y=sin(x), dll.
               "visualization": { "type": "function", "config": { "expression": "-x*x + 4*x + 5", "title": "h(t) = -t\u00b2 + 4t + 5", "xLabel": "Waktu (detik)", "yLabel": "Ketinggian (cm)", "xRange": [-1, 5], "yRange": [-2, 10], "points": [{"x": 2, "y": 9, "label": "Maks"}] } }
               Catatan: "expression" harus ekspresi JavaScript valid (x=variabel, * untuk kali, ** untuk pangkat).
             - **Chart (grafik data statistik)**: Gunakan untuk grafik batang/garis/scatter dari data diskrit.
               "visualization": { "type": "chart", "config": { "type": "line", "title": "Judul", "xLabel": "X", "yLabel": "Y", "data": [{"x": 1, "y": 2}] } }
             - **Logic (gerbang logika & timing digital)**: Gunakan untuk Informatika/Sistem Komputer.
               "visualization": { "type": "logic", "config": { "code": { "assign": [["out", ["|", ["&", "A", "B"], "C"]]] } } }
             - **Scratch (pemrograman visual)**: Gunakan untuk Informatika algoritma blok Scratch.
               "visualization": { "type": "scratch", "config": { "code": "when flag clicked\ngo to x: (0) y: (0)\nrepeat (10)\n move (10) steps\nend" } }
             - **Chemistry (struktur molekul)**: Gunakan untuk Kimia, WAJIB diisi string SMILES yang valid.
               "visualization": { "type": "chemistry", "config": { "smiles": "C1=CC=C(C=C1)O" } }
             - **Music (not balok)**: Gunakan untuk Seni Budaya, WAJIB diisi notasi ABC yang valid.
               "visualization": { "type": "music", "config": { "abc": "X:1\nT:Notes\nM:C\nL:1/4\nK:C\nC, D, E, F,|G, A, B, C|D E F G|A B c d|e f g a|b c' d' e'|f' g' a' b'|" } }
             - **Diagram (flowchart/timeline)**: Gunakan untuk soal algoritma, urutan, hubungan.
               "visualization": { "type": "diagram", "config": { "type": "flowchart", "diagram": "mermaid code" } }
             - **Image (infografis)**: Gunakan untuk soal perbandingan visual, struktur.
               "visualization": { "type": "image", "config": { "description": "[Tempatkan Gambar: ...]", "position": "center", "width": "45%" } }
             - Jika soal tidak butuh visualisasi, kosongkan field ini.

         9. **KEPATUHAN TIPE SOAL (CRITICAL)**: Field "type" pada JSON output **HARUS SAMA PERSIS** dengan instruksi tipe pada "TUGAS UTAMA". Dilarang keras menciptakan, menambah, atau membuang tipe soal yang ditentukan.
        9. **TIDAK ADA SUBSTITUSI TIPE (MANDATORY)**: Anda WAJIB menggunakan tepat kerangka/struktur JSON milik tipe soal yang bersangkutan sesuai panduan. JANGAN PERNAH mengubah tipe soal A menjadi tipe B dengan argumen kemiripan wujud/logika materi (Misal: merubah \`pg_matrix\` ke format \`true_false\`, \`essay\` ke \`short_answer\`, dsb). Konsekuensi struktural akan fatal jika ini dilanggar!
        10. **ANTI-MONOTON (WAJIB)**: Jangan mengulang tipe cerita, tokoh, format perhitungan, atau gaya bahasa yang sama berulang-ulang dari soal sebelumnya. Pastikan variasi yang kaya dan dinamis pada setiap butir soal!
        
         STRUKTUR JSON PER TIPE (INPUT HARUS SESUAI):
         - **Wajib Ada di Setiap Soal**: 
           "pedagogical_materi": "Materi spesifik soal ini (max 5 kata)",
           "competency": "Intisari CP relevan (Singkat)", 
           "indicator": "Indikator operasional (Singkat)", 
           "cognitive_level": "L1/L2/L3/L4/L5/L6",
           "stimulus": "Teks stimulus/kasus untuk soal ini (kosongkan jika mode tanpa stimulus)",
           "image_hint": "Instruksi gambar (Opsional, gunakan [] jika ada)",
           "visualization": "Visualisasi (Opsional, 5% soal)"
         - **pg**: {"type": "pg", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "options": ["A...", "B..."], "answer": "A...", "explanation": "..."}
         - **pg_complex**: {"type": "pg_complex", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "options": ["1...", "2..."], "answer": ["1...", "3..."], "explanation": "..."}
          - **pg_matrix**: {"type": "pg_matrix", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "rows": ["Pernyataan 1", "Pernyataan 2"], "columns": ["Kategori A", "Kategori B"], "answer": [{"row": "Pernyataan 1", "column": "Kategori A"}], "explanation": "..."}
          - **matching**: {"type": "matching", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "left_side": ["Pernyataan A", "Pernyataan B"], "right_side": ["Jawaban 2", "Jawaban 1", "Jawaban 3"], "pairs": [{"left": "Pernyataan A", "right": "Jawaban 1"}], "explanation": "..."}
          - **true_false**: {"type": "true_false", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "statements": [{"text": "S1", "isCorrect": true}], "explanation": "..."}
          - **short_answer**: {"type": "short_answer", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "answer": "Kunci jawaban (Singkat 1-3 kata)", "explanation": "..."}
          - **sequencing**: {"type": "sequencing", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "items": ["Langkah A", "Langkah B", "Langkah C"], "correct_order": ["Langkah B", "Langkah A", "Langkah C"], "explanation": "..."}
          - **essay/uraian**: {"type": "essay", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "answer": "Kunci jawaban (WAJIB SINGKAT & PADAT)", "grading_guide": "Pedoman penskoran ringkas", "explanation": "Penjelasan singkat"}

        FORMAT OUTPUT TOTAL (JSON):
        {
          "title": "${topic}",
          "questions": [
             // Masukkan ${batchInstructions.split('\n').length} soal di sini sesuai tipe di atas
          ]
        }
      `;

export const getQuizFromImagePrompt = ({ count, gradeLevel, subject, topic, BSKAP_DATA }) => `
      Anda adalah "Ahli Visual Pendidikan" yang bekerja berdasarkan repositori **BSKAP_DATA**.
      
      **OFFICIAL KNOWLEDGE ENGINE (BSKAP_DATA):**
      - Regulasi Dasar: **${BSKAP_DATA.standards.regulation}**
      - Filosofi Operasional: **${BSKAP_DATA.standards.philosophy.name}**
      
      **TUGAS:**
      Analisis gambar/dokumen yang diberikan dan buatlah ${count} soal pilihan ganda yang **WAJIB** merujuk pada standar CP resmi dan kosakata resmi **Kemendikdasmen** untuk:
      - Jenjang/Kelas: ${gradeLevel}
      - Mata Pelajaran: ${subject}
      - Fokus Materi: ${topic}
      
      **INSTRUKSI PENTING (STRICT):**
      1. **SOURCE OF TRUTH**: Seluruh isi soal, stimulus, dan penjelasan harus selaras dengan buku teks resmi.
      2. **TERMINOLOGI**: Gunakan "Peserta Didik".
      3. **PRINSIP DEEP LEARNING**: Pastikan soal bermakna (Meaningful) dan tidak sekadar hafalan visual murni.
      
      INSTRUKSI TEKNIS:
      1.  Jika gambar adalah **Diagram/Anatomi**: Buat soal yang menunjuk bagian tertentu (misal: "Fungsi bagian yang ditunjuk huruf X adalah...").
      2.  Jika gambar adalah **Teks/Infografis**: Buat soal literasi informasi.
      3.  Jika gambar adalah **Pemandangan/Situasi**: Buat soal analisis situasi atau cerita.
      
      FORMAT OUTPUT (JSON ONLY):
      {
        "questions": [
           {
             "id": 1,
             "type": "pg",
             "pedagogical_materi": "Sub-materi spesifik dari gambar (max 5 kata)",
             "competency": "Kompetensi relevan (Singkat)",
             "indicator": "Indikator (Format: Disajikan gambar..., siswa dapat...)",
             "stimulus": "Penjelasan singkat tentang bagian gambar yang dirujuk",
             "question": "Berdasarkan gambar di atas, ...?",
             "options": ["A...", "B...", "C...", "D...", "E..."],
             "answer": "A...",
             "explanation": "..."
           }
        ]
      }
    `;
