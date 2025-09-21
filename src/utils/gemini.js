import { GoogleGenerativeAI } from "@google/generative-ai";

// Get the API key from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize the GoogleGenerativeAI client
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- Caching variables for analyzeTeachingJournals ---
let lastAnalyzedJournalsString = null;
let lastAnalysisResultCache = null;
// --- End Caching variables ---

// --- Caching variables for generateClassAnalysisReport ---
let lastAnalyzedClassDataString = null;
let lastClassAnalysisReportCache = null;
// --- End Caching variables ---

// --- Caching variables for generateConciseClassAnalysisReport ---
let lastAnalyzedConciseClassDataString = null;
let lastConciseClassAnalysisReportCache = null;
// --- End Caching variables ---

/**
 * Creates a system instruction prompt for the AI.
 * @param {Object} userProfile - The user's profile data.
 * @returns {Object} The system instruction object for the model.
 */
const createSystemInstruction = (userProfile) => {
    let userName = "Guru"; // Default name
    if (userProfile) {
        userName = userProfile.name || userProfile.email.split('@')[0];
    }

    const instruction = `
        Anda adalah "Smarty", asisten AI yang ramah dan sangat membantu untuk para guru di aplikasi Smart Teaching.
        Nama pengguna yang sedang berinteraksi dengan Anda adalah Bpk/Ibu ${userName}.
        Selalu sapa pengguna dengan nama ini jika relevan, dan pertahankan nada yang profesional namun bersahabat.
        
        Tugas utama Anda:
        1. Menjawab pertanyaan terkait pendidikan, strategi mengajar, manajemen kelas, dan pengembangan profesional.
        2. Memberikan ide-ide kreatif untuk materi pembelajaran, tugas, dan proyek.
        3. Membantu menganalisis data (jika diberikan dalam prompt) dan memberikan wawasan.
        4. Memberikan dukungan dan motivasi kepada guru.

        Aturan Respons:
        - Selalu gunakan Bahasa Indonesia yang baik dan benar.
        - Jawaban harus jelas, ringkas, dan mudah dipahami.
        - Jika pertanyaan tidak jelas, ajukan pertanyaan klarifikasi.
        - Anda tidak dapat mengakses data pengguna atau data sekolah secara langsung, jadi jangan mengklaim bisa melakukannya. Jawaban Anda hanya berdasarkan informasi yang diberikan dalam percakapan.
        - Di akhir jawaban Anda, sebagai bagian dari kalimat penutup, berikan 1-2 saran pertanyaan lanjutan yang relevan dan singkat. Contoh: '...apakah Anda ingin saya menjelaskan lebih lanjut tentang RPP, atau mungkin topik lain?'
    `;

    return { parts: [{ text: instruction }] };
};


/**
 * Generates a response for a conversational chat.
 * @param {Array<Object>} history - The conversation history.
 * @param {string} newMessage - The new message from the user.
 * @param {Object} userProfile - The user's profile data.
 * @returns {Promise<string>} The generated response text.
 */
export async function generateChatResponse(history, newMessage, userProfile) {
  try {
    const sanitizedHistory = [];
    if (history && history.length > 0) {
        // Find the index of the first message with the 'user' role.
        const firstUserIndex = history.findIndex(msg => msg.role === 'user');

        if (firstUserIndex !== -1) {
            // Start the history from the first user message.
            let lastRole = '';
            for (let i = firstUserIndex; i < history.length; i++) {
                const message = history[i];
                // Add message only if the role is different from the last one.
                if (message.role !== lastRole) {
                    sanitizedHistory.push(message);
                    lastRole = message.role;
                }
            }
        }
    }

    const systemInstruction = createSystemInstruction(userProfile);

    const chat = model.startChat({
      history: sanitizedHistory,
      generationConfig: {
        maxOutputTokens: 8192, // Increased for more detailed answers
      },
      systemInstruction: systemInstruction,
    });

    const result = await chat.sendMessage(newMessage);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error generating chat response with Gemini API: ", error);
    return "Maaf, terjadi sedikit kendala dengan koneksi ke AI. Silakan coba beberapa saat lagi.";
  }
}


/**
 * Analyzes teaching journals to provide a summary and sentiment analysis.
 * Implements caching: returns cached result if journals data has not changed.
 * @param {Array<Object>} journals - The list of journal objects.
 * @returns {Promise<Object>} An object containing the summary and sentiment.
 */
