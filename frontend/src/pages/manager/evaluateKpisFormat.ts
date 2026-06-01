import { formatDate, formatDateTimeParen } from '../../components/hr/kpi-template/kpiTemplateDateFormat';
import type { ManagerKpiAssignment, ManagerKpiScoreLine } from '../../types/kpiWorkflow';
import type { DraftScores } from './ManagerEmployeeKpiScoreModal';

/** `DD-MM-YYYY (hh:mm AM/PM)`; date-only values use `(12:00 AM)`. */
export const displayDateTimeDisplay = (value?: string | null): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (/[T\s]\d{1,2}:\d{2}/.test(raw)) return formatDateTimeParen(value);
  const dateOnly = formatDate(value);
  return dateOnly === '—' ? dateOnly : `${dateOnly} (12:00 AM)`;
};

export const formatPeriodRange = (start?: string | null, end?: string | null): string => {
  if (!start && !end) return '—';
  if (start && end) return `${displayDateTimeDisplay(start)} – ${displayDateTimeDisplay(end)}`;
  if (start) return displayDateTimeDisplay(start);
  return displayDateTimeDisplay(end);
};

/** One decimal place with trailing `%` (e.g. `85.3%`). */
export const formatPctOneDecimal = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
};

export const achievementPct = (actual: number | null, target: number | null | undefined): number | null => {
  if (actual == null || !Number.isFinite(actual) || target == null || target <= 0) return null;
  return (actual / target) * 100;
};

export const weightScoreFromActual = (
  actual: number | null,
  target: number | null | undefined,
  weight: number | null | undefined,
): number | null => {
  const pct = achievementPct(actual, target);
  if (pct == null || weight == null) return null;
  return (pct * weight) / 100;
};

export const resolveLineActual = (
  line: ManagerKpiScoreLine,
  draftRaw: string | undefined,
): number | null => {
  const trimmed = draftRaw?.trim() ?? '';
  if (trimmed !== '') {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return line.actualValue;
};

export const computeLiveTotalWeightedScore = (
  assignment: ManagerKpiAssignment,
  drafts: DraftScores,
): number | null => {
  const map = drafts[assignment.employeeKpiFormId] ?? {};
  let total = 0;
  let hasContribution = false;

  for (const line of assignment.lines) {
    const actual = resolveLineActual(line, map[line.kpiFormItemId]);
    const preview = weightScoreFromActual(actual, line.target, line.weight);
    if (preview != null && Number.isFinite(preview)) {
      total += preview;
      hasContribution = true;
      continue;
    }
    if (line.weightedScore != null && Number.isFinite(line.weightedScore)) {
      total += line.weightedScore;
      hasContribution = true;
    }
  }

  return hasContribution ? total : null;
};
