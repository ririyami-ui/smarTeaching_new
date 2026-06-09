export const routeSocialLanguage = (subject, topic, syncRule) => {
  const t = topic.toLowerCase();
  const s = subject.toLowerCase();

  const isLanguage = s.includes('bahasa');
  const isSocial = s.includes('ips') || s.includes('sejarah') || s.includes('geografi') || s.includes('sosiologi') || s.includes('ekonomi') || s.includes('pancasila') || s.includes('pkn');
  const isArts = s.includes('seni');
  const isReligion = s.includes('agama') || s.includes('pai');
  const isPE = s.includes('pjok');

  // 1. Language
  if (isLanguage) {
    if (t.includes('puisi') || t.includes('cerita') || t.includes('teks')) {
      return { allowed: ['mindmap', 'diagram'], forbidden: ['logic', 'scratch', 'function', 'geometry', 'spreadsheet'], forceInstruction: `${syncRule} Gunakan peta konsep (mindmap) untuk menganalisis teks.` };
    }
    return { allowed: ['image', 'mindmap'], forbidden: ['logic', 'scratch', 'function'], forceInstruction: `${syncRule} Gunakan visualisasi teks atau gambar.` };
  }

  // 2. Social Studies & Civics
  if (isSocial) {
    if (t.includes('peta') || t.includes('lokasi') || t.includes('wilayah')) {
      return { allowed: ['map', 'diagram'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan peta atau diagram spasial.` };
    }
    if (t.includes('sejarah') || t.includes('kronologi') || t.includes('waktu')) {
      return { allowed: ['mermaid'], forbidden: ['spreadsheet', 'logic'], forceInstruction: `${syncRule} Gunakan diagram timeline (Mermaid) untuk urutan waktu.` };
    }
    if (t.includes('ekonomi') || t.includes('uang') || t.includes('harga') || t.includes('pasar')) {
      return { allowed: ['chart', 'spreadsheet'], forbidden: ['logic', 'scratch'], forceInstruction: `${syncRule} Gunakan grafik (chart) atau tabel (spreadsheet) untuk data ekonomi.` };
    }
    if (t.includes('masyarakat') || t.includes('sosial') || t.includes('konstitusi')) {
      return { allowed: ['mindmap', 'mermaid'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan peta konsep (mindmap) atau hierarki (mermaid).` };
    }
  }

  // 3. Arts (Seni Budaya)
  if (isArts) {
    if (t.includes('musik') || t.includes('nada') || t.includes('lagu')) {
      return { allowed: ['music'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan notasi musik (ABC).` };
    }
    return { allowed: ['image', 'diagram'], forbidden: ['logic', 'function'], forceInstruction: `${syncRule} Gunakan sketsa atau gambar.` };
  }

  // 4. Physical Education (PJOK)
  if (isPE) {
    return { allowed: ['diagram', 'image', 'mermaid'], forbidden: ['logic', 'function', 'scratch', 'spreadsheet'], forceInstruction: `${syncRule} Gunakan diagram formasi atau alur gerakan.` };
  }

  // 5. Religion (PAI)
  if (isReligion) {
    return { allowed: ['mindmap', 'diagram'], forbidden: ['logic', 'function', 'scratch', 'spreadsheet'], forceInstruction: `${syncRule} Gunakan peta konsep (mindmap).` };
  }

  // Social Default
  return {
    allowed: ['mindmap', 'diagram', 'mermaid'],
    forbidden: ['logic', 'scratch', 'function', 'chemistry'],
    forceInstruction: `${syncRule} Pilih visual berupa peta konsep atau diagram yang relevan.`
  };
};
