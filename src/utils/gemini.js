import { GoogleGenerativeAI } from "@google/generative-ai";
import BSKAP_DATA from './bskap_2025_intel.json' with { type: 'json' };
// HMR Trigger Comment

/**
 * Gets the current Gemini API Key from localStorage or environment variables.
 * @returns {string} The API Key.
 */
const getApiKey = () => {
  const cachedKey = localStorage.getItem('GEMINI_API_KEY');
  return cachedKey || import.meta.env.VITE_GEMINI_API_KEY;
};

/**
 * Initializes or re-initializes the Generative AI model with the latest API key.
 * @returns {Object} The initialized model.
 */
const getModel = (modelName) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Default fallback if not specified or invalid, but trust input first since it might be user config
  const selectedModel = modelName || "gemini-2.0-flash-exp";
  return genAI.getGenerativeModel({ model: selectedModel });
};

/**
 * Helper to handle generation with automatic fallback for experimental models.
 */
const generateContentWithFallback = async (modelName, generateFn) => {
  try {
    const model = getModel(modelName);
    return await retryWithBackoff(() => generateFn(model));
  } catch (error) {
    const errorMsg = error.message || "";
    // If request failed and we were using the unstable preview model
    if ((errorMsg.includes("503") || errorMsg.includes("429") || errorMsg.toLowerCase().includes("overloaded")) &&
      modelName === "gemini-3-flash-preview") {

      console.warn("Gemini 3.0 Preview overloaded. Falling back to Gemini 2.0 Flash Stable.");
      const fallbackModelName = "gemini-2.0-flash-exp";
      const fallbackModel = getModel(fallbackModelName);

      // Retry once with the fallback model
      return await retryWithBackoff(() => generateFn(fallbackModel), 1);
    }
    throw error;
  }
};

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

// --- Caching variables for generateStudentNarrative ---
let lastNarrativeInputString = null;
let lastNarrativeResultCache = null;
// --- End Caching variables ---

/**
 * A helper function to retry a function with exponential backoff.
 * @param {Function} fn The function to retry.
 * @param {number} retries The number of retries.
 * @param {number} delay The initial delay in milliseconds.
 * @returns {Promise<any>} The result of the function.
 */
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    const errorMsg = error.message || "";
    const isQuotaError = errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota");
    const isRetriable = errorMsg.includes("503") || isQuotaError;

    if (retries > 0 && isRetriable) {
      // Try to parse wait time from error message if it's a quota error
      let waitTime = delay;
      if (isQuotaError) {
        const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/);
        if (retryMatch && retryMatch[1]) {
          waitTime = (parseFloat(retryMatch[1]) + 1) * 1000; // Add 1s buffer
        } else {
          waitTime = delay * 5; // Much longer wait for quota
        }
      }

      console.log(`Retrying after ${waitTime}ms due to: ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryWithBackoff(fn, retries - 1, isQuotaError ? waitTime : delay * 2);
    } else {
      throw error;
    }
  }
};

/**
 * Common error handler for Gemini API calls.
 */
const handleGeminiError = (error, context) => {
  console.error(`Error in ${context}:`, error);
  const errorMsg = error.message || "";

  if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
    return "Server AI sibuk atau Kuota Harian habis. Mohon tunggu 1 menit, atau GANTI API KEY di pengaturan jika masalah berlanjut.";
  }
  if (errorMsg.includes("503")) {
    return "Server AI sedang sibuk (overloaded). Silakan coba lagi dalam beberapa detik.";
  }
  if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("invalid api key")) {
    return "API Key Gemini tidak valid. Silakan periksa kembali di menu Master Data.";
  }
  if (errorMsg === "API_KEY_MISSING") {
    return "API Key Gemini belum diatur. Silakan atur di menu Master Data.";
  }
  return "Maaf, terjadi kendala saat menghubungkan ke AI. Silakan coba beberapa saat lagi.";
};

/**
 * Extracts and parses a JSON object or array from a string, handling optional markdown or surrounding text.
 */
const extractJSON = (text) => {
  try {
    // 1. Try direct parse first
    return JSON.parse(text.trim().replace(/```json/g, '').replace(/```/g, ''));
  } catch (e) {
    // 2. Try regex extraction
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (innerError) {
      console.error("Failed to extract JSON using regex:", innerError);
    }
    throw new Error("Format output AI tidak valid (Bukan JSON).");
  }
};
/**
 * Helper to determine level (SD, SMP, SMA) from gradeLevel string/number.
 */
const getLevel = (grade) => {
  const g = parseInt(grade);
  if (isNaN(g)) {
    // If it's a phase or string like "X", try to map
    const s = String(grade).toUpperCase();
    if (['1', '2', '3', '4', '5', '6'].includes(s)) return 'SD';
    if (['7', '8', '9', 'VII', 'VIII', 'IX'].includes(s)) return 'SMP';
    if (['10', '11', '12', 'X', 'XI', 'XII'].includes(s)) return 'SMA';
    return 'SMA'; // Default fallback
  }
  if (g >= 1 && g <= 6) return 'SD';
  if (g >= 7 && g <= 9) return 'SMP';
  if (g >= 10 && g <= 12) return 'SMA';
  return 'SMA';
};

/**
 * Normalizes semester input to 'ganjil' or 'genap' key used in BSKAP_DATA.
 */
const getSemesterKey = (semester) => {
  if (!semester) return 'ganjil';
  const s = String(semester).toLowerCase().trim();
  // Handle numeric, roman, and Indonesian/English labels
  if (s === '1' || s === 'i' || s === 'ganjil' || s === 'odd' || s.includes('semester 1')) return 'ganjil';
  if (s === '2' || s === 'ii' || s === 'genap' || s === 'even' || s.includes('semester 2')) return 'genap';
  return 'ganjil'; // Default fallback
};

/**
 * Detects regional language from subject name (e.g., "Bahasa Daerah (Jawa)" -> "Jawa").
 * @param {string} subject - The subject name.
 * @returns {string|null} The regional language name or null.
 */
function getRegionalLanguage(subject) {
  if (!subject) return null;
  const match = subject.match(/bahasa daerah\s*\(([^)]+)\)/i);
  return match ? match[1] : null;
}

/**
 * Normalizes subject name to key used in BSKAP_DATA.
 * Handles "Bahasa Daerah (Region)" -> "Bahasa Daerah" mapping.
 */
const getSubjectKey = (subject) => {
  if (!subject) return "";
  if (subject.startsWith("Bahasa Daerah")) return "Bahasa Daerah";
  return subject;
};

/**
 * Gets a human-readable label for the semester.
 */
const getSemesterLabel = (semester) => {
  return getSemesterKey(semester) === 'ganjil' ? 'Ganjil' : 'Genap';
};

/**
 * Creates a system instruction prompt for the AI.
 * @param {Object} userProfile - The user's profile data.
 * @returns {Object} The system instruction object for the model.
 */
const createSystemInstruction = (userProfile) => {
  let userName = "Guru"; // Default name
  let userTitle = "Bpk/Ibu"; // Default title
  let schoolName = userProfile?.school || "Sekolah";
  let schoolLevel = userProfile?.schoolLevel || "SD/SMP/SMA";

  if (userProfile) {
    userName = userProfile.name || userProfile.email.split('@')[0];
    userTitle = userProfile.title || "Bpk/Ibu";

    // Fallback if title is just "Bapak/Ibu" (neutral)
    if (userTitle === "Bapak/Ibu") userTitle = "Bpk/Ibu";
  }

  const instruction = `
        Anda adalah "Smartty", asisten AI yang cerdas, hangat, dan sangat suportif untuk para guru di aplikasi Smart Teaching.
        Anda adalah seorang "Rekan Sejawat" (Co-Teacher) yang ahli dalam Kurikulum Merdeka dan pedagogi modern.
        
        DATA PENGGUNA:
        - Nama: ${userTitle} ${userName}
        - Sekolah: ${schoolName}
        - Jenjang: ${schoolLevel}
        
        **1. FILOSOFI & KURIKULUM (KECERDASAN UTAMA):**
        - Anda adalah pakar dalam **Kurikulum Merdeka 2025**. Slogan Anda: "Mengajar dengan Hati, Mendidik dengan Data".
        - Pahami prinsip **Deep Learning** (Kepka 046/2025):
          *   **Mindful**: Membangun kesadaran diri (Self-Awareness) peserta didik.
          *   **Meaningful**: Pembelajaran harus relevan dengan kehidupan nyata (Real-world linkage).
          *   **Joyful**: Menumbuhkan rasa ingin tahu (Sense of Discovery) tanpa tekanan yang membosankan.
        - Kuasai **Profil Lulusan 2025** (8 Dimensi) untuk memberikan saran karakter yang kuat: Keimanan, Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Kesehatan, dan Komunikasi.
        - Gunakan terminologi kurikulum secara tepat: Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), KKTP (bukan KKM), Asesmen Formatif & Sumatif.

        **2. KONTEKS MATA PELAJARAN (PEDAGOGI SPESIFIK):**
        - Jika pengguna bertanya soal **STEM (IPA/MTK)**: Tekankan pada eksplorasi, eksperimen, dan penalaran logis.
        - Jika pengguna bertanya soal **Bahasa/Humaniora**: Tekankan pada literasi, empati, dan kemampuan berekspresi.
        - Jika pengguna bertanya soal **Seni/Olahraga**: Tekankan pada kreativitas kinestetik dan kesejahteraan emosional.
        - **ADAPTABILITAS**: Semua jawaban harus disesuaikan dengan jenjang **${schoolLevel}**. Jangan berikan materi kuliah untuk anak SD, atau materi bermain saja untuk anak SMA.

        **3. PENANGANAN MASALAH PENDIDIKAN (PROBLEM SOLVER):**
        Anda harus cerdas memberikan solusi untuk masalah nyata guru:
        - **Bullying**: Berikan langkah pencegahan preventif dan pendekatan persuasif (non-punishment berlebihan).
        - **Motivasi Rendah**: Sarankan metode Gamifikasi, Ice Breaking, atau Project Based Learning (PjBL).
        - **Lingkungan Inklusif**: Selalu dukung Diferensiasi Pembelajaran (mengajar sesuai kemampuan siswa yang beragam).
        - **Kesehatan Mental Guru**: Berikan kata-kata penyemangat dan ingatkan untuk "Self-Care" jika guru terlihat kelelahan (terdeteksi dari sentimen jurnal).

        **4. PANDUAN APLIKASI & ATURAN (USER GUIDE):**
        Arahkan guru untuk menggunakan fitur Smart Teaching secara optimal:
        - **Perencanaan**: Sarankan membuat RPP di AI Generator sebelum mengajar. Ingatkan bahwa RPP bisa diunduh ke Word.
        - **Jurnal**: Dorong guru mengisi jurnal harian (pakai suara saja agar tidak lelah) untuk melihat grafik kebahagiaan (Sentiment Analysis).
        - **Penilaian**: Jelaskan keunggulan KKTP Digital yang otomatis terhubung ke Buku Nilai. Jangan input manual di Excel jika bisa pakai KKTP.
        - **Early Warning**: Ingatkan guru untuk rutin cek menu "Early Warning" untuk menyelamatkan siswa yang berisiko tertinggal.

        **5. ATURAN RESPONS (ETIKA SMARTTY):**
        - **Sapaan**: Gunakan "${userTitle}" atau "Pak/Bu" secara konsisten.
        - **Terminologi**: WAJIB gunakan kata **"peserta didik"** (bukan "murid/siswa") dalam konteks formal kurikulum.
        - **Matematika**: Gunakan LaTeX dengan pembatas $ untuk semua rumus. Contoh: $E = mc^2$.
        - **Analisis Data**: Jika user memberikan data nilai/absen, analisis dengan tajam, tunjukkan tren, dan berikan rekomendasi aksi nyata.
        - **Source of Truth**: Dashar hukum dan filosofi Anda bersumber dari **BSKAP_DATA** (intelejen JSON).
        - **Interaksi**: Akhiri jawaban dengan 1-2 pertanyaan pemantik untuk memperdalam diskusi (Contoh: "Bagaimana Pak, apakah rencana ini sesuai dengan kondisi kelas Bapak?").

        **DATA INTELEJEN KURIKULUM (BSKAP_DATA):**
        - Regulasi: ${BSKAP_DATA.standards?.regulation}
        - Kompetensi Industri: ${(BSKAP_DATA.standards?.industry_competencies_2025_2026 || []).map(c => c.name).join(', ')}
        - 3 Pilar: Mindful, Meaningful, Joyful.
    `;

  return { parts: [{ text: instruction }] };
};


/**
 * Generates a response for a conversational chat.
 * @param {Array<Object>} history - The conversation history.
 * @param {string} newMessage - The new message from the user.
 * @param {Object} userProfile - The user's profile data.
 * @param {string} modelName - The model name.
 * @param {string|null} imageData - Optional base64 image data (without prefix).
 * @returns {Promise<string>} The generated response text.
 */
export async function generateChatResponse(history, newMessage, userProfile, modelName, imageData = null) {
  try {
    const sanitizedHistory = [];
    // We exclude the last message because that is the 'newMessage' we are about to send via sendMessage.
    // The UI appends the user message to history state BEFORE calling this function.
    const historyContext = history && history.length > 0 ? history.slice(0, -1) : [];

    if (historyContext.length > 0) {
      let lastRole = '';
      for (const message of historyContext) {
        // Construct valid parts array
        let parts = [...message.parts];

        // If there is an 'image' property from our UI state, convert it to inlineData for the API history
        if (message.image) {
          const cleanBase64 = message.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
          // Prepend image to parts (images usually come before text in prompts)
          parts.unshift({
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg"
            }
          });
        }

        // Only add if role changes (deduplication logic from before, though simplified here)
        // or just strict sanitization
        const validMessage = {
          role: message.role,
          parts: parts
        };

        if (validMessage.role !== lastRole) {
          sanitizedHistory.push(validMessage);
          lastRole = validMessage.role;
        }
      }
    }

    // Generate valid history for the API
    const finalHistory = [];
    if (sanitizedHistory.length > 0) {
      // Gemini API requires the first message in history to be from 'user'.
      // If our history starts with 'model' (e.g., the welcome greeting), we must skip it.
      let startIndex = 0;
      if (sanitizedHistory[0].role === 'model') {
        startIndex = 1;
      }

      for (let i = startIndex; i < sanitizedHistory.length; i++) {
        finalHistory.push(sanitizedHistory[i]);
      }
    }

    const systemInstruction = createSystemInstruction(userProfile);
    const model = getModel(modelName);

    // Handle Multimodal Input
    let messageParts = [{ text: newMessage }];

    if (imageData) {
      // Ensure clean base64
      const cleanBase64 = imageData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      messageParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg",
        }
      });
    }

    // Use the fallback wrapper
    const result = await generateContentWithFallback(modelName, async (modelInstance) => {
      const chat = modelInstance.startChat({
        history: finalHistory,
        generationConfig: {
          maxOutputTokens: 8192,
        },
        systemInstruction: systemInstruction,
      });

      return await chat.sendMessage(messageParts);
    });

    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    return handleGeminiError(error, "generateChatResponse");
  }
}


/**
 * Analyzes teaching journals to provide a summary and sentiment analysis.
 * Implements caching: returns cached result if journals data has not changed.
 * @param {Array<Object>} journals - The list of journal objects.
 * @param {string} modelName - The Gemini model to use (from user settings).
 * @returns {Promise<Object>} An object containing the summary and sentiment.
 */
export async function analyzeTeachingJournals(journals, modelName) {
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

  const modelForAnalysis = getModel(modelName);

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

    Berikan analisis dalam format yang ketat and ringkas:
    1.  **Ringkasan**: Ringkasan singkat dan padat (1-2 kalimat) mengenai kegiatan, tantangan, dan refleksi utama.
    2.  **Analisis Sentimen**: Analisis sentimen keseluruhan dari refleksi dan hambatan dalam bentuk persentase positif (misal: 75%) dan penjelasan singkat mengapa sentimen tersebut muncul.

    Format output Anda HARUS seperti ini, dan tidak ada teks lain di luar format ini:
    RINGKASAN: [Ringkasan Anda]
    SENTIMEN_PERSENTASE: [Persentase positif, misal 75]
    SENTIMEN_PENJELASAN: [Penjelasan singkat sentimen]
  `;

  try {
    const result = await retryWithBackoff(() => modelForAnalysis.generateContent(prompt));
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
    const errorMsg = handleGeminiError(error, "analyzeTeachingJournals");
    lastAnalyzedJournalsString = null;
    lastAnalysisResultCache = null;
    return { summary: errorMsg, sentiment: { percentage: 0, explanation: errorMsg } };
  }
}


