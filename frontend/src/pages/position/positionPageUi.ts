export const POSITION_FONT = '"Times New Roman", Times, serif';

export const positionHeroGradient =
  'bg-[radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.45),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#dbeafe_42%,#1e3a8a_100%)]';

export const modalOverlayClass =
  'fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]';

export const inputClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export const btnPrimary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

/** Soft dusty red — Deactivate actions */
export const btnNudeRed =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#e8b4b4] bg-[#fae8e8] px-4 text-sm font-bold text-[#a85858] shadow-sm transition hover:border-[#ddb0b0] hover:bg-[#f5d4d4] disabled:cursor-not-allowed disabled:opacity-50';

export const btnDanger =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#e8b4b4] bg-[#fae8e8] px-4 text-sm font-bold text-[#a85858] shadow-sm transition hover:border-[#ddb0b0] hover:bg-[#f5d4d4] disabled:cursor-not-allowed disabled:opacity-50';

/** Icon-only deactivate control in tables */
export const btnIconNudeRed =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8c4c4] bg-[#faf0f0] text-[#b86b6b] transition hover:border-[#ddb0b0] hover:bg-[#f5d8d8] hover:text-[#9e4f4f]';

/** Icon-only view / primary action in tables */
export const btnIconBlue =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800';

/** Icon-only edit control in tables */
export const btnIconSecondary =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-slate-50 hover:text-blue-700';

export const PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
