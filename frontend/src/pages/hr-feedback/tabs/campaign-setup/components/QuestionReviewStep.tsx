import type { Dispatch, SetStateAction } from 'react';


type StateSetter = Dispatch<SetStateAction<any>>;

interface Props {
    savedAssignmentCount: any;
    selectedCampaign: any;
    competencyWeightsReady: any;
    formatPercent: any;
    competencyWeightTotal: any;
    competencyWeights: any;
    competencyWeightDelta: any;
    questionSaveDisabled: any;
    saveQuestionReview: any;
    savingQuestionReview: any;
    loadingQuestionReview: any;
    balanceCompetencyWeightsByQuestions: any;
    equalizeCompetencyWeights: any;
    updateCompetencyWeight: any;
    resolvingQuestionReview: any;
    resolveQuestionReview: any;
    questionReview: any;
    questionGroups: any;
    buildQuestionCompetencies: any;
    selectedQuestionGroup: any;
    setSelectedQuestionGroupKey: StateSetter;
    relationshipLabel: any;
    activeQuestionFormTitle: any;
    selectedQuestionIncludedQuestionCount: any;
    selectedQuestionTotalQuestionCount: any;
    selectedQuestionIncludedCompetencyCount: any;
    selectedQuestionTotalCompetencyCount: any;
    selectedQuestionCompetencies: any;
    isQuestionCompetencyExpanded: any;
    handleCompetencyDrop: any;
    writeQuestionDragData: any;
    toggleQuestionCompetency: any;
    isQuestionPreviewExpanded: any;
    handleQuestionDrop: any;
    toggleQuestionPreview: any;
    toggleQuestionIncluded: any;
}

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
                                       balanceCompetencyWeightsByQuestions,
                                       equalizeCompetencyWeights,
                                       updateCompetencyWeight,
                                       resolvingQuestionReview,
                                       resolveQuestionReview,
                                       questionReview,
                                       questionGroups,
                                       buildQuestionCompetencies,
                                       selectedQuestionGroup,
                                       setSelectedQuestionGroupKey,
                                       relationshipLabel,
                                       activeQuestionFormTitle,
                                       selectedQuestionIncludedQuestionCount,
                                       selectedQuestionTotalQuestionCount,
                                       selectedQuestionIncludedCompetencyCount,
                                       selectedQuestionTotalCompetencyCount,
                                       selectedQuestionCompetencies,
                                       isQuestionCompetencyExpanded,
                                       handleCompetencyDrop,
                                       writeQuestionDragData,
                                       toggleQuestionCompetency,
                                       isQuestionPreviewExpanded,
                                       handleQuestionDrop,
                                       toggleQuestionPreview,
                                       toggleQuestionIncluded,
                                   }: Props) {
    return (
        <section className={`hfdq-table-card hfdqr-card hfdqw-card ${savedAssignmentCount === 0 ? 'disabled' : ''}`}>
            <div className="hfdqw-page-head">
                <div className="hfdqw-title-block">
                    <span className="hfdq-kicker">Step 4</span>
                    <h3>{selectedCampaign?.name ?? 'Feedback Campaign'}</h3>
                    <p>Question review · evaluator forms · form readiness</p>
                </div>
                <div className={`hfdqw-weight-indicator ${competencyWeightsReady ? 'ready' : 'warning'}`}>
                    <span>Scoring weights</span>
                    <strong>{formatPercent(competencyWeightTotal)}%</strong>
                    <em>{competencyWeightsReady ? `${competencyWeights.length} competencies` : `${formatPercent(Math.abs(competencyWeightDelta))}% ${competencyWeightDelta > 0 ? 'remaining' : 'over'}`}</em>
                    <button className="hfd-btn hfd-btn-primary" type="button" disabled={questionSaveDisabled} onClick={() => void saveQuestionReview()}>
                        <i className="bi bi-save2" /> {savingQuestionReview ? 'Saving...' : 'Save Review'}
                    </button>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save campaign info first</strong><p>Questions become available after the campaign setup is ready.</p></div>
            ) : savedAssignmentCount === 0 ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-diagram-3" /><strong>Save evaluators first</strong><p>Questions become available after evaluators are saved.</p></div>
            ) : loadingQuestionReview ? (
                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading questions...</div>
            ) : (
                <div className="hfdqw-step-stack">
                    <section className="hfdqw-scoring-panel">
                        <div className="hfdqw-scoring-head">
                            <div>
                                <span className="hfdq-kicker">Scoring weights</span>
                                <h4>Competency weights</h4>
                                <p>Set how much each competency contributes to each evaluator form score.</p>
                            </div>
                            <div className={`hfdqw-total-pill ${competencyWeightsReady ? 'ready' : 'warning'}`}>
                                <span>Total</span>
                                <strong>{formatPercent(competencyWeightTotal)}%</strong>
                            </div>
                        </div>

                        <div className="hfdqw-weight-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={selectedCampaign.status !== 'DRAFT'} onClick={balanceCompetencyWeightsByQuestions}>
                                Balance by questions
                            </button>
                            <button className="hfd-btn hfd-btn-secondary" type="button" disabled={selectedCampaign.status !== 'DRAFT'} onClick={equalizeCompetencyWeights}>
                                Equal by competency
                            </button>
                            <span>{competencyWeightsReady ? 'Ready to save.' : `Adjust weights to total 100%. ${formatPercent(Math.abs(competencyWeightDelta))}% ${competencyWeightDelta > 0 ? 'remaining' : 'over'}.`}</span>
                        </div>

                        {competencyWeights.length === 0 ? (
                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-sliders" /><strong>No scoring weights yet</strong><p>Refresh questions from active rules to prepare competency weights.</p></div>
                        ) : (
                            <div className="hfdqw-weight-table">
                                <div className="hfdqw-weight-row hfdqw-weight-header">
                                    <span>Competency</span>
                                    <span>Questions</span>
                                    <span>Used in</span>
                                    <span>Weight</span>
                                </div>
                                {competencyWeights.map((weight: any) => (
                                    <div key={weight.competencyCode} className={`hfdqw-weight-row ${(weight.warnings ?? []).length > 0 ? 'warning' : ''}`}>
                                        <div>
                                            <strong>{weight.competencyName}</strong>
                                            <small>{weight.competencyCode}</small>
                                            {(weight.warnings ?? []).map((warning: any) => <em key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</em>)}
                                        </div>
                                        <span>{weight.questionCountVariesByForm ? 'Varies by form' : `${weight.questionCountPerForm ?? 0} per form`}</span>
                                        <span>{(weight.usedInForms ?? []).join(', ') || 'Not used'}</span>
                                        <label className="hfdqw-weight-input">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                disabled={selectedCampaign.status !== 'DRAFT'}
                                                value={Number(weight.weightPercent ?? 0)}
                                                onChange={(event: any) => updateCompetencyWeight(weight.competencyCode, Number(event.target.value))}
                                            />
                                            <span>%</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="hfdqw-builder-layout">
                        <aside className="hfdqw-form-panel">
                            <div className="hfdqw-panel-head">
                                <span className="hfdq-kicker">Forms</span>
                                <h4>Feedback forms</h4>
                                <p>Select the form to review.</p>
                            </div>

                            <div className="hfdqr-actions hfdqw-actions-top">
                                <button className="hfd-btn hfd-btn-secondary" type="button" disabled={resolvingQuestionReview || savingQuestionReview} onClick={() => void resolveQuestionReview()}>
                                    <i className="bi bi-arrow-repeat" /> {resolvingQuestionReview ? 'Refreshing...' : 'Refresh from Rules'}
                                </button>
                            </div>

                            {questionReview.warnings.length > 0 && (
                                <div className="hfdt-response-warnings compact">
                                    {questionReview.warnings.slice(0, 4).map((item: any) => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                                </div>
                            )}

                            <div className="hfdqr-group-list hfdqw-form-list">
                                {questionGroups.length === 0 ? (
                                    <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-ui-checks-grid" /><strong>No questions yet</strong><p>Refresh from active rules to review the form.</p></div>
                                ) : questionGroups.map((group: any) => {
                                    const groupCompetencies = buildQuestionCompetencies(group.questions);
                                    const groupReady = group.includedQuestionCount > 0 && group.warnings.length === 0;
                                    return (
                                        <button key={group.groupKey} type="button" className={`hfdqr-group-card hfdqw-form-tab ${selectedQuestionGroup?.groupKey === group.groupKey ? 'selected' : ''} ${groupReady ? 'ready' : 'warning'}`} onClick={() => setSelectedQuestionGroupKey(group.groupKey)}>
                                            <span className={`hfdt-readiness-dot ${groupReady ? 'ready' : 'warning'}`} />
                                            <span>
                              <strong>{relationshipLabel(group.relationshipType)} form</strong>
                              <small>{group.includedQuestionCount}/{group.questionCount} questions · {groupCompetencies.length} competencies</small>
                            </span>
                                            <em>{group.includedQuestionCount}</em>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <main className="hfdqw-builder-panel">
                            {!selectedQuestionGroup ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-ui-checks" /><strong>Select a form</strong><p>The question review will appear here.</p></div>
                            ) : (
                                <>
                                    <div className="hfdqw-builder-head">
                                        <div>
                                            <span className="hfdq-kicker">Question review</span>
                                            <h4>{activeQuestionFormTitle}</h4>
                                            <p>{selectedQuestionIncludedQuestionCount}/{selectedQuestionTotalQuestionCount} questions · {selectedQuestionIncludedCompetencyCount}/{selectedQuestionTotalCompetencyCount} competencies</p>
                                        </div>
                                        <div className="hfdqw-form-meta">
                                            <span>Rating scale: 1–5</span>
                                            <span>Comments included</span>
                                        </div>
                                    </div>

                                    {selectedQuestionGroup.warnings.length > 0 && (
                                        <div className="hfdt-selected-issues hfdqr-group-warnings">
                                            {selectedQuestionGroup.warnings.map((warning: any) => <span key={warning}><i className="bi bi-exclamation-triangle" /> {warning}</span>)}
                                        </div>
                                    )}

                                    <div className="hfdqw-accordion-list">
                                        {selectedQuestionCompetencies.length === 0 ? (
                                            <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-slash-circle" /><strong>No questions found</strong><p>Refresh from active rules after updating the question setup.</p></div>
                                        ) : selectedQuestionCompetencies.map((competency: any) => {
                                            const includedCount = competency.questions.filter((question: any) => question.included).length;
                                            const expanded = isQuestionCompetencyExpanded(selectedQuestionGroup.groupKey, competency.sectionCode);
                                            return (
                                                <article
                                                    key={competency.sectionCode}
                                                    className={`hfdqw-accordion-card ${expanded ? 'open' : ''}`}
                                                    onDragOver={(event: any) => event.preventDefault()}
                                                    onDrop={(event: any) => handleCompetencyDrop(event, selectedQuestionGroup.groupKey, competency.sectionCode)}
                                                >
                                                    <div className="hfdqw-accordion-head">
                                    <span
                                        className="hfdqw-drag-handle"
                                        draggable={selectedCampaign.status === 'DRAFT'}
                                        onDragStart={(event: any) => writeQuestionDragData(event, { kind: 'competency', groupKey: selectedQuestionGroup.groupKey, sectionCode: competency.sectionCode })}
                                        title="Drag to reorder"
                                    >
                                      <i className="bi bi-grip-vertical" />
                                    </span>
                                                        <button type="button" className="hfdqw-accordion-toggle" onClick={() => toggleQuestionCompetency(selectedQuestionGroup.groupKey, competency.sectionCode)}>
                                      <span>
                                        <strong>{competency.sectionTitle}</strong>
                                        <small>{includedCount} question{includedCount === 1 ? '' : 's'}</small>
                                      </span>
                                                            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                                        </button>

                                                    </div>

                                                    {expanded && (
                                                        <div className="hfdqw-question-stack">
                                                            {competency.questions.map((question: any, questionIndex: any) => (
                                                                <article
                                                                    key={question.questionCode}
                                                                    className={`hfdqw-question-card ${question.included ? 'included' : 'excluded'} ${isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'preview-open' : ''}`}
                                                                    onDragOver={(event: any) => event.preventDefault()}
                                                                    onDrop={(event: any) => {
                                                                        event.stopPropagation();
                                                                        handleQuestionDrop(event, selectedQuestionGroup.groupKey, competency.sectionCode, question.questionCode);
                                                                    }}
                                                                >
                                              <span
                                                  className="hfdqw-drag-handle"
                                                  draggable={selectedCampaign.status === 'DRAFT'}
                                                  onDragStart={(event: any) => writeQuestionDragData(event, { kind: 'question', groupKey: selectedQuestionGroup.groupKey, sectionCode: competency.sectionCode, questionCode: question.questionCode })}
                                                  title="Drag to reorder"
                                              >
                                                <i className="bi bi-grip-vertical" />
                                              </span>
                                                                    <div className="hfdqw-question-body">
                                                                        <div className="hfdqw-question-topline">
                                                                            <small>Question {questionIndex + 1}</small>
                                                                            <div className="hfdqw-question-actions">
                                                                                <button type="button" className="hfdqw-preview-toggle" onClick={() => toggleQuestionPreview(selectedQuestionGroup.groupKey, question.questionCode)}>
                                                                                    {isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'Hide preview' : 'Show preview'}
                                                                                    <i className={`bi ${isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                                                                </button>
                                                                                <label className="hfdqw-include-toggle">
                                                                                    <input type="checkbox" checked={question.included} disabled={selectedCampaign.status !== 'DRAFT'} onChange={() => toggleQuestionIncluded(selectedQuestionGroup.groupKey, question.questionCode)} />
                                                                                    <span>{question.included ? 'Included' : 'Excluded'}</span>
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                        <strong>{question.questionText}</strong>
                                                                        {isQuestionPreviewExpanded(selectedQuestionGroup.groupKey, question.questionCode) && (
                                                                            <div className="hfdqw-preview-controls">
                                                                                <div className="hfdqw-rating-preview" aria-hidden="true">
                                                                                    {[1, 2, 3, 4, 5].map((value: any) => <button key={value} type="button" disabled>{value}</button>)}
                                                                                </div>
                                                                                <textarea className="hfdqw-comment-preview" disabled rows={3} placeholder="Write a clear, helpful comment for this feedback response." />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </article>
                                                            ))}
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </main>
                    </div>
                </div>
            )}
        </section>
    );
}
