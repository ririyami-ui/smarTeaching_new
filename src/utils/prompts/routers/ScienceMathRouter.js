export const routeScienceMath = (subject, topic, syncRule) => {
  const t = topic.toLowerCase();
  const s = subject.toLowerCase();

  const isMath = s.includes('matematika') || s.includes('mtk');
  const isPhysics = s.includes('fisika');
  const isChemistry = s.includes('kimia');
  const isBiology = s.includes('biologi');
  const isIPAS = s.includes('ipas') || s.includes('ipa');

  // 1. Math specific
  if (isMath) {
    if (t.includes('grafik') || t.includes('fungsi') || t.includes('persamaan') || t.includes('koordinat')) {
      return { allowed: ['function'], forbidden: ['chart', 'mermaid', 'logic'], forceInstruction: `${syncRule} Gunakan koordinat kartesius (function).` };
    }
    if (t.includes('bangun') || t.includes('geometri') || t.includes('sudut') || t.includes('segitiga')) {
      return { allowed: ['geometry'], forbidden: ['chart', 'mermaid'], forceInstruction: `${syncRule} Tampilkan bangun datar/ruang (geometry) dengan label sudut/sisi.` };
    }
    if (t.includes('statistika') || t.includes('data') || t.includes('peluang')) {
      return { allowed: ['chart', 'spreadsheet'], forbidden: ['mermaid', 'logic'], forceInstruction: `${syncRule} Gunakan grafik statistik (chart) atau tabel data.` };
    }
    return { allowed: ['math', 'function', 'geometry'], forbidden: ['logic', 'mermaid'], forceInstruction: `${syncRule} Gunakan visualisasi matematis.` };
  }

  // 2. Physics
  if (isPhysics) {
    if (t.includes('vektor') || t.includes('gaya') || t.includes('gerak')) {
      return { allowed: ['geometry', 'diagram'], forbidden: ['chart', 'logic'], forceInstruction: `${syncRule} Gunakan diagram vektor atau sketsa gaya.` };
    }
    if (t.includes('listrik') || t.includes('rangkaian')) {
      // Allow logic ONLY for digital circuits in physics, else diagram
      return { allowed: ['diagram', 'logic'], forbidden: ['function'], forceInstruction: `${syncRule} Gunakan diagram rangkaian listrik.` };
    }
    return { allowed: ['diagram', 'function', 'math'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan diagram konsep fisika.` };
  }

  // 3. Chemistry
  if (isChemistry) {
    if (t.includes('molekul') || t.includes('senyawa') || t.includes('ikatan') || t.includes('karbon')) {
      return { allowed: ['chemistry'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan struktur molekul (chemistry / SMILES).` };
    }
    return { allowed: ['diagram', 'chemistry'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan diagram reaksi atau struktur molekul.` };
  }

  // 4. Biology & IPAS (General Science)
  if (isBiology || isIPAS) {
    if (t.includes('ekosistem') || t.includes('rantai makanan') || t.includes('siklus') || t.includes('sistem')) {
      return { allowed: ['mermaid', 'mindmap'], forbidden: ['logic', 'function', 'geometry'], forceInstruction: `${syncRule} Gunakan diagram alir (Mermaid) untuk rantai makanan atau siklus.` };
    }
    if (t.includes('anatomi') || t.includes('sel') || t.includes('organ')) {
      return { allowed: ['diagram', 'image'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan diagram anatomi berlabel.` };
    }
  }

  // Science Default
  return {
    allowed: ['diagram', 'mermaid', 'mindmap'],
    forbidden: ['logic', 'scratch'],
    forceInstruction: `${syncRule} Pilih diagram ilmiah yang paling sesuai.`
  };
};
