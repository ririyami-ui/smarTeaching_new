import { PekanEfektifItem } from '../pages/ProgramMengajarPage';

/**
 * Template pekan efektif untuk Kelas 7 (SMP)
 * Lebih banyak pekan efektif karena sedikit ujian
 */
export const KELAS_7_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Persiapan PAS', isAuto: true }
];

/**
 * Template pekan efektif untuk Kelas 8 (SMP)
 * Sedikit lebih banyak ujian dari Kelas 7
 */
export const KELAS_8_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Tengah Semester', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Persiapan PAS', isAuto: true }
];

/**
 * Template pekan efektif untuk Kelas 9 (SMP)
 * Banyak pekan tidak efektif karena banyak ujian
 */
export const KELAS_9_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Awal', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Tengah Semester', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Akhir', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Remedial & Ulangan', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 2, keterangan: 'PAS, Ulangan, Persiapan', isAuto: true }
];

/**
 * Template pekan efektif untuk Kelas 10 (SMA)
 * Mulai ada lebih banyak kegiatan akademik
 */
export const KELAS_10_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Orientasi & Ulangan Awal', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Tengah Semester', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Akhir', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Persiapan PAS', isAuto: true }
];

/**
 * Template pekan efektif untuk Kelas 11 (SMA)
 * Lebih banyak kegiatan akademik
 */
export const KELAS_11_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Awal', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Tengah Semester', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Akhir', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Remedial', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 2, keterangan: 'PAS & Ulangan', isAuto: true }
];

/**
 * Template pekan efektif untuk Kelas 12 (SMA)
 * Banyak ujian dan persiapan kelulusan
 */
export const KELAS_12_TEMPLATE: PekanEfektifItem[] = [
  { name: 'Juli', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Awal', isAuto: true },
  { name: 'Agustus', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan', isAuto: true },
  { name: 'September', totalWeeks: 4, nonEffectiveWeeks: 1, keterangan: 'Ulangan Tengah Semester', isAuto: true },
  { name: 'Oktober', totalWeeks: 5, nonEffectiveWeeks: 1, keterangan: 'Ulangan Akhir', isAuto: true },
  { name: 'November', totalWeeks: 4, nonEffectiveWeeks: 2, keterangan: 'Remedial & Ulangan', isAuto: true },
  { name: 'Desember', totalWeeks: 4, nonEffectiveWeeks: 2, keterangan: 'PAS, Ulangan, Persiapan', isAuto: true }
];

/**
 * Mapping kelas ke template
 */
export const CLASS_TEMPLATES: Record<string, PekanEfektifItem[]> = {
  '7': KELAS_7_TEMPLATE,
  '8': KELAS_8_TEMPLATE,
  '9': KELAS_9_TEMPLATE,
  '10': KELAS_10_TEMPLATE,
  '11': KELAS_11_TEMPLATE,
  '12': KELAS_12_TEMPLATE,
  'I': KELAS_7_TEMPLATE,
  'II': KELAS_8_TEMPLATE,
  'III': KELAS_9_TEMPLATE,
  'IV': KELAS_10_TEMPLATE,
  'V': KELAS_11_TEMPLATE,
  'VI': KELAS_12_TEMPLATE
};

/**
 * Dapatkan template berdasarkan grade
 */
export function getTemplateForGrade(grade: string): PekanEfektifItem[] | undefined {
  // Normalize grade (convert Roman to Arabic if needed)
  const gradeMap: Record<string, string> = {
    '1': '7', '2': '8', '3': '9', '4': '10', '5': '11', '6': '12',
    'I': '7', 'II': '8', 'III': '9', 'IV': '10', 'V': '11', 'VI': '12'
  };
  
  const normalizedGrade = gradeMap[grade] || grade;
  return CLASS_TEMPLATES[normalizedGrade];
}

/**
 * Dapatkan semua template
 */
export function getAllTemplates(): Record<string, PekanEfektifItem[]> {
  return CLASS_TEMPLATES;
}

/**
 * Hitung total pekan efektif dari template
 */
export function calculateTotalEffectiveWeeks(template: PekanEfektifItem[]): number {
  return template.reduce((acc, m) => acc + (parseInt(String(m.totalWeeks || 0)) - parseInt(String(m.nonEffectiveWeeks || 0))), 0);
}

/**
 * Hitung total jam efektif dari template
 */
export function calculateTotalEffectiveHours(template: PekanEfektifItem[], jpPerWeek: number): number {
  return calculateTotalEffectiveWeeks(template) * jpPerWeek;
}
