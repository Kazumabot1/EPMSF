const pad2 = (value: number | string) => String(value).padStart(2, '0');

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const HAS_TIME_PART = /[T\s]\d{1,2}:\d{2}/;

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '-';
  const raw = String(value).trim();
  if (!raw) return '-';

  const isoMatch = raw.match(ISO_DATE_PREFIX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
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

  const day = pad2(parsed.getDate());
  const month = pad2(parsed.getMonth() + 1);
  const year = parsed.getFullYear();
  const hours = pad2(parsed.getHours());
  const minutes = pad2(parsed.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