export async function analyzeTeachingJournals(journals) {
  if (!journals || journals.length === 0) {
    lastAnalyzedJournalsString = null;
    lastAnalysisResultCache = null;
    return { summary: "Tidak ada jurnal untuk dianalisis.", sentiment: { percentage: 0, explanation: "" } };
  }

  const currentJournalsString = JSON.stringify(journals);

  if (currentJournalsString === lastAnalyzedJournalsString && lastAnalysisResultCache !== null) {
    console.log("Returning cached analysis result for teaching journals.");
    return lastAnalysisResultCache;
  }

    const modelForAnalysis = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const journalTexts = journals.map(journal => `
    Tanggal: ${journal.date}
    Kelas: ${journal.className}
    Mata Pelajaran: ${journal.subjectName}
    Materi: ${journal.material}
    Tujuan Pembelajaran: ${journal.learningObjectives}
    Kegiatan Pembelajaran: ${journal.learningActivities}
    Refleksi: ${journal.reflection || 'Tidak ada'}
    Hambatan: ${journal.challenges || 'Tidak ada'}
    Tindak Lanjut: ${journal.followUp || 'Tidak ada'}
    ---
  `).join('\n');

  const prompt = `
    Anda adalah seorang asisten analisis data untuk guru. Berdasarkan beberapa entri jurnal mengajar berikut:
    ${journalTexts}

    Berikan analisis dalam format yang ketat dan ringkas:
    1.  **Ringkasan**: Ringkasan singkat dan padat (1-2 kalimat) mengenai kegiatan, tantangan, dan refleksi utama.
    2.  **Analisis Sentimen**: Analisis sentimen keseluruhan dari refleksi dan hambatan dalam bentuk persentase positif (misal: 75%) dan penjelasan singkat mengapa sentimen tersebut muncul.

    Format output Anda HARUS seperti ini, dan tidak ada teks lain di luar format ini:
    RINGKASAN: [Ringkasan Anda]
    SENTIMEN_PERSENTASE: [Persentase positif, misal 75]
    SENTIMEN_PENJELASAN: [Penjelasan singkat sentimen]
  `;

  try {
    const result = await modelForAnalysis.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let summary = "Tidak dapat menghasilkan ringkasan.";
    let sentimentPercentage = 0;
    let sentimentExplanation = "Tidak dapat menganalisis sentimen.";

    const summaryMatch = text.match(/RINGKASAN: (.*)/);
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }

    const sentimentPercentageMatch = text.match(/SENTIMEN_PERSENTASE: (\d+)/);
    if (sentimentPercentageMatch && sentimentPercentageMatch[1]) {
      sentimentPercentage = parseInt(sentimentPercentageMatch[1], 10);
    }

    const sentimentExplanationMatch = text.match(/SENTIMEN_PENJELASAN: (.*)/);
    if (sentimentExplanationMatch && sentimentExplanationMatch[1]) {
      sentimentExplanation = sentimentExplanationMatch[1].trim();
    }

    const analysisResult = {
      summary,
      sentiment: {
        percentage: sentimentPercentage,
        explanation: sentimentExplanation,
      },
    };

    lastAnalyzedJournalsString = currentJournalsString;
    lastAnalysisResultCache = analysisResult;

    return analysisResult;
  } catch (error) {
    console.error("Error analyzing teaching journals with Gemini API: ", error);
    lastAnalyzedJournalsString = null;
    lastAnalysisResultCache = null;
    return { summary: "kuota AI terbatas, mohon maaf.", sentiment: { percentage: 0, explanation: "kuota AI terbatas, mohon maaf." } };
  }
}


/**
 * Analyzes teaching journals to find mentions of specific students and identify potential issues.
 * @param {Array<Object>} journals - The list of all journal objects.
 * @param {Array<string>} studentNames - The list of student names to look for.
 * @returns {Promise<Object>} An object where keys are student IDs and values are arrays of warning strings.
 */
