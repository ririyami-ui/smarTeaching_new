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
    getATPPrompt
} from "../prompts/applicationPrompts";
import { BSKAP_DATA, VERBATIM_BSKAP_DATA } from "../bskapData";

/**
 * Generates an automated RPP (Lesson Plan).
 */
export const generateLessonPlan = async (data) => {
    try {
        const onProgress = data.onProgress || (() => { });
        const level = getLevel(data.gradeLevel);
        const subjectKey = getSubjectKey(data.subject);
        const cpFullVerbatim = VERBATIM_BSKAP_DATA.subjects?.[level]?.[data.gradeLevel]?.[subjectKey]?.cp_full || "Lihat list elemen dan materi.";

        onProgress("Menyusun RPP...");
        const regionalLanguage = getRegionalLanguage(data.subject);
        const prompt = getLessonPlanPrompt(data, BSKAP_DATA, level, cpFullVerbatim, getSemesterLabel(data.semester), getSemesterKey(data.semester), subjectKey, regionalLanguage);

        const model = getModel(data.modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateLessonPlan"));
    }
};

/**
 * Generates a Handout.
 */
export async function generateHandout(data, modelName) {
    try {
        const prompt = getHandoutPrompt(data, BSKAP_DATA, getRegionalLanguage);
        const model = getModel(modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateHandout"));
    }
}

/**
 * Generates LKPD from RPP content.
 */
export async function generateLKPDFromRPP(rppContent, assessmentModel, modelName, studentListText = "") {
    try {
        const prompt = getLKPDFromRPPPrompt(rppContent, assessmentModel, BSKAP_DATA, studentListText);
        const model = getModel(modelName);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateLKPDFromRPP"));
    }
}

/**
 * Generates Alur Tujuan Pembelajaran (ATP).
 */
export async function generateATP(data, modelName) {
    try {
        const level = getLevel(data.gradeLevel);
        const subjectKey = getSubjectKey(data.subject);
        const semesterKey = getSemesterKey(data.semester);
        const subjectData = BSKAP_DATA.subjects[level]?.[data.gradeLevel]?.[subjectKey] || BSKAP_DATA.subjects[level]?.[subjectKey];
        const cpFullVerbatim = VERBATIM_BSKAP_DATA.subjects?.[level]?.[data.gradeLevel]?.[subjectKey]?.cp_full || "Lihat list elemen dan materi.";

        const prompt = getATPPrompt(data, BSKAP_DATA, level, subjectData, cpFullVerbatim, getSemesterLabel(data.semester), semesterKey, subjectKey, data.userProfile, getRegionalLanguage);

        const model = getModel(modelName, true);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return extractJSON(result.response.text());
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateATP"));
    }
}
