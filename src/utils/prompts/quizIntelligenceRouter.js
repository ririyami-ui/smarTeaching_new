import bskapData from '../bskap_2025_intel.json';
import bookIndex from '../data/books/index.json';
import { routeTech } from './routers/TechRouter';
import { routeScienceMath } from './routers/ScienceMathRouter';
import { routeSocialLanguage } from './routers/SocialLanguageRouter';

// HUKUM TERTINGGI: VARIABEL HARUS SAMA (Locking Variable)
const syncRule = "[HUKUM SINKRONISASI]: Gunakan NAMA TOKOH (misal: Siska, Budi), ANGKA, dan LABEL yang ada di soal ke dalam visualisasi. DILARANG menggunakan data palsu/template.";

export const getSmartVisualRules = (subject, topic) => {
  const s = subject.toLowerCase();

  // 1. Tech & Informatics
  if (s.includes('informatika') || s.includes('tik') || s.includes('prakarya')) {
    return routeTech(subject, topic, syncRule);
  }

  // 2. Science & Math
  if (s.includes('matematika') || s.includes('mtk') || s.includes('fisika') || s.includes('kimia') || s.includes('biologi') || s.includes('ipa') || s.includes('ipas')) {
    return routeScienceMath(subject, topic, syncRule);
  }

  // 3. Humanities, Languages, Arts, PE, Religion
  if (s.includes('bahasa') || s.includes('ips') || s.includes('sejarah') || s.includes('geografi') || s.includes('ekonomi') || s.includes('sosiologi') || s.includes('pancasila') || s.includes('pkn') || s.includes('seni') || s.includes('agama') || s.includes('pai') || s.includes('pjok')) {
    return routeSocialLanguage(subject, topic, syncRule);
  }

  // GLOBAL DEFAULT FALLBACK (Very strict)
  return {
    allowed: ['mindmap', 'diagram'],
    forbidden: ['logic', 'scratch', 'function', 'chemistry', 'spreadsheet'],
    forceInstruction: `${syncRule} Pilih peta konsep (mindmap) atau diagram relevan.`
  };
};

export const getBSKAPContext = (bskapDataObj, grade, subject) => {
  if (!bskapDataObj || !bskapDataObj.standards || !bskapDataObj.standards.phases) return "";
  const phaseInfo = bskapDataObj.standards.phases.find(p => p.grades.includes(Number(grade)));
  if (!phaseInfo) return "";
  return `\n[BSKAP 2025] Fase: ${phaseInfo.phase}, Jenjang: ${phaseInfo.level}. Fokus: Deep Learning (Meaningful).`;
};

// New Intelligence: Locate the specific book based on Subject and Grade to enforce context binding
export const getBookMaterial = (booksData, subject, grade, topic) => {
  if (!bookIndex) return `Gunakan referensi Buku Paket ${subject} Kelas ${grade}.`;
  
  const targetBook = bookIndex.find(b => 
    b.mapel.toLowerCase() === subject.toLowerCase() && 
    b.kelas === String(grade)
  );

  if (targetBook) {
    // Cari bab yang paling relevan dengan topik
    let visualInstruction = "";
    // Note: In a real scenario, we might want to load the actual book JSON here to get chapters.
    // For now, we will signal to the service to pass this info.
    return `[SUMBER BUKU WAJIB]: Anda WAJIB menggunakan silabus dari buku resmi "${targetBook.title}".`;
  }

  return `Gunakan referensi Buku Paket ${subject} Kelas ${grade}.`;
};
