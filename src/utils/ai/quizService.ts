import {
    getModel,
    retryWithBackoff,
    extractJSON,
    shuffleArray,
    handleGeminiError
} from "./base";
import { getAdvancedQuizPrompt, getQuizFromImagePrompt } from "../prompts/quizPrompts";
import { BSKAP_DATA } from "../bskapData";
import { STRICT_DOCUMENT_BRAIN } from "../prompts/smarttyPrompts";

const BATCH_SIZE = 3;

interface ProgressInfo {
  stage: string;
  message: string;
  percentage: number;
}

interface QuizQuestion {
  type: string;
  options?: string[];
  [key: string]: unknown;
}

interface QuizParams {
  topic: string;
  context: string;
  gradeLevel: string | number;
  subject: string;
  typeCounts: Record<string, number>;
  difficulty: string;
  modelName: string;
  stimulusMode?: string;
  onProgress?: (val: ProgressInfo) => void;
}

/**
 * Advanced Quiz Generator with Batching.
 */
export async function generateAdvancedQuiz({ topic, context, gradeLevel, subject, typeCounts, difficulty, modelName, stimulusMode = 'auto', onProgress = () => { } }: QuizParams) {
    try {
        onProgress({ stage: 'preparing', message: 'Mempersiapkan parameter kuis...', percentage: 5 });
        const flattened: string[] = [];
        Object.entries(typeCounts).forEach(([type, count]) => { for (let i = 0; i < count; i++) flattened.push(type); });

        const batches: string[][] = [];
        for (let i = 0; i < flattened.length; i += BATCH_SIZE) batches.push(flattened.slice(i, i + BATCH_SIZE));

        let allQuestions: QuizQuestion[] = [];
        let quizTitle = "";

        for (let i = 0; i < batches.length; i++) {
            const batchNum = i + 1;
            const progress = 10 + (batchNum / batches.length) * 80;
            onProgress({ stage: 'generating', message: `Batch ${batchNum}/${batches.length}...`, percentage: Math.round(progress) });

            let optionCount = 5;
            let optionLabel = "A-E";
            const g = String(gradeLevel).toLowerCase();
            if (g.match(/\b(1|2|3|4|5|6|sd|mi)\b/i)) {
                optionCount = 3;
                optionLabel = "A-C";
            } else if (g.match(/\b(7|8|9|smp|mts)\b/i)) {
                optionCount = 4;
                optionLabel = "A-D";
            }

            const batchInstructions = batches[i].map((type, idx) => `- Soal No ${allQuestions.length + idx + 1}: Tipe **${type}**`).join('\n');
            const prompt = getAdvancedQuizPrompt({ topic, context, gradeLevel, subject, batchNum, batches, allQuestions, batchInstructions, optionCount, optionLabel, difficulty, stimulusMode });

            const model = await getModel(modelName, true, STRICT_DOCUMENT_BRAIN);
            const result = await retryWithBackoff(() => model.generateContent(prompt));
            const parsed = extractJSON<{ questions?: QuizQuestion[]; title?: string }>(result.response.text());

            if (parsed.questions) {
                allQuestions = [...allQuestions, ...parsed.questions.map((q: QuizQuestion) => {
                    if (['pg', 'pg_complex'].includes(q.type)) return { ...q, options: shuffleArray(q.options ?? []) };
                    return q;
                })];
                if (!quizTitle && parsed.title) quizTitle = parsed.title;
            }
        }
        onProgress({ stage: 'complete', message: 'Selesai!', percentage: 100 });
        return { title: quizTitle || topic, questions: allQuestions };
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateAdvancedQuiz"));
    }
}

/**
 * Generates quiz from image.
 */
export async function generateQuizFromImage({ imageBase64, topic, gradeLevel, subject, count, modelName, onProgress = () => { } }: { imageBase64: string, topic: string, gradeLevel: string | number, subject: string, count: number, modelName: string, onProgress?: (val: ProgressInfo) => void }) {
    try {
        onProgress({ stage: 'preparing', message: 'Menganalisis gambar...', percentage: 20 });
        const model = await getModel(modelName);
        const prompt = getQuizFromImagePrompt({ count, gradeLevel, subject, topic, BSKAP_DATA });
        const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } };

        onProgress({ stage: 'generating', message: 'Menghasilkan soal...', percentage: 50 });
        const result = await retryWithBackoff(() => model.generateContent([prompt, imagePart]));
        const parsed = extractJSON<Record<string, unknown>>(result.response.text());
        onProgress({ stage: 'complete', message: 'Selesai!', percentage: 100 });
        return parsed;
    } catch (error: unknown) {
        throw new Error(handleGeminiError(error, "generateQuizFromImage"));
    }
}
