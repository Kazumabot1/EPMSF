import { useEffect, useMemo, useState } from "react";
import type { FeedbackCampaignQuestionGroup } from "../../../../../types/feedbackCampaign";
import {
    buildQuestionCompetencies,
    sortQuestionItems,
} from "../utils/campaignSetupQuestionUtils";

type QuestionReviewStepProps = {
    savedAssignmentCount: number;
    selectedCampaign: any;
    competencyWeightsReady: boolean;
    formatPercent: (value: number) => string;
    competencyWeightTotal: number;
    competencyWeights: any[];
    competencyWeightDelta: number;
    questionSaveDisabled: boolean;
    saveQuestionReview: () => Promise<void> | void;
    savingQuestionReview: boolean;
    loadingQuestionReview: boolean;
    equalizeCompetencyWeights: () => void;
    updateCompetencyWeight: (competencyCode: string, value: number) => void;
    resolvingQuestionReview: boolean;
    resolveQuestionReview: () => Promise<void> | void;
    questionReview: any;
    questionGroups: FeedbackCampaignQuestionGroup[];
    selectedQuestionGroupKey: string;
    setSelectedQuestionGroupKey: (value: string) => void;
};

type QuestionSet = {
    setKey: string;
    title: string;
    relationshipLabels: string[];
    variants: FeedbackCampaignQuestionGroup[];
    questions: FeedbackCampaignQuestionGroup["questions"];
    competencies: ReturnType<typeof buildQuestionCompetencies>;
    targetCount: number;
    assignmentCount: number;
    validQuestionCount: number;
    invalidQuestionCount: number;
    questionCount: number;
    ready: boolean;
};

type InvalidQuestionSummary = {
    questionCode: string;
    questionText: string;
    sourceRules: string[];
    competencies: string[];
    variantLabels: string[];
};

const normalizeResponse = (value: unknown) =>
    String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, "_");

const isRatingWithRequiredComment = (question: any) =>
    normalizeResponse(question.responseType) === "RATING_WITH_COMMENT" &&
    normalizeResponse(question.scoringBehavior) === "SCORED" &&
    question.required === true;

const variantLabel = (group: any) =>
    group?.formVariantLabel ||
    [
        group?.relationshipLabel,
        group?.targetDepartmentName,
        group?.targetPositionName,
        group?.targetLevelCode,
    ]
        .filter(Boolean)
        .join(" · ") ||
    "Form variant";

const unique = (values: Array<string | null | undefined>) =>
    Array.from(
        new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
    );

const hashSignature = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return `QS-${Math.abs(hash).toString(36)}-${value.length.toString(36)}`;
};

const questionSignature = (group: FeedbackCampaignQuestionGroup) =>
    sortQuestionItems(group.questions ?? [])
        .map((question) =>
            [
                question.questionCode,
                question.questionVersionId ?? "active",
                question.competencyCode || question.sectionCode || "UNMAPPED",
                question.sectionOrder ?? "",
                question.displayOrder ?? "",
                normalizeResponse(question.responseType),
                normalizeResponse(question.scoringBehavior),
                question.required ? "required" : "optional",
                question.included ? "included" : "excluded",
            ].join("~"),
        )
        .join("|");

