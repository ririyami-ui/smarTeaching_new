export const routeSocialLanguageLesson = (subject, topic) => {
  const s = subject.toLowerCase();
  const isLanguage = s.includes('bahasa') || s.includes('english') || s.includes('indonesia');
  
  if (isLanguage) {
    return {
      model: "Genre-Based Approach (GBA)",
      pedagogicalFocus: "Building Knowledge of Field (BKoF), Modelling of Text (MoT), Joint Construction (JCoT), Independent Construction (ICoT).",
      specificSafety: "Etika berkomunikasi dan penggunaan bahasa yang santun.",
      deepLearningDNA: "Meaningful: Gunakan teks otentik (berita/cerita nyata). Communication: Praktik berbicara/menulis untuk audiens nyata."
    };
  }

  // Social (IPS/Sejarah/Geografi/Ekonomi/Sosiologi)
  return {
    model: "Case-Based Learning (CBL)",
    pedagogicalFocus: "Analisis Isu Kontekstual & Literasi Kritis. Hubungkan dengan fenomena sosial terkini.",
    specificSafety: "N/A",
    deepLearningDNA: "Mindful: Empati terhadap perspektif orang lain. Meaningful: Peran siswa sebagai warga negara global."
  };
};
