import toast from 'react-hot-toast';
import { ApiRequestError, toApiRequestError } from '../../../services/apiError';
import { kpiCategoryService } from '../../../services/kpiCategoryService';
import { kpiItemService } from '../../../services/kpiItemService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import { kpiUnitService } from '../../../services/kpiUnitService';
import { positionService } from '../../../services/positionService';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type {
  KpiFormStatus,
  KpiTemplateRequest,
  KpiTemplateResponse,
  KpiTemplateRowDraft,
} from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';
import type { PositionResponse } from '../../../types/position';
import { DEFAULT_KPI_TEMPLATE_DURATION_MONTHS, type KpiTemplateDurationMonths } from './kpiTemplateUi';

export const EXISTING_KPI_FOR_POSITION_MSG =
  'A KPI form already exists for this position. Your changes will be saved to that form.';

export type KpiTemplateFormFields = {
  title: string;
  status: KpiFormStatus;
  positionId: number | null;
  positionDurationMonths: KpiTemplateDurationMonths;
  rows: KpiTemplateRowDraft[];
};

export const newKpiTemplateRow = (): KpiTemplateRowDraft => ({
  rowId: crypto.randomUUID(),
  id: null,
  kpiItemId: null,
  kpiLabel: '',
  kpiCategoryId: null,
  kpiCategoryLabel: '',
  kpiUnitId: null,
  kpiUnitLabel: '',
  target: null,
  weight: null,
});

export function mapTemplateToFormFields(tmpl: KpiTemplateResponse): KpiTemplateFormFields {
  return {
    title: tmpl.title,
    status: tmpl.status,
    positionId: tmpl.positions[0]?.positionId ?? null,
    positionDurationMonths: (tmpl.positions[0]?.durationMonths ?? DEFAULT_KPI_TEMPLATE_DURATION_MONTHS) as KpiTemplateDurationMonths,
    rows:
      tmpl.items.length > 0
        ? tmpl.items.map((line) => ({
            rowId: crypto.randomUUID(),
            id: line.id ?? null,
            kpiItemId: line.kpiItemId,
            kpiLabel: line.kpiLabel ?? '',
            kpiCategoryId: line.kpiCategoryId,
            kpiCategoryLabel: line.kpiCategoryLabel ?? (line.kpiCategoryId == null ? line.kpiCategoryName ?? '' : ''),
            kpiUnitId: line.kpiUnitId,
            kpiUnitLabel: line.kpiUnitLabel ?? (line.kpiUnitId == null ? line.kpiUnitName ?? '' : ''),
            target: line.target,
            weight: line.weight,
          }))
        : [newKpiTemplateRow()],
  };
}

export type ExistingKpiForPosition = {
  templateId: number;
  templateTitle?: string;
};

function deriveAssignedPositionIds(
  positions: PositionResponse[],
  availablePositions: PositionResponse[] | null,
  assignedPositionIds: number[],
): number[] {
  const assigned = new Set(assignedPositionIds);

  /*
   * null means available-positions failed.
   * Do not treat every position as assigned when that API fails.
   */
  if (availablePositions === null) {
    return [...assigned];
  }

  const available = new Set(availablePositions.map((position) => position.id));

  for (const position of positions) {
    if (!available.has(position.id)) {
      assigned.add(position.id);
    }
  }

  return [...assigned];
}

export async function resolveAssignedPositionIdsFromTemplates(
  excludeFormId?: number,
): Promise<number[]> {
  const templates = await kpiTemplateService.getAllTemplates();
  const ids = new Set<number>();

  for (const template of templates) {
    if (excludeFormId != null && template.id === excludeFormId) {
      continue;
    }

    for (const link of template.positions ?? []) {
      if (link.positionId != null) {
        ids.add(link.positionId);
      }
    }
  }

  return [...ids];
}

async function loadAssignedPositionIds(excludeFormId?: number): Promise<number[]> {
  try {
    return await kpiTemplateService.getAssignedPositionIdsOnly(excludeFormId);
  } catch {
    try {
      return await resolveAssignedPositionIdsFromTemplates(excludeFormId);
    } catch {
      return [];
    }
  }
}

function findExistingInTemplateList(
  positionId: number,
  templates: Awaited<ReturnType<typeof kpiTemplateService.getAllTemplates>>,
  excludeFormId?: number,
): ExistingKpiForPosition | null {
  for (const template of templates) {
    if (excludeFormId != null && template.id === excludeFormId) {
      continue;
    }

    const link = (template.positions ?? []).find((p) => p.positionId === positionId);

    if (link) {
      return { templateId: template.id, templateTitle: template.title };
    }
  }

  return null;
}

export async function findExistingTemplateForPosition(
  positionId: number,
  excludeFormId?: number,
): Promise<ExistingKpiForPosition | null> {
  try {
    const availability = await kpiTemplateService.checkPositionAvailability(
      positionId,
      excludeFormId,
    );

    if (
      !availability.available &&
      availability.existingTemplateId != null &&
      availability.existingTemplateId > 0
    ) {
      return {
        templateId: availability.existingTemplateId,
        templateTitle: availability.templateTitle ?? undefined,
      };
    }

    if (availability.available) {
      return null;
    }
  } catch {
    // fall through
  }

  try {
    const resolved = await kpiTemplateService.resolveTemplateIdForPosition(
      positionId,
      excludeFormId,
    );

    if (resolved != null && resolved > 0) {
      return { templateId: resolved };
    }
  } catch {
    // fall through
  }

  try {
    return findExistingInTemplateList(
      positionId,
      await kpiTemplateService.getAllTemplates(),
      excludeFormId,
    );
  } catch {
    return null;
  }
}

