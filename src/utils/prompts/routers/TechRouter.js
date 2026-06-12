export const routeTech = (subject, topic, syncRule) => {
  const t = topic.toLowerCase();
  
  // 1. Social Impact / Privacy / Security
  if (t.includes('privasi') || t.includes('sosial') || t.includes('etika') || t.includes('hukum') || t.includes('dampak')) {
    return { 
      allowed: ['mermaid'], 
      forbidden: ['logic', 'scratch', 'spreadsheet', 'chart'], 
      forceInstruction: `${syncRule} Gunakan diagram alir (Mermaid) untuk menunjukkan risiko atau dampak sosial.` 
    };
  }
  
  // 2. Data / Spreadsheet
  if (t.includes('spreadsheet') || t.includes('lembar kerja') || t.includes('data') || t.includes('pengolah angka') || t.includes('tabel') || t.includes('excel')) {
    return { 
      allowed: ['spreadsheet', 'chart'], 
      forbidden: ['mermaid', 'logic', 'scratch'], 
      forceInstruction: `${syncRule} Gunakan grid tabel kotak (spreadsheet) atau grafik data.` 
    };
  }
  
  // 3. Computer Systems / Logic
  if (t.includes('logika') || t.includes('biner') || t.includes('gerbang') || t.includes('sistem komputer') || t.includes('hardware')) {
    return { 
      allowed: ['logic', 'mermaid'], 
      forbidden: ['spreadsheet', 'scratch'], 
      forceInstruction: `${syncRule} Gunakan simbol gerbang logika ANSI (jika membahas sirkuit) atau Mermaid (jika arsitektur hardware).` 
    };
  }
  
  // 4. Algorithms / Programming
  if (t.includes('algoritma') || t.includes('pemrograman') || t.includes('coding') || t.includes('program') || t.includes('scratch') || t.includes('berpikir komputasional')) {
    const isScratch = t.includes('scratch') || t.includes('visual');
    return { 
      allowed: isScratch ? ['scratch'] : ['scratch', 'mermaid', 'code'], 
      forbidden: ['logic', 'spreadsheet'], 
      forceInstruction: isScratch 
        ? `${syncRule} WAJIB gunakan blok visual (Scratch). Gunakan sintaks scratchblocks yang VALID (misal: "when green flag clicked", "move (10) steps", "say [Halo] for (2) secs"). JANGAN pakai diagram mermaid untuk materi ini.`
        : `${syncRule} Gunakan blok visual (Scratch), diagram alir algoritma (Mermaid), atau potongan kode (Code).` 
    };
  }

  // Tech Default
  return {
    allowed: ['mermaid', 'mindmap', 'diagram'],
    forbidden: ['logic', 'scratch', 'function', 'geometry'],
    forceInstruction: `${syncRule} Pilih visual teknis yang paling relevan dengan materi (Mindmap/Diagram alir).`
  };
};