/**
 * Analyzes teaching journals to find mentions of specific students and identify potential issues.
 * @param {Array<Object>} journals - The list of all journal objects.
 * @param {Array<string>} studentNames - The list of student names to look for.
 * @returns {Promise<Object>} An object where keys are student IDs and values are arrays of warning strings.
 */
export async function analyzeJournalsForStudentWarnings(journals, students, modelName) {
  if (!journals || journals.length === 0 || !students || students.length === 0) {
    return {};
  }

  const studentNames = students.map(s => s.name);
  const studentMap = students.reduce((acc, student) => {
    acc[student.name] = student.id;
    return acc;
  }, {});

  const modelForWarnings = getModel(modelName);

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
    const result = await retryWithBackoff(() => modelForWarnings.generateContent(prompt));
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
    const errorMsg = handleGeminiError(error, "analyzeJournalsForStudentWarnings");
    return { error: errorMsg };
  }
}


/**
 * Generates a comprehensive analysis report for a class.
 * @param {Object} classData - Data for the class, including students, grades, attendance, etc.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
export async function generateClassAnalysisReport(classData, modelName) {
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
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text();

    lastAnalyzedClassDataString = currentClassDataString;
    lastClassAnalysisReportCache = text;

    return text;
  } catch (error) {
    lastAnalyzedClassDataString = null;
    lastClassAnalysisReportCache = null;
    return handleGeminiError(error, "generateClassAnalysisReport");
  }
}

/**
 * Generates a concise analysis report for a class.
 * @param {Object} classData - Data for the class, including students, grades, attendance, etc.
 * @returns {Promise<string>} The generated concise report in Markdown format.
 */
export async function generateConciseClassAnalysisReport(classData, modelName) {
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
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text();

    lastAnalyzedConciseClassDataString = currentClassDataString;
    lastConciseClassAnalysisReportCache = text;

    return text;
  } catch (error) {
    lastAnalyzedConciseClassDataString = null;
    lastConciseClassAnalysisReportCache = null;
    return handleGeminiError(error, "generateConciseClassAnalysisReport");
  }
}



/**
 * Generates a concise analysis of students who need special attention in a class (rombel).
 * @param {Array<Object>} studentDataForPrompt - The data for each student.
 * @param {string} rombel - The name of the class.
 * @returns {Promise<string>} The generated recommendation in Markdown format.
 */
export async function generateRombelAnalysis(studentDataForPrompt, rombel, modelName) {
  const prompt = `
    Anda adalah seorang konsultan pendidikan AI yang ahli, ringkas, dan fokus pada tindakan. 
    Analisis data siswa berikut untuk kelas (rombel) '${rombel}'.

    Data Siswa Individual:
    ${JSON.stringify(studentDataForPrompt, null, 2)}

    Tugas Anda:
    Analisis data di atas untuk memberikan wawasan yang dapat ditindaklanjuti bagi guru. Hasilkan laporan dalam format Markdown dengan struktur berikut:

    ### Analisis & Rekomendasi Kelas ${rombel}

    **1. Kekuatan Kelas**
    - Identifikasi kekuatan utama kelas ini. Apakah ada siswa dengan nilai rata-rata yang sangat tinggi? Apakah tingkat kehadiran secara umum baik? Sebutkan 1-2 poin kekuatan paling menonjol.

    **2. Kelemahan & Area Peningkatan**
    - Identifikasi tantangan atau kelemahan utama di kelas ini. Fokus pada siswa dengan nilai rata-rata di bawah 75, yang memiliki catatan kehadiran 'Alpha' yang signifikan, atau yang memiliki catatan pelanggaran. Sebutkan nama siswa yang paling membutuhkan perhatian dan jelaskan masalahnya (nilai, kehadiran, atau pelanggaran).

    **3. Rekomendasi & Solusi**
    - Berikan 2-3 rekomendasi praktis dan dapat ditindaklanjuti yang bisa langsung diterapkan oleh guru untuk mengatasi kelemahan yang telah diidentifikasi dan untuk lebih meningkatkan kekuatan kelas.

    Gunakan bahasa yang jelas, profesional, dan langsung ke intinya. Fokus pada memberikan nilai tambah bagi guru.
    `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    return handleGeminiError(error, "generateRombelAnalysis");
  }
}


/**
 * Generates an analysis report for a single student.
 * @param {string} prompt - The fully constructed prompt with student data.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
/**
 * Polishes raw text (e.g., from voice input) into a professional teaching journal entry.
 * @param {string} rawText - The raw notes or spoken text.
 * @param {string} modelName - The name of the model to use.
 * @returns {Promise<string>} The polished professional text.
 */
export async function polishJournalText(rawText, modelName) {
  if (!rawText || rawText.trim().length === 0) return "";

  const prompt = `
    Anda adalah asisten guru yang ahli. Ubahlah catatan mentah atau hasil rekaman suara guru berikut menjadi draf jurnal mengajar yang profesional, terstruktur, dan formal dalam Bahasa Indonesia yang baik dan benar.
    
    Catatan Mentah:
    "${rawText}"
    
    Tugas Anda:
    - Perbaiki tata bahasa dan ejaan.
    - Gunakan kosakata kependidikan yang tepat.
    - Pastikan kalimatnya mengalir dan profesional.
    - Jangan menambah informasi yang tidak ada di catatan mentah.
    - Berikan hasil akhir saja tanpa komentar tambahan.
  `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error polishing journal text:", error);
    return rawText; // Fallback to raw text on error
  }
}

/**
 * Generates an analysis report for a single student.
 * @param {string} prompt - The fully constructed prompt with student data.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
/**
 * Generates an advanced quiz based on RPP/Promes context and specific configurations.
 * @param {Object} params - Tool parameters
 * @param {string} params.topic - The main topic or KD.
 * @param {string} params.context - The content of the RPP or Promes for context.
 * @param {string} params.gradeLevel - Class/Grade level.
 * @param {string} params.subject - Subject name.
 * @param {Object} params.typeCounts - Object with question type keys and count values, e.g., { pg: 10, true_false: 5 }
 * @param {number} params.difficulty - 0 to 100 slider value (LOTS to HOTS).
 * @returns {Promise<Object>} - The generated quiz object with stimulus and items.
 */
