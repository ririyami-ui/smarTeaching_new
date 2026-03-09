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
import { getDailyBriefingPrompt } from "../prompts/applicationPrompts";
import { BSKAP_DATA } from "../bskapData";

// --- Caching variables ---
let lastAnalyzedJournalsString = null;
let lastAnalysisResultCache = null;
let lastAnalyzedClassDataString = null;
let lastClassAnalysisReportCache = null;

/**
 * Generates a response for a conversational chat.
 */
export async function generateChatResponse(history, newMessage, userProfile, modelName, imageData = null, liveContext = null) {
    try {
        const sanitizedHistory = [];
        const historyContext = history && history.length > 0 ? history.slice(0, -1) : [];

        if (historyContext.length > 0) {
            let lastRole = '';
            for (const message of historyContext) {
                let parts = [...message.parts];
                if (message.image) {
                    const cleanBase64 = message.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                    parts.unshift({ inlineData: { data: cleanBase64, mimeType: "image/jpeg" } });
                }
                const validMessage = { role: message.role, parts: parts };
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
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const currentMonth = monthNames[now.getMonth()];
        const currentDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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

        const systemInstruction = { parts: [{ text: getSystemInstruction(userTitle, userName, schoolName, schoolLevel, contextSnippet, BSKAP_DATA) }] };

        let messageParts = [{ text: newMessage }];
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
export async function analyzeTeachingJournals(journals, modelName) {
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
        const model = getModel(modelName);
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
export async function analyzeJournalsForStudentWarnings(journals, students, modelName) {
    if (!journals || journals.length === 0 || !students || students.length === 0) return {};

    const studentMap = students.reduce((acc, s) => ({ ...acc, [s.name]: s.id }), {});
    const journalTexts = journals.map(j => `Tanggal: ${j.date}\nKelas: ${j.className}\nRefleksi: ${j.reflection || '-'}\nHambatan: ${j.challenges || '-'}\n---`).join('\n');

    try {
        const model = getModel(modelName);
        const prompt = getStudentWarningAnalysisPrompt(journalTexts, students.map(s => s.name));
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const parsed = extractJSON(result.response.text());

        const warnings = {};
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
export async function generateClassAnalysisReport(classData, modelName, isConcise = false) {
    const currentStr = JSON.stringify({ ...classData, isConcise });
    if (currentStr === lastAnalyzedClassDataString && lastClassAnalysisReportCache) return lastClassAnalysisReportCache;

    const { className, students, grades, attendance, infractions, journals } = classData;
    let prompt = getClassAnalysisReportPrompt(
        className,
        students.length,
        JSON.stringify(attendance, null, 2),
        JSON.stringify(grades, null, 2),
        JSON.stringify(infractions, null, 2),
        journals.map(j => `- ${j.date}: ${j.reflection || j.material}`).join('\n')
    );

    if (isConcise) {
        prompt += "\n\nCATATAN KHUSUS: Buat laporan ini SANGAT RINGKAS (maksimal 8-10 baris saja). Fokus pada poin-poin paling kritis.";
    }

    try {
        const model = getModel(modelName);
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
export async function generateConciseClassAnalysisReport(classData, modelName) {
    return generateClassAnalysisReport(classData, modelName, true);
}

/**
 * Polish journal text.
 */
export async function polishJournalText(rawText, modelName, fieldHint = "") {
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
        const model = getModel(modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text().trim();
    } catch (error) {
        return rawText;
    }
}
