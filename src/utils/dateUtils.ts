const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

export function formatDate(
  date: Date | string | null | undefined,
  locale = 'id-ID',
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(locale, options);
  } catch {
    return '-';
  }
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale = 'id-ID',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString(locale, options);
  } catch {
    return '-';
  }
}

export function formatTime(
  date: Date | string | null | undefined,
  locale = 'id-ID',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString(locale, options);
  } catch {
    return '-';
  }
}
