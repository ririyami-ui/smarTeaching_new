import moment from 'moment';

interface PekanEfektifItem {
  name: string;
  totalWeeks: number | string;
  nonEffectiveWeeks: number | string;
  keterangan: string;
  isAuto?: boolean;
}

const MONTH_MAP: Record<string, number> = {
  'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
  'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
};

/**
 * Check if a specific date falls within an effective week
 * @param date - Date to check (string or Date object)
 * @param pekanEfektif - Array of effective weeks data
 * @param academicYear - Academic year (e.g., "2024/2025")
 * @param semester - Semester ("Ganjil" or "Genap")
 * @returns Object with isEffective status and reason
 */
export function isDateEffective(
  date: string | Date,
  pekanEfektif: PekanEfektifItem[],
  academicYear: string,
  _semester: string
): { isEffective: boolean; reason?: string; monthName?: string } {
  if (!pekanEfektif || pekanEfektif.length === 0) {
    return { isEffective: true };
  }

  const targetDate = moment(date);
  if (!targetDate.isValid()) {
    return { isEffective: true };
  }

  const targetMonth = targetDate.month() + 1;
  const targetYear = targetDate.year();
  const years = academicYear.split('/');

  const monthData = pekanEfektif.find(m => {
    const mNum = MONTH_MAP[m.name];
    if (!mNum) return false;

    const actualYear = mNum >= 7 ? parseInt(years[0]) : parseInt(years[1]);
    return mNum === targetMonth && actualYear === targetYear;
  });

  if (!monthData) {
    return { isEffective: true };
  }

  const nonEffectiveWeeks = parseInt(String(monthData.nonEffectiveWeeks || 0));
  if (nonEffectiveWeeks === 0) {
    return { isEffective: true, monthName: monthData.name };
  }

  const totalWeeks = parseInt(String(monthData.totalWeeks || 0));
  if (nonEffectiveWeeks >= totalWeeks) {
    return {
      isEffective: false,
      reason: monthData.keterangan || 'Seluruh pekan tidak efektif',
      monthName: monthData.name
    };
  }

  const dayOfMonth = targetDate.date();
  const weekOfMonth = Math.floor((dayOfMonth - 1) / 7);

  // Non-effective weeks are at the end of the month (manual entry aligns with school agenda)
  if (weekOfMonth >= (totalWeeks - nonEffectiveWeeks)) {
    return {
      isEffective: false,
      reason: monthData.keterangan || 'Pekan tidak efektif',
      monthName: monthData.name
    };
  }

  return { isEffective: true, monthName: monthData.name };
}

/**
 * Get all non-effective dates in a month
 * @param pekanEfektif - Array of effective weeks data
 * @param academicYear - Academic year
 * @param semester - Semester
 * @param month - Month number (1-12)
 * @param year - Year
 * @returns Array of non-effective dates
 */
export function getNonEffectiveDatesInMonth(
  pekanEfektif: PekanEfektifItem[],
  academicYear: string,
  semester: string,
  month: number,
  year: number
): Date[] {
  const nonEffectiveDates: Date[] = [];
  const daysInMonth = moment(`${year}-${month}`, 'YYYY-M').daysInMonth();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = moment(`${year}-${month}-${day}`, 'YYYY-M-D').toDate();
    const result = isDateEffective(date, pekanEfektif, academicYear, semester);
    if (!result.isEffective) {
      nonEffectiveDates.push(date);
    }
  }

  return nonEffectiveDates;
}

/**
 * Get effective weeks summary for a class/grade
 * @param pekanEfektif - Array of effective weeks data
 * @returns Summary object with total effective weeks and hours
 */
export function getEffectiveWeeksSummary(pekanEfektif: PekanEfektifItem[]): {
  totalWeeks: number;
  totalEffectiveWeeks: number;
  totalNonEffectiveWeeks: number;
  effectivePercentage: number;
} {
  const totalWeeks = pekanEfektif.reduce((acc, m) => acc + parseInt(String(m.totalWeeks || 0)), 0);
  const totalNonEffectiveWeeks = pekanEfektif.reduce((acc, m) => acc + parseInt(String(m.nonEffectiveWeeks || 0)), 0);
  const totalEffectiveWeeks = totalWeeks - totalNonEffectiveWeeks;
  const effectivePercentage = totalWeeks > 0 ? (totalEffectiveWeeks / totalWeeks) * 100 : 100;

  return {
    totalWeeks,
    totalEffectiveWeeks,
    totalNonEffectiveWeeks,
    effectivePercentage
  };
}

/**
 * Check if current week is effective
 * @param pekanEfektif - Array of effective weeks data
 * @param academicYear - Academic year
 * @param semester - Semester
 * @returns Boolean indicating if current week is effective
 */
export function isCurrentWeekEffective(
  pekanEfektif: PekanEfektifItem[],
  academicYear: string,
  semester: string
): boolean {
  const today = new Date();
  return isDateEffective(today, pekanEfektif, academicYear, semester).isEffective;
}
