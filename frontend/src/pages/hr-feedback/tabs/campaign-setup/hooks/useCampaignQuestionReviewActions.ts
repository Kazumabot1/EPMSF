import type { Dispatch, SetStateAction } from "react";
import { feedbackCampaignApi } from "../../../../../api/feedbackCampaignApi";
import type {
    FeedbackCampaign,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackRelationshipType,
} from "../../../../../types/feedbackCampaign";
import type {
    CampaignInfoForm,
    SetupStepKey,
} from "../types/campaignSetupTypes";
import {
    allocateEqualPercentages,
    formatPercent,
    roundPercent,
} from "../utils/campaignSetupCollections";
import { RELATIONSHIP_ORDER } from "../utils/campaignSetupConstants";
import { isReviewQuestionScored } from "../utils/campaignSetupQuestionUtils";

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignQuestionReviewActionsParams = {
    selectedCampaign: FeedbackCampaign | null;
    savedAssignmentCount: number;
    questionReview: FeedbackCampaignQuestionReview;
    competencyWeights: FeedbackCampaignQuestionReview["competencyWeights"];
    competencyWeightsReady: boolean;
    competencyWeightTotal: number;
    relationshipWeightTotal: number;
    scoringConfig: FeedbackCampaignScoringConfig;
    setQuestionReview: Setter<FeedbackCampaignQuestionReview>;
    setSelectedQuestionGroupKey: Setter<string>;
    setResolvingQuestionReview: Setter<boolean>;
    setSavingQuestionReview: Setter<boolean>;
    setScoringConfig: Setter<FeedbackCampaignScoringConfig>;
    setSavingScoringConfig: Setter<boolean>;
    setForm: Setter<CampaignInfoForm>;
    setError: Setter<string>;
    setSuccess: Setter<string>;
    setActiveStepKey: Setter<SetupStepKey>;
    loadScoringConfig: (campaignId: number) => Promise<void>;
    loadActivationState: (campaignId: number) => Promise<void>;
};