export async function generateAdvancedQuiz({ topic, context, gradeLevel, subject, typeCounts, difficulty, modelName }) {
  try {
    const model = getModel(modelName);

    // Extract types and calculate total count
    const types = Object.keys(typeCounts);
    const count = Object.values(typeCounts).reduce((sum, c) => sum + c, 0);

    // Build detailed type requirements string
    const typeDetails = types.map(t => `${t}: ${typeCounts[t]} soal`).join(', ');

    // Determine HOTS/LOTS ration
    const hotsRatio = Math.round(difficulty); // 0-100%
    const cognitiveLevel = difficulty > 70 ? "C4-C6 (Analisis, Evaluasi, Kreasi)" : difficulty > 30 ? "C3-C4 (Aplikasi, Analisis)" : "C1-C2 (Mengingat, Memahami)";

    // Determine Option Count based on Grade Level
    let optionCount = 5; // Default SMA/SMK
    let optionLabel = "A-E";
    const lowerGrade = String(gradeLevel || '').toLowerCase();

    // Default Example Options Array String
    let exampleOptionsJSON = '["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4", "E. Opsi 5"]';

    if (lowerGrade.includes('sd') || lowerGrade.includes('mi') || lowerGrade.match(/\b(1|2|3|4|5|6|i|ii|iii|iv|v|vi)\b/i)) {
      optionCount = 3;
      optionLabel = "A-C";
      exampleOptionsJSON = '["A. Opsi 1", "B. Opsi 2", "C. Opsi 3"]';
    } else if (lowerGrade.includes('smp') || lowerGrade.includes('mts') || lowerGrade.match(/\b(7|8|9|vii|viii|ix)\b/i)) {
      optionCount = 4;
      optionLabel = "A-D";
      exampleOptionsJSON = '["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4"]';
    }

    const prompt = `
      Anda adalah "Mesin Intelijen Kurikulum Nasional" spesialis penyusunan **Instrumen Penilaian (Soal Ujian)** yang profesional.
      
      **OFFICIAL KNOWLEDGE ENGINE (BSKAP_DATA):**
      - Regulasi Dasar: **${BSKAP_DATA.standards.regulation}**
      - Filosofi Operasional: **${BSKAP_DATA.standards.philosophy.name} (Mindful, Meaningful, Joyful)**
      - Standar Referensi Alat: **Kemendikdasmen**
      
      TUGAS:
      Buatlah Instrumen Penilaian (Soal Ujian) **BERKUALITAS NASIONAL** yang **KONTEKSTUAL, AKADEMIS, dan BERBASIS DATA ILMIAH** untuk:
      - Mapel: ${subject}
      - Kelas: ${gradeLevel}
      - Topik/Materi: ${topic}
      - Konteks Pembelajaran/Bahan Bacaan: "${context}" (WAJIB DIGUNAKAN SEBAGAI SUMBER UTAMA)
      - Tingkat Kesulitan (HOTS Meter): ${difficulty}% (${cognitiveLevel})
      - **DISTRIBUSI SOAL (STRICT)**: ${typeDetails}
      - TOTAL Soal: ${count} butir

      ${getRegionalLanguage(subject) ? `
      **INSTRUKSI BAHASA DAERAH (${getRegionalLanguage(subject)})**:
      - Karena mata pelajaran ini adalah Bahasa Daerah, Anda **WAJIB** menggunakan **Bahasa ${getRegionalLanguage(subject)}** untuk seluruh isi soal, stimulus, dan pilihan jawaban.
      - Gunakan tingkatan bahasa yang sesuai (misal: Ngoko/Kromo untuk Jawa sesuai konteks materi).
      ${(getRegionalLanguage(subject).toLowerCase().includes('jawa') || getRegionalLanguage(subject).toLowerCase().includes('madura')) ? `- Sertakan penggunaan **Aksara Hanacaraka (Aksara Jawa/Madura)** pada bagian yang relevan (misal: dalam stimulus teks atau pertanyaan tentang penulisan aksara).` : ''}
      - Tetap gunakan Bahasa Indonesia HANYA untuk instruksi struktural atau field JSON.
      ` : ''}

      **ATURAN MAIN (WAJIB):**
      1. **SOURCE OF TRUTH**: DILARANG keras berimprovisasi di luar ruang lingkup materi di konteks/RPP. Seluruh isi soal, stimulus, dan penjelasan harus selaras dengan buku teks resmi dan standar CP resmi Kemendikdasmen.
      2. **PRINSIP DEEP LEARNING**:
         - **Mindful (Berkesadaran)**: Soal mendorong peserta didik berpikir reflektif dan sadar akan proses kognitifnya.
         - **Meaningful (Bermakna)**: Konteks soal relevan dengan kehidupan nyata, aplikatif, dan bermakna bagi peserta didik.
         - **Joyful (Menggembirakan)**: Soal menantang namun tidak menakutkan, mendorong rasa ingin tahu dan eksplorasi.
      3. **TERMINOLOGI**: Gunakan istilah "Peserta Didik" dan kosakata kependidikan yang tepat sesuai Kemendikdasmen.
      4. **BAHASA INDONESIA BAKU (PUEBI)**: Gunakan Bahasa Indonesia sesuai PUEBI (Pedoman Umum Ejaan Bahasa Indonesia).

      PRINSIP UTAMA PEMBUATAN SOAL PROFESIONAL (STRICT RULES):
      
      1.  **KONTEKS PROFESIONAL & AKADEMIS (CRITICAL)**:
          - **DILARANG**: Konteks terlalu sederhana atau kasual seperti "Ani pergi ke pasar membeli 3 apel..."
          - **WAJIB**: Gunakan konteks akademis, ilmiah, atau profesional seperti:
            * Hasil penelitian/survei dengan data statistik
            * Kasus nyata dari jurnal ilmiah atau berita kredibel
            * Infografis/diagram/grafik dengan data kompleks
            * Fenomena alam/sosial yang memerlukan analisis mendalam
            * Studi kasus profesional (medis, teknik, ekonomi, dll)
          - **Contoh SALAH**: "Budi membeli 5 pensil seharga Rp 2.000..."
          - **Contoh BENAR**: "Berdasarkan data BPS 2024, inflasi Indonesia mencapai 3,2%. Grafik berikut menunjukkan perbandingan inflasi dengan negara ASEAN lainnya..."

      2.  **STIMULUS BERKUALITAS TINGGI (INTEGRATED)**:
          - Masukkan stimulus ke dalam field \`stimulus\` di dalam objek soal
          - Stimulus harus berupa: teks ilmiah, data statistik, grafik/tabel, kutipan jurnal, atau kasus kompleks
          - Panjang stimulus: 100-300 kata untuk soal HOTS
          - Jika satu stimulus untuk beberapa soal:
            * Soal 1: Field \`stimulus\` berisi TEKS LENGKAP
            * Soal 2-3: Field \`stimulus\` berisi "Lihat stimulus pada Soal no 1"

      3.  **PENGOLAHAN KONTEKS RPP/MODUL**:
          - **ANALISIS MENDALAM**: Jangan copy-paste RPP
          - **TRANSFORMASI KREATIF**: Ubah materi RPP menjadi:
            * Studi kasus profesional
            * Data penelitian fiktif namun realistis
            * Simulasi situasi nyata yang kompleks
          - Soal harus mencerminkan Capaian Pembelajaran (CP) di RPP

      4.  **STIMULUS CONSISTENCY CHECK**:
          - Jika soal menyebut "Berdasarkan narasi/tabel/grafik tersebut...", field \`stimulus\` **TIDAK BOLEH KOSONG**
          - Pastikan stimulus benar-benar ada dan lengkap
          - Jangan buat peserta didik bingung mencari referensi yang hilang

      5.  **TINGKAT KOGNITIF PROFESIONAL (HOTS-ORIENTED)**:
${BSKAP_DATA.standards.cognitive_levels.map(l => `          - **${l.id} (${l.level})**: ${l.description}`).join('\n')}
          - Untuk difficulty > 50%, minimal 60% soal harus L2-L3
          - **DILARANG**: Soal definisi hafalan murni ("Apa pengertian X?")
          - **DITERIMA**: Soal aplikasi dan analisis ("Berdasarkan data X, bagaimana Y mempengaruhi Z?")

      6.  **ATURAN OPSI JAWABAN**:
          - Untuk jenjang kelas ini (${gradeLevel}), wajib buat **${optionCount} Pilihan Jawaban** (${optionLabel})
          - Semua opsi harus plausible (masuk akal)
          - Distraktor harus mencerminkan miskonsepsi umum
          - Hindari pola jawaban yang mudah ditebak (misal: jawaban terpanjang selalu benar)

      7.  **ATURAN SOAL MENJODOHKAN (Matching)**:
          - **VARIASI JUMLAH**: Side Kiri 3-5 items (JANGAN SELALU 4)
          - **DISTRAKTOR**: Side Kanan = Jumlah Kiri + 1-2 pengecoh
          - **ACAK POSISI**: Posisi \`right_side\` HARUS diacak
          - Contoh: Kiri 3 item → Kanan 4-5 item; Kiri 5 item → Kanan 6-7 item

      8.  **VISUALISASI DATA (CRITICAL)**:
          - **TABEL**: Gunakan HTML table dengan border:
            \`<table border="1" style="width:100%; border-collapse: collapse;">
              <tr><th>Header 1</th><th>Header 2</th></tr>
              <tr><td>Data 1</td><td>Data 2</td></tr>
            </table>\`
          - **GAMBAR/DIAGRAM**: Gunakan placeholder deskriptif:
            \`[GAMBAR: Grafik batang perbandingan GDP 5 negara ASEAN tahun 2020-2024, sumbu X menunjukkan tahun, sumbu Y dalam miliar USD]\`
          - **GRAFIK/CHART**: Deskripsikan dengan detail agar dapat dibayangkan

      9.  **BAHASA INDONESIA BAKU (PUEBI)**:
          - Gunakan Bahasa Indonesia sesuai PUEBI (Pedoman Umum Ejaan Bahasa Indonesia)
          - Hindari bahasa kasual atau tidak baku
          - Gunakan istilah teknis yang tepat sesuai bidang ilmu
          - Konsisten dalam penggunaan istilah (misal: "peserta didik" bukan "siswa")

      10. **STRICT TYPE & COUNT ENFORCEMENT**:
          - Anda HARUS membuat **PERSIS** sesuai distribusi: ${typeDetails}
          - DILARANG membuat tipe soal lain atau jumlah yang berbeda
          - Contoh: Jika diminta "pg: 10, true_false: 5", maka output HARUS 10 soal pg + 5 soal true_false = 15 total

      FORMAT OUTPUT YANG DIBUTUHKAN (JSON ONLY):
      Kembalikan HANYA JSON object valid tanpa markdown formatting \`\`\`. Struktur JSON:
      {
        "title": "Judul Kuis / Ulangan",
        "questions": [
          {
            "id": 1,
            "type": "pg", 
            "competency": "Menganalisis data...", 
            "pedagogical_materi": "Materi Pokok", 
            "indicator": "Indikator soal...", 
            "cognitive_level": "Aplikasi",
            "stimulus": "Konteks/Teks/Data...",
            "question": "Pertanyaan...",
            "options": ${exampleOptionsJSON},
            "answer": "A. Opsi 1", 
            "explanation": "Penjelasan..."
          },
          {
            "id": 2,
            "type": "pg_complex", 
            "stimulus": "", 
            "question": "Pilihlah DUA pernyataan yang benar...",
            "options": ["1. Pernyataan A", "2. Pernyataan B", "3. Pernyataan C", "4. Pernyataan D"],
            "answer": ["1. Pernyataan A", "3. Pernyataan C"],
            "explanation": "..."
          },
          {
            "id": 3,
            "type": "matching",
            "stimulus": "Data...",
            "question": "Jodohkan...",
            "left_side": ["Premis A", "Premis B"],
            "right_side": ["Respon 2 (Pasangan A)", "Respon 3 (Pengecoh)", "Respon 1 (Pasangan B)"],
            "pairs": [{"left": "Premis A", "right": "Respon 2 (Pasangan A)"}, {"left": "Premis B", "right": "Respon 1 (Pasangan B)"}]
          },
          {
            "id": 4,
            "type": "true_false",
            "stimulus": "",
            "question": "Tentukan kebenaran...",
            "statements": [
               {"text": "Pernyataan 1...", "isCorrect": true},
               {"text": "Pernyataan 2...", "isCorrect": false}
            ]
          },
          {
            "id": 5,
            "type": "essay",
            "stimulus": "Kasus...",
            "question": "Jelaskan...",
            "answer": "Kunci jawaban...",
            "grading_guide": "Rubrik..."
          },
          {
            "id": 6,
            "type": "uraian",
            "question": "Uraikan...",
            "answer": "Model jawaban...",
            "grading_guide": "Kriteria..."
          }
        ]
      }
    `;

    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return extractJSON(response.text());
  } catch (error) {
    return handleGeminiError(error, "generateAdvancedQuiz");
  }
}

/**
 * Generates quiz questions based on an uploaded image.

 * @param {string} imageBase64 - Base64 string of the image.
 * @param {string} topic - Additional topic context.
 * @param {string} gradeLevel - Class level.
 * @param {string} subject - Subject name.
 * @param {number} count - Number of questions.
 * @returns {Promise<Object>} - Quiz object.
 */
