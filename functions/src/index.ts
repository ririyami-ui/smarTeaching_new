import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const callGemini = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { prompt, chapterId, contextData, teacherProfile, selectedSubject, previousChapters } = data;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new functions.https.HttpsError('internal', 'AI request failed');
  }
});