export function useCampaignQuestionReviewActions({
                                                     selectedCampaign,
                                                     savedAssignmentCount,
                                                     questionReview,
                                                     competencyWeights,
                                                     competencyWeightsReady,
                                                     competencyWeightTotal,
                                                     relationshipWeightTotal,
                                                     scoringConfig,
                                                     setQuestionReview,
                                                     setSelectedQuestionGroupKey,
                                                     setResolvingQuestionReview,
                                                     setSavingQuestionReview,
                                                     setScoringConfig,
                                                     setSavingScoringConfig,
                                                     setForm,
                                                     setError,
                                                     setSuccess,
                                                     setActiveStepKey,
                                                     loadScoringConfig,
                                                     loadActivationState,
                                                 }: CampaignQuestionReviewActionsParams) {
    const resolveQuestionReview = async () => {
        if (!selectedCampaign) return;
        if (savedAssignmentCount === 0) {
            setError(
                "Save evaluator assignments before preparing the question snapshot.",
            );
            return;
        }
        setResolvingQuestionReview(true);
        setError("");
        setSuccess("");
        try {
            const data = await feedbackCampaignApi.resolveQuestionReview(
                selectedCampaign.id,
            );
            setQuestionReview(data);
            setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? "");
            setSuccess("Campaign question preview refreshed from Form Setup.");
            await loadScoringConfig(selectedCampaign.id);
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Question snapshot could not be prepared.",
            );
        } finally {
            setResolvingQuestionReview(false);
        }
    };

    const updateRelationshipWeight = (
        relationshipType: FeedbackRelationshipType,
        value: number,
    ) => {
        const normalized = Number.isFinite(value)
            ? Math.max(0, Math.min(100, value))
            : 0;
        setScoringConfig((current) => ({
            ...current,
            relationshipWeightsReady: false,
            relationshipWeights: RELATIONSHIP_ORDER.map((type) => {
                const existing = current.relationshipWeights.find(
                    (item) => item.relationshipType === type,
                );
                return {
                    relationshipType: type,
                    label: existing?.label ?? type,
                    weightPercent:
                        type === relationshipType
                            ? normalized
                            : Number(existing?.weightPercent ?? 0),
                    assignmentCount: existing?.assignmentCount ?? 0,
                    targetCountWithRole: existing?.targetCountWithRole ?? 0,
                    currentlyAvailable: Boolean(existing?.currentlyAvailable),
                };
            }),
        }));
    };

    const saveScoringConfig = async () => {
        if (!selectedCampaign) return;
        if (selectedCampaign.status !== "DRAFT") {
            setError(
                "Scoring weights can be changed only while the campaign is DRAFT.",
            );
            return;
        }
        if (Math.round(relationshipWeightTotal * 100) / 100 !== 100) {
            setError(
                `Evaluator relationship weights must total 100%. Current total is ${relationshipWeightTotal}%.`,
            );
            return;
        }
        setSavingScoringConfig(true);
        setError("");
        setSuccess("");
        try {
            const data = await feedbackCampaignApi.updateScoringConfig(
                selectedCampaign.id,
                {
                    redistributeMissingRelationshipWeight:
                    scoringConfig.redistributeMissingRelationshipWeight,
                    relationshipWeights: RELATIONSHIP_ORDER.map((type) => ({
                        relationshipType: type,
                        weightPercent: Number(
                            scoringConfig.relationshipWeights.find(
                                (item) => item.relationshipType === type,
                            )?.weightPercent ?? 0,
                        ),
                    })),
                },
            );
            setScoringConfig(data);
            setForm((current) => ({
                ...current,
                redistributeMissingRelationshipWeight:
                data.redistributeMissingRelationshipWeight,
            }));
            setSuccess("Evaluator relationship weights saved.");
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Scoring configuration could not be saved.",
            );
        } finally {
            setSavingScoringConfig(false);
        }
    };

    const updateCompetencyWeight = (competencyCode: string, value: number) => {
        const normalized = roundPercent(
            Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)),
        );
        setQuestionReview((current) => ({
            ...current,
            saved: false,
            competencyWeightsReady: false,
            competencyWeights: (current.competencyWeights ?? []).map((item) =>
                item.competencyCode === competencyCode
                    ? { ...item, weightPercent: normalized, saved: false }
                    : item,
            ),
        }));
    };

    const equalizeCompetencyWeights = () => {
        setQuestionReview((current) => {
            const weights = current.competencyWeights ?? [];
            const percentages = allocateEqualPercentages(weights.length);
            return {
                ...current,
                saved: false,
                competencyWeightsReady: false,
                competencyWeights: weights.map((item, index) => ({
                    ...item,
                    weightPercent: percentages[index] ?? 0,
                    saved: false,
                })),
            };
        });
    };

    const saveQuestionReview = async () => {
        if (!selectedCampaign) return;
        if (selectedCampaign.status !== "DRAFT") {
            setError(
                "Question snapshot can be saved only while the campaign is DRAFT.",
            );
            return;
        }
        const selections = questionReview.groups.flatMap((group) =>
            group.questions.map((question) => ({
                selectionId: question.selectionId ?? null,
                relationshipType: group.relationshipType,
                targetLevelCode: group.targetLevelCode,
                targetDepartmentId: group.targetDepartmentId ?? null,
                targetPositionId: group.targetPositionId ?? null,
                questionCode: question.questionCode,
                included: true,
                required: true,
                sectionOrder: question.sectionOrder ?? null,
                displayOrder: question.displayOrder ?? null,
            })),
        );
        if (selections.length === 0) {
            setError("Refresh the question snapshot before saving.");
            return;
        }
        const emptyGroups = questionReview.groups.filter(
            (group) => group.questions.filter(isReviewQuestionScored).length === 0,
        );
        if (emptyGroups.length > 0) {
            setError(
                "Each form variant needs at least one rating question with a required comment.",
            );
            return;
        }
        const invalidQuestionCodes = Array.from(
            new Set(
                questionReview.groups.flatMap((group) =>
                    group.questions
                        .filter((question) => !isReviewQuestionScored(question))
                        .map((question) => String(question.questionCode ?? "UNKNOWN")),
                ),
            ),
        );
        if (invalidQuestionCodes.length > 0) {
            setError(
                `Only rating questions with required comments can be used. ${invalidQuestionCodes.length} invalid question${invalidQuestionCodes.length === 1 ? "" : "s"} found: ${invalidQuestionCodes.slice(0, 8).join(", ")}${invalidQuestionCodes.length > 8 ? ", ..." : ""}`,
            );
            return;
        }
        if (competencyWeights.length === 0) {
            setError("Competency weights are required before saving the snapshot.");
            return;
        }
        if (!competencyWeightsReady) {
            setError(
                `Competency weights must total 100%. Current total is ${formatPercent(competencyWeightTotal)}%.`,
            );
            return;
        }
        setSavingQuestionReview(true);
        setError("");
        setSuccess("");
        try {
            const data = await feedbackCampaignApi.saveQuestionReview(
                selectedCampaign.id,
                {
                    selections,
                    competencyWeights: competencyWeights.map((item) => ({
                        competencyCode: item.competencyCode,
                        weightPercent: Number(item.weightPercent ?? 0),
                    })),
                },
            );
            setQuestionReview(data);
            setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? "");
            setSuccess("Question snapshot saved.");
            setActiveStepKey("launch");
            await loadScoringConfig(selectedCampaign.id);
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Question snapshot could not be saved.",
            );
        } finally {
            setSavingQuestionReview(false);
        }
    };

    return {
        resolveQuestionReview,
        updateRelationshipWeight,
        saveScoringConfig,
        updateCompetencyWeight,
        equalizeCompetencyWeights,
        saveQuestionReview,
    };
}
