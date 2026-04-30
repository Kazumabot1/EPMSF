/** Shared KPI template UI helpers (Tailwind class strings). EPMS violet-aligned. */

export function kpiStatusBadgeClass(status: string): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  switch (status) {
    case 'ACTIVE':
      return `${base} bg-emerald-50 text-emerald-800 ring-emerald-600/15`;
    case 'FINALIZED':
      return `${base} bg-sky-50 text-sky-900 ring-sky-600/15`;
    case 'SENT':
      return `${base} bg-violet-50 text-violet-900 ring-violet-600/15`;
    case 'ARCHIVED':
      return `${base} bg-gray-100 text-gray-600 ring-gray-400/20`;
    case 'DRAFT':
    default:
      return `${base} bg-violet-50/80 text-violet-900 ring-violet-500/20`;
  }
}
