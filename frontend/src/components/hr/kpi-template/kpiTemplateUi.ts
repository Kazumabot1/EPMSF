/** Shared KPI template UI helpers (Tailwind class strings). EPMS violet-aligned. */

export function kpiCycleStatusBadgeClass(status: string): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  switch (status) {
    case 'ACTIVE':
      return `${base} bg-emerald-50 text-emerald-800 ring-emerald-600/15`;
    case 'DEACTIVATED':
      return `${base} bg-gray-100 text-gray-600 ring-gray-400/20`;
    case 'DRAFT':
    default:
      return `${base} bg-violet-50/80 text-violet-900 ring-violet-500/20`;
  }
}

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

export type KpiTemplateDurationMonths = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const KPI_TEMPLATE_DURATION_OPTIONS: Array<{ value: KpiTemplateDurationMonths; label: string }> = [
  { value: 3, label: '3 months' },
  { value: 4, label: '4 months' },
  { value: 5, label: '5 months' },
  { value: 6, label: '6 months' },
  { value: 7, label: '7 months' },
  { value: 8, label: '8 months' },
  { value: 9, label: '9 months' },
  { value: 10, label: '10 months' },
  { value: 11, label: '11 months' },
  { value: 12, label: '1 year' },
];

export const DEFAULT_KPI_TEMPLATE_DURATION_MONTHS: KpiTemplateDurationMonths = 12;

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function calculateKpiTemplateEndDate(startDate: string, durationMonths: KpiTemplateDurationMonths): string {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  end.setDate(end.getDate() - 1);
  return toDateInputValue(end);
}

export function inferKpiTemplateDurationMonths(startDate: string, endDate: string): KpiTemplateDurationMonths {
  const matched = KPI_TEMPLATE_DURATION_OPTIONS.find(
    (option) => calculateKpiTemplateEndDate(startDate, option.value) === endDate,
  );
  return matched?.value ?? DEFAULT_KPI_TEMPLATE_DURATION_MONTHS;
}

export type KpiPositionDropdownOption<T extends { id: number; positionTitle: string }> = {
  position: T;
  disabled: boolean;
  label: string;
};

type BuildKpiPositionDropdownOptionsConfig = {
  /** When true, taken positions stay selectable and open the existing form for edit. */
  createOrEditMode?: boolean;
};

/** All positions for the KPI form dropdown; taken slots are disabled unless createOrEditMode. */
export function buildKpiPositionDropdownOptions<T extends { id: number; positionTitle: string }>(
  positions: T[],
  assignedPositionIds: number[],
  currentPositionId: number | null,
  config?: BuildKpiPositionDropdownOptionsConfig,
): KpiPositionDropdownOption<T>[] {
  const createOrEditMode = config?.createOrEditMode === true;
  const assigned = new Set(assignedPositionIds);
  return positions.map((position) => {
    const isCurrent = currentPositionId != null && position.id === currentPositionId;
    const isTaken = assigned.has(position.id) && !isCurrent;
    return {
      position,
      disabled: createOrEditMode ? false : isTaken,
      label: isTaken
        ? createOrEditMode
          ? `${position.positionTitle} (edit existing form)`
          : `${position.positionTitle} (KPI form exists)`
        : position.positionTitle,
    };
  });
}

export function countAvailableKpiPositions(
  options: KpiPositionDropdownOption<{ id: number; positionTitle: string }>[],
): number {
  return options.filter((option) => !option.disabled).length;
}

export function countPositionsWithoutKpiTemplate(
  positions: { id: number }[],
  assignedPositionIds: number[],
): number {
  const assigned = new Set(assignedPositionIds);
  return positions.filter((position) => !assigned.has(position.id)).length;
}

/** KPI forms saved via "Use Form" (draft) — selectable in template cycles. */
export function filterKpiFormsForCycleSelection<T extends { id: number; status: string }>(
  templates: T[],
  selectedFormIds: number[] = [],
): T[] {
  const selected = new Set(selectedFormIds);
  return templates.filter((template) => template.status === 'DRAFT' || selected.has(template.id));
}

export function formatTemplatePositionLabels(
  positions: Array<{ positionTitle?: string | null }>,
): string {
  const labels = positions
    .map((link) => link.positionTitle?.trim())
    .filter((name): name is string => Boolean(name));
  return labels.length > 0 ? labels.join(' · ') : '—';
}

export function sumTemplateItemWeights(items: Array<{ weight?: number | null }>): number {
  return items.reduce((sum, item) => sum + (item.weight ?? 0), 0);
}

export function formatKpiFormCycleOptionLabel(template: {
  title: string;
  status: string;
  positions?: Array<{ positionTitle?: string | null }>;
}): string {
  const positions = (template.positions ?? [])
    .map((link) => link.positionTitle?.trim())
    .filter((name): name is string => Boolean(name))
    .join(', ');
  const positionSuffix = positions ? ` — ${positions}` : '';
  return `${template.title}${positionSuffix} (${template.status})`;
}
