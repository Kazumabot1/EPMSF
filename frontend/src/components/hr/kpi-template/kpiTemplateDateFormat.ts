const pad2 = (value: number) => String(value).padStart(2, '0');

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const HAS_TIME_PART = /[T\s]\d{1,2}:\d{2}/;

const formatParts = (year: number, month: number, day: number): string =>
  `${pad2(day)}-${pad2(month)}-${year}`;

/** Formats a date as `DD-MM-YYYY`. */
export const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';

  const isoMatch = raw.match(ISO_DATE_PREFIX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return formatParts(Number(year), Number(month), Number(day));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return formatParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
};

/** Formats a date-time as `DD-MM-YYYY (hh:mm AM/PM)`. */
export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';

  if (!HAS_TIME_PART.test(raw)) {
    return formatDate(raw);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const datePart = formatParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  let hours = parsed.getHours();
  const minutes = pad2(parsed.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${datePart} (${pad2(hours)}:${minutes} ${ampm})`;
};

/** Formats a `Date` as `DD-MM-YYYY (hh:mm AM/PM)`. */
export const formatDateTimeParenFromDate = (date: Date): string => {
  const datePart = formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
  let hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${datePart} (${pad2(hours)}:${minutes} ${ampm})`;
};

/** Formats a date-time as `DD-MM-YYYY (hh:mm AM/PM)`. */
export const formatDateTimeParen = (value?: string | null): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';

  if (!HAS_TIME_PART.test(raw)) {
    return formatDate(raw);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const datePart = formatParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  let hours = parsed.getHours();
  const minutes = pad2(parsed.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${datePart} (${pad2(hours)}:${minutes} ${ampm})`;
};