export function notifySwitchedToExistingForm(templateTitle?: string): void {
  const detail =
    templateTitle != null && templateTitle.trim().length > 0
      ? `${EXISTING_KPI_FOR_POSITION_MSG} (“${templateTitle.trim()}”)`
      : EXISTING_KPI_FOR_POSITION_MSG;

  toast(detail, { icon: 'ℹ️', duration: 7000 });
}

export async function loadTemplateFormFields(
  templateId: number,
): Promise<KpiTemplateFormFields> {
  const tmpl = await kpiTemplateService.getTemplateById(templateId);
  return mapTemplateToFormFields(tmpl);
}

export type KpiTemplateEditorLookups = {
  categories: KpiCategory[];
  units: KpiUnit[];
  items: KpiItem[];
  positions: PositionResponse[];
  assignedPositionIds: number[];
};

const EMPTY_LOOKUPS: KpiTemplateEditorLookups = {
  categories: [],
  units: [],
  items: [],
  positions: [],
  assignedPositionIds: [],
};

export async function loadKpiTemplateEditorLookups(
  excludeFormId?: number,
  options?: { toastOnPartialFailure?: boolean },
): Promise<KpiTemplateEditorLookups> {
  const failures: string[] = [];

  const load = async <T>(
    label: string,
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      failures.push(label);
      console.warn(`[KPI template] ${label} load failed:`, toApiRequestError(err, label).message);
      return fallback;
    }
  };

  let availablePositionsFailed = false;

  const loadAvailablePositions = async (): Promise<PositionResponse[] | null> => {
    try {
      return await kpiTemplateService.getAvailablePositions(excludeFormId);
    } catch (err) {
      availablePositionsFailed = true;
      failures.push('available positions');
      console.warn(
        '[KPI template] available positions load failed:',
        toApiRequestError(err, 'available positions').message,
      );

      return null;
    }
  };

  const [categories, units, items, positions, availablePositions, assignedPositionIds] =
    await Promise.all([
      load('KPI categories', () => kpiCategoryService.getAll(), []),
      load('KPI units', () => kpiUnitService.getAll(), []),
      load('KPI items', () => kpiItemService.getAll(), []),
      load('positions', () => positionService.getPositions(), []),
      loadAvailablePositions(),
      load('assigned positions', () => loadAssignedPositionIds(excludeFormId), []),
    ]);

  if (options?.toastOnPartialFailure !== false && failures.length > 0) {
    const message = availablePositionsFailed
      ? 'Some KPI lookup data could not load, but you can still save the form.'
      : `Could not load: ${failures.join(', ')}. Other dropdowns may still be usable.`;

    toast.error(message);
  }

  return {
    categories,
    units,
    items,
    positions,
    assignedPositionIds: deriveAssignedPositionIds(
      positions,
      availablePositions,
      assignedPositionIds,
    ),
  };
}

export { EMPTY_LOOKUPS as emptyKpiTemplateEditorLookups };

export type SaveKpiTemplateResult = {
  templateId: number;
  created: boolean;
};

export async function saveKpiTemplateCreateOrUpdate(options: {
  positionId: number;
  payload: KpiTemplateRequest;
  excludeFormId?: number;
  knownEditTemplateId?: number | null;
  onSwitchedToEdit?: (templateId: number) => void;
}): Promise<SaveKpiTemplateResult> {
  let templateId =
    options.knownEditTemplateId != null && options.knownEditTemplateId > 0
      ? options.knownEditTemplateId
      : null;

  if (templateId == null) {
    const existing = await findExistingTemplateForPosition(
      options.positionId,
      options.excludeFormId,
    );

    if (existing) {
      templateId = existing.templateId;
      options.onSwitchedToEdit?.(templateId);
      notifySwitchedToExistingForm(existing.templateTitle);
    }
  }

  if (templateId != null) {
    const updated = await kpiTemplateService.updateTemplate(templateId, options.payload);
    return { templateId: updated.id, created: false };
  }

  try {
    const created = await kpiTemplateService.createTemplate(options.payload);
    return { templateId: created.id, created: true };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 409) {
      let conflictId =
        err.existingTemplateId != null && err.existingTemplateId > 0
          ? err.existingTemplateId
          : null;

      let conflictTitle: string | undefined;

      if (conflictId == null) {
        const existing = await findExistingTemplateForPosition(
          options.positionId,
          options.excludeFormId,
        );

        if (existing) {
          conflictId = existing.templateId;
          conflictTitle = existing.templateTitle;
        }
      }

      if (conflictId != null) {
        options.onSwitchedToEdit?.(conflictId);
        notifySwitchedToExistingForm(conflictTitle);
        const updated = await kpiTemplateService.updateTemplate(conflictId, options.payload);
        return { templateId: updated.id, created: false };
      }
    }

    throw err;
  }
}
