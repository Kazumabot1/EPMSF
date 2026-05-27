const pad2 = (value: number | string) => String(value).padStart(2, '0');

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const HAS_TIME_PART = /[T\s]\d{1,2}:\d{2}/;
const DISPLAY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const LONG_DATE_PATTERN = /^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/;

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const toValidIsoDate = (year: number, month: number, day: number): string | null => {
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

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

  const slashMatch = DISPLAY_DATE_PATTERN.exec(raw);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return toValidIsoDate(Number(year), Number(month), Number(day));
  }

  const longMatch = LONG_DATE_PATTERN.exec(raw);
  if (longMatch) {
    const [, day, monthName, year] = longMatch;
    const month = MONTH_INDEX_BY_NAME[monthName.toLowerCase()];
    if (!month) return null;
    return toValidIsoDate(Number(year), month, Number(day));
  }

  const isoMatch = raw.match(ISO_DATE_PREFIX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return toValidIsoDate(Number(year), Number(month), Number(day));
  }

  return null;
};

export const isValidDisplayDateText = (value?: string | null): boolean => {
  const raw = String(value ?? '').trim();
  return !raw || Boolean(parseDisplayDateToIso(raw));
};
