const pad2 = (value: number | string) => String(value).padStart(2, '0');

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const HAS_TIME_PART = /[T\s]\d{1,2}:\d{2}/;
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '-';
  const raw = String(value).trim();
  if (!raw) return '-';

  const isoMatch = raw.match(ISO_DATE_PREFIX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedIso = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(parsedIso.getTime())) return DISPLAY_DATE_FORMATTER.format(parsedIso);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return DISPLAY_DATE_FORMATTER.format(parsed);
};

export const formatDisplayDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const raw = String(value).trim();
  if (!raw) return '-';

  if (!HAS_TIME_PART.test(raw)) {
    return formatDisplayDate(raw);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const formattedDate = DISPLAY_DATE_FORMATTER.format(parsed);
  const hours = pad2(parsed.getHours());
  const minutes = pad2(parsed.getMinutes());
  return `${formattedDate}, ${hours}:${minutes}`;
};

export const formatDateInputText = (value?: string | null): string => {
  const formatted = formatDisplayDate(value);
  return formatted === '-' ? '' : formatted;
};

export const parseDisplayDateToIso = (value?: string | null): string | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const match = DISPLAY_DATE_PATTERN.exec(raw);
  if (!match) return null;

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }
  return iso;
};

export const isValidDisplayDateText = (value?: string | null): boolean => {
  const raw = String(value ?? '').trim();
  return !raw || Boolean(parseDisplayDateToIso(raw));
};
