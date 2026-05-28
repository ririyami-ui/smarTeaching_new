import {
    getModel,
    retryWithBackoff,
    generateContentWithFallback,
    handleGeminiError,
    extractJSON
} from "./base";
import {
    getSystemInstruction,
    getTeachingJournalAnalysisPrompt,
    getStudentWarningAnalysisPrompt,
    getClassAnalysisReportPrompt
} from "../prompts/smarttyPrompts";
import { BSKAP_DATA } from "../bskapData";
import { Part, Content } from "@google/generative-ai";
import { formatDate } from "../dateUtils";

// --- Types ---
export interface Message {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>;
  image?: string;
}

export interface UserProfile {
  name?: string;
  email?: string;
  title?: string;
  school?: string;
  schoolName?: string;
  schoolLevel?: string;
  nip?: string;
}

export interface LiveContext {
  activeSemester?: string;
  avgGrade?: string | number;
  avgAttendance?: string | number;
  totalInfractions?: number;
  totalStars?: number;
  studentsAtRisk?: Record<string, unknown>[];
}

export interface Journal {
  date: string;
  className: string;
  subjectName: string;
  material: string;
  learningObjectives?: string;
  learningActivities?: string;
  reflection?: string;
  challenges?: string;
  followUp?: string;
  isImplemented?: boolean;
}

// --- Caching variables ---
let lastAnalyzedJournalsString: string | null = null;
let lastAnalysisResultCache: { summary: string; sentiment: { percentage: number; explanation: string } } | null = null;
let lastAnalyzedClassDataString: string | null = null;
let lastClassAnalysisReportCache: string | null = null;

/**
 * Generates a response for a conversational chat.
 */
export async function generateChatResponse(
  history: Message[], 
  newMessage: string, 
  userProfile: UserProfile | null, 
  modelName: string, 
  imageData: string | null = null, 
  liveContext: LiveContext | null = null
): Promise<string> {
    try {
        const sanitizedHistory: Content[] = [];
        const historyContext = history && history.length > 0 ? history.slice(0, -1) : [];

        if (historyContext.length > 0) {
            let lastRole = '';
            for (const message of historyContext) {
                let parts = [...message.parts];
                if (message.image) {
                    const cleanBase64 = message.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                    parts.unshift({ inlineData: { data: cleanBase64, mimeType: "image/jpeg" } });
                }
                const validMessage: Content = { role: message.role, parts: parts as Part[] };
                if (validMessage.role !== lastRole) {
                    sanitizedHistory.push(validMessage);
                    lastRole = validMessage.role;
                }
            }
        }

        const finalHistory = sanitizedHistory.filter((msg, idx) => !(idx === 0 && msg.role === 'model'));

        // Extract user profile details or use defaults
        const userName = userProfile?.name || (userProfile?.email ? userProfile.email.split('@')[0] : "Guru");
        const userTitle = userProfile?.title || "Bpk/Ibu";
        const schoolName = userProfile?.school || "Sekolah";
        const schoolLevel = userProfile?.schoolLevel || "SD/SMP/SMA";

        // Format live context if available
        let contextSnippet = "";
        const now = new Date();
        const currentDate = formatDate(now);

        if (liveContext) {
            contextSnippet = `
      INFO SAAT INI:
      - Tanggal: ${currentDate}
      - Semester: ${liveContext.activeSemester || 'Aktif'}
      
      Radar Kondisi Kelas:
      - Rata-rata Nilai: ${liveContext.avgGrade}
      - Rata-rata Kehadiran: ${liveContext.avgAttendance}%
      - Total Pelanggaran: ${liveContext.totalInfractions}
      - Total Bintang/Apresiasi: ${liveContext.totalStars}
      - Siswa Perlu Perhatian: ${JSON.stringify(liveContext.studentsAtRisk || [])}
      `;
        } else {
            contextSnippet = `INFO SAAT INI: Tanggal ${currentDate}.`;
        }

        const systemInstruction: Content = { role: "user", parts: [{ text: getSystemInstruction(userTitle, userName, schoolName, schoolLevel, contextSnippet, BSKAP_DATA) }] };

        let messageParts: Part[] = [{ text: newMessage }];
        if (imageData) {
            const cleanBase64 = imageData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
            messageParts.push({ inlineData: { data: cleanBase64, mimeType: "image/jpeg" } });
        }

        const result = await generateContentWithFallback(modelName, async (modelInstance) => {
            const chat = modelInstance.startChat({
                history: finalHistory,
                generationConfig: { maxOutputTokens: 8192 },
                systemInstruction: systemInstruction,
            });
            return await chat.sendMessage(messageParts);
        });

        const response = await result.response;
        return response.text();
    } catch (error) {
        return handleGeminiError(error, "generateChatResponse");
    }
}