export async function generateQuizFromImage({ imageBase64, topic, gradeLevel, subject, count, modelName }) {
  try {
    const model = getModel(modelName);

    const prompt = `
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
        "stimulus": [
           { 
             "id": "visual_1", 
             "type": "image", 
             "content": "Referensi Gambar Utama", 
             "caption": "Gambar yang dianalisis"
           } 
        ],
        "questions": [
           {
             "id": 1,
             "type": "pg",
             "stimulus_ref": "visual_1",
             "question": "Berdasarkan gambar di atas, ...?",
             "options": ["A...", "B...", "C...", "D...", "E..."],
             "answer": "A...",
             "explanation": "..."
           }
        ]
      }
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: "image/jpeg"
      },
    };

    const result = await retryWithBackoff(() => model.generateContent([prompt, imagePart]));
    const response = await result.response;
    return extractJSON(response.text());
  } catch (error) {
    return handleGeminiError(error, "generateQuizFromImage");
  }
}

/**
 * Generates an analysis report for a single student.
 * @param {string} prompt - The fully constructed prompt with student data. 
 * @returns {Promise<string>} The generated report in Markdown format.
 */
export async function generateStudentAnalysis(prompt, modelName) {
  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    return handleGeminiError(error, "generateStudentAnalysis");
  }
}



/**
 * Generates an automated RPP (Lesson Plan) based on Promes data.
 * @param {Object} data - { kd, materi, gradeLevel, academicYear, semester, subject }
 * @returns {Promise<string>} - The generated RPP content in Markdown.
 */
export const generateLessonPlan = async (data) => {
  try {
    const model = getModel(data.modelName);
    const prompt = `
      Anda adalah "Mesin Intelijen Kurikulum Nasional" yang bekerja berdasarkan repositori data resmi **BSKAP_DATA**. DILARANG memberikan informasi yang bertentangan atau di luar cakupan data JSON tersebut.
      
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
      ${data.profilLulusan ? `
      - **PROFIL LULUSAN (MANDATORY)**: Dimensi yang HARUS digunakan: **${data.profilLulusan}**. DILARANG KERAS berimprovisasi, menambah, atau mengurangi dimensi ini. Gunakan PERSIS seperti tertulis.` : ''}
      ${data.sourceType === 'atp' ? `- **SUMBER UTAMA (ATP)**: RPP ini HARUS diturunkan secara spesifik dari butir Tujuan Pembelajaran (TP) yang tercantum di Alur Tujuan Pembelajaran (ATP). Gunakan Elemen ${data.elemen} sebagai jangkar kompetensi.` : ''}
      
      ${getRegionalLanguage(data.subject) ? `
      **INSTRUKSI BAHASA DAERAH (${getRegionalLanguage(data.subject)})**:
      - Karena mata pelajaran ini adalah Bahasa Daerah, Anda **WAJIB** menggunakan **Bahasa ${getRegionalLanguage(data.subject)}** untuk seluruh isi konten pembelajaran (Tujuan Pembelajaran, Langkah Kegiatan, Materi Ajar, dsb).
      - Gunakan tingkatan bahasa yang sesuai (misal: Ngoko/Kromo untuk Jawa sesuai konteks materi).
      ${(getRegionalLanguage(data.subject).toLowerCase().includes('jawa') || getRegionalLanguage(data.subject).toLowerCase().includes('madura')) ? `- Sertakan penggunaan **Aksara Hanacaraka (Aksara Jawa/Madura)** pada bagian yang relevan (terutama di bagian Materi Ajar Mendetail dan Latihan LKPD).` : ''}
      - Tetap gunakan Bahasa Indonesia HANYA untuk instruksi struktural dan label header dokumen.
      ` : ''}
      
      **INTELIGENSI SEMESTER (WAJIB):**
      - Semester Aktif: **${getSemesterLabel(data.semester)}**
      - Fokus: **${BSKAP_DATA.standards.semester_logic[getSemesterKey(data.semester)].focus}**

      **KOMPETENSI MASA DEPAN (STRATEGIS 2026):**
      Integrasikan butir-butir kompetensi industri berikut ke dalam Langkah Pembelajaran atau Asesmen jika relevan:
      ${(BSKAP_DATA.standards.industry_competencies_2025_2026 || []).map(c => `- ${c.name}: ${c.description}`).join('\n      ')}

      **PRINSIP PENYUSUNAN:**
      1. **KESELARASAN KOGNITIF:** Pastikan level KKO (Kata Kerja Operasional) konsisten dari TP hingga KKTP.
      2. **FOKUS MATERI:** Pembahasan harus terpusat pada "${data.materi}" tanpa melebar.
      3. **KESESUAIAN JENJANG:** Sesuaikan bahasa, contoh, dan kegiatan dengan tingkat perkembangan Kelas ${data.gradeLevel}.
      4. **INDIKATOR OPERASIONAL:** Turunkan TP menjadi beberapa IKTP yang spesifik dan terukur.

      **PENTING - OPERASIONALISASI TUJUAN (IKTP):**
      Anda **WAJIB** menurunkan Tujuan Pembelajaran (TP) yang luas menjadi beberapa **Indikator Tujuan Pembelajaran (IKTP)** yang spesifik, operasional, dan terukur untuk kegiatan ini.
      - Cantumkan label **"Indikator Tujuan Pembelajaran"** secara eksplisit di bawah bagian Tujuan Pembelajaran.
      - IKTP harus menunjukkan langkah-langkah pencapaian kompetensi secara bertahap (misal: dari mengidentifikasi -> mengklasifikasi -> mensimulasikan).

      **PENTING - KESESUAIAN JENJANG KELAS:**
      Anda HARUS menyesuaikan seluruh konten RPP dengan jenjang kelas "${data.gradeLevel}". Perhatikan hal-hal berikut:

      **Untuk Kelas SD (1-6):**
      - Gunakan bahasa yang sangat sederhana, konkret, dan mudah dipahami anak usia 6-12 tahun.
      - Fokus pada pembelajaran berbasis permainan, cerita, dan pengalaman langsung.
      - Contoh dan ilustrasi harus dari kehidupan sehari-hari anak (keluarga, sekolah, lingkungan sekitar).
      - Kegiatan harus melibatkan gerakan fisik, visual, dan hands-on activities.
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
      1. **SUMBER KEBENARAN TUNGGAL**: Data berikut adalah EKSTRAKSI RESMI dari **${BSKAP_DATA.standards.regulation}** untuk **${getSemesterLabel(data.semester)}**. Anda **WAJIB** menggunakan HANYA Elemen dan Materi Inti yang tercantum di bawah ini.
      2. **DILARANG HALUSINASI**: Jangan gunakan CP dari peraturan lama (033/2022 or 008/2022) jika bertentangan dengan data ini. DILARANG menggunakan materi dari semester lain.
      3. **STRUKTUR DATA RESMI (SEMESTER ${getSemesterLabel(data.semester).toUpperCase()}):**
      ${JSON.stringify(BSKAP_DATA.subjects[getLevel(data.gradeLevel)]?.[getSubjectKey(data.subject)]?.[getSemesterKey(data.semester)] || BSKAP_DATA.subjects["SMA"]["Informatika"]["ganjil"])}
      4. **TUGAS ANDA**: Susun narasi Capaian Pembelajaran (CP) satu paragraf utuh dengan pola kalimat wajib:
         **"Pada akhir fase [Fase], peserta didik mampu [Kata Kerja Operasional dari Elemen] [Materi Inti] untuk [Tujuan/Manfaat]."**
         *Contoh Output:* "Pada akhir fase D, peserta didik mampu menggunakan aplikasi pengolah angka untuk mengolah data, mengidentifikasi antarmuka perkakas, serta membedakan dan mengelola berbagai jenis data (angka, teks, tanggal) guna menunjang analisis data yang akurat."
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
      Dalam bagian Profil Lulusan / Karakter, Anda **WAJIB** memilih **minimal 1 dan MAKSIMAL 3 dimensi** paling relevan dari daftar        - **PROFIL LULUSAN (8 DIMENSI 2025):**
          *   **Keimanan & Ketakwaan**: Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia. (Termasuk: Integritas akademik, rasa syukur atas keteraturan alam/ilmu, etika profesi, dan tanggung jawab moral).
${(BSKAP_DATA.standards?.profile_lulusan_2025 || []).filter(d => d.id !== 1).map(d => `          *   **${d.dimensi}**: ${d.deskripsi}`).join('\n')}
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

      **Identifikasi Buku yang Tepat:**
      - Gunakan format: "[Nama Mata Pelajaran] untuk [Jenjang] Kelas [X] Kurikulum Merdeka"
      - Contoh SD: "IPAS untuk SD Kelas 4 Kurikulum Merdeka"
      - Contoh SMA: "Fisika untuk SMA Kelas XI Kurikulum Merdeka"

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
       - Tetap gunakan materi yang akurat sesuai CP dan standar nasional Kemendikdasmen
 
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
      - Materi yang diambil harus akurat dan tidak menyimpang dari buku sumber
      - Jika ada perbedaan antara buku lama dan CP 2025, prioritaskan CP 2025

      **STRUKTUR RPP YANG HARUS DIHASILKAN (Gunakan Format Markdown Ini):**

      # MODUL AJAR DEEP LEARNING (STANDARD 2026)

      ## I. IDENTIFIKASI PEMBELAJARAN
      | Komponen | Detail Informasi |
      | :--- | :--- |
      | **Satuan Pendidikan** | ${data.schoolName || '-'} |
      | **Mata Pelajaran** | ${data.subject} |
      | **Elemen** | ${data.elemen || '-'} |
      | **Kelas / Semester** | ${data.gradeLevel} / ${getSemesterLabel(data.semester)} |
      | **Materi Pokok** | ${data.materi} |
      | **Alokasi Waktu** | ${data.jp || '-'} JP (Total: .... menit) (${data.distribution ? data.distribution.length : 1} x tatap muka) |
      ${data.distribution && data.distribution.length > 1 ? `| **Rincian Pertemuan** | ${data.distribution.map((j, i) => `P${i + 1}: ${j} JP`).join(', ')} |` : ''}
      | **Model Pembelajaran** | [PILIH MODEL SPESIFIK: PBL/PJBL/DLL] |
      | **Tahun Ajaran** | ${data.academicYear || '-'} |
      | **Guru Pengampu** | ${data.teacherName || '-'} |
      | **NIP Guru** | ${data.teacherNip || '-'} |

      ## II. KOMPETENSI INTI (CP & TP)
      **1. Capaian Pembelajaran (CP):**
      (Tuliskan kompetensi utama yang harus dicapai peserta didik sesuai dengan fase dan materi pokok ini).

      **2. Tujuan Pembelajaran (TP):**
      **WAJIB: Buatlah maksimal 3 (tiga) poin Tujuan Pembelajaran yang esensial.**
      DILARANG membuat terlalu banyak TP agar tidak memberatkan "tagihan nilai" (asesmen) di rapor. Fokuslah pada kompetensi utama yang ingin dicapai dalam seluruh rangkaian pertemuan ini.
      **WAJIB MENGGUNAKAN FORMULA A-B-C-D (Audience, Behavior, Condition, Degree)**
      Setiap poin tujuan pembelajaran HARUS memuat 4 unsur ini secara eksplisit namun mengalir.
      
      **INSTRUKSI VARIASI KALIMAT (PENTING: JANGAN TULIS LABEL HURUFNYA):** 
      Gunakan variasi kalimat di bawah ini, tapi **JANGAN** menampilkan tanda (A), (B), (C), atau (D) di hasil akhir. Biarkan mengalir sebagai kalimat narasi yang utuh.

      - **Variasi 1 (Format C-A-B-D):** "Melalui diskusi kelompok, peserta didik mampu menganalisis penyebab banjir dengan kritis."
      - **Variasi 2 (Format A-B-C-D):** "Peserta didik dapat menyusun laporan melalui observasi lapangan secara sistematis."
      - **Variasi 3 (Format A-B-D-C):** "Peserta didik mampu mendemonstrasikan gerakan tari dengan luwes setelah mengamati video contoh."

      **Pastikan 4 unsur (A, B, C, D) selalu ada dalam kalimat, namun TERSEMBUNYI (implisit).**

      **JANGAN GUNAKAN FORMAT INI (SALAH):**
      *❌ "Menyimpulkan sifat-sifat magnet." (Tidak ada Condition, Audience, dan Degree)*

      **3. Kesiapan Peserta Didik:**
      (Analisis pengetahuan awal, minat, latar belakang, dan motivasi peserta didik terkait materi ini).

      **4. Karakteristik Materi:**
      (Jenis pengetahuan, relevansi dengan kehidupan, struktur materi, serta integrasi nilai & karakter).

      **5. Dimensi Profil Lulusan (8 Dimensi):**
      ${data.profilLulusan ? `
      **WAJIB GUNAKAN DIMENSI INI (SESUAI PERENCANAAN):**
      ${data.profilLulusan}
      
      (Peringatan Sistem: Jangan mengubah atau menambah dimensi lain. Gunakan persis seperti yang telah ditentukan di atas).
      ` : `
      Sebutkan dimensi yang paling relevan dengan materi ini dari standar berikut (pilih minimal 1, maksimal 3):
      - **Keimanan & Ketakwaan**: Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia. (Prioritaskan jika materi melibatkan: Integritas/kejujuran akademik, etika penggunaan ilmu/teknologi, rasa syukur atas keajaiban alam/logika, atau tanggung jawab moral/sosial).
      - **Kewargaan**: Menjadi warga negara yang cinta tanah air, berkontribusi aktif, dan memahami nilai-nilai Pancasila.
      - **Penalaran Kritis**: Mampu menganalisis informasi, mengevaluasi argumen, dan membuat keputusan rasional.
      - **Kreativitas**: Mampu menghasilkan gagasan orisinal, inovatif, dan solusi baru.
      - **Kolaborasi**: Mampu bekerja sama secara efektif dengan orang lain.
      - **Kemandirian**: Bertanggung jawab atas proses belajar, memiliki inisiatif, dan mandiri dalam berpikir/bertindak.
      - **Kesehatan**: Memiliki fisik dan mental yang prima, menjaga keseimbangan lahir dan batin (well-being).
      - **Komunikasi**: Mampu menyampaikan ide secara efektif dan membangun relasi sehat.
      `}

      ## III. LANGKAH-LANGKAH PEMBELAJARAN
      **PENTING - ALOKASI WAKTU:**
      Durasi total menit wajib dicantumkan dalam tabel Identifikasi. Standar Durasi:
${Object.entries(BSKAP_DATA.standards.duration_per_jp || {}).map(([lvl, min]) => `      - ${lvl}: 1 JP = ${min} Menit`).join('\n')}
      
      HITUNGLAH durasi total menit dengan mengalikan total JP (${data.jp}) sesuai jenjang Kelas ${data.gradeLevel}.

      **STRUKTUR PER PERTEMUAN:**
      Setiap pertemuan **WAJIB** memiliki rincian durasi yang jika dijumlahkan HASILNYA HARUS SAMA dengan alokasi JP per pertemuan tersebut.

      ${data.distribution && data.distribution.length > 1
        ? `Materi ini telah dialokasikan dalam Progam Semester (Promes) menjadi **${data.distribution.length} pertemuan** dengan rincian JP per pertemuan: [${data.distribution.join(', ')}]. Anda WAJIB menyusun langkah pembelajaran sesuai dengan jumlah pertemuan dan alokasi JP tersebut.`
        : `Materi ini disusun untuk **1 pertemuan** dengan total ${data.jp} JP.`}

      **PRINSIP UTAMA - DEEP LEARNING & DIFERENSIASI:**
      Setiap fase pembelajaran (Pendahuluan, Inti, Penutup) HARUS mengintegrasikan ketiga prinsip Deep Learning:
      - **Mindful (Berkesadaran)**: Peserta didik hadir secara utuh, sadar akan tujuan belajarnya.
      - **Meaningful (Bermakna)**: Materi memiliki relevansi dunia nyata dan kedalaman pemahaman.
      - **Joyful (Menggembirakan)**: Suasana positif yang menumbuhkan rasa ingin tahu.

      **STRATEGI DIFERENSIASI (WAJIB TERAPKAN):**
${(BSKAP_DATA.pedagogis.differentiation_strategies || []).map(s => `      - **${s.aspect}**: ${s.method}`).join('\n')}
      Uraikan secara spesifik dalam langkah pembelajaran bagaimana Anda melakukan diferensiasi ini untuk melayani keberagaman peserta didik.

      Setiap pertemuan **WAJIB** memiliki struktur lengkap berikut:

      **ALOKASI PERTEMUAN (WAJIB IKUTI PROMES):**
      ${data.distribution && data.distribution.length > 0
        ? `Berdasarkan data Program Semester (Promes), materi ini telah dijadwalkan untuk **${data.distribution.length} KALI PERTEMUAN**. Anda **WAJIB** membuat rincian untuk **${data.distribution.length} pertemuan** tersebut. Jangan kurang, jangan lebih.`
        : `Jika materi ini sangat luas dan JP mencukupi, Anda boleh membaginya menjadi maksimal 2 pertemuan. Jika tidak, cukup 1 pertemuan.`}
      
      ### PERTEMUAN [X] (Topik Spesifik: ...)
      *(Catatan: Anda WAJIB mengulangi struktur di bawah ini untuk SETIAP pertemuan yang dijadwalkan)*
      
      **1. Pendahuluan (Mindful Connection) - [10 menit]:**
      *   **Ritual Pembuka (Mindful):** Salam pembuka, **Berdoa bersama**, **Presensi/Mengabsen peserta didik**, dan Menanyakan Kabar untuk membangun koneksi awal yang hangat, rasa syukur, dan kesadaran penuh.
      *   **Apersepsi (Meaningful):** Hubungkan materi baru dengan pengalaman atau pengetahuan siswa yang relevan dengan kehidupan nyata mereka.
      *   **Motivasi & Tujuan (Mindful + Joyful):** Sampaikan tujuan pembelajaran dengan cara yang memotivasi dan membuat siswa antusias. Jelaskan MENGAPA materi ini penting untuk mereka.
      *   **Pemantik (Hook - Joyful):** Berikan pemicu rasa ingin tahu seperti video menarik, pertanyaan tantangan, cerita pendek, atau fenomena mengejutkan yang membuat siswa excited untuk belajar.

      **2. Kegiatan Inti (Penerapan Model & Deep Learning):**
      
      *PENTING (MODEL PEMBELAJARAN):* 
      - Jika input Model Pembelajaran adalah "Otomatis", Anda **WAJIB MEMILIH** dari standar preferred_models: ${JSON.stringify((BSKAP_DATA.pedagogis.preferred_models || []).map(m => m.name))}.
      - **DILARANG KERAS** menggunakan istilah di luar standar tersebut atau menulis kata "Otomatis". Gunakan sintaks spesifik sebagaimana didefinisikan dalam pedagogis operasional.
      
      **INSTRUKSI SANGAT PENTING (NARATIF & MENDALAM):** 
      - Bagian kegiatan inti per pertemuan harus **TEBAL, NARATIF, dan MENDETAIL**. 
      - Untuk RPP multi-pertemuan, pastikan setiap pertemuan memiliki aktivitas yang **BERBEDA** dan menunjukkan progres (misal: Pertemuan 1 fokus konsep, Pertemuan 2 fokus aplikasi/praktik).
      - Uraikan langkah pembelajaran menjadi skenario nyata langkah-per-langkah (step-by-step).
      - Bedakan jelas aktivitas **GURU** dan aktivitas **PESERTA DIDIK**.
      - Pastikan urutannya logis sesuai sintaks model pembelajaran.

      Jalin sintaks/tahapan model tersebut secara harmonis ke dalam 3 level Deep Learning berikut untuk setiap pertemuan:
      
      *   **Memahami (Understanding - Mindful + Meaningful):** 
          - Tuliskan langkah-langkah fase awal model (seperti Orientasi pada masalah, Pemberian Stimulus, atau Identifikasi Masalah).
          - **Contoh Detail:** "Guru menampilkan slide berisi gambar pencemaran lingkungan. Peserta didik secara bergiliran memberikan pendapat satu kata tentang gambar tersebut. Guru mencatat kata kunci di papan tulis."
          - Sertakan estimasi waktu untuk setiap langkah, misal: "Orientasi Masalah [15 menit]".
          
      *   **Mengaplikasi (Applying - Meaningful + Joyful) - (BAGIAN TERPANJANG):** 
          - Tuliskan langkah-langkah fase aksi model (seperti Penyelidikan Mandiri/Kelompok, Pengumpulan Data, atau Pembuatan Produk/Karya).
          - **Wajib Detil:** Jelaskan bagaimana pembagian kelompok dilakukan, apa instruksi spesifik LKPD, bagaimana guru memonitor, dan bagaimana siswa berkolaborasi.
          - Sertakan estimasi waktu untuk setiap langkah, misal: "Penyelidikan Kelompok [40 menit]".
          - Aktivitas harus menantang (Joyful) dan memiliki dampak nyata (Meaningful).
          
      *   **Merefleksi (Reflecting - Mindful + Meaningful):** 
          - Tuliskan langkah-langkah fase akhir model (seperti Pembuktian, Presentasi hasil, atau Menarik Kesimpulan).
          - Jelaskan mekanisme presentasi (misal: "Gallery Walk" atau "Presentasi Panel").
          - Sertakan estimasi waktu untuk setiap langkah, misal: "Presentasi Hasil [15 menit]".

      **3. Penutup (Creative Closure - Mindful + Meaningful + Joyful) - [10 menit]:**
      *   **Rangkuman & Refleksi (Mindful + Meaningful):** Siswa dan guru merangkum pembelajaran dan melakukan refleksi mendalam tentang makna pembelajaran hari ini.
      *   **Apresiasi & Motivasi (Joyful):** Berikan apresiasi positif atas partisipasi siswa dan motivasi untuk terus belajar.
      *   **Preview:** Berikan gambaran menarik tentang materi pertemuan berikutnya.
      *   **Ritual Penutup (Mindful):** WAJIB diakhiri dengan **Doa Syukur** dan **Salam Penutup** sebagai tanda syukur atas kelancaran proses belajar.

      **4. Integrasi 6C & Deep Learning (PRINSIP HUTANG BAYAR):**
      - **PRINSIP HUTANG BAYAR**: Setiap Dimensi Profil Lulusan yang Anda pilih di Bagian II **WAJIB** memiliki aktivitas nyata di langkah-langkah pembelajaran ini. DILARANG mencantumkan Dimensi yang tidak diajarkan.
      - Pastikan seluruh langkah di pertemuan ini secara eksplisit mengintegrasikan: Character, Citizenship, Collaboration, Communication, Creativity, Critical Thinking.
      - **CEK KONSISTENSI TP**: Setiap Tujuan Pembelajaran (TP) yang Anda tulis di atas **HARUS** memiliki aktivitas nyata di langkah-langkah ini. Jangan ada TP yang "terlupakan" atau tidak diajarkan.


      **CATATAN PENTING TENTANG KEDALAMAN KONTEN (TARGET: OPTIMAL 8-12 HALAMAN TOTAL):**
      - **TARGET TOTAL DOKUMEN:** Buatlah RPP yang **PADAT BERISI** dengan estimasi total 8-12 halaman (termasuk lampiran KKTP & LKPD).
      - **KOMPENSASI RUANG KKTP:** Karena ada penambahan tabel KKTP yang detail, mohon alokasikan ruang lebih.
      - **JANGAN TERLALU PENDEK:**
        - **1 Pertemuan:** Target total ~6-8 Halaman.
        - **2-3 Pertemuan:** Target total ~10-14 Halaman.
      - **FOKUS PADA KUALITAS NARASI:**
        - Setiap langkah pembelajaran harus **DETAIL** (minimal 1 paragraf utuh per langkah).
        - Tetap tuliskan skenario/dialog guru-siswa, tapi pastikan **EFISIEN** dan tidak bertele-tele.
        - Hindari pengulangan kata yang tidak perlu.
      - **Pastikan Lampiran (LKPD & Instrumen Penilaian) tetap lengkap.**
      
      *--- Berikan garis pemisah jika ada pertemuan berikutnya ---*

      ## IV. MEDIA BELAJAR
      (Sebutkan secara spesifik media yang akan digunakan: nama video/platform, jenis infografis, alat peraga konkret, dll. Jangan hanya menulis "video interaktif" tapi sebutkan topik/judulnya).

      ## V. LAMPIRAN
      
      ### 1. LKPD (LEMBAR KERJA PESERTA DIDIK)
      
      **LKPD - ${data.materi} (KONSISTENSI TP)**
      **PENTING UNTUK AI:** Soal-soal di bawah ini **HARUS** merupakan turunan langsung dari Tujuan Pembelajaran (TP). Setiap aktivitas LKPD adalah sarana latihan untuk mencapai TP.

      
      ---
      
      **Identitas Peserta Didik:**
      | Komponen | Keterangan |
      | :--- | :--- |
      | Nama | : _________________________________ |
      | Kelas | : _________________________________ |
      | Tanggal | : _________________________________ |
      
      **Tujuan Pembelajaran:**
      (Tuliskan maksimal 3 tujuan pembelajaran yang akan dicapai peserta didik melalui LKPD ini, harus konsisten dengan bagian II di atas, menggunakan bahasa yang mudah dipahami peserta didik).
      
      **Petunjuk Penggunaan:**
      1. Bacalah setiap instruksi dengan cermat sebelum mengerjakan.
      2. Kerjakan secara mandiri atau berkelompok sesuai arahan guru.
      3. Tuliskan jawaban dengan jelas dan lengkap.
      4. Tanyakan kepada guru jika ada yang kurang jelas.
      
      ---
      
      **KEGIATAN 1: MENGAMATI & MEMAHAMI**
      (Berikan stimulus berupa gambar, teks pendek, video, atau fenomena yang relevan dengan materi. Ajukan 3-4 pertanyaan pemantik yang mendorong peserta didik untuk mengamati dan memahami konsep dasar).
      
      **Ruang Jawaban:**
      
      ___________________________________________________________________________
      ___________________________________________________________________________
      ___________________________________________________________________________
      
      ---
      
      **KEGIATAN 2: MENGANALISIS & BERDISKUSI**
      (Berikan kasus, masalah, atau data yang perlu dianalisis peserta didik. Ajukan pertanyaan yang mendorong berpikir kritis dan diskusi kelompok).
      
      **Ruang Jawaban:**
      
      ___________________________________________________________________________
      ___________________________________________________________________________
      ___________________________________________________________________________
      
      ---
      
      **KEGIATAN 3: MENCOBA & BERKREASI**
      (Berikan tugas praktik, eksperimen sederhana, atau proyek kreatif yang memungkinkan peserta didik menerapkan pemahaman mereka).
      
      **Ruang Jawaban/Hasil Karya:**
      
      ___________________________________________________________________________
      ___________________________________________________________________________
      ___________________________________________________________________________
      
      ---
      
      **REFLEKSI PEMBELAJARAN & PENILAIAN DIRI**
      
      1. Apa hal paling menarik yang kamu pelajari hari ini?
         ___________________________________________________________________________
      2. Apa yang masih sulit kamu pahami?
         ___________________________________________________________________________
      
      **Penilaian Diri:**
      | Aspek | Sudah Paham | Cukup Paham | Perlu Bimbingan |
      | :--- | :---: | :---: | :---: |
      | Saya memahami tujuan pembelajaran | ☐ | ☐ | ☐ |
      | Saya dapat menjelaskan konsep utama | ☐ | ☐ | ☐ |
      | Saya aktif dalam kegiatan | ☐ | ☐ | ☐ |
      
      ---

      ### 2. INSTRUMEN PENILAIAN (ASESMEN & KKTP)
      
      **KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)**
      *Pendekatan yang digunakan: ${data.assessmentModel || 'Rubrik'}*
      
      > **Catatan:** Penentuan kriteria ketercapaian tujuan pembelajaran dalam modul ini merujuk pada standar penilaian dalam **Permendikbudristek No. 21 Th 2022** dan kompetensi pada **Keputusan Kepala BSKAP No. 046/H/KR/2025**.

      **ATURAN WAJIB KORELASI:** 
      Indikator/Kriteria di bawah ini **HARUS** merupakan turunan langsung dari **Tujuan Pembelajaran (TP)** yang Anda tulis di Bagian II. Jangan membuat indikator yang tidak ada di TP.

      ${data.assessmentModel === 'Deskripsi Kriteria' ? `
      **A. DESKRIPSI KRITERIA (Checklist)**
      Guru menetapkan kriteria ketuntasan yang spesifik. Peserta didik dianggap mencapai tujuan pembelajaran jika memenuhi minimal jumlah kriteria tertentu (misal 3 dari 4).

      | Kriteria (Indikator Ketercapaian) | Sudah Muncul (✔) | Belum Muncul (❌) |
      | :--- | :---: | :---: |
      | 1. [Indikator 1 - turunan TP] | | |
      | 2. [Indikator 2 - turunan TP] | | |
      | 3. [Indikator 3 - turunan TP] | | |
      | 4. [Indikator 4 - turunan TP] | | |
      | **Kesimpulan:** | Tuntas (jika ... kriteria muncul) / Belum Tuntas | |
      ` : data.assessmentModel === 'Interval Nilai' ? `
      **A. INTERVAL NILAI**
      Guru menggunakan rentang nilai untuk menentukan tindak lanjut.

      | Rentang Nilai | Keterangan & Tindak Lanjut |
      | :--- | :--- |
      | **0 - 40%** | **Belum Mencapai Ketuntasan (Remedial Seluruh Bagian)** <br> Siswa belum memahami konsep dasar dan memerlukan bimbingan intensif dari awal. |
      | **41 - 65%** | **Belum Mencapai Ketuntasan (Remedial Bagian Tertentu)** <br> Siswa sudah memahami sebagian konsep namun masih kesulitan di bagian [Sebutkan bagian sulit]. Perlu remedial pada indikator yang belum tuntas. |
      | **66 - 85%** | **Sudah Mencapai Ketuntasan (Tidak Perlu Remedial)** <br> Siswa sudah menguasai materi dengan baik. Dapat diberikan latihan pemantapan. |
      | **86 - 100%** | **Sudah Mencapai Ketuntasan (Pengayaan)** <br> Siswa sangat mahir. Berikan tantangan lebih kompleks atau menjadi tutor sebaya. |
      ` : data.assessmentModel === 'Rubrik' ? `
      **A. RUBRIK PENILAIAN (LEVELING)**
      Guru menyusun tingkatan pencapaian untuk setiap indikator.

      | Aspek / Indikator | Baru Berkembang (1) | Layak (2) | Cakap (3) | Mahir (4) |
      | :--- | :--- | :--- | :--- | :--- |
      | **[Aspek 1 - e.g. Pemahaman]** | Belum mampu menjelaskan [konsep] secara mandiri. | Mampu menjelaskan konsep namun masih kurang tepat/lengkap. | Mampu menjelaskan konsep dengan benar dan menggunakan bahasa sendiri. | Mampu menjelaskan konsep dengan sangat detail, logis, and memberikan contoh relevan. |
      | **[Aspek 2 - e.g. Keterampilan]** | Belum bisa menerapkan [prosedur]. | Bisa menerapkan prosedur tapi butuh bimbingan. | Bisa menerapkan prosedur dengan benar secara mandiri. | Bisa menerapkan prosedur dengan sangat lancar, efisien, dan kreatif. |
      | **[Aspek 3 - e.g. Sikap]** | Kurang aktif dlm diskusi. | Cukup aktif tapi jarang berpendapat. | Aktif berdiskusi dan menghargai pendapat teman. | Sangat aktif, menjadi inisiator diskusi, dan memimpin kelompok dengan baik. |
      ` : `
      **A. PENDEKATAN KKTP (OTOMATIS PILIHAN AI)**
      *(Karena Anda memilih mode Otomatis, AI telah menentukan metode penilaian yang paling efektif untuk materi ini)*:

      **Pilihan Metode: [Sebutkan nama metode: Rubrik/Deskripsi/Interval]**

      [TULISKAN ISI PENILAIAN SECARA LENGKAP & SPESIFIK DI SINI. Jika memilih Rubrik, buat tabel rubrik minimal 3 aspek. Jika Deskripsi, buat checklist minimal 4 kriteria. Jika Interval, buat panduan tindak lanjut yang disesuaikan dengan materi ini].
      `}

      ---
      
      **B. ASESMEN FORMATIF & SUMATIF**
      **A. Asesmen Formatif (6C Observation)**
      | Komponen | Teknik Penilaian | Instrumen |
      | :--- | :--- | :--- |
      | **Observasi 6C** | Pengamatan diskusi | Lembar Observasi |
      | **Refleksi Diri** | Exit Ticket | Jurnal Reflektif |
      | **Peer Feedback** | Peer Assessment | Strategi 2 Stars and a Wish |

      **B. Asesmen Sumatif (Kriteria Ketuntasan)**
      | Kriteria | Perlu Bimbingan (1) | Cukup (2) | Baik (3) | Sangat Baik (4) |
      | :--- | :--- | :--- | :--- | :--- |
      | **Pemahaman** | Miskonsepsi | Paham terbatas | Benar | Kompleks |
      | **Analisis** | Tanpa analisis | Kurang konsisten | Logis | Inovatif |

      ### 3. MATERI AJAR MENDETAIL (KONSISTENSI TP)
      **WAJIB DIISI DENGAN KONTEN LENGKAP & RELEVAN!**
      - **CEK KONSISTENSI:** Pastikan materi yang ditulis di sini **MENJAWAB** seluruh Tujuan Pembelajaran (TP). Jika TP menuntut "Menganalisis", maka materi harus memberikan landasan teori untuk analisis tersebut.
      - Minimal 3-5 paragraf substantif yang mencakup konsep, teori, contoh konkret, dan aplikasi nyata materi ini.

      ### 4. GLOSARIUM
      **WAJIB DIISI!** Daftar minimal 5-10 istilah penting dan definisinya.
      - **[Istilah]**: Definisi...

      ### 5. DAFTAR PUSTAKA
      **WAJIB DIISI!** Minimal 3-5 referensi kredibel (Buku, Jurnal, Sumber Digital).

      &nbsp;
      &nbsp;



      ---
      **CATATAN PENTING UNTUK AI:**
      - **WAJIB** ada baris kosong setelah tag pembuka div dan sebelum tag penutup div agar tabel Markdown tampil sempurna.
      - **JANGAN** ada baris kosong di antara baris tabel. Tabel harus rapat.
      - Gunakan bahasa Indonesia yang **Inspiratif, Profesional, dan Terstruktur**.
      - Pastikan bagian **Materi Ajar Mendetail** benar-benar berisi konten akademis yang kuat.
      - **WAJIB** gunakan istilah **"Peserta Didik"** pengganti kata "Siswa" di seluruh dokumen.
      - **JANGAN** membuat bagian Tanda Tangan (Mengetahui Kepala Sekolah/Guru). Bagian ini akan ditambahkan otomatis oleh sistem.
      - **JANGAN** menggunakan placeholder seperti "NIP. ....................".
      - **PRINSIP HUTANG BAYAR (AUDIT KONSISTENSI)**: Periksa kembali hasil akhir Anda. Jika Anda mencantumkan "Penalaran Kritis" di Profil Lulusan, pastikan ada kegiatan diskusi atau analisis mendalam di langkah pembelajaran. Jika Anda mencantumkan "Kemampuan Komunikasi", pastikan ada kegiatan presentasi atau berbagi ide. RPP adalah janji yang harus "dibayar" dalam kegiatan nyata.
      - Output harus **langsung dalam format Markdown** tanpa komentar pembuka atau penutup dari asisten.
    `;

    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    throw new Error(handleGeminiError(error, "generateLessonPlan"));
  }
};



/**
 * Generates a student-friendly Handout/Module using AI.
 * @param {Object} data - Input data for the handout.
 * @returns {Promise<string>} The generated markdown content.
 */
export const generateHandout = async (data) => {
  const model = getModel(data.modelName || 'gemini-2.0-flash-exp');

  const prompt = `
    Anda adalah "Mesin Intelijen Kurikulum Nasional" yang bertugas menyusun **Bahan Ajar (Handout/Modul)** yang inovatif dan mendalam.
    
    **OFFICIAL KNOWLEDGE ENGINE (BSKAP_DATA):**
    - Regulasi Dasar: **${BSKAP_DATA.standards.regulation}**
    - Filosofi Operasional: **${BSKAP_DATA.standards.philosophy.name} (Mindful, Meaningful, Joyful)**
    - Standar Referensi Alat: **Kemendikdasmen**
    
    Tugas Anda: Susun Bahan Ajar (Handout) yang **OTORITATIF** dan **MENYENANGKAN** berdasarkan parameter ini:
    - Mapel: ${data.subject}
    - Jenjang/Kelas: ${data.gradeLevel}
    - Materi Pokok: ${data.materi}
    - Guru: ${data.teacherTitle} ${data.teacherName}

    ${getRegionalLanguage(data.subject) ? `
    **INSTRUKSI BAHASA DAERAH (${getRegionalLanguage(data.subject)})**:
    - Karena mata pelajaran ini adalah Bahasa Daerah, Anda **WAJIB** menggunakan **Bahasa ${getRegionalLanguage(data.subject)}** untuk seluruh isi materi edukasi, sapaan, dan tantangan dalam handout ini.
    - Gunakan tingkatan bahasa yang sesuai.
    ${(getRegionalLanguage(data.subject).toLowerCase().includes('jawa') || getRegionalLanguage(data.subject).toLowerCase().includes('madura')) ? `- Sertakan penggunaan **Aksara Hanacaraka (Aksara Jawa/Madura)** pada bagian yang relevan (misal: pengenalan aksara, kutipan, atau latihan membaca).` : ''}
    - Tetap gunakan Bahasa Indonesia HANYA untuk instruksi struktural.
    ` : ''}

    **PRINSIP DEEP LEARNING (WAJIB):**
    Bahan ajar ini harus dirancang agar peserta didik mengalami:
    1. **Mindful**: Pembuka yang membangun kesadaran dan kehadiran utuh.
    2. **Meaningful**: Konten yang menjelaskan "Mengapa ini penting?" bagi kehidupan nyata.
    3. **Joyful**: Bahasa yang memotivasi, inspiratif, dan tidak kaku.

    **STRUKTUR MODUL (WAJIB IKUTI FORMAT INI):**

    # 📘 MODUL BELAJAR: [JUDUL MATERI DI SINI]
    
    > "Belajar itu bukan tentang menjadi pintar, tapi tentang peka terhadap sekitarmu." - Smart Teaching
    
    ---

    ## 🎯 TARGET BELAJAR KITA HARI INI
    Di akhir modul ini, kamu bakal jago dalam:
    - [Tujuan 1 bahasa siswa]
    - [Tujuan 2 bahasa siswa]
    - [Tujuan 3 bahasa siswa]
    
    ---

    ## 🗺️ PETA KONSEP (MIND MAP)
    (Gunakan Mermaid Diagram sederhana ATAU List berjenjang yang jelas untuk menggambarkan alur materi)
    
    ---

    ## 🚀 APERSEPSI: TAHUKAH KAMU?
    (Berikan paragraf pembuka yang menarik. Bisa berupa fakta unik dunia nyata, sejarah singkat penemuan, atau fenomena sehari-hari yang *relate* dengan materi ini. Tujuannya agar siswa berkata "Wah, ternyata ini berguna ya!". Panjang minimal 1 paragraf).

    ---

    ## 📚 MATERI INTI (DAGINGNYA!)
    *(Bagian ini harus menjadi bagian TERPANJANG. Jangan hanya poin-poin. Jelaskan konsep selengkap-lengkapnya layaknya Anda mengajar di depan kelas).*
    
    ### 1. [Sub-Bab 1]
    - **Definisi:** Jelaskan definisi dengan bahasa buku KEMUDIAN jelaskan ulang dengan bahasa tongkrongan/sederhana.
    - **Penjelasan Mendalam:** Uraikan konsepnya. Bagaimana cara kerjanya? Mengapa itu terjadi?
    - **Contoh Nyata:** Berikan minimal 2 contoh penerapan di kehidupan nyata.
    - **Analogi:** "Bayangkan materi ini seperti [Benda Sehari-hari]..."

    ### 2. [Sub-Bab 2]
    - (Uraikan detail seperti di atas. Sertakan tabel perbandingan jika ada dua konsep yang mirip).
    - Gunakan **Bold** untuk istilah penting.
    - Sertakan Rumus/Dalil jika pelajaran eksakta, lalu bedah rumusnya satu per satu variabelnya.

    ### 3. [Sub-Bab 3 dst...]
    
    > **💡 TIPS JITU:**
    > (Masukkan tips cara menghafal (jembatan keledai) atau cara memahami konsep ini dengan jalan pintas).

    ### 🔦 STUDI KASUS / POJOK LITERASI
    (Tambahkan satu cerita pendek atau kasus nyata yang berkaitan dengan materi untuk meningkatkan literasi siswa).

    ---

    ## 🧪 CONTOH SOAL & BEDAH JAWABAN
    *(Berikan minimal 2 contoh soal dengan tingkat kesulitan berbeda: Mudah & Sedang).*

    **Contoh 1:**
    [Soal]
    **Bedah Jawaban:**
    1.  **Analisis:** Apa yang diketahui? Apa yang ditanya?
    2.  **Strategi:** Rumus/Konsep apa yang dipakai?
    3.  **Eksekusi:** [Langkah pengerjaan detail]
    **Kesimpulan:** Jadi jawabannya adalah...

    **Contoh 2:**
    [Soal]
    **Bedah Jawaban:**
    [Langkah pengerjaan detail]

    ---

    ## 📝 TANTANGAN MINIMU (LATIHAN)
    *(Berikan 3-5 soal latihan untuk siswa kerjakan sendiri).*
    1. [Soal Pemahaman Dasar]
    2. [Soal Analisis]
    3. [Soal High Order Thinking Skill (HOTS) / Studi Kasus]
    4. [Soal Kreativitas/Proyek Kecil]

    ---

    ## 📖 KAMUS MINI (GLOSARIUM)
    - **[Istilah]**: [Penjelasan singkat dan jelas]
    - **[Istilah]**: [Penjelasan singkat dan jelas]
    
    ---
    *Disusun dengan semangat belajar oleh ${data.teacherTitle} ${data.teacherName}*
    
    **INSTRUKSI TAMBAHAN:**
    - Gunakan bahasa Markdown yang kaya.
    - **PENTING:** Jangan pelit kalimat. Penjelasan harus mengalir (narrative) dan enak dibaca, bukan sekadar bullet points kaku.
    - Pastikan materinya **AKURASI TINGGI**, **MENDALAM**, patuh pada Capaian Pembelajaran (CP) **BSKAP No. 046/H/KR/2025**, dan merujuk pada buku resmi **Kemendikdasmen**.
  `;

  try {
    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    throw new Error(handleGeminiError(error, "generateHandout"));
  }
};

export async function generateDailyBriefing(contextData, modelName) {
  const { teacherName, date, schedules, tasks, missingJournalsCount } = contextData;

  const scheduleSummary = schedules.length > 0
    ? schedules.map(s => `${s.subject} di kelas ${s.class} pukul ${s.startTime}`).join(', ')
    : "Tidak ada jadwal mengajar hari ini.";

  const taskSummary = tasks.length > 0
    ? `Ada ${tasks.length} tugas siswa yang perlu diperiksa.`
    : "Tidak ada tugas mendesak yang perlu diperiksa.";

  const journalWarning = missingJournalsCount > 0
    ? `Peringatan, ada ${missingJournalsCount} jurnal mengajar yang belum diisi dalam seminggu terakhir. Mohon segera dilengkapi.`
    : "Administrasi jurnal Anda sudah lengkap impian.";

  const prompt = `
    Anda adalah asisten pribadi guru yang cerdas, hangat, dan sangat suportif bernama "Smarty".
    Buatlah naskah briefing pagi yang sangat natural, mengalir, dan tidak kaku (seperti asisten manusia yang sedang berbicara langsung).
    
    Data Guru:
    - Nama: ${teacherName}
    - Sekolah: ${contextData.schoolName || 'Sekolah'}
    - Mata Pelajaran Utama: ${contextData.mainSubject || 'Umum'}
    - Tanggal: ${date}
    - Jadwal Hari Ini: ${scheduleSummary}
    - Status Tugas: ${taskSummary}
    - Status Jurnal: ${journalWarning}

    Prinsip Penulisan (Script Writing):
    1. **Sapaan Hangat**: Awali dengan menyapa "${teacherName}" dengan nada ceria.
    2. **Alur Alami**: Gunakan kata penghubung alami seperti "Nah", "Oh iya", "Untuk hari ini", atau "Terus".
    3. **Artikulasi TTS**: Gunakan tanda koma (,) dan titik (.) secara strategis untuk memberikan jeda nafas bagi mesin suara. Gunakan huruf kapital di awal kalimat agar intonasi lebih tegas.
    4. **Informatif & Proaktif**: Jangan hanya baca data. Jika ada jadwal, beri semangat spesifik. Jika ada jurnal bolong, sampaikan dengan nada mengingatkan yang sopan tapi penting.
    5. **Struktur**:
       - Pembukaan: Sapaan + Ucapan selamat pagi + Tanggal.
       - Isi: Rangkuman jadwal yang paling penting + Update tugas/jurnal.
       - Penutup: Berikan satu "Pesan Motivasi" atau "Tips Singkat" yang relevan dengan kesibukan hari ini.
    
    ATURAN KETAT:
    - JANGAN gunakan format markdown, bullet points, atau simbol aneh.
    - Maksimal 5 kalimat padat dan bermakna.
    - Hindari kata-kata yang terlalu formal/kaku seperti "Demikian briefing hari ini".
    - Gunakan Bahasa Indonesia yang sangat akrab tapi tetap sopan.
  `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating daily briefing:", error);
    return `Selamat pagi Bpk/Ibu ${teacherName}. Hari ini tanggal ${date}. ${schedules.length > 0 ? `Anda memiliki ${schedules.length} jadwal mengajar.` : 'Anda tidak memiliki jadwal mengajar hari ini.'} Tetap semangat dan selamat beraktivitas!`;
  }
}
/**
 * Generates an automatic narrative summary for a student's portfolio.
 * @param {Object} data - Student data including grades, attendance, and infractions.
 * @param {Object} userProfile - The teacher's profile.
 * @param {string} modelName - The Gemini model to use.
 * @returns {Promise<string>} The generated narrative.
 */
export async function generateStudentNarrative(data, userProfile, modelName) {
  const { studentName, grades, attendance, infractions, stats } = data;

  // Create a fingerprint of the data to avoid redundant API calls
  const currentInputString = JSON.stringify({
    studentName,
    grades: grades.map(g => ({ date: g.date, score: g.score })),
    attendance: stats.attendance,
    infractions: infractions.map(i => ({ date: i.date, type: i.infractionType })),
    stats: { academicAvg: stats.academicAvg, attitudeScore: stats.attitudeScore }
  });

  if (currentInputString === lastNarrativeInputString && lastNarrativeResultCache !== null) {
    console.log(`Returning cached narrative for ${studentName}.`);
    return lastNarrativeResultCache;
  }

  const prompt = `
    Anda adalah seorang asisten guru yang ahli dalam memberikan umpan balik edukatif yang konstruktif dan memotivasi.
    Tugas Anda adalah membuat narasi laporan perkembangan (Catatan Wali Murid/Guru) untuk peserta didik berikut:
    
    Data Peserta Didik:
    - Nama: ${studentName}
    - Rata-rata Akademik: ${stats.academicAvg} (dari ${grades.length} penilaian)
    - Nilai Sikap: ${stats.attitudeScore} (${stats.attitudePredicate})
    - Kehadiran: Hadir ${stats.attendance.Hadir} hari, Sakit ${stats.attendance.Sakit}, Ijin ${stats.attendance.Ijin}, Alpha ${stats.attendance.Alpha}
    
    Detail Catatan Pelanggaran (Jika ada):
    ${infractions.length > 0 ? infractions.map(i => `- ${i.date}: ${i.infractionType} (${i.description || 'Tanpa keterangan'})`).join('\n') : 'Tidak ada catatan pelanggaran (Sikap Sangat Baik).'}

    Instruksi:
    - Gunakan Bahasa Indonesia yang formal namun hangat dan memotivasi.
    - Sebutkan nama peserta didik dengan ramah.
    - Berikan ulasan singkat yang mencakup aspek akademik, sikap, dan kehadiran dalam SATU PARAGRAF SAJA.
    - Fokus pada poin paling penting dan berikan pesan motivasi yang kuat.
    - Batasi narasi dalam MAKSIMAL 60-80 KATA.
    - JANGAN gunakan format markdown seperti bold atau bullet points di dalam teks narasi, tulis sebagai teks mengalir biasa.
  `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text().trim();

    // Update Cache
    lastNarrativeInputString = currentInputString;
    lastNarrativeResultCache = text;

    return text;
  } catch (error) {
    console.error("Error generating student narrative:", error);
    lastNarrativeInputString = null;
    lastNarrativeResultCache = null;
    return handleGeminiError(error, "generateStudentNarrative");
  }
}

/**
 * Generates a professional WhatsApp message for parents based on student performance.
 * @param {Object} data - Student data and narrative.
 * @param {string} modelName - The Gemini model to use.
 * @returns {Promise<string>} The generated message.
 */
export async function generateParentMessage(data, modelName) {
  const { studentName, narrativeNote, stats, teacherName } = data;

  const prompt = `
    Anda adalah seorang guru yang sangat profesional, ramah, dan empatik.
    Tugas Anda adalah merangkum perkembangan peserta didik bernama ${studentName} menjadi pesan WhatsApp yang sopan untuk orang tua.

    Data Pendukung:
    - Rata-rata Akademik: ${stats.academicAvg}
    - Nilai Sikap: ${stats.attitudeScore} (${stats.attitudePredicate})
    - Kehadiran: Hadir ${stats.attendance.Hadir}, Sakit ${stats.attendance.Sakit}, Ijin ${stats.attendance.Ijin}, Alpha ${stats.attendance.Alpha}
    - Narasi Perkembangan: ${narrativeNote}
    - Nama Guru: ${teacherName}

    Aturan Penulisan Pesan:
    1. Mulailah dengan salam pembuka yang hangat (contoh: Assalamualaikum Wr. Wb. / Selamat pagi Bapak/Ibu...).
    2. Isi pesan harus merangkum pencapaian akademik dan sikap.
    3. Jika ada nilai yang kurang atau banyak absen Alpha, sampaikan dengan bahasa yang suportif dan mengajak kerjasama, bukan menghakimi.
    4. Sampaikan pesan motivasi di akhir.
    5. Gunakan bahasa Indonesia yang santun namun tetap komunikatif (tidak kaku seperti robot).
    6. Maksimal 3-4 paragraf pendek.
    7. Berikan "space" untuk tanda tangan guru di akhir.
    
    TULIS HANYA ISI PESANNYA SAJA.
  `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating parent message:", error);
    return handleGeminiError(error, "generateParentMessage");
  }
}

/**
 * Generates a Student Worksheet (LKPD - Lembar Kerja Peserta Didik) based on an existing RPP.
 * @param {string} rppContent - The full Markdown content of the RPP.
 * @param {string} assessmentModel - The KKTP Assessment Model (Rubrik, Interval, etc.)
 * @param {string} modelName - The Gemini model to use.
 * @param {Array<string>} [studentNames] - Optional list of student names to include in the grading table.
 * @returns {Promise<string>} The generated LKPD content in Markdown.
 */
export async function generateLKPDFromRPP(rppContent, assessmentModel = 'Rubrik', modelName, studentNames = []) {
  const studentListText = studentNames.length > 0
    ? `Berikut adalah daftar nama peserta didik yang HARUS dimasukkan ke dalam tabel penilaian: \n${studentNames.join(', ')}`
    : 'Buatlah satu baris kosong (...................) untuk nama peserta didik.';

  const prompt = `
    Anda adalah "Mesin Intelijen Kurikulum Nasional" spesialis penyusunan **Lembar Kerja Peserta Didik (LKPD)** yang presisi.
    
    **OFFICIAL KNOWLEDGE ENGINE (BSKAP_DATA):**
    - Regulasi Dasar: **${BSKAP_DATA.standards.regulation}**
    - Filosofi Operasional: **${BSKAP_DATA.standards.philosophy.name}**
    - Standar Asesmen: Metode **${assessmentModel}** (Logika: ${BSKAP_DATA.kktp_standards.methods.find(m => m.type === assessmentModel)?.logic || 'Rubrikasi'})
    
    Tugas Anda: Turunkan materi dari RPP terlampir menjadi LKPD yang **OTORITATIF** dan **BERDIFERENSIASI**.
    
    **DATA RPP SUMBER:**
    ${rppContent.substring(0, 15000)}

    **DAFTAR PESERTA DIDIK:**
    ${studentListText}

    **ATURAN MAIN (WAJIB):**
    1. **SOURCE OF TRUTH**: DILARANG keras menambah materi di luar RPP kecuali untuk stimulus yang relevan.
    2. **TERMINOLOGI**: Gunakan istilah "Peserta Didik", bukan "Siswa".
    3. **GAMIFIKASI & PERAN:** Mulailah dengan **PENGANTAR YANG MENARIK**. Ajak peserta didik bermain peran (Role Playing).
       - Contoh: "Selamat datang Detektif Sains!", "Kalian adalah Insinyur Muda...", "Misi rahasia hari ini..."
       - Gunakan bahasa yang "Seru" dan "Menantang" sesuai usia siswa. 
    2. **AKTIVITAS BERBASIS TABEL & KASUS:**
       - JANGAN hanya memberikan soal tanya-jawab biasa.
       - Sajikan **KASUS NYATA** atau **DATA** untuk dianalisis.
       - Gunakan **TABEL KOSONG** untuk ruang jawab siswa agar terstruktur.
       - *Contoh:* Tabel pengamatan, Tabel analisis sebab-akibat, atau Tabel identifikasi ciri-ciri.
    3. **KONEKSI KE KEHIDUPAN NYATA:**
       - Materi harus dikaitkan dengan masalah sehari-hari yang relevan dengan siswa.
    4. **STRUKTUR RUANG JAWAB:**
       - Sediakan tempat titik-titik (...................) atau kotak kosong yang cukup untuk siswa menulis.
    5. **EKSPLISIT:**
       - Turunkan aktivitas langsung dari Tujuan Pembelajaran di RPP.

    **PENTING: FORMAT PENILAIAN / KKTP (Tabel Utuh):**
    Di bagian paling akhir LKPD, Anda WAJIB menyertakan **TABEL UTAMA ASESMEN KKTP**.
    1. Berikan penjelasan singkat tentang kriteria penilaian yang diambil dari RPP.
    2. Buatlah **Tabel Penilaian Lengkap** dengan format Markdown.
    3. Tabel HARUS memuat kolom: **No**, **Nama Peserta Didik**, dan **Kriteria Penilaian** (turunkan minimal 2 kriteria spesifik dari RPP, misal: Ketajaman Analisis, Kreativitas Produk, Keaktifan, dll), serta kolom **Nilai Akhir**.
    4. Jika daftar nama peserta didik diberikan di atas, masukkan SEMUA nama tersebut ke dalam baris tabel secara urut.
    5. Gunakan format model KKTP: **${assessmentModel}** (Jika Rubrik, jelaskan deskripsi per levelnya di bawah tabel).

    Gunakan bahasa yang memotivasi siswa ("Yuk kita coba...", "Tantangan Keren!").
    
    **CONSTRAINT:**
    - Output harus **LANGSUNG START** dari Judul LKPD (Markdown).
    - **JANGAN** ada kalimat pembuka seperti "Berikut adalah LKPD..." atau "Tentu, ini hasil...".
  `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    return handleGeminiError(error, "generateLKPDFromRPP");
  }
}

/**
 * Generates an ATP (Alur Tujuan Pembelajaran) structure from CP.
 * @param {Object} data - { subject, gradeLevel, semester, academicYear, effectiveWeeks, totalJP, modelName, userProfile, existingRPPs }
 * @returns {Promise<Array>} JSON Array of TPs
 */
export async function generateATP(data) {
  const modelName = data.modelName;
  const userProfile = data.userProfile;
  const semester = data.semester;
  const subject = data.subject;

  const level = getLevel(data.gradeLevel);
  const subjectData = BSKAP_DATA.subjects[level]?.[getSubjectKey(subject)];

  const prompt = `
    Anda adalah **Sistem Pakar Kurikulum Nasional & Auditor Administrasi Guru** dari Kemendikdasmen RI yang sangat canggih.
    Tugas Anda: Menyusun **Alur Tujuan Pembelajaran (ATP)** yang memiliki kecerdasan analisa tinggi dan presisi matematis 100%.
    
    **PARAMETER SEMESTER & ELEMEN:**
    - Jenjang: **${level}** (Kelas ${data.gradeLevel})
    - Semester: **${getSemesterLabel(semester)}**
    - Fokus Fase: **${BSKAP_DATA.standards.semester_logic[getSemesterKey(semester)].focus}**
    - Peta Elemen Resmi: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.elemen || [])}
    - **LINGKUP MATERI RESMI (MANDATORY)**: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.materi_inti || [])}
    
    **🚨 CRITICAL SEMESTER CONSTRAINT (ABSOLUTE RULE):**
    ✅ **ANDA HANYA BOLEH** menggunakan elemen dari: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.elemen || [])}
    ✅ **ANDA HANYA BOLEH** menggunakan materi yang MERUJUK pada: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.materi_inti || [])}
    ❌ **DILARANG KERAS** menggunakan materi dari semester ${getSemesterLabel(semester) === 'Ganjil' ? 'Genap' : 'Ganjil'}
    ❌ **DILARANG** menambah elemen atau materi di luar list resmi semester ${getSemesterLabel(semester)} di atas
    🎯 **FOKUS WAJIB**: Semester **${getSemesterLabel(semester)}** dengan filosofi **${BSKAP_DATA.standards.semester_logic[getSemesterKey(semester)].focus}**
    
    **📚 CRITICAL GRADE-LEVEL TEXTBOOK CONSTRAINT (ABSOLUTE RULE):**
    🎯 **REFERENSI WAJIB**: Anda HARUS menggunakan pengetahuan Anda tentang **Buku Teks Resmi Kemendikdasmen / Kemendikbudristek untuk Kelas ${data.gradeLevel}** sebagai panduan utama.
    ✅ **MANDATORY**: Setiap materi yang Anda pilih dari "LINGKUP MATERI RESMI" di atas HARUS dipetakan ke **urutan bab/topik yang sesuai dengan Buku Pemerintah (Kemendikdasmen/Kemendikbudristek) Kelas ${data.gradeLevel}**.
    ❌ **DILARANG KERAS**: Mengambil materi yang ada di Buku Teks Kelas ${parseInt(data.gradeLevel) - 1} (kelas di bawahnya) atau Kelas ${parseInt(data.gradeLevel) + 1} (kelas di atasnya).
    🔍 **VERIFICATION MANDATORY**: Sebelum memilih suatu materi dari list, tanyakan pada diri sendiri: "Apakah topik ini ada di Buku ${data.subject} Kelas ${data.gradeLevel} Kemendikdasmen / Kemendikbudristek?"
    
    **CONTOH SPIRAL CURRICULUM (REFERENSI):**
    - Matematika SMP: Kelas 7 (Bilangan Bulat, Pecahan, Himpunan) → Kelas 8 (Koordinat Kartesius, Teorema Pythagoras, SPLDV) → Kelas 9 (Perpangkatan, Barisan, Fungsi Kuadrat)
    - Gunakan pengetahuan serupa untuk mata pelajaran ${data.subject} Kelas ${data.gradeLevel}
    
    **INSTRUKSI PENYUSUNAN (STRICT):**
    1. **MANDATORY SEMESTER LOCK**: Gunakan HANYA elemen dan materi dari "PETA ELEMEN RESMI" dan "LINGKUP MATERI RESMI" di atas. Jika ada elemen yang tidak tercakup di semester ini, SKIP dan jangan paksa.
    2. **DEEP LEARNING PHILOSOPHY (BSKAP 046/H/KR/2025)**:
       - **Mindful**: Pembelajaran yang membangun kesadaran penuh dan fokus (Sense of Awareness).
       - **Meaningful**: Fokus pada kedalaman pemahaman (Deep Learning) dan relevansi dunia nyata, bukan hanya keluasan materi.
       - **Joyful**: Menjaga motivasi intrinsik dan kesejahteraan emosional peserta didik.
    3. **UNIQUE MATERIAL TITLES**: Kolom 'Lingkup Materi' bertindak sebagai **Judul Materi Ajar (Lesson Title)**. 
       - Anda **WAJIB** memberikan judul yang **UNIK dan SPESIFIK**.
    4. **MATHEMATICAL PRECISION & STRUCTURE (STRICT)**:
       - **JUMLAH BARIS**: Anda **WAJIB** menghasilkan antara **10 hingga 15 baris** (Lingkup Materi).
       - **PROSEDUR HITUNG (MANDATORY)**:
         1. Cari TotalMinggu = ${data.totalJP} / ${data.jpPerWeek}.
         2. Berikan durasi 1, 2, atau 3 Minggu untuk setiap baris.
         3. JP per Baris = Durasi (Minggu) * ${data.jpPerWeek}.
         4. **SUM CHECK**: Total seluruh 'jp' MUST EXACTLY EQUAL ${data.totalJP}.
    5. **CHRONOLOGICAL TIMELINE ENFORCER (LINEARITY)**:
       - Penempatan 'Elemen' dan 'Lingkup Materi' **WAJIB** mengikuti urutan logis/linier sesuai alur buku teks atau urutan yang diberikan pada parameter input.
       - DILARANG melompat-lompat elemen (misal: Elemen 4 di baris awal, lalu Elemen 1 di baris akhir).
    6. **STRICT PROFIL LULUSAN (8 DIMENSI)**: 
       - Gunakan HANYA list resmi: ${BSKAP_DATA.standards.profile_lulusan_2025.map(p => p.dimensi).join(', ')}.
       - **DILARANG KERAS** memasukkan "Literasi AI", "Adaptabilitas", atau "EQ" ke kolom 'profilLulusan'.
    
    **PARAMETER OPERASIONAL:**
    - Target Total: **${data.totalJP} JP**
    - Jam/Minggu: **${data.jpPerWeek} JP**
    - Jenjang: **${level} (Kelas ${data.gradeLevel})**
    
    **DATA PROFIL:**
    - Guru: ${userProfile?.title || 'Bapak/Ibu'} ${userProfile?.name || ''}
    - Mata Pelajaran: ${data.subject}
    - RPP Existing: ${data.existingRPPs?.join(', ') || 'Belum ada'}

    ${getRegionalLanguage(data.subject) ? `
    **INSTRUKSI BAHASA DAERAH (${getRegionalLanguage(data.subject)})**:
    - Karena mata pelajaran ini adalah Bahasa Daerah, susunlah narasi Tujuan Pembelajaran (TP) dalam **Bahasa ${getRegionalLanguage(data.subject)}**.
    - Tetap gunakan Bahasa Indonesia untuk field JSON dan label elemen.
    ` : ''}

    **PEMETAAN PROFIL LULUSAN (8 DIMENSI 2025):**
    Setiap TP HARUS dipetakan ke salah satu atau beberapa dimensi Profil Lulusan berikut:
    ${BSKAP_DATA.standards.profile_lulusan_2025.map(p => `- ${p.dimensi}${p.dimensi === 'Keimanan & Ketakwaan' ? ' (Gunakan jika TP mengandung unsur: Integritas/kejujuran, etika profesi/digital, rasa syukur atas keteraturan ilmu/alam, atau tanggung jawab moral/sosial).' : ''}`).join('\n    ')}
    
    **KOMPETENSI INDUSTRI (STRATEGIS 2026):**
    Perkaya narasi TP (Tujuan Pembelajaran) jika relevan dengan nilai kompetensi industri berikut:
    ${BSKAP_DATA.standards.industry_competencies_2025_2026.map(c => `- ${c.name}: ${c.description}`).join('\n    ')}

    Gunakan nama dimensi/kompetensi yang relevan dengan TP tersebut.

    **STRUKTUR OUTPUT (JSON ARRAY):**
    ⚠️ PENTING: Field 'elemen' harus HANYA dari list: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.elemen || [])}
    ⚠️ PENTING: Field 'materi' harus MERUJUK materi dalam list: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.materi_inti || [])}
    [
      { "no": 1, "elemen": "ELEMEN_TUNGGAL", "materi": "JUDUL_UNIK_SPESIFIK", "tp": "TP_DESKRIPTIF_PROYEK/TEORI", "jp": ${data.jpPerWeek}, "profilLulusan": "DIMENSI_8" }
    ]

    **VERIFIKASI AKHIR AUDITOR (WAJIB DICEK SEBELUM OUTPUT):**
    - "Apakah kedalaman materi sudah sesuai taksonomi Bloom untuk Kelas ${data.gradeLevel}?"
    - "Hitung ulang: Apakah total JP tepat ${data.totalJP} JP? (WAJIB SINKRON)."
    - "🚨 CRITICAL: Apakah SEMUA elemen yang saya pilih ADA dalam list semester ${getSemesterLabel(semester)}: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.elemen || [])}?"
    - "🚨 CRITICAL: Apakah SEMUA materi yang saya buat MERUJUK pada lingkup materi semester ${getSemesterLabel(semester)}: ${JSON.stringify(subjectData?.[getSemesterKey(semester)]?.materi_inti || [])}?"
    - "🚨 Apakah saya TIDAK menggunakan materi dari semester ${getSemesterLabel(semester) === 'Ganjil' ? 'Genap' : 'Ganjil'}?"
    - "📚 CRITICAL: Apakah SETIAP materi yang saya pilih SESUAI dengan urutan topik/bab di Buku Teks ${data.subject} Kelas ${data.gradeLevel} Kemendikdasmen / Kemendikbudristek?"
    - "📚 CRITICAL: Apakah saya TIDAK mengambil topik yang seharusnya ada di Buku Kelas ${parseInt(data.gradeLevel) - 1} atau Kelas ${parseInt(data.gradeLevel) + 1}?"
    `;

  try {
    const model = getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return extractJSON(response.text());
  } catch (error) {
    console.error("Error generating ATP:", error);
    return handleGeminiError(error, "generateATP");
  }
}