export async function analyzeJournalsForStudentWarnings(journals, students) {
  if (!journals || journals.length === 0 || !students || students.length === 0) {
    return {};
  }

  const studentNames = students.map(s => s.name);
  const studentMap = students.reduce((acc, student) => {
    acc[student.name] = student.id;
    return acc;
  }, {});

  const modelForWarnings = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const journalTexts = journals.map(j => `
    --- JURNAL BARU ---
    Tanggal: ${j.date}
    Kelas: ${j.className}
    Materi: ${j.material}
    Refleksi: ${j.reflection || '-'}
    Hambatan: ${j.challenges || '-'}
    ---
  `).join('\n');

  const prompt = `
    Anda adalah AI asisten guru yang cerdas. Tugas Anda adalah membaca kumpulan jurnal mengajar berikut dan mengidentifikasi catatan negatif atau kekhawatiran tentang siswa tertentu.

    Jurnal Mengajar:
    ${journalTexts}

    Daftar Nama Siswa untuk Dipindai:
    ${studentNames.join(', ')}

    Analisis setiap jurnal dan identifikasi jika ada siswa dari daftar di atas yang disebutkan dalam konteks negatif, seperti "sulit fokus", "tidak mengerjakan tugas", "mengganggu kelas", "sering melamun", "terlihat sedih", "kurang berpartisipasi", atau masalah lainnya.

    Hasilkan output dalam format JSON yang ketat. Kunci JSON adalah nama siswa, dan nilainya adalah array string yang berisi ringkasan singkat dari setiap masalah yang ditemukan untuk siswa tersebut. 
    
    Contoh output:
    {
      "Budi Santoso": ["Disebutkan mengalami kesulitan fokus saat pelajaran matematika.", "Ada catatan bahwa Budi tidak mengerjakan PR."],
      "Ani Lestari": ["Terlihat kurang aktif dan sering melamun di kelas."]
    }

    Jika tidak ada siswa yang disebutkan atau tidak ada catatan negatif yang ditemukan untuk siswa mana pun, kembalikan objek JSON kosong {}.
  `;

  try {
    const result = await modelForWarnings.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) {
      console.error("AI response is not in the expected JSON format:", text);
      return {};
    }

    const parsedResult = JSON.parse(jsonMatch[0]);

    const warningsByStudentId = {};
    for (const name in parsedResult) {
      const studentId = studentMap[name];
      if (studentId) {
        warningsByStudentId[studentId] = parsedResult[name];
      }
    }

    return warningsByStudentId;

  } catch (error) {
    console.error("Error analyzing journals for student warnings with Gemini API: ", error);
    return { error: "kuota AI terbatas, mohon maaf." }; // Return empty object on error
  }
}