const buildQuestionSets = (
    groups: FeedbackCampaignQuestionGroup[],
): QuestionSet[] => {
    const bySignature = new Map<string, FeedbackCampaignQuestionGroup[]>();
    groups.forEach((group) => {
        const signature = questionSignature(group) || `EMPTY-${group.groupKey}`;
        bySignature.set(signature, [...(bySignature.get(signature) ?? []), group]);
    });

    return Array.from(bySignature.entries())
        .map(([signature, variants], index) => {
            const first = variants[0];
            const questions = sortQuestionItems(first?.questions ?? []);
            const competencies = buildQuestionCompetencies(questions);
            const relationshipLabels = unique(
                variants.map((variant) => variant.relationshipLabel),
            );
            const validQuestionCount = questions.filter(
                isRatingWithRequiredComment,
            ).length;
            const invalidQuestionCount = questions.filter(
                (question) => !isRatingWithRequiredComment(question),
            ).length;
            const title =
                relationshipLabels.length === 1
                    ? `${relationshipLabels[0]} Question Set`
                    : `Shared Question Set ${index + 1}`;
            return {
                setKey: hashSignature(signature),
                title,
                relationshipLabels,
                variants,
                questions,
                competencies,
                targetCount: variants.reduce(
                    (sum, variant) => sum + Number(variant.targetCount ?? 0),
                    0,
                ),
                assignmentCount: variants.reduce(
                    (sum, variant) => sum + Number(variant.assignmentCount ?? 0),
                    0,
                ),
                validQuestionCount,
                invalidQuestionCount,
                questionCount: questions.length,
                ready: validQuestionCount > 0 && invalidQuestionCount === 0,
            };
        })
        .sort(
            (left, right) =>
                Number(!left.ready) - Number(!right.ready) ||
                right.assignmentCount - left.assignmentCount ||
                right.variants.length - left.variants.length ||
                left.title.localeCompare(right.title),
        );
};

const buildInvalidQuestionSummaries = (
    groups: FeedbackCampaignQuestionGroup[],
): InvalidQuestionSummary[] => {
    const byQuestion = new Map<string, InvalidQuestionSummary>();
    groups.forEach((group) => {
        (group.questions ?? [])
            .filter((question) => !isRatingWithRequiredComment(question))
            .forEach((question) => {
                const questionCode = String(question.questionCode || "UNKNOWN");
                const existing = byQuestion.get(questionCode) ?? {
                    questionCode,
                    questionText: String(question.questionText ?? ""),
                    sourceRules: [],
                    competencies: [],
                    variantLabels: [],
                };
                existing.sourceRules = unique([
                    ...existing.sourceRules,
                    question.sourceRuleName ||
                    (question.sourceRuleId
                        ? `Rule #${question.sourceRuleId}`
                        : "Active Form Setup"),
                ]);
                existing.competencies = unique([
                    ...existing.competencies,
                    question.competencyName ||
                    question.sectionTitle ||
                    question.competencyCode ||
                    "Unmapped competency",
                ]);
                existing.variantLabels = unique([
                    ...existing.variantLabels,
                    variantLabel(group),
                ]);
                byQuestion.set(questionCode, existing);
            });
    });
    return Array.from(byQuestion.values()).sort((left, right) =>
        left.questionCode.localeCompare(right.questionCode),
    );
};