/**
 * Analyzes teaching journals.
 */
export async function analyzeTeachingJournals(journals: Journal[], modelName: string) {
    if (!journals || journals.length === 0) {
        lastAnalyzedJournalsString = null;
        lastAnalysisResultCache = null;
        return { summary: "Tidak ada jurnal untuk dianalisis.", sentiment: { percentage: 0, explanation: "" } };
    }

    const currentJournalsString = JSON.stringify(journals);
    if (currentJournalsString === lastAnalyzedJournalsString && lastAnalysisResultCache !== null) {
        return lastAnalysisResultCache;
    }

    try {
        const model = await getModel(modelName);
        const journalTexts = journals.map(j => `Tanggal: ${j.date}\nKelas: ${j.className}\nMatpel: ${j.subjectName}\nMateri: ${j.material}\nRefleksi: ${j.reflection || 'Tidak ada'}\nHambatan: ${j.challenges || 'Tidak ada'}\n---`).join('\n');
        const prompt = getTeachingJournalAnalysisPrompt(journalTexts);

        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const text = result.response.text();

        const analysisResult = {
            summary: text.match(/RINGKASAN: (.*)/)?.[1] || "Tidak dapat menghasilkan ringkasan.",
            sentiment: {
                percentage: parseInt(text.match(/SENTIMEN_PERSENTASE: (\d+)/)?.[1] || "0", 10),
                explanation: text.match(/SENTIMEN_PENJELASAN: (.*)/)?.[1] || "Tidak dapat menganalisis sentimen."
            }
        };

        lastAnalyzedJournalsString = currentJournalsString;
        lastAnalysisResultCache = analysisResult;
        return analysisResult;
    } catch (error) {
        return { summary: handleGeminiError(error, "analyzeTeachingJournals"), sentiment: { percentage: 0, explanation: "" } };
    }
}

/**
 * Analyzes projects for student warnings.
 */
export async function analyzeJournalsForStudentWarnings(journals: Journal[], students: Array<{ name: string; id: string }>, modelName: string) {
    if (!journals || journals.length === 0 || !students || students.length === 0) return {};

    const studentMap = students.reduce((acc, s) => ({ ...acc, [s.name]: s.id }), {} as Record<string, string>);
    const journalTexts = journals.map(j => `Tanggal: ${j.date}\nKelas: ${j.className}\nRefleksi: ${j.reflection || '-'}\nHambatan: ${j.challenges || '-'}\n---`).join('\n');

    try {
        const model = await getModel(modelName);
        const prompt = getStudentWarningAnalysisPrompt(journalTexts, students.map(s => s.name));
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const parsed = extractJSON<Record<string, string>>(result.response.text());

        const warnings: Record<string, string> = {};
        for (const name in parsed) {
            if (studentMap[name]) warnings[studentMap[name]] = parsed[name];
        }
        return warnings;
    } catch (error) {
        return { error: handleGeminiError(error, "analyzeJournalsForStudentWarnings") };
    }
}

/**
 * Generates class analysis report.
 */
