import {
    getModel,
    retryWithBackoff,
    extractJSON,
    getLevel,
    getSemesterLabel,
    getSemesterKey,
    getSubjectKey,
    getRegionalLanguage,
    handleGeminiError
} from "./base";
import { getLessonPlanPrompt } from "../prompts/lessonPlanPrompts";
import {
    getHandoutPrompt,
    getLKPDFromRPPPrompt,
    getATPPrompt,
    getExtractKKTPPrompt
} from "../prompts/applicationPrompts";
import { BSKAP_DATA, VERBATIM_BSKAP_DATA } from "../bskapData";
import { STRICT_DOCUMENT_BRAIN } from "../prompts/smarttyPrompts";

interface GenerationInput {
    gradeLevel: string | number;
    subject: string;
    semester: string | number;
    modelName: string;
    onProgress?: (msg: string) => void;
}

interface BSKAPSubjectEntry {
    cp_full?: string;
}

interface BSKAPSubjects {
    subjects?: Record<string, Record<string, Record<string, BSKAPSubjectEntry>>>;
}

/**
 * Generates an automated RPP (Lesson Plan).
 */
export const generateLessonPlan = async (data: GenerationInput & Record<string, unknown>): Promise<string> => {
    try {
        const onProgress = data.onProgress || (() => { });
        const level = getLevel(data.gradeLevel);
        const subjectKey = getSubjectKey(data.subject);
        const cpFullVerbatim = (VERBATIM_BSKAP_DATA as BSKAPSubjects).subjects?.[level]?.[data.gradeLevel]?.[subjectKey]?.cp_full || "Lihat list elemen dan materi.";

        const regionalLanguage = getRegionalLanguage(data.subject);
        const bookChapterData = data.bookChapterData || null;

        const basePrompt = getLessonPlanPrompt(data, BSKAP_DATA, level, cpFullVerbatim, getSemesterLabel(data.semester), getSemesterKey(data.semester), subjectKey, regionalLanguage, bookChapterData);
        const model = await getModel(data.modelName, false, STRICT_DOCUMENT_BRAIN);

        // PART 1: IDENTIFICATION & SECTION I
        onProgress("Menyusun Identitas & Kompetensi...");
        const part1Prompt = `${basePrompt}\n\n**INTRUKSI KHUSUS GENERASI PART 1:**\nHanya buat bagian HEADER (Identifikasi Pembelajaran) dan SEKSI I (KOMPETENSI INTI). Berhenti tepat setelah SEKSI I selesai. JANGAN buat SEKSI II ke bawah dulu. Fokus pada keakuratan CP dan TP. \n\n**DILARANG KERAS:** Jangan sertakan visualisasi JSON dalam bagian ini.`;
        const result1 = await retryWithBackoff(() => model.generateContent(part1Prompt));
        const res1Text = result1.response.text();

        // PART 2: SECTION II
        onProgress("Menyusun Langkah Pembelajaran...");
        const part2Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK:**\n${res1Text}\n\n**INTRUKSI KHUSUS GENERASI PART 2:**\nBerdasarkan Identitas dan Kompetensi di atas, buatlah SEKSI II (LANGKAH-LANGKAH PEMBELAJARAN) saja. \n**KONTROL PANJANG:** Buatlah langkah pembelajaran yang naratif dan mendetail namun **tetap efisien** (Target: sekitar 3-4 halaman per pertemuan). Jangan terlalu berulang. Berhenti tepat setelah SEKSI II selesai. \n\n**DILARANG KERAS:** Jangan sertakan visualisasi JSON dalam bagian ini.`;
        const result2 = await retryWithBackoff(() => model.generateContent(part2Prompt));
        const res2Text = result2.response.text();

        // PART 3: SECTIONS III & IV (Media & Lampiran/LKPD)
        onProgress("Menyusun Media & Lampiran (LKPD/Asesmen)...");
        const part3Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK:**\n${res1Text}\n${res2Text}\n\n**INTRUKSI KHUSUS GENERASI PART 3:**\nLanjutkan dengan membuat SEKSI III (MEDIA BELAJAR) dan SEKSI IV (LAMPIRAN/LKPD/ASESMEN). Berhenti tepat setelah SEKSI IV selesai. JANGAN buat Materi Ajar dulu. \n\n**DILARANG KERAS:** Jangan sertakan visualisasi JSON dalam bagian ini.`;
        const result3 = await retryWithBackoff(() => model.generateContent(part3Prompt));
        const res3Text = result3.response.text();

        // PART 4: SECTIONS V, VI, VII (MATERI AJAR & FINALISASI)
        onProgress("Menguraikan Materi Ajar Mendetail...");
        const part4Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK:**\n${res1Text}\n${res2Text}\n${res3Text}\n\n**INTRUKSI KHUSUS GENERASI PART 4:**\nBerdasarkan langkah pembelajaran di atas, uraikan SEKSI V (MATERI AJAR MENDETAIL) secara sangat mendalam (minimal 5-8 paragraf), diikuti SEKSI VI (GLOSARIUM) dan SEKSI VII (DAFTAR PUSTAKA).\n\n**AKTIVASI VISUAL:** SEKARANG SAATNYA Anda menyisipkan 1-2 visualisasi interaktif (JSON) di dalam SEKSI V sesuai instruksi Sistem Visualisasi Cerdas.`;
        const result4 = await retryWithBackoff(() => model.generateContent(part4Prompt));
        const res4Text = result4.response.text();

        // COMBINE
        return `${res1Text}\n\n${res2Text}\n\n${res3Text}\n\n${res4Text}`;
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateLessonPlan"));
    }
};

/**
 * Generates a Handout.
 */
export async function generateHandout(data: Record<string, unknown>, modelName: string): Promise<string> {
    try {
        const prompt = getHandoutPrompt(data, BSKAP_DATA, getRegionalLanguage);
        const model = await getModel(modelName, false, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateHandout"));
    }
}

/**
 * Generates LKPD from RPP content.
 */
export async function generateLKPDFromRPP(rppContent: string, assessmentModel: string, modelName: string, studentListText: string = ""): Promise<string> {
    try {
        const prompt = getLKPDFromRPPPrompt(rppContent, assessmentModel, BSKAP_DATA, studentListText);
        const model = await getModel(modelName, false, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateLKPDFromRPP"));
    }
}

/**
 * Extracts KKTP data from RPP content using AI.
 */
export async function extractKKTPFromRPP(rppContent: string, modelName: string): Promise<Record<string, unknown>> {
    try {
        const prompt = getExtractKKTPPrompt(rppContent);
        const model = await getModel(modelName, true, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const textResponse = result.response.text();
        return extractJSON(textResponse);
    } catch (error) {
        throw new Error(handleGeminiError(error, "extractKKTPFromRPP"));
    }
}

/**
 * Generates Alur Tujuan Pembelajaran (ATP).
 */
export async function generateATP(data: Record<string, unknown>, modelName: string): Promise<Record<string, unknown>> {
    const typedData = data as unknown as { gradeLevel: string | number; subject: string; semester: string | number; userProfile: Record<string, unknown> };
    try {
        const level = getLevel(typedData.gradeLevel);
        const subjectKey = getSubjectKey(typedData.subject);
        const semesterKey = getSemesterKey(typedData.semester);
        const subjectData = (BSKAP_DATA as BSKAPSubjects).subjects?.[level]?.[typedData.gradeLevel]?.[subjectKey] || (BSKAP_DATA as BSKAPSubjects).subjects?.[level]?.[subjectKey];
        const cpFullVerbatim = (VERBATIM_BSKAP_DATA as BSKAPSubjects).subjects?.[level]?.[typedData.gradeLevel]?.[subjectKey]?.cp_full || "Lihat list elemen dan materi.";

        const prompt = getATPPrompt(data, BSKAP_DATA, level, subjectData, cpFullVerbatim, getSemesterLabel(typedData.semester), semesterKey, subjectKey, typedData.userProfile, getRegionalLanguage);

        // Append Book Context if available
        let finalPrompt = prompt;
        if (data.bookContext) {
            const book: { chapters?: Array<{ title: string }> } = data.bookContext as any;
            if (book.chapters) {
                const chaptersText = book.chapters.map((c: any) => `- ${c.title}`).join('\n');
                finalPrompt += `\n\n**KONTEKS MATERI BUKU TEKS:**\n${chaptersText}\n\nInstruksi: Gunakan urutan topik dari buku teks di atas sebagai panduan alur (sequence) materi. Pastikan cakupan materi tidak melenceng dari buku siswa, namun fokuskan output pada kompetensi Kurikulum Merdeka (CP/TP). JANGAN sertakan nomor halaman atau nomor bab dalam teks hasil akhir.`;
            }
        }

        const model = await getModel(modelName, true, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(finalPrompt));
        return extractJSON(result.response.text());
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateATP"));
    }
}
