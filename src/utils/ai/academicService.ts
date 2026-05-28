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
        const basePrompt = getLessonPlanPrompt(data, BSKAP_DATA, level, cpFullVerbatim, getSemesterLabel(data.semester), getSemesterKey(data.semester), subjectKey, regionalLanguage);
        const model = await getModel(data.modelName, false, STRICT_DOCUMENT_BRAIN);

        // PART 1: IDENTIFICATION & SECTION I
        onProgress("Menyusun Identitas & Kompetensi...");
        const part1Prompt = `${basePrompt}\n\n**INTRUKSI KHUSUS GENERASI PART 1:**\nHanya buat bagian HEADER (Identifikasi Pembelajaran) dan SEKSI I (KOMPETENSI INTI). Berhenti tepat setelah SEKSI I selesai. JANGAN buat SEKSI II ke bawah dulu. Fokus pada keakuratan CP dan TP.`;
        const result1 = await retryWithBackoff(() => model.generateContent(part1Prompt));
        const res1Text = result1.response.text();

        // PART 2: SECTION II
        onProgress("Menyusun Langkah Pembelajaran...");
        const part2Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK:**\n${res1Text}\n\n**INTRUKSI KHUSUS GENERASI PART 2:**\nBerdasarkan Identitas dan Kompetensi di atas, buatlah SEKSI II (LANGKAH-LANGKAH PEMBELAJARAN) saja. \n**KONTROL PANJANG:** Buatlah langkah pembelajaran yang naratif dan mendetail namun **tetap efisien** (Target: sekitar 3-4 halaman per pertemuan). Jangan terlalu berulang. Berhenti tepat setelah SEKSI II selesai.`;
        const result2 = await retryWithBackoff(() => model.generateContent(part2Prompt));
        const res2Text = result2.response.text();

        // PART 3: SECTIONS III, IV, V
        onProgress("Menyusun Lampiran & Materi Ajar...");
        const part3Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK:**\n${res1Text}\n${res2Text}\n\n**INTRUKSI KHUSUS GENERASI PART 3:**\nLanjutkan dokumen ini dengan membuat SEKSI III (MEDIA BELAJAR), SEKSI IV (LAMPIRAN/LKPD/ASESMEN), dan SEKSI V (MATERI AJAR MENDETAIL/GLOSARIUM/DP). \n**KONTROL PANJANG:** Pastikan LKPD dan Materi Ajar lengkap sesuai target, namun jangan melebar tanpa arah. Selesaikan seluruh dokumen sampai Daftar Pustaka.`;
        const result3 = await retryWithBackoff(() => model.generateContent(part3Prompt));
        const res3Text = result3.response.text();

        // COMBINE
        return `${res1Text}\n\n${res2Text}\n\n${res3Text}`;
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

        const model = await getModel(modelName, true, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return extractJSON(result.response.text());
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateATP"));
    }
}