export async function generateClassAnalysisReport(classData: { className: string; students: Array<{ name: string; id: string }>; grades: Record<string, unknown>[]; attendance: Record<string, unknown>; infractions: Record<string, unknown>[]; journals: Journal[] }, modelName: string, isConcise: boolean = false) {
    const currentStr = JSON.stringify({ ...classData, isConcise });
    if (currentStr === lastAnalyzedClassDataString && lastClassAnalysisReportCache) return lastClassAnalysisReportCache;

    const { className, students, grades, attendance, infractions, journals } = classData;
    let prompt = getClassAnalysisReportPrompt(
        className,
        students.length,
        JSON.stringify(attendance, null, 2),
        JSON.stringify(grades, null, 2),
        JSON.stringify(infractions, null, 2),
        journals.map((j: Journal) => `- ${j.date}: ${j.reflection || j.material}`).join('\n')
    );

    if (isConcise) {
        prompt += "\n\nCATATAN KHUSUS: Buat laporan ini SANGAT RINGKAS (maksimal 8-10 baris saja). Fokus pada poin-poin paling kritis.";
    }

    try {
        const model = await getModel(modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const text = result.response.text();
        lastAnalyzedClassDataString = currentStr;
        lastClassAnalysisReportCache = text;
        return text;
    } catch (error) {
        return handleGeminiError(error, "generateClassAnalysisReport");
    }
}

/**
 * Generates concise class analysis report.
 */
export async function generateConciseClassAnalysisReport(classData: { className: string; students: Array<{ name: string; id: string }>; grades: Record<string, unknown>[]; attendance: Record<string, unknown>; infractions: Record<string, unknown>[]; journals: Journal[] }, modelName: string) {
    return generateClassAnalysisReport(classData, modelName, true);
}

/**
 * Polish journal text.
 */
export async function polishJournalText(rawText: string, modelName: string, fieldHint: string = ""): Promise<string> {
    if (!rawText?.trim()) return "";

    let prompt = `Anda adalah seorang asisten editorial ahli untuk guru. Tugas Anda adalah memoles (polish) catatan mentah jurnal mengajar berikut agar menjadi lebih profesional, namun tetap SANGAT RINGKAS dan TO-THE-POINT.\n\nCatatan Mentah: "${rawText}"`;

    if (fieldHint) {
        prompt += `\nKonteks Field: ${fieldHint}.`;
    }

    prompt += `\n\nATURAN KETAT:
    1. KONSISTENSI & RINGKAS: Berikan hasil yang padat, tidak bertele-tele, dan langsung ke inti. 
    2. GAYA BAHASA: Gunakan bahasa Indonesia formal yang efektif.
    3. FORMAT: Jika field adalah "Tujuan Pembelajaran" atau "Kegiatan", gunakan poin-poin (bullets) jika terdapat lebih dari satu poin utama.
    4. TANPA PREAMBLE: Jangan berikan kata pengantar seperti "Berikut adalah hasilnya..." atau pembukaan AI lainnya. Berikan teks hasil polesan saja.`;

    try {
        const model = await getModel(modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text().trim();
    } catch {
        return rawText;
    }
}

export interface ScheduleItem {
  subject: string;
  class: string;
  startTime: string;
}

export interface TaskItem {
  id?: string;
  name?: string;
}

export interface DailyBriefingContext {
  teacherName: string;
  date: string;
  schedules: ScheduleItem[];
  tasks: TaskItem[];
  missingJournalsCount: number;
  schoolName?: string;
  mainSubject?: string;
  model?: string;
}

export async function generateDailyBriefing(contextData: DailyBriefingContext, modelName: string): Promise<string> {
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
    Anda adalah asisten pribadi guru yang ceria dan profesional bernama "Smarty".
    Buatlah naskah briefing singkat (max 3-4 kalimat) untuk dibacakan kepada guru di pagi hari.
    
    Data Guru:
    - Nama: ${teacherName}
    - Tanggal: ${date}
    - Jadwal Hari Ini: ${scheduleSummary}
    - Status Tugas: ${taskSummary}
    - Status Jurnal: ${journalWarning}

    Instruksi:
    - Sapa guru PERSIS dengan panggilan: "${teacherName}". (Jangan ubah title atau namanya).
    - Sebutkan hari/tanggal hari ini.
    - Rangkum jadwal hari ini dengan semangat.
    - Ingatkan tentang tugas atau jurnal jika ada yang pending.
    - Tutup dengan kalimat motivasi singkat.
    - Gunakan Bahasa Indonesia yang natural dan akrab.
    - JANGAN gunakan format markdown atau bullet points, tulis sebagai paragraf narasi biasa.
  `;

  try {
    const model = await getModel(modelName);
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating daily briefing:", error);
    return `Selamat pagi Bpk/Ibu ${teacherName}. Hari ini tanggal ${date}. ${schedules.length > 0 ? `Anda memiliki ${schedules.length} jadwal mengajar.` : 'Anda tidak memiliki jadwal mengajar hari ini.'} Tetap semangat dan selamat beraktivitas!`;
  }
}


export const detectAnalysisIntent = (msg) => {
  if (!msg) return false;
  const lowered = msg.toLowerCase();
  const keywords = [" siswa\,\nilai\,\presensi\,\kehadiran\,\pelanggaran\,\kelas\,\kondisi\,\raport\,\analisis\];
 return keywords.some(k => lowered.includes(k));
};


export const detectAnalysisIntent = (msg) => {
  if (!msg) return false;
  const lowered = msg.toLowerCase();
  const keywords = [" siswa\,\nilai\,\presensi\,\kehadiran\,\pelanggaran\,\kelas\,\kondisi\,\raport\,\analisis\];
 return keywords.some(k => lowered.includes(k));
};