/**
 * Generates a comprehensive analysis report for a class.
 * @param {Object} classData - Data for the class, including students, grades, attendance, etc.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
export async function generateClassAnalysisReport(classData) {
  const currentClassDataString = JSON.stringify(classData);

  if (currentClassDataString === lastAnalyzedClassDataString && lastClassAnalysisReportCache !== null) {
    console.log("Returning cached analysis report for class.");
    return lastClassAnalysisReportCache;
  }

  const { className, students, grades, attendance, infractions, journals } = classData;

  // Basic data formatting for the prompt
  const studentCount = students.length;
  const attendanceSummary = attendance.length > 0 ? JSON.stringify(attendance, null, 2) : "Tidak ada data kehadiran.";
  const gradesSummary = grades.length > 0 ? JSON.stringify(grades, null, 2) : "Tidak ada data nilai.";
  const infractionsSummary = infractions.length > 0 ? JSON.stringify(infractions, null, 2) : "Tidak ada data pelanggaran.";
  const journalsSummary = journals.length > 0 ? journals.map(j => `- ${j.date}: ${j.reflection || j.material}`).join('\n') : "Tidak ada catatan jurnal guru.";

  const prompt = `
    Anda adalah seorang konsultan pendidikan dan analis data yang sangat berpengalaman.
    Tugas Anda adalah menganalisis data dari sebuah kelas bernama "${className}" dan memberikan laporan komprehensif beserta solusi praktis untuk guru kelas tersebut.

    Berikut adalah data yang tersedia untuk kelas ini:
    - Jumlah Siswa: ${studentCount}
    - Ringkasan Kehadiran: ${attendanceSummary}
    - Ringkasan Nilai: ${gradesSummary}
    - Ringkasan Pelanggaran: ${infractionsSummary}

    Instruksi tambahan untuk Analisis Perilaku:
    Jika ada data pelanggaran, hitung total pelanggaran, identifikasi jenis pelanggaran paling umum, dan sebutkan siswa yang paling sering melakukan pelanggaran (jika relevan). Berikan rekomendasi berdasarkan pola pelanggaran yang ditemukan. Jika tidak ada pelanggaran, nyatakan dengan jelas.
    - Catatan Jurnal Guru:
    ${journalsSummary}

    PENTING: Saat merujuk pada siswa, selalu gunakan nama siswa (studentName) dan JANGAN PERNAH menyertakan studentId atau ID lainnya.

    Berdasarkan data di atas, buatlah laporan dengan format Markdown yang jelas dan terstruktur sebagai berikut:

    ### Laporan Analisis Kelas: ${className}

    **1. Ringkasan Umum**
    Berikan paragraf singkat yang merangkum kondisi umum kelas berdasarkan semua data yang ada.

    **2. Analisis Akademik**
    - Analisis performa akademik kelas secara keseluruhan.
    - Identifikasi mata pelajaran yang menjadi kekuatan atau kelemahan kelas.
    - Sebutkan jika ada kelompok siswa yang menonjol (berprestasi tinggi) atau yang memerlukan perhatian khusus (berprestasi rendah).

    **3. Analisis Kehadiran**
    - Analisis tingkat kehadiran secara umum.
    - Identifikasi jika ada pola absensi yang perlu diwaspadai (misalnya, siswa tertentu yang sering absen atau absen pada hari-hari tertentu).

    **4. Analisis Perilaku**
    - Analisis catatan pelanggaran untuk mengidentifikasi masalah perilaku yang dominan di kelas.
    - Berikan penilaian tentang suasana belajar di kelas berdasarkan data pelanggaran dan catatan jurnal guru.

    **5. Rekomendasi dan Solusi Praktis**
    Berdasarkan semua analisis di atas, berikan daftar rekomendasi yang konkret, praktis, dan dapat ditindaklanjuti oleh guru. Kelompokkan rekomendasi berdasarkan area (Akademik, Kehadiran, Perilaku, Manajemen Kelas).
    - **Solusi Akademik:** (Contoh: Sarankan metode pengajaran alternatif, program bimbingan, atau penggunaan materi tambahan).
    - **Solusi Kehadiran:** (Contoh: Sarankan strategi untuk meningkatkan kehadiran, pendekatan komunikasi dengan orang tua).
    - **Solusi Perilaku:** (Contoh: Sarankan teknik manajemen kelas, sistem penghargaan, atau intervensi individual).

    Pastikan laporan Anda objektif, berbasis data, dan memberikan solusi yang benar-benar membantu guru untuk meningkatkan efektivitas pengajaran dan mengelola kelasnya dengan lebih baik.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    lastAnalyzedClassDataString = currentClassDataString;
    lastClassAnalysisReportCache = text;

    return text;
  } catch (error) {
    console.error("Error generating class analysis report with Gemini API: ", error);
    lastAnalyzedClassDataString = null;
    lastClassAnalysisReportCache = null;
    return "Maaf, terjadi kesalahan saat membuat laporan analisis kelas. Silakan coba lagi.";
  }
}

/**
 * Generates a concise analysis report for a class.
 * @param {Object} classData - Data for the class, including students, grades, attendance, etc.
 * @returns {Promise<string>} The generated concise report in Markdown format.
 */
