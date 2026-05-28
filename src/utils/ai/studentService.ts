import { getModel, retryWithBackoff, handleGeminiError } from "./base";
import {
    getStudentNarrativePrompt,
    getParentMessagePrompt
} from "../prompts/applicationPrompts";
import { STRICT_DOCUMENT_BRAIN } from "../prompts/smarttyPrompts";

interface StudentNarrativeInput {
  studentName: string;
  stats: Record<string, unknown>;
  grades: Array<Record<string, unknown>>;
  infractionsList?: Array<Record<string, unknown>>;
  infractions?: Array<Record<string, unknown>>;
  infractionsText?: string;
}

interface ParentMessageInput {
  studentName: string;
  stats: Record<string, unknown>;
  narrativeNote: string;
  teacherName: string;
}

/**
 * Generates an analysis report for a single student (narrative).
 */
export async function generateStudentNarrative(data: StudentNarrativeInput, modelName: string): Promise<string> {
    try {
        const { studentName, stats, grades, infractionsList, infractions, infractionsText } = data;

        // infractionsText could be passed directly or calculated from list
        let finalInfractionsText = infractionsText;
        if (!finalInfractionsText && (infractionsList || infractions)) {
            const list = infractionsList || infractions!;
            finalInfractionsText = list.length > 0
                ? list.map((i: Record<string, unknown>) => `- ${i.date}: ${i.type} (${i.points} poin)${i.note ? ` - ${i.note}` : ''}`).join('\n')
                : "Tidak ada catatan pelanggaran.";
        }

        const prompt = getStudentNarrativePrompt(studentName, stats, (grades?.length || 0), finalInfractionsText);
        const model = await getModel(modelName, false, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        return handleGeminiError(error, "generateStudentNarrative");
    }
}

/**
 * Generates an analysis report for a single student.
 * @param {string} prompt - The fully constructed prompt with student data.
 * @returns {Promise<string>} The generated report in Markdown format.
 */
export async function generateStudentAnalysis(prompt: string, modelName: string): Promise<string> {
    try {
        const model = await getModel(modelName, false, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const response = await result.response;
        return response.text();
    } catch (error) {
        return handleGeminiError(error, "generateStudentAnalysis");
    }
}

/**
 * Generates a message for parents.
 */
export async function generateParentMessage(data: ParentMessageInput, modelName: string): Promise<string> {
    try {
        const { studentName, stats, narrativeNote, teacherName } = data;
        const prompt = getParentMessagePrompt(studentName, stats, narrativeNote, teacherName);
        const model = await getModel(modelName, false, STRICT_DOCUMENT_BRAIN);
        const result = await retryWithBackoff(() => model.generateContent(prompt));
        return result.response.text();
    } catch (error) {
        return handleGeminiError(error, "generateParentMessage");
    }
}
