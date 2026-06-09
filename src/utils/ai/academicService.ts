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
        const model = await getModel(data.modelName, false, STRICT_DOCUMENT_BRAIN);

        // PREPARE PROMPTS
        const { basePrompt, materialPrompt } = getLessonPlanPrompt(data, BSKAP_DATA, level, cpFullVerbatim, getSemesterLabel(data.semester), getSemesterKey(data.semester), subjectKey, regionalLanguage) as any;

        // PART 1: IDENTIFICATION & SECTION I
        onProgress("Menyusun Identitas & Kompetensi...");
        const part1Prompt = `${basePrompt}\n\n**INTRUKSI KHUSUS GENERASI PART 1:**\nHanya buat bagian HEADER dan SEKSI I (KOMPETENSI INTI). Berhenti tepat setelah SEKSI I selesai. DILARANG membuat seksi lainnya.`;
        const result1 = await retryWithBackoff(() => model.generateContent(part1Prompt));
        const res1Text = result1.response.text();

        // PART 2: SECTION II (Langkah Pembelajaran Presisi)
        onProgress("Merancang Langkah Pembelajaran (Tabel Guru & Siswa)...");
        const part2Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK (DILARANG TULIS ULANG):**\n${res1Text}\n\n**INTRUKSI KHUSUS GENERASI PART 2:**\nBuat SEKSI II (LANGKAH-LANGKAH PEMBELAJARAN). \n**KONTROL OUTPUT:** Langsung mulai dari header "## II. LANGKAH-LANGKAH PEMBELAJARAN". DILARANG menulis ulang judul utama, identitas, atau seksi sebelumnya. Wajib gunakan format tabel. Berhenti tepat setelah SEKSI II selesai.`;
        const result2 = await retryWithBackoff(() => model.generateContent(part2Prompt));
        const res2Text = result2.response.text();

        // PART 3: SECTIONS III & IV (Media & Lampiran/LKPD)
        onProgress("Menyusun Media & Lampiran (LKPD/Asesmen)...");
        const part3Prompt = `${basePrompt}\n\n**KONTEKS YANG SUDAH TERBENTUK (DILARANG TULIS ULANG):**\n${res1Text}\n${res2Text}\n\n**INTRUKSI KHUSUS GENERASI PART 3:**\nBuat SEKSI III (MEDIA BELAJAR) dan SEKSI IV (LAMPIRAN/LKPD/ASESMEN). \n**KONTROL OUTPUT:** Langsung mulai dari header "## III. MEDIA BELAJAR". DILARANG menulis ulang judul utama atau seksi sebelumnya. Berhenti tepat setelah SEKSI IV selesai. **PENTING: JANGAN BUAT MATERI AJAR/GLOSARIUM DI SINI.**`;
        const result3 = await retryWithBackoff(() => model.generateContent(part3Prompt));
        const res3Text = result3.response.text();

        // PART 4: SECTION V, VI, VII (MATERI AJAR, GLOSARIUM, DAFTAR PUSTAKA)
        onProgress("Finalisasi Materi Ajar, Glosarium & Daftar Pustaka...");
        const part4Prompt = `${materialPrompt}\n\n**KONTEKS UNTUK REFERENSI (DILARANG TULIS ULANG):**\n${res1Text}\n${res2Text}\n${res3Text}\n\n**INTRUKSI KHUSUS GENERASI PART 4 (FINAL):**\nBerdasarkan konteks di atas, buatlah SEKSI V, VI, dan VII secara mendalam.`;
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
            const chaptersText = book.chapters?.map((c: any) => `- ${c.title}`).join('\n') || '';
            if (chaptersText) {
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