export async function generateConciseClassAnalysisReport(classData) {
  const currentClassDataString = JSON.stringify(classData);

  if (currentClassDataString === lastAnalyzedConciseClassDataString && lastConciseClassAnalysisReportCache !== null) {
    console.log("Returning cached concise analysis report for class.");
    return lastConciseClassAnalysisReportCache;
  }

  const { className, students, grades, attendance, infractions, journals } = classData;

  const studentCount = students.length;
  const attendanceSummary = attendance.length > 0 ? JSON.stringify(attendance.slice(0, 10)) : "Tidak ada data kehadiran."; // Limit data for conciseness
  const gradesSummary = grades.length > 0 ? JSON.stringify(grades.slice(0, 15)) : "Tidak ada data nilai."; // Limit data for conciseness
  const infractionsSummary = infractions.length > 0 ? JSON.stringify(infractions.slice(0, 10)) : "Tidak ada data pelanggaran."; // Limit data for conciseness
  const journalsSummary = journals.length > 0 ? journals.slice(0, 5).map(j => `- ${j.date}: ${j.reflection || j.material}`).join('\n') : "Tidak ada catatan jurnal guru.";

  const prompt = `
    Anda adalah asisten AI untuk guru yang efisien. Analisis data kelas "${className}" berikut dan berikan laporan yang **ringkas dan padat**.

    Data yang tersedia (beberapa data mungkin dipotong untuk keringkasan):
    - Jumlah Siswa: ${studentCount}
    - Data Kehadiran: ${attendanceSummary}
    - Data Nilai: ${gradesSummary}
    - Data Pelanggaran: ${infractionsSummary}
    - Catatan Jurnal Guru: ${journalsSummary}

    PENTING: Saat merujuk pada siswa, selalu gunakan nama siswa (studentName) dan JANGAN PERNAH menyertakan studentId atau ID lainnya.

    Tugas Anda adalah membuat laporan dalam format Markdown yang singkat dan langsung ke intinya, dengan struktur berikut:

    ### Analisis Ringkas Kelas: ${className}

    **1. Poin Utama Akademik**
    - Tulis 1-2 poin paling signifikan tentang kekuatan atau kelemahan akademik kelas.

    **2. Poin Utama Perilaku & Kehadiran**
    - Tulis 1-2 poin paling menonjol mengenai pola kehadiran atau perilaku siswa.

    **3. Tiga Rekomendasi Teratas**
    - Berikan 3 saran paling penting dan praktis yang bisa langsung diterapkan oleh guru.

    Gunakan bahasa yang jelas, hindari penjelasan yang terlalu panjang, dan fokus hanya pada informasi yang paling krusial.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    lastAnalyzedConciseClassDataString = currentClassDataString;
    lastConciseClassAnalysisReportCache = text;

    return text;
  } catch (error) {
    console.error("Error generating concise class analysis report with Gemini API: ", error);
    lastAnalyzedConciseClassDataString = null;
    lastConciseClassAnalysisReportCache = null;
    return "Maaf, terjadi kesalahan saat membuat laporan analisis ringkas. Silakan coba lagi.";
  }
}



/**
 * Generates a concise analysis of students who need special attention in a class (rombel).
 * @param {Array<Object>} studentDataForPrompt - The data for each student.
 * @param {string} rombel - The name of the class.
 * @returns {Promise<string>} The generated recommendation in Markdown format.
 */
export async function generateRombelAnalysis(studentDataForPrompt, rombel) {
  const prompt = `
      Anda adalah seorang asisten guru yang ahli, ringkas, dan fokus pada tindakan. 
      Analisis data siswa berikut untuk kelas (rombel) '${rombel}'.

      Data Siswa Individual:
      ${JSON.stringify(studentDataForPrompt, null, 2)}

      Tugas Anda:
      Identifikasi siswa yang memerlukan perhatian khusus berdasarkan kombinasi kehadiran (terutama jumlah 'Alpha' yang tinggi) dan nilai (terutama nilai rata-rata di bawah 75).
      
      Hasilkan daftar bernomor (numbering) yang berisi hanya siswa-siswa tersebut. Untuk setiap siswa, berikan satu kalimat singkat yang menjelaskan masalahnya sesuai format yang diminta (nama ditebalkan, tanpa tanda kurung).

      Contoh output yang diinginkan:
      1. **DURROTUL HIKMAH** butuh perhatian khusus karena nilai rata-ratanya masih rendah (68.50).
      2. **MUHAMMAD ANDI RAMADANI** tingkat kehadirannya rendah (Alpha: 5) dan nilainya juga perlu ditingkatkan (72.00).
      3. **RAMDHAN TAUFIQUR RAHMAN** memiliki banyak catatan absensi tanpa keterangan (Alpha: 8).

      Jangan memberikan ringkasan, poin kekuatan, atau narasi panjang lainnya. Langsung ke daftar bernomor siswa yang perlu perhatian.
    `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error generating rombel analysis:", error);
    if (error.message.includes("503")) {
         return "Model AI sedang kelebihan beban. Silakan coba beberapa saat lagi.";
    }
    return "Gagal menghasilkan rekomendasi. Silakan coba lagi nanti.";
  }
}


/**
 * Generates an analysis report for a single student.
 * @param {string} prompt - The fully constructed prompt with student data.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
export async function generateStudentAnalysis(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error during AI analysis:", error);
    if (error.message.includes("503")) {
      return "Model AI sedang kelebihan beban. Silakan coba beberapa saat lagi.";
    }
    return "Terjadi kesalahan saat menghasilkan analisis.";
  }
}


// Export the initialized client for potential other uses
export default genAI;