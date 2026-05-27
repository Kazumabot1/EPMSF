import { DEFAULT_EVALUATOR_CONFIG, normalizeEvaluatorConfig } from '../../../../../types/feedbackCampaign';
import type { EvaluatorConfigInput } from '../../../../../types/feedbackCampaign';

export interface FeedbackWorkspaceState {
    campaignId: number | null;
    evalConfig: EvaluatorConfigInput;
}

export const WORKSPACE_STORAGE_KEY = 'epms.hrFeedback.workspaceState.v3';
export const LEGACY_WORKSPACE_STORAGE_KEY = 'epms.hrFeedback.workspaceState.v2';

export const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((left, right) => left - right);

export const sameIds = (left: number[], right: number[]) => {
    const a = normalizeIds(left);
    const b = normalizeIds(right);
    return a.length === b.length && a.every((value, index) => value === b[index]);
};

export const emptyWorkspace = (): FeedbackWorkspaceState => ({
    campaignId: null,
    evalConfig: normalizeEvaluatorConfig(DEFAULT_EVALUATOR_CONFIG),
});

const readWorkspaceKey = (key: string): FeedbackWorkspaceState | null => {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<FeedbackWorkspaceState> & {
        savedTargetIds?: number[];
        draftTargetIds?: number[];
    };

    return {
        campaignId: typeof parsed.campaignId === 'number' ? parsed.campaignId : null,
        evalConfig: normalizeEvaluatorConfig(parsed.evalConfig ?? DEFAULT_EVALUATOR_CONFIG),
    };
};

export const readStoredWorkspace = (): FeedbackWorkspaceState => {
    if (typeof window === 'undefined') return emptyWorkspace();

    try {
        return readWorkspaceKey(WORKSPACE_STORAGE_KEY)
            ?? readWorkspaceKey(LEGACY_WORKSPACE_STORAGE_KEY)
            ?? emptyWorkspace();
    } catch {
        return emptyWorkspace();
    }
};

export const writeStoredWorkspace = (workspace: FeedbackWorkspaceState) => {
    if (typeof window === 'undefined') return;
    const payload: FeedbackWorkspaceState = {
        campaignId: workspace.campaignId ?? null,
        evalConfig: normalizeEvaluatorConfig(workspace.evalConfig),
    };
    window.sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
    window.sessionStorage.removeItem(LEGACY_WORKSPACE_STORAGE_KEY);
};