export function QuestionReviewStep({
                                       savedAssignmentCount,
                                       selectedCampaign,
                                       competencyWeightsReady,
                                       formatPercent,
                                       competencyWeightTotal,
                                       competencyWeights,
                                       competencyWeightDelta,
                                       questionSaveDisabled,
                                       saveQuestionReview,
                                       savingQuestionReview,
                                       loadingQuestionReview,
                                       equalizeCompetencyWeights,
                                       updateCompetencyWeight,
                                       resolvingQuestionReview,
                                       resolveQuestionReview,
                                       questionReview,
                                       questionGroups,
                                       selectedQuestionGroupKey,
                                       setSelectedQuestionGroupKey,
                                   }: QuestionReviewStepProps) {
    const [selectedQuestionSetKey, setSelectedQuestionSetKey] = useState("");
    const hasSnapshot = questionGroups.length > 0;
    const snapshotStale = hasSnapshot && !questionReview.saved;

    const questionSets = useMemo(
        () => buildQuestionSets(questionGroups),
        [questionGroups],
    );
    const invalidQuestionSummaries = useMemo(
        () => buildInvalidQuestionSummaries(questionGroups),
        [questionGroups],
    );
    const blockingGroups = questionGroups.filter(
        (group) => Number(group.includedScoredQuestionCount ?? 0) === 0,
    );
    const formVariantCount = questionGroups.length;
    const selectedQuestionSet =
        questionSets.find((set) => set.setKey === selectedQuestionSetKey) ??
        questionSets.find((set) =>
            set.variants.some(
                (variant) => variant.groupKey === selectedQuestionGroupKey,
            ),
        ) ??
        questionSets[0] ??
        null;
    const invalidVariantCount = unique(
        invalidQuestionSummaries.flatMap((item) => item.variantLabels),
    ).length;

    useEffect(() => {
        if (questionSets.length === 0) {
            setSelectedQuestionSetKey("");
            return;
        }
        const selectedStillExists = questionSets.some(
            (set) => set.setKey === selectedQuestionSetKey,
        );
        if (!selectedStillExists) {
            const matchFromVariant = questionSets.find((set) =>
                set.variants.some(
                    (variant) => variant.groupKey === selectedQuestionGroupKey,
                ),
            );
            setSelectedQuestionSetKey(
                matchFromVariant?.setKey ?? questionSets[0].setKey,
            );
        }
    }, [questionSets, selectedQuestionGroupKey, selectedQuestionSetKey]);

    const selectQuestionSet = (questionSet: QuestionSet) => {
        setSelectedQuestionSetKey(questionSet.setKey);
        setSelectedQuestionGroupKey(questionSet.variants[0]?.groupKey ?? "");
    };

    return (
        <section
            className={`hfdq-table-card hfdqs-card ${savedAssignmentCount === 0 ? "disabled" : ""}`}
        >
            <div className="hfdqs-head">
                <div>
                    <span className="hfdq-kicker">Step 4</span>
                    <h3>Campaign Question Preview</h3>
                    <p>
                        Review unique question sets and scoring readiness before freezing
                        the campaign forms. Questions are controlled by Question Bank and
                        Form Setup.
                    </p>
                </div>
                <div className="hfdqs-head-actions">
                    <button
                        className="hfd-btn hfd-btn-secondary"
                        type="button"
                        disabled={
                            !selectedCampaign ||
                            selectedCampaign.status !== "DRAFT" ||
                            savedAssignmentCount === 0 ||
                            resolvingQuestionReview
                        }
                        onClick={() => void resolveQuestionReview()}
                    >
                        <i className="bi bi-arrow-clockwise" />{" "}
                        {resolvingQuestionReview ? "Refreshing..." : "Refresh Preview"}
                    </button>
                    <button
                        className="hfd-btn hfd-btn-primary"
                        type="button"
                        disabled={
                            questionSaveDisabled ||
                            blockingGroups.length > 0 ||
                            invalidQuestionSummaries.length > 0
                        }
                        onClick={() => void saveQuestionReview()}
                    >
                        <i className="bi bi-save2" />{" "}
                        {savingQuestionReview ? "Saving..." : "Save Campaign Questions"}
                    </button>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty">
                    <i className="bi bi-save" />
                    <strong>Save campaign details first</strong>
                    <p>
                        Campaign question preview becomes available after the campaign setup is
                        ready.
                    </p>
                </div>
            ) : savedAssignmentCount === 0 ? (
                <div className="hfd-empty-state hfdt-empty">
                    <i className="bi bi-diagram-3" />
                    <strong>Save evaluator assignments first</strong>
                    <p>
                        Question forms are generated from the saved evaluator relationships.
                    </p>
                </div>
            ) : loadingQuestionReview ? (
                <div className="hfd-spinner">
                    <i className="bi bi-arrow-repeat" /> Loading campaign question preview...
                </div>
            ) : (
                <div className="hfdqs-body">
                    <div className="hfdqs-summary-grid hfdqs-summary-grid-wide">
                        <div>
                            <strong>{questionSets.length}</strong>
                            <span>question sets</span>
                        </div>
                        <div>
                            <strong>{formVariantCount}</strong>
                            <span>form variants</span>
                        </div>
                        <div>
                            <strong>{questionReview.targetCount ?? 0}</strong>
                            <span>recipients covered</span>
                        </div>
                        <div>
                            <strong>{questionReview.assignmentCount ?? 0}</strong>
                            <span>assignments covered</span>
                        </div>
                        <div
                            className={
                                invalidQuestionSummaries.length > 0 ? "danger" : "ready"
                            }
                        >
                            <strong>{invalidQuestionSummaries.length}</strong>
                            <span>invalid questions</span>
                        </div>
                    </div>

                    {(snapshotStale ||
                        (questionReview.warnings ?? []).length > 0 ||
                        blockingGroups.length > 0 ||
                        invalidQuestionSummaries.length > 0) && (
                        <div
                            className={`hfdqs-alert ${blockingGroups.length > 0 || invalidQuestionSummaries.length > 0 ? "danger" : "warning"}`}
                        >
                            <i
                                className={`bi ${blockingGroups.length > 0 || invalidQuestionSummaries.length > 0 ? "bi-exclamation-octagon" : "bi-info-circle"}`}
                            />
                            <div>
                                <strong>
                                    {blockingGroups.length > 0 ||
                                    invalidQuestionSummaries.length > 0
                                        ? "Campaign question preview needs attention before it can be saved."
                                        : snapshotStale
                                            ? "Campaign question preview needs save."
                                            : "Campaign question preview notice"}
                                </strong>
                                {snapshotStale && (
                                    <p>
                                        The evaluator assignments or Form Setup may have changed.
                                        Save these campaign questions before launch.
                                    </p>
                                )}
                                {(questionReview.warnings ?? [])
                                    .slice(0, 3)
                                    .map((warning: string) => (
                                        <p key={warning}>{warning}</p>
                                    ))}
                                {blockingGroups.length > 0 && (
                                    <p>
                                        {blockingGroups.length} form variant
                                        {blockingGroups.length === 1 ? "" : "s"} have no rating
                                        question with required comment.
                                    </p>
                                )}
                                {invalidQuestionSummaries.length > 0 && (
                                    <p>
                                        {invalidQuestionSummaries.length} invalid question
                                        {invalidQuestionSummaries.length === 1 ? "" : "s"} are used
                                        across {invalidVariantCount} form variant
                                        {invalidVariantCount === 1 ? "" : "s"}. Replace them in
                                        Question Bank or Form Setup, then refresh this preview.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {invalidQuestionSummaries.length > 0 && (
                        <section className="hfdqs-invalid-panel">
                            <div className="hfdqs-panel-title">
                                <span className="hfdq-kicker">Invalid questions</span>
                                <strong>{invalidQuestionSummaries.length}</strong>
                            </div>
                            <div className="hfdqs-invalid-list">
                                {invalidQuestionSummaries.slice(0, 6).map((item) => (
                                    <article key={item.questionCode}>
                                        <strong>{item.questionCode}</strong>
                                        <span>{item.questionText}</span>
                                        <small>
                                            {item.competencies.join(", ")} · Used in{" "}
                                            {item.variantLabels.length} variant
                                            {item.variantLabels.length === 1 ? "" : "s"} ·{" "}
                                            {item.sourceRules.join(", ")}
                                        </small>
                                    </article>
                                ))}
                                {invalidQuestionSummaries.length > 6 && (
                                    <p>
                                        {invalidQuestionSummaries.length - 6} more invalid question
                                        {invalidQuestionSummaries.length - 6 === 1 ? "" : "s"}{" "}
                                        hidden for readability.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                    {!hasSnapshot ? (
                        <div className="hfd-empty-state hfdt-empty">
                            <i className="bi bi-ui-checks-grid" />
                            <strong>No campaign question preview yet</strong>
                            <p>
                                Refresh the preview to resolve questions from Form Setup.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hfdqs-workbench hfdqs-workbench-grouped hfdqs-primary-workbench">
                                <aside className="hfdqs-variants">
                                    <div className="hfdqs-panel-title">
                                        <span className="hfdq-kicker">Question sets</span>
                                        <strong>{questionSets.length}</strong>
                                    </div>
                                    <div className="hfdqs-variant-list">
                                        {questionSets.map((questionSet) => {
                                            const active =
                                                selectedQuestionSet?.setKey === questionSet.setKey;
                                            return (
                                                <button
                                                    key={questionSet.setKey}
                                                    type="button"
                                                    className={`hfdqs-variant hfdqs-question-set ${active ? "active" : ""} ${questionSet.ready ? "ready" : "blocked"}`}
                                                    onClick={() => selectQuestionSet(questionSet)}
                                                >
                          <span>
                            {questionSet.relationshipLabels.length === 1
                                ? questionSet.relationshipLabels[0]
                                : "Shared form"}
                          </span>
                                                    <strong>{questionSet.title}</strong>
                                                    <em>
                                                        {questionSet.validQuestionCount} valid questions ·{" "}
                                                        {questionSet.variants.length} variant
                                                        {questionSet.variants.length === 1 ? "" : "s"}
                                                    </em>
                                                    <small>
                                                        {questionSet.targetCount} recipients ·{" "}
                                                        {questionSet.assignmentCount} assignments
                                                    </small>
                                                    {!questionSet.ready && (
                                                        <b>
                                                            {questionSet.invalidQuestionCount > 0
                                                                ? `${questionSet.invalidQuestionCount} invalid`
                                                                : "No valid question"}
                                                        </b>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </aside>

                                <main className="hfdqs-preview-panel">
                                    {!selectedQuestionSet ? (
                                        <div className="hfd-empty-state hfdt-mini-empty">
                                            <i className="bi bi-ui-checks" />
                                            <strong>Select a question set</strong>
                                            <p>
                                                Choose a question set to preview the evaluator form
                                                once.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="hfdqs-form-head">
                                                <div>
                          <span className="hfdq-kicker">
                            Evaluator form preview
                          </span>
                                                    <h4>{selectedQuestionSet.title}</h4>
                                                    <p>
                                                        {selectedQuestionSet.variants.length} variants ·{" "}
                                                        {selectedQuestionSet.targetCount} recipients ·{" "}
                                                        {selectedQuestionSet.assignmentCount} assignments ·{" "}
                                                        {selectedQuestionSet.validQuestionCount} valid
                                                        questions
                                                    </p>
                                                </div>
                                                <span
                                                    className={`hfdqs-status ${selectedQuestionSet.ready ? "ready" : "blocked"}`}
                                                >
                          {selectedQuestionSet.ready ? "Ready" : "Blocked"}
                        </span>
                                            </div>

                                            <div className="hfdqs-form-preview hfdqs-form-preview-compact">
                                                {selectedQuestionSet.competencies.length === 0 ? (
                                                    <div className="hfd-empty-state hfdt-mini-empty">
                                                        <i className="bi bi-slash-circle" />
                                                        <strong>No questions matched</strong>
                                                        <p>
                                                            Update active Form Setup for this recipient and
                                                            relationship scope.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    selectedQuestionSet.competencies.map(
                                                        (competency: any, competencyIndex: number) => (
                                                            <article
                                                                key={competency.sectionCode}
                                                                className="hfdqs-competency"
                                                            >
                                                                <header>
                                  <span>
                                    {String(competencyIndex + 1).padStart(
                                        2,
                                        "0",
                                    )}
                                  </span>
                                                                    <div>
                                                                        <strong>{competency.sectionTitle}</strong>
                                                                        <small>
                                                                            {(competency.questions ?? []).length}{" "}
                                                                            question
                                                                            {(competency.questions ?? []).length === 1
                                                                                ? ""
                                                                                : "s"}
                                                                        </small>
                                                                    </div>
                                                                </header>
                                                                <div className="hfdqs-question-list">
                                                                    {(competency.questions ?? []).map(
                                                                        (question: any, questionIndex: number) => {
                                                                            const valid =
                                                                                isRatingWithRequiredComment(question);
                                                                            return (
                                                                                <article
                                                                                    key={`${question.questionCode}-${questionIndex}`}
                                                                                    className={`hfdqs-question ${valid ? "" : "invalid"}`}
                                                                                >
                                                                                    <div className="hfdqs-question-copy">
                                                                                        <small>
                                                                                            {question.questionCode} ·{" "}
                                                                                            {valid
                                                                                                ? "Rating 1–5 + required comment"
                                                                                                : "Invalid for 360 campaign"}
                                                                                        </small>
                                                                                        <strong>
                                                                                            {question.questionText}
                                                                                        </strong>
                                                                                    </div>
                                                                                    <div className="hfdqs-question-response-row">
                                                                                        <div
                                                                                            className="hfdqs-rating-preview"
                                                                                            aria-hidden="true"
                                                                                        >
                                                                                            {[1, 2, 3, 4, 5].map((value) => (
                                                                                                <span key={value}>{value}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="hfdqs-comment-preview">
                                                                                            Comment required
                                                                                        </div>
                                                                                    </div>
                                                                                </article>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            </article>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </>
                                    )}
                                </main>
                            </div>

                            <section className="hfdqs-competency-weight-panel">
                                <div className="hfdqs-weight-header">
                                    <div>
                                        <span className="hfdq-kicker">Competency weights</span>
                                        <h4>Scoring importance</h4>
                                        <p>
                                            Questions come from Form Setup. This section only controls
                                            how much each competency contributes to the final score.
                                        </p>
                                    </div>
                                    <div className="hfdqs-weight-total">
                                        <span>Total</span>
                                        <strong
                                            className={
                                                competencyWeightsReady ? "ready-text" : "warn-text"
                                            }
                                        >
                                            {formatPercent(competencyWeightTotal)}%
                                        </strong>
                                    </div>
                                </div>

                                <div className="hfdqs-weight-mode-row">
                                    <button
                                        className="hfd-btn hfd-btn-secondary"
                                        type="button"
                                        disabled={selectedCampaign.status !== "DRAFT"}
                                        onClick={equalizeCompetencyWeights}
                                    >
                                        Equal weight
                                    </button>
                                    <span className="hfdqs-weight-mode-note">
                    Edit any percentage to use custom competency weights. Weight
                    by question count is not used.
                  </span>
                                </div>

                                {!competencyWeightsReady && (
                                    <p className="hfdqs-weight-warning">
                                        {formatPercent(Math.abs(competencyWeightDelta))}%{" "}
                                        {competencyWeightDelta > 0 ? "remaining" : "over"}. Total
                                        must equal 100% before saving.
                                    </p>
                                )}

                                <div
                                    className="hfdqs-weight-table"
                                    role="table"
                                    aria-label="Competency weights"
                                >
                                    <div className="hfdqs-weight-table-head" role="row">
                                        <span>Competency</span>
                                        <span>Questions</span>
                                        <span>Used in</span>
                                        <span>Weight</span>
                                    </div>
                                    {competencyWeights.map((weight: any) => {
                                        const questionCountLabel = weight.questionCountVariesByForm
                                            ? "Varies"
                                            : `${Number(weight.questionCountPerForm ?? 0)}`;
                                        return (
                                            <label
                                                key={weight.competencyCode}
                                                className="hfdqs-weight-table-row"
                                                role="row"
                                            >
                        <span className="hfdqs-weight-name">
                          <strong>{weight.competencyName}</strong>
                          <small>{weight.competencyCode}</small>
                        </span>
                                                <span>{questionCountLabel}</span>
                                                <span>
                          {Number(weight.formCount ?? 0)} variant
                                                    {Number(weight.formCount ?? 0) === 1 ? "" : "s"}
                        </span>
                                                <span className="hfdqs-weight-input-wrap">
                          <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              disabled={selectedCampaign.status !== "DRAFT"}
                              value={Number(weight.weightPercent ?? 0)}
                              onChange={(event) =>
                                  updateCompetencyWeight(
                                      weight.competencyCode,
                                      Number(event.target.value),
                                  )
                              }
                          />
                          <em>%</em>
                        </span>
                                                {(weight.warnings ?? []).length > 0 && (
                                                    <small className="hfdqs-weight-row-warning">
                                                        {weight.warnings[0]}
                                                    </small>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
