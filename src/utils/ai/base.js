import { GoogleGenerativeAI } from "@google/generative-ai";
import { SMARTTY_BRAIN } from "../prompts/smarttyPrompts";

/**
 * Gets the current Gemini API Key from localStorage or environment variables.
 * @returns {string} The API Key.
 */
export const getApiKey = () => {
    const cachedKey = localStorage.getItem('GEMINI_API_KEY');
    return cachedKey || import.meta.env.VITE_GEMINI_API_KEY;
};

/**
 * Initializes or re-initializes the Generative AI model with the latest API key.
 * @returns {Object} The initialized model.
 */
export const getModel = (modelName, isJson = false) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY_MISSING");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const profileModel = localStorage.getItem('GEMINI_MODEL');
    const selectedModel = modelName || profileModel || "gemini-3-flash-preview";

    const generationConfig = {
        maxOutputTokens: 8192,
        temperature: 0.7,
    };

    if (isJson) {
        generationConfig.responseMimeType = "application/json";
    }

    return genAI.getGenerativeModel({
        model: selectedModel,
        systemInstruction: SMARTTY_BRAIN,
        generationConfig
    });
};

/**
 * A helper function to retry a function with exponential backoff.
 */
export const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        const errorMsg = error.message || "";
        const isQuotaError = errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota");
        const isRetriable = errorMsg.includes("503") || isQuotaError;

        if (retries > 0 && isRetriable) {
            let waitTime = delay;
            if (isQuotaError) {
                const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/);
                if (retryMatch && retryMatch[1]) {
                    waitTime = (parseFloat(retryMatch[1]) + 1) * 1000;
                } else {
                    waitTime = delay * 5;
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
 * Helper to handle generation with automatic fallback for experimental models.
 */
export const generateContentWithFallback = async (modelName, generateFn) => {
    try {
        const model = getModel(modelName);
        return await retryWithBackoff(() => generateFn(model));
    } catch (error) {
        throw error;
    }
};

/**
 * Common error handler for Gemini API calls.
 */
export const handleGeminiError = (error, context) => {
    console.error(`Error in ${context}: `, error);
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
 * Extracts and parses a JSON object or array from a string.
 */
export const extractJSON = (text) => {
    if (!text) throw new Error("Output AI kosong.");
    let cleanText = text.trim();
    cleanText = cleanText.replace(/^```(json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const firstOpenBrace = cleanText.indexOf('{');
    const firstOpenBracket = cleanText.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIdx = firstOpenBrace;
        endIdx = cleanText.lastIndexOf('}');
    } else if (firstOpenBracket !== -1 && (firstOpenBrace === -1 || firstOpenBracket < firstOpenBrace)) {
        startIdx = firstOpenBracket;
        endIdx = cleanText.lastIndexOf(']');
    }
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
    }
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        let recovered = cleanText.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(recovered);
        } catch (e2) {
            throw new Error("Format output AI tidak valid.");
        }
    }
};

/**
 * Helper to shuffle array (Fisher-Yates)
 */
export const shuffleArray = (array) => {
    if (!array || !Array.isArray(array)) return array;
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

/**
 * Helper to determine level (SD, SMP, SMA) from gradeLevel string/number.
 */
export const getLevel = (grade) => {
    const g = parseInt(grade);
    if (isNaN(g)) {
        const s = String(grade).toUpperCase();
        if (['1', '2', '3', '4', '5', '6'].includes(s)) return 'SD';
        if (['7', '8', '9', 'VII', 'VIII', 'IX'].includes(s)) return 'SMP';
        if (['10', '11', '12', 'X', 'XI', 'XII'].includes(s)) return 'SMA';
        return 'SMA';
    }
    if (g >= 1 && g <= 6) return 'SD';
    if (g >= 7 && g <= 9) return 'SMP';
    if (g >= 10 && g <= 12) return 'SMA';
    return 'SMA';
};

/**
 * Normalizes semester input to 'ganjil' or 'genap' key.
 */
export const getSemesterKey = (semester) => {
    if (!semester) return 'ganjil';
    const s = String(semester).toLowerCase().trim();
    if (s === '1' || s === 'i' || s === 'ganjil' || s === 'odd' || s.includes('semester 1')) return 'ganjil';
    if (s === '2' || s === 'ii' || s === 'genap' || s === 'even' || s.includes('semester 2')) return 'genap';
    return 'ganjil';
};

/**
 * Normalizes subject name to key.
 */
export const getSubjectKey = (subject) => {
    if (!subject) return "";
    if (subject.startsWith("Bahasa Daerah")) return "Bahasa Daerah";
    return subject;
};

/**
 * Gets a human-readable label for the semester.
 */
export const getSemesterLabel = (semester) => {
    return getSemesterKey(semester) === 'ganjil' ? 'Ganjil' : 'Genap';
};

/**
 * Detects regional language from subject name.
 */
export const getRegionalLanguage = (subject) => {
    if (!subject) return null;
    const match = subject.match(/bahasa daerah\s*\(([^)]+)\)/i);
    return match ? match[1] : null;
};
