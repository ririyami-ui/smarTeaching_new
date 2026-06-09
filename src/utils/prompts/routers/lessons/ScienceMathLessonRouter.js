export const routeScienceMathLesson = (subject, topic) => {
  const s = subject.toLowerCase();
  const isMath = s.includes('matematika') || s.includes('mtk');
  
  if (isMath) {
    return {
      model: "Problem-Based Learning (PBL)",
      pedagogicalFocus: "Abstraksi Matematis & Pemodelan Realistik. Pastikan ada fase 'Manipulasi Objek' atau 'Visualisasi Grafik'.",
      specificSafety: "N/A",
      deepLearningDNA: "Meaningful: Hubungkan angka dengan data nyata di sekitar siswa. Joyful: Gunakan teka-teki logika."
    };
  }

  // Science (IPA/Fisika/Kimia/Biologi)
  return {
    model: "Inquiry Learning (5E Cycle)",
    pedagogicalFocus: "Siklus Eksplorasi: Engage, Explore, Explain, Elaborate, Evaluate. Tekankan pada pengambilan data empiris.",
    specificSafety: "WAJIB: Tambahkan sub-bagian 'Prosedur Keselamatan Kerja Laboratorium' sebelum langkah inti.",
    deepLearningDNA: "Mindful: Observasi fenomena alam dengan kesadaran penuh. Meaningful: Dampak fenomena terhadap ekosistem."
  };
};
