import { mathVisuals } from './visualizations/mathVisuals';
import { scienceVisuals } from './visualizations/scienceVisuals';
import { techVisuals } from './visualizations/techVisuals';
import { artsVisuals } from './visualizations/artsVisuals';
import { generalVisuals } from './visualizations/generalVisuals';

const getSubjectVisualizations = (subjectName) => {
    if (!subjectName) return generalVisuals;
    const subject = subjectName.toLowerCase();
    
    if (subject.includes('matematika') || subject.includes('fisika')) return mathVisuals;
    if (subject.includes('kimia') || subject.includes('biologi') || subject.includes('ipa') || subject.includes('sains')) return scienceVisuals;
    if (subject.includes('informatika') || subject.includes('tik') || subject.includes('komputer')) return techVisuals;
    if (subject.includes('seni') || subject.includes('musik')) return artsVisuals;
    
    return generalVisuals;
};

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
        - HOTS Meter: ${difficulty}%
        - Status: Batch ${batchNum} dari ${batches.length}
        ${allQuestions.length > 0 ? `- SOAL SEBELUMNYA: ${allQuestions.map((q, i) => `${i+1}. ${q.question}`).join('\n')}` : ''}

        TUGAS UTAMA: 
        1. Analisis SELURUH materi dalam "Konteks".
        2. Buatlah soal yang **BERIMBANG**.
        ${batchInstructions}

        STRICT RULES:
        1. ${getStimulusModeInstruction(stimulusMode, batchInstructions.split('\n').length)}
        2. **VISUALIZATION (SANGAT PENTING - 30% SOAL)**: Minimal 30% soal WAJIB memiliki visualisasi premium yang berwarna-warni (vibrant colors).
             **[PERINGATAN KERAS UNTUK SEMUA VISUAL DI BAWAH INI]**
             Contoh JSON berikut hanyalah STRUKTUR/FORMAT. Anda **DILARANG KERAS** menyalin isinya secara mentah (copy-paste)! Anda **WAJIB MENGGANTI** seluruh teks, angka, node diagram, fungsi aljabar, data tabel, dan elemen lainnya agar **100% SINKRON/RELEVAN** dengan teks dan angka pada soal yang sedang Anda buat! JANGAN MALAS!
${getSubjectVisualizations(subject)}

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
      `;

export const getQuizFromImagePrompt = ({ count, gradeLevel, subject, topic, BSKAP_DATA }) => `
      Buat ${count} soal PG berdasarkan gambar dan standar BSKAP. Output JSON murni.
    `;
