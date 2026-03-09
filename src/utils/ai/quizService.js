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

/**
 * Advanced Quiz Generator with Batching.
 */
export async function generateAdvancedQuiz({ topic, context, gradeLevel, subject, typeCounts, difficulty, modelName, onProgress = () => { } }) {
    try {
        onProgress({ stage: 'preparing', message: 'Mempersiapkan parameter kuis...', percentage: 5 });
        const flattened = [];
        Object.entries(typeCounts).forEach(([type, count]) => { for (let i = 0; i < count; i++) flattened.push(type); });

        const batches = [];
        for (let i = 0; i < flattened.length; i += BATCH_SIZE) batches.push(flattened.slice(i, i + BATCH_SIZE));

        let allQuestions = [];
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
            const prompt = getAdvancedQuizPrompt({ topic, context, gradeLevel, subject, batchNum, batches, allQuestions, batchInstructions, optionCount, optionLabel, difficulty });

            const model = getModel(modelName, true, STRICT_DOCUMENT_BRAIN);
            const result = await retryWithBackoff(() => model.generateContent(prompt));
            const parsed = extractJSON(result.response.text());

            if (parsed.questions) {
                allQuestions = [...allQuestions, ...parsed.questions.map(q => {
                    if (['pg', 'pg_complex'].includes(q.type)) return { ...q, options: shuffleArray(q.options) };
                    return q;
                })];
                if (!quizTitle) quizTitle = parsed.title;
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
export async function generateQuizFromImage({ imageBase64, topic, gradeLevel, subject, count, modelName, onProgress = () => { } }) {
    try {
        onProgress({ stage: 'preparing', message: 'Menganalisis gambar...', percentage: 20 });
        const model = getModel(modelName);
        const prompt = getQuizFromImagePrompt({ count, gradeLevel, subject, topic, BSKAP_DATA });
        const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } };

        onProgress({ stage: 'generating', message: 'Menghasilkan soal...', percentage: 50 });
        const result = await retryWithBackoff(() => model.generateContent([prompt, imagePart]));
        const parsed = extractJSON(result.response.text());
        onProgress({ stage: 'complete', message: 'Selesai!', percentage: 100 });
        return parsed;
    } catch (error) {
        throw new Error(handleGeminiError(error, "generateQuizFromImage"));
    }
}
