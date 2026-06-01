import { formatDate, formatDateTimeParen } from '../hr/kpi-template/kpiTemplateDateFormat';

export const OOM_FONT = '"Times New Roman", Times, serif';

/** Formats as `DD-MM-YYYY (hh:mm AM/PM)`; date-only values use midnight. */
export function formatOomDateTime(value?: string | null): string {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  if (/[T\s]\d{1,2}:\d{2}/.test(raw)) {
    return formatDateTimeParen(value);
  }
  return `${formatDate(value)} (12:00 AM)`;
}

export const oomPageWrap =
  'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8';

export const oomCompactHeader =
  'mb-5 rounded-xl border border-[#dbe7f6] bg-gradient-to-br from-white via-[#f8fbfd] to-[#eff6ff] px-5 py-3 shadow-sm';

export const oomEyebrow =
  'mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563eb]';

export const oomHeaderTitle = 'text-lg font-bold tracking-tight text-[#0f172a] sm:text-xl';

export const oomHeaderDesc = 'mt-1 max-w-3xl text-xs leading-snug text-[#64748b] sm:text-sm';

export const oomCard =
  'rounded-xl border border-[#dbe7f6] bg-white p-5 shadow-sm sm:p-6';

export const oomInput =
  'w-full min-h-11 rounded-lg border border-[#d7e4f5] bg-white px-3.5 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#64748b]';

export const oomTextarea = `${oomInput} min-h-[110px] resize-y py-2.5`;

export const oomLabel = 'text-xs font-bold text-[#334155] sm:text-sm';

export const oomBtnPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2563eb] bg-[#2563eb] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-55';

export const oomBtnSecondary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe7f6] bg-white px-4 text-sm font-bold text-[#334155] shadow-sm transition hover:border-[#93c5fd] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-55';

export const oomBtnDanger =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#fecaca] bg-[#dc2626] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-55';

export const oomBtnTeal =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#5eead4] bg-[#0f766e] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d9488] disabled:cursor-not-allowed disabled:opacity-55';

export const oomTabActive =
  'rounded-full border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-sm font-bold text-white shadow-sm';

export const oomTabIdle =
  'rounded-full border border-[#dbe7f6] bg-white px-4 py-2 text-sm font-bold text-[#475569] transition hover:border-[#93c5fd] hover:bg-[#eff6ff]';

export const oomMeetingCardBtn =
  'group flex w-full flex-col rounded-xl border border-[#dbe7f6] bg-white p-4 text-left shadow-sm transition hover:border-[#93c5fd] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/30';

export const oomModalOverlay =
  'fixed inset-0 z-[1200] flex items-center justify-center overflow-y-auto bg-[#0f172a]/45 p-4 backdrop-blur-[2px] sm:p-6';

export const oomModalPanel =
  'my-auto flex w-full max-w-2xl max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-2xl border border-[#dbe7f6] bg-gradient-to-b from-white to-[#f8fbfd] shadow-2xl';
