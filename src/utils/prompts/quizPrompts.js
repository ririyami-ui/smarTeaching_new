import { mathVisuals } from './visualizations/mathVisuals';
import { techVisuals } from './visualizations/techVisuals';
import { generalVisuals } from './visualizations/generalVisuals';
import { getSmartVisualRules, getBSKAPContext, getBookMaterial } from './quizIntelligenceRouter';
import bskapData from '../bskap_2025_intel.json';
import bookIndex from '../data/books/index.json';

export const getAdvancedQuizPrompt = ({ topic, context, bookContext, BSKAP_DATA, gradeLevel, subject, batchNum, batches, allQuestions, batchInstructions, optionCount, optionLabel, difficulty, stimulusMode = 'auto', chapterVisualHint }) => {
    const smartRules = getSmartVisualRules(subject, topic);
    const bskapContext = getBSKAPContext(bskapData, gradeLevel, subject);
    const intelligentBookContext = getBookMaterial(bookIndex, subject, gradeLevel, topic);

    const systemInstruction = `
[ROLE]
Anda adalah AI Spesialis Pembuat Soal yang patuh 100% pada Kurikulum Merdeka BSKAP 2025 (Kepka 046/2025).

[SINKRONISASI KONTEKS]
Mata Pelajaran: ${subject}
Materi Inti: ${topic}
Jenjang: Kelas ${gradeLevel} ${bskapContext}
Tingkat Kesulitan: ${difficulty}% (HOTS Meter)
Sumber Materi: ${bookContext ? bookContext + "\\n" + intelligentBookContext : intelligentBookContext}

[ATURAN VISUALISASI CERDAS]
${chapterVisualHint ? `[PRIORITAS VISUAL]: Berdasarkan Buku Kurikulum, Anda WAJIB memprioritaskan tipe visualisasi: **${chapterVisualHint}**.` : ''}
WAJIB diikuti tanpa kecuali:
- TIPE VISUALISASI YANG DIIZINKAN: ${smartRules.allowed.join(', ')} (PILIH SALAH SATU YANG PALING COCOK)
- TIPE VISUALISASI YANG DILARANG: ${smartRules.forbidden.join(', ')}
- INSTRUKSI KHUSUS: ${smartRules.forceInstruction}

[VISUAL TEMPLATE - PILIH SALAH SATU SESUAI KONTEKS SOAL]
${smartRules.allowed.includes('spreadsheet') ? `[SPREADSHEET] Untuk tabel data: {"type": "spreadsheet", "config": { "selectedCell": "A1", "data": [ {"row": ["Nama", "Skor"]}, {"row": ["Budi", "90"]} ] } }` : ''}
${smartRules.allowed.includes('logic') ? `[LOGIC] Untuk gerbang logika: {"type": "logic", "config": { "code": "A AND B -> Y" } }` : ''}
${smartRules.allowed.includes('mermaid') ? `[MERMAID] Untuk alur/proses: {"type": "mermaid", "config": { "diagram": "graph LR\\nA[Mulai] --> B{Kondisi}\\nB -- Ya --> C[Selesai]\\nB -- Tidak --> D[Ulang]" } } (Gunakan "graph LR" agar diagram melebar horizontal dan tidak bertumpuk).` : ''}
${smartRules.allowed.includes('function') ? `[FUNCTION] Untuk grafik matematika: {"type": "math", "config": { "expression": "y=x", "range": [-10, 10] } }` : ''}
${smartRules.allowed.includes('scratch') ? `[SCRATCH] Untuk blok algoritma: {"type": "scratch", "config": { "code": "when green flag clicked\\nforever\\nif <key [space] pressed?> then\\nmove (10) steps\\nend\\nend" } }` : ''}
${smartRules.allowed.includes('chart') ? `[CHART] Untuk grafik statistik: {"type": "chart", "config": { "type": "bar", "data": [{"x": "A", "y": 10}], "title": "Data" } }` : ''}

[SAYARAT MUTLAK SINKRONISASI]
Jika teks soal yang Anda buat mengandung kata "tabel", "spreadsheet", "kolom", atau "sel", Anda DIWAJIBKAN 100% menggunakan tipe "spreadsheet" (jika diizinkan) dan DILARANG KERAS menggunakan tipe "mermaid" atau flowchart. Jangan pernah menggambar proses logika jika konteks fisiknya adalah tabel.
`;

    return `
${systemInstruction}
        LANDASAN REGULASI: **${BSKAP_DATA?.standards?.regulation || 'BSKAP No. 46 Tahun 2025'}** (Standar Nasional Kurikulum Merdeka).
        STANDAR PEDAGOGIS: **${BSKAP_DATA?.standards?.philosophy?.name || 'Deep Learning'}** (${BSKAP_DATA?.standards?.philosophy?.pillars?.map(p => p.name).join(', ') || 'Mindful, Meaningful, Joyful'}).
        [ANTI-SPOILER VISUAL]: Visualisasi berfungsi sebagai STIMULUS (Pemberi Masalah) atau KONTEKS. DILARANG KERAS mencantumkan KUNCI JAWABAN atau KESIMPULAN di dalam gambar visualisasi. Biarkan siswa yang menganalisis.
        
        INSTRUKSI UTAMA:
        1. Buat ${batchNum === batches ? (allQuestions % 5 || 5) : 5} soal kuis (Batch ${batchNum}/${batches}).
        2. Format: JSON ARRAY of OBJECTS.
        3. Setiap soal harus unik dan memiliki: question, type, options, answer, explanation, indicator, competency, cognitive_level, stimulus, dan visualization.
        4. [ATURAN DISTRIBUSI VISUAL]: JANGAN beri visualisasi pada semua soal! HANYA berikan visual (maksimal 30-50% soal) pada pertanyaan yang memang membutuhkan analisis gambar/tabel. Untuk soal teori/konsep murni atau jika Anda ragu, isi field "visualization" dengan null. DILARANG KERAS mengirimkan objek kosong "{}" jika tidak ada data visual konkret.
        5. [FATAL ERROR RISK] JIKA Anda membuat visualisasi, "type" dan "config" HARUS HANYA dari daftar "TIPE VISUALISASI YANG DIIZINKAN". 
           [ATURAN SINKRONISASI]: ${smartRules.allowed.includes('spreadsheet') ? `Jika teks soal Anda menyebut "tabel", "spreadsheet", "kolom", atau "sel", Anda WAJIB mengisi "type": "spreadsheet" dan DILARANG KERAS menggunakan "mermaid".` : `Pastikan visual yang Anda pilih selaras dengan konteks benda fisik di dalam soal.`}
           [ANTI-SPOILER]: Visualisasi TIDAK BOLEH berisi jawaban! Jika visual adalah soal teka-teki/analisis, gunakan tanda tanya ("?") atau biarkan sel kosong pada bagian yang menjadi pertanyaan. Jika melanggar, soal Anda akan dihapus oleh sistem.
        6. Opsi Jawaban: Gunakan ${optionCount} pilihan dengan label ${optionLabel}.
        
        Konteks Tambahan Guru: ${context || 'Tidak ada'}
        ${batchInstructions || ''}

        STRUKTUR JSON PER TIPE (WAJIB):
         - **pg**: {"type": "pg", "pedagogical_materi": "...", "competency": "...", "indicator": "...", "cognitive_level": "...", "stimulus": "...", "question": "...", "options": ["A...", "B..."], "answer": "A...", "explanation": "...", "visualization": {...}}
         - **matching**: {"type": "matching", "stimulus": "...", "question": "...", "left_side": ["A"], "right_side": ["1"], "pairs": [{"left": "A", "right": "1"}], "explanation": "...", "visualization": {...}}
         - **true_false**: {"type": "true_false", "stimulus": "...", "question": "...", "statements": [{"text": "S1", "isCorrect": true}], "explanation": "...", "visualization": {...}}
         - **pg_complex**: {"type": "pg_complex", "stimulus": "...", "question": "...", "options": ["1..."], "answer": ["1..."], "explanation": "...", "visualization": {...}}
         - **pg_matrix**: {"type": "pg_matrix", "stimulus": "...", "question": "...", "rows": ["P1"], "columns": ["K1"], "answer": [{"row": "P1", "column": "K1"}], "explanation": "...", "visualization": {...}}
         - **sequencing**: {"type": "sequencing", "stimulus": "...", "question": "...", "items": ["Langkah A"], "correct_order": ["Langkah A"], "explanation": "...", "visualization": {...}}

        FORMAT OUTPUT TOTAL (JSON):
        {
          "title": "${topic}",
          "questions": []
        }
        
        Keluaran harus VALID JSON murni tanpa markdown blocks.
    `;
};

export const getQuizFromImagePrompt = ({ count, gradeLevel, subject, topic, BSKAP_DATA }) => `
      Buat ${count} soal PG berdasarkan gambar dan standar BSKAP. Output JSON murni.
`;
