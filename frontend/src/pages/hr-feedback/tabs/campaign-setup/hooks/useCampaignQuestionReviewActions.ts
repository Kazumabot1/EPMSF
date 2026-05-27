import type { Dispatch, DragEvent, SetStateAction } from 'react';
import { feedbackCampaignApi } from '../../../../../api/feedbackCampaignApi';
import type {
    FeedbackCampaign,
    FeedbackCampaignQuestionGroup,
    FeedbackCampaignQuestionReview,
    FeedbackCampaignScoringConfig,
    FeedbackRelationshipType,
} from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, SetupStepKey } from '../types/campaignSetupTypes';
import { allocateEqualPercentages, formatPercent, roundPercent } from '../utils/campaignSetupCollections';
import { RELATIONSHIP_ORDER } from '../utils/campaignSetupConstants';
import {
    getQuestionSectionCode,
    isReviewQuestionScored,
    readQuestionDragData,
    sortQuestionItems,
} from '../utils/campaignSetupQuestionUtils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type CampaignQuestionReviewActionsParams = {
    selectedCampaign: FeedbackCampaign | null;
    savedAssignmentCount: number;
    questionReview: FeedbackCampaignQuestionReview;
    competencyWeights: FeedbackCampaignQuestionReview['competencyWeights'];
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
            setError('Generate evaluator assignments before resolving campaign questions.');
            return;
        }
        setResolvingQuestionReview(true);
        setError('');
        setSuccess('');
        try {
            const data = await feedbackCampaignApi.resolveQuestionReview(selectedCampaign.id);
            setQuestionReview(data);
            setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? '');
            setSuccess('Questions refreshed from active rules.');
            await loadScoringConfig(selectedCampaign.id);
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Questions could not be prepared.');
        } finally {
            setResolvingQuestionReview(false);
        }
    };

    const updateQuestionGroup = (
        groupKey: string,
        updater: (questions: FeedbackCampaignQuestionGroup['questions']) => FeedbackCampaignQuestionGroup['questions'],
    ) => {
        setQuestionReview(current => {
            const groups = current.groups.map(group => {
                if (group.groupKey !== groupKey) return group;
                const questions = updater(group.questions);
                const questionCount = questions.length;
                const includedQuestionCount = questions.filter(question => question.included).length;
                const scoredQuestionCount = questions.filter(isReviewQuestionScored).length;
                const includedScoredQuestionCount = questions.filter(question => question.included && isReviewQuestionScored(question)).length;
                return { ...group, questions, questionCount, includedQuestionCount, scoredQuestionCount, includedScoredQuestionCount };
            });
            return {
                ...current,
                saved: false,
                questionCount: groups.reduce((total, group) => total + group.questionCount, 0),
                includedQuestionCount: groups.reduce((total, group) => total + group.includedQuestionCount, 0),
                scoredQuestionCount: groups.reduce((total, group) => total + group.scoredQuestionCount, 0),
                includedScoredQuestionCount: groups.reduce((total, group) => total + group.includedScoredQuestionCount, 0),
                groups,
            };
        });
    };

    const toggleQuestionIncluded = (groupKey: string, questionCode: string) => {
        updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) =>
            questions.map(question => question.questionCode === questionCode ? { ...question, included: !question.included } : question),
        );
    };

    const moveCompetency = (groupKey: string, fromSectionCode: string, toSectionCode: string) => {
        if (fromSectionCode === toSectionCode) return;
        updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) => {
            const sections = Array.from(new Map(sortQuestionItems(questions).map(question => [getQuestionSectionCode(question), question])).keys());
            const fromIndex = sections.indexOf(fromSectionCode);
            const toIndex = sections.indexOf(toSectionCode);
            if (fromIndex < 0 || toIndex < 0) return questions;
            const nextSections = [...sections];
            const [moved] = nextSections.splice(fromIndex, 1);
            nextSections.splice(toIndex, 0, moved);
            const sectionOrder = new Map(nextSections.map((section, index) => [section, (index + 1) * 10]));
            return questions.map(question => {
                const currentSectionCode = getQuestionSectionCode(question);
                return { ...question, sectionOrder: sectionOrder.get(currentSectionCode) ?? question.sectionOrder };
            });
        });
    };

    const moveQuestion = (groupKey: string, sectionCode: string, fromQuestionCode: string, toQuestionCode: string) => {
        if (fromQuestionCode === toQuestionCode) return;
        updateQuestionGroup(groupKey, (questions: FeedbackCampaignQuestionGroup['questions']) => {
            const scoped = sortQuestionItems(questions.filter(question => (getQuestionSectionCode(question)) === sectionCode));
            const fromIndex = scoped.findIndex(question => question.questionCode === fromQuestionCode);
            const toIndex = scoped.findIndex(question => question.questionCode === toQuestionCode);
            if (fromIndex < 0 || toIndex < 0) return questions;
            const ordered = [...scoped];
            const [moved] = ordered.splice(fromIndex, 1);
            ordered.splice(toIndex, 0, moved);
            const displayOrder = new Map(ordered.map((question, index) => [question.questionCode, (index + 1) * 10]));
            return questions.map(question => {
                const nextDisplayOrder = displayOrder.get(question.questionCode);
                return typeof nextDisplayOrder === 'number'
                    ? { ...question, displayOrder: nextDisplayOrder }
                    : question;
            });
        });
    };

    const handleCompetencyDrop = (event: DragEvent<HTMLElement>, groupKey: string, toSectionCode: string) => {
        event.preventDefault();
        const payload = readQuestionDragData(event);
        if (payload?.kind === 'competency' && payload.groupKey === groupKey) {
            moveCompetency(groupKey, payload.sectionCode, toSectionCode);
        }
    };

    const handleQuestionDrop = (event: DragEvent<HTMLElement>, groupKey: string, sectionCode: string, toQuestionCode: string) => {
        event.preventDefault();
        const payload = readQuestionDragData(event);
        if (payload?.kind === 'question' && payload.groupKey === groupKey && payload.sectionCode === sectionCode) {
            moveQuestion(groupKey, sectionCode, payload.questionCode, toQuestionCode);
        }
    };

    const updateRelationshipWeight = (relationshipType: FeedbackRelationshipType, value: number) => {
        const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
        setScoringConfig(current => ({
            ...current,
            relationshipWeightsReady: false,
            relationshipWeights: RELATIONSHIP_ORDER.map(type => {
                const existing = current.relationshipWeights.find(item => item.relationshipType === type);
                return {
                    relationshipType: type,
                    label: existing?.label ?? type,
                    weightPercent: type === relationshipType ? normalized : Number(existing?.weightPercent ?? 0),
                    assignmentCount: existing?.assignmentCount ?? 0,
                    targetCountWithRole: existing?.targetCountWithRole ?? 0,
                    currentlyAvailable: Boolean(existing?.currentlyAvailable),
                };
            }),
        }));
    };

    const saveScoringConfig = async () => {
        if (!selectedCampaign) return;
        if (selectedCampaign.status !== 'DRAFT') {
            setError('Scoring weights can be changed only while the campaign is DRAFT.');
            return;
        }
        if (Math.round(relationshipWeightTotal * 100) / 100 !== 100) {
            setError(`Evaluator relationship weights must total 100%. Current total is ${relationshipWeightTotal}%.`);
            return;
        }
        setSavingScoringConfig(true);
        setError('');
        setSuccess('');
        try {
            const data = await feedbackCampaignApi.updateScoringConfig(selectedCampaign.id, {
                redistributeMissingRelationshipWeight: scoringConfig.redistributeMissingRelationshipWeight,
                relationshipWeights: RELATIONSHIP_ORDER.map(type => ({
                    relationshipType: type,
                    weightPercent: Number(scoringConfig.relationshipWeights.find(item => item.relationshipType === type)?.weightPercent ?? 0),
                })),
            });
            setScoringConfig(data);
            setForm(current => ({ ...current, redistributeMissingRelationshipWeight: data.redistributeMissingRelationshipWeight }));
            setSuccess('Campaign relationship weights saved. Missing role weights will be handled according to the redistribution setting.');
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Scoring configuration could not be saved.');
        } finally {
            setSavingScoringConfig(false);
        }
    };

    const updateCompetencyWeight = (competencyCode: string, value: number) => {
        const normalized = roundPercent(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
        setQuestionReview(current => ({
            ...current,
            competencyWeightsReady: false,
            competencyWeights: (current.competencyWeights ?? []).map(item => (
                item.competencyCode === competencyCode ? { ...item, weightPercent: normalized, saved: false } : item
            )),
        }));
    };

    const balanceCompetencyWeightsByQuestions = () => {
        setQuestionReview(current => ({
            ...current,
            competencyWeightsReady: false,
            competencyWeights: (current.competencyWeights ?? []).map(item => ({
                ...item,
                weightPercent: roundPercent(Number(item.defaultWeightPercent ?? 0)),
                saved: false,
            })),
        }));
    };

    const equalizeCompetencyWeights = () => {
        setQuestionReview(current => {
            const weights = current.competencyWeights ?? [];
            const percentages = allocateEqualPercentages(weights.length);
            return {
                ...current,
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
        if (selectedCampaign.status !== 'DRAFT') {
            setError('Campaign questions can be changed only while the campaign is DRAFT.');
            return;
        }
        const selections = questionReview.groups.flatMap(group => group.questions.map(question => ({
            selectionId: question.selectionId ?? null,
            relationshipType: group.relationshipType,
            targetLevelCode: group.targetLevelCode,
            questionCode: question.questionCode,
            included: Boolean(question.included),
            required: Boolean(question.required),
            sectionOrder: question.sectionOrder ?? null,
            displayOrder: question.displayOrder ?? null,
        })));
        if (selections.length === 0) {
            setError('Resolve campaign questions before saving.');
            return;
        }
        const emptyGroups = questionReview.groups.filter(group => group.questions.filter(question => question.included).length === 0);
        if (emptyGroups.length > 0) {
            setError('Each form needs at least one included question.');
            return;
        }
        if (competencyWeights.length === 0) {
            setError('Scoring weights are required before saving.');
            return;
        }
        if (!competencyWeightsReady) {
            setError(`Competency weights must total 100%. Current total is ${formatPercent(competencyWeightTotal)}%.`);
            return;
        }
        setSavingQuestionReview(true);
        setError('');
        setSuccess('');
        try {
            const data = await feedbackCampaignApi.saveQuestionReview(selectedCampaign.id, {
                selections,
                competencyWeights: competencyWeights.map(item => ({
                    competencyCode: item.competencyCode,
                    weightPercent: Number(item.weightPercent ?? 0),
                })),
            });
            setQuestionReview(data);
            setSelectedQuestionGroupKey(data.groups[0]?.groupKey ?? '');
            setSuccess('Question review saved.');
            setActiveStepKey('launch');
            await loadScoringConfig(selectedCampaign.id);
            await loadActivationState(selectedCampaign.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Question review could not be saved.');
        } finally {
            setSavingQuestionReview(false);
        }
    };

    return {
        resolveQuestionReview,
        toggleQuestionIncluded,
        handleCompetencyDrop,
        handleQuestionDrop,
        updateRelationshipWeight,
        saveScoringConfig,
        updateCompetencyWeight,
        balanceCompetencyWeightsByQuestions,
        equalizeCompetencyWeights,
        saveQuestionReview,
    };
}
