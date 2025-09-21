import React, { useState } from 'react';
import genAI from '../utils/gemini';

function ContohKomponen() {
  const [hasil, setHasil] = useState(null);
  const [memuat, setMemuat] = useState(false);

  async function jalankanModel() {
    setMemuat(true);
    try {
      // Dapatkan model generatif
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

      // Berikan prompt
      const prompt = "Tulis sebuah cerita pendek tentang petualangan di luar angkasa.";

      // Hasilkan konten
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setHasil(text);
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Contoh Komponen Gemini</h2>
      <button 
        onClick={jalankanModel} 
        disabled={memuat}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
      >
        {memuat ? 'Menghasilkan...' : 'Hasilkan Cerita'}
      </button>
      {hasil && <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap' }}>{hasil}</div>}
    </div>
  );
}

export default ContohKomponen;
