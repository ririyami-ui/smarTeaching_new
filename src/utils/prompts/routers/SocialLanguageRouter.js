export const routeSocialLanguage = (subject, topic, syncRule) => {
  const t = topic.toLowerCase();
  const s = subject.toLowerCase();

  const isLanguage = s.includes('bahasa');
  const isSocial = s.includes('ips') || s.includes('sejarah') || s.includes('geografi') || s.includes('sosiologi') || s.includes('ekonomi') || s.includes('pancasila') || s.includes('pkn');
  const isArts = s.includes('seni');
  const isReligion = s.includes('agama') || s.includes('pai');
  const isPE = s.includes('pjok');

  // 1. Language (Bahasa Indonesia/Inggris/Daerah)
  if (isLanguage) {
    if (t.match(/puisi|pantun|syair|prosa|sastra/i)) {
      return { allowed: ['image', 'mindmap'], forbidden: ['spreadsheet', 'logic'], forceInstruction: `${syncRule} Gunakan gambar ilustrasi suasana atau peta konsep makna.` };
    }
    if (t.match(/teks|paragraf|struktur|narasi|eksposisi|rekon/i)) {
      return { allowed: ['mindmap', 'mermaid'], forbidden: ['chart', 'logic'], forceInstruction: `${syncRule} Gunakan diagram alir (Mermaid) untuk struktur teks atau Peta Konsep.` };
    }
    return { allowed: ['image', 'mindmap'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan visualisasi teks atau gambar pendukung.` };
  }

  // 2. Social Studies (IPS, Sejarah, Geografi, Ekonomi)
  if (isSocial) {
    if (t.match(/peta|lokasi|wilayah|geografis|negara|batas/i)) {
      return { allowed: ['map', 'image'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} WAJIB gunakan Peta atau citra satelit wilayah terkait.` };
    }
    if (t.match(/sejarah|kronologi|peristiwa|kerajaan|perang|waktu/i)) {
      return { allowed: ['mermaid'], forbidden: ['spreadsheet', 'logic'], forceInstruction: `${syncRule} WAJIB gunakan diagram timeline (Mermaid LR) untuk urutan kronologi sejarah.` };
    }
    if (t.match(/ekonomi|uang|harga|pasar|permintaan|penawaran|inflasi/i)) {
      return { allowed: ['chart', 'spreadsheet', 'function'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan kurva permintaan/penawaran (function) atau tabel data (spreadsheet).` };
    }
    if (t.match(/masyarakat|sosial|budaya|konstitusi|hukum|pancasila/i)) {
      return { allowed: ['mindmap', 'mermaid'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan Peta Konsep (mindmap) untuk hubungan antar norma/nilai.` };
    }
  }

  // 3. Arts & Religion
  if (isArts || isReligion) {
    if (t.match(/musik|nada|lagu|notasi|ritme/i)) {
      return { allowed: ['music'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} WAJIB gunakan Notasi Musik (ABC) yang valid.` };
    }
    return { allowed: ['image', 'mindmap'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan gambar karya seni atau peta konsep ajaran.` };
  }

  // Social Default
  return {
    allowed: ['mindmap', 'diagram', 'mermaid'],
    forbidden: ['logic', 'scratch', 'function', 'chemistry'],
    forceInstruction: `${syncRule} Pilih visual berupa peta konsep atau diagram yang relevan.`
  };
};
