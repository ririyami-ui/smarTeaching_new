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
    if (t.match(/molekul|senyawa|ikatan|karbon|kimia organik/i)) {
      return { 
        allowed: ['model3d', 'chemistry'], 
        forbidden: ['logic', 'function'], 
        forceInstruction: `${syncRule} Tampilkan struktur molekul dalam format 3D (model3d) atau 2D (chemistry).` 
      };
    }
    return { allowed: ['diagram', 'chemistry'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan diagram reaksi kimia.` };
  }

  // 4. Biology & IPAS
  if (isBiology || isIPAS) {
    if (t.match(/anatomi|sel|organ|jantung|paru-paru|tulang/i)) {
      return { 
        allowed: ['model3d', 'diagram'], 
        forbidden: ['logic', 'scratch'], 
        forceInstruction: `${syncRule} WAJIB tampilkan model 3D (model3d) untuk anatomi organ tubuh agar interaktif.` 
      };
    }
    if (t.match(/ekosistem|rantai makanan|siklus|metamorfosis/i)) {
      return { allowed: ['mermaid', 'mindmap'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan diagram alir (Mermaid).` };
    }
    return { allowed: ['diagram', 'image'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan diagram biologi.` };
  }

  // Science Default
  return {
    allowed: ['diagram', 'mermaid', 'mindmap'],
    forbidden: ['logic', 'scratch'],
    forceInstruction: `${syncRule} Pilih diagram ilmiah yang paling sesuai.`
  };
};
