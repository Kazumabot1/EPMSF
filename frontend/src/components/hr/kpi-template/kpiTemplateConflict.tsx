import type { NavigateFunction } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ApiRequestError } from '../../../services/apiError';
import {
  EXISTING_KPI_FOR_POSITION_MSG,
  findExistingTemplateForPosition,
  notifySwitchedToExistingForm,
} from './kpiTemplateWorkflow';

type HandleKpiTemplateSaveErrorOptions = {
  /** Refresh available-positions after a conflict so the dropdown matches the server. */
  onConflict?: () => void | Promise<void>;
};

/** Navigation fallback when save still returns 409 without resolving the existing form in-modal. */
export async function handleKpiTemplateSaveError(
  err: unknown,
  navigate: NavigateFunction,
  positionId?: number,
  excludeFormId?: number,
  options?: HandleKpiTemplateSaveErrorOptions,
): Promise<boolean> {
  if (!(err instanceof ApiRequestError) || err.status !== 409) {
    return false;
  }

  await options?.onConflict?.();

  let existingTemplateId =
    err.existingTemplateId != null && err.existingTemplateId > 0 ? err.existingTemplateId : undefined;
  let templateTitle: string | undefined;

  if (existingTemplateId == null && positionId != null) {
    const existing = await findExistingTemplateForPosition(positionId, excludeFormId);
    if (existing) {
      existingTemplateId = existing.templateId;
      templateTitle = existing.templateTitle;
    }
  }

  if (existingTemplateId != null && existingTemplateId > 0) {
    notifySwitchedToExistingForm(templateTitle);
    toast.error(
      `This position already has KPI form #${existingTemplateId}. Opening it for edit.`,
      { duration: 6000 },
    );
    navigate(`/hr/kpi-template/${existingTemplateId}/edit`);
    return true;
  }

  const apiMessage =
    err instanceof ApiRequestError && err.message.trim().length > 0 ? err.message : EXISTING_KPI_FOR_POSITION_MSG;
  toast.error(apiMessage, { duration: 6000 });
  return true;
}
