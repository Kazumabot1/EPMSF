import { useCallback, useEffect, useMemo, useState } from 'react';
import '../hr-feedback-dashboard.css';
import {
    hrFeedbackApi,
    type FeedbackCompetencyItem,
    type FeedbackCompetencyPayload,
    type FeedbackQuestionBankReadiness,
    type FeedbackQuestionQualityIssue,
    type FeedbackQuestionQualityValidation,
    type QuestionBankItem,
} from '../../../api/hrFeedbackApi';
import CompetencyManagerModal from './question-bank/components/CompetencyManagerModal';
import QuestionCatalogTable from './question-bank/components/QuestionCatalogTable';
import QuestionEditorDrawer from './question-bank/components/QuestionEditorDrawer';
import {
    emptyQuestionForm,
    getCompetencyName,
    normalizeText,
    toQuestionForm,
    toQuestionPayload,
    type QuestionEditorFormState,
} from './question-bank/questionBankConfig';
import { buildLocalQualityIssues } from './question-bank/utils/questionQuality';

type EditorMode = 'create' | 'edit';

type QuestionLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'ARCHIVED';

const PAGE_SIZE = 12;

const normalizeCompetencies = (loaded: FeedbackCompetencyItem[]): FeedbackCompetencyItem[] => {
    const byCode = new Map<string, FeedbackCompetencyItem>();

    loaded.forEach((competency, index) => {
        const code = competency.code || `COMPETENCY_${index + 1}`;
        const existing = byCode.get(code);
        if (!existing || (competency.id > 0 && existing.id <= 0)) {
            byCode.set(code, {
                ...competency,
                code,
                displayOrder: competency.displayOrder ?? (index + 1) * 10,
                questionCount: competency.questionCount ?? 0,
                activeQuestionCount: competency.activeQuestionCount ?? 0,
            });
        }
    });

    return [...byCode.values()].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.name.localeCompare(b.name));
};

const sortQuestions = (questions: QuestionBankItem[], sortBy: string, competencies: FeedbackCompetencyItem[]) => {
    const copy = [...questions];

    if (sortBy === 'QUESTION_ASC') {
        return copy.sort((a, b) => a.questionText.localeCompare(b.questionText));
    }

    if (sortBy === 'COMPETENCY_ASC') {
        return copy.sort((a, b) => {
            const competencyCompare = getCompetencyName(a.competencyCode, competencies).localeCompare(getCompetencyName(b.competencyCode, competencies));
            return competencyCompare || a.questionText.localeCompare(b.questionText);
        });
    }

    if (sortBy === 'STATUS_ASC') {
        return copy.sort((a, b) => String(a.status).localeCompare(String(b.status)) || a.questionText.localeCompare(b.questionText));
    }

    return copy.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime || b.id - a.id;
    });
};

export default function DynamicQuestionBankTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [competencies, setCompetencies] = useState<FeedbackCompetencyItem[]>([]);
    const [readiness, setReadiness] = useState<FeedbackQuestionBankReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedCompetency, setSelectedCompetency] = useState('ALL');
    const [sortBy, setSortBy] = useState('UPDATED_DESC');
    const [page, setPage] = useState(1);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode>('create');
    const [competencyManagerOpen, setCompetencyManagerOpen] = useState(false);
    const [form, setForm] = useState<QuestionEditorFormState>(emptyQuestionForm());
    const [serverQuality, setServerQuality] = useState<FeedbackQuestionQualityValidation | null>(null);

    const loadQuestionBank = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [loadedQuestions, loadedCompetencies, loadedReadiness] = await Promise.all([
                hrFeedbackApi.getQuestionBank(),
                hrFeedbackApi.getFeedbackCompetencies().catch(() => []),
                hrFeedbackApi.getQuestionBankReadiness().catch(() => null),
            ]);
            setQuestions(loadedQuestions);
            setCompetencies(normalizeCompetencies(loadedCompetencies));
            setReadiness(loadedReadiness);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Question Bank could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadQuestionBank();
    }, [loadQuestionBank]);

    useEffect(() => {
        if (!success) return;
        const timer = window.setTimeout(() => setSuccess(''), 3200);
        return () => window.clearTimeout(timer);
    }, [success]);

    const localIssues = useMemo(() => buildLocalQualityIssues(form, competencies), [form, competencies]);
    const displayedIssues: FeedbackQuestionQualityIssue[] = serverQuality?.issues ?? localIssues;

    const activeQuestions = useMemo(() => questions.filter((question) => question.status === 'ACTIVE').length, [questions]);
    const draftQuestions = useMemo(() => questions.filter((question) => question.status === 'DRAFT').length, [questions]);
    const currentQuestions = useMemo(() => questions.filter((question) => question.status !== 'ARCHIVED'), [questions]);

    const filteredQuestions = useMemo(() => {
        const query = normalizeText(search);
        const filtered = questions.filter((question) => {
            const competencyName = getCompetencyName(question.competencyCode, competencies);
            const matchesSearch = !query || [question.questionCode, question.questionText, question.competencyCode, competencyName]
                .some((value) => normalizeText(value).includes(query));
            const matchesCompetency = selectedCompetency === 'ALL' || question.competencyCode === selectedCompetency;
            const matchesStatus = statusFilter === 'ALL'
                ? question.status !== 'ARCHIVED'
                : question.status === statusFilter;
            return matchesSearch && matchesCompetency && matchesStatus;
        });

        return sortQuestions(filtered, sortBy, competencies);
    }, [competencies, questions, search, selectedCompetency, sortBy, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, selectedCompetency, sortBy, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pagedQuestions = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selectedQuestion = questions.find((question) => question.id === form.id) ?? null;

    const selectedCompetencyName = selectedCompetency === 'ALL' ? 'All competencies' : getCompetencyName(selectedCompetency, competencies);

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const openCreateEditor = () => {
        resetMessages();
        setEditorMode('create');
        setForm(emptyQuestionForm());
        setServerQuality(null);
        setEditorOpen(true);
    };

    const openEditEditor = (question: QuestionBankItem) => {
        resetMessages();
        setEditorMode('edit');
        setForm(toQuestionForm(question));
        setServerQuality(null);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        if (busy) return;
        setEditorOpen(false);
        setForm(emptyQuestionForm());
        setServerQuality(null);
    };

    const patchForm = (patch: Partial<QuestionEditorFormState>) => {
        setForm((current) => ({ ...current, ...patch }));
        setServerQuality(null);
    };

    const saveQuestion = async (targetStatus: 'DRAFT' | 'ACTIVE') => {
        resetMessages();
        const payload = toQuestionPayload({ ...form, status: targetStatus });
        setBusy(true);
        try {
            const validation = await hrFeedbackApi.validateQuestionBankItem(payload, form.id ?? undefined);
            setServerQuality(validation);
            if (!validation.canSave || (targetStatus === 'ACTIVE' && !validation.canActivate)) {
                setError(validation.issues.find((issue) => issue.severity === 'ERROR')?.message ?? 'Question needs attention before saving.');
                return;
            }
            if (form.id) {
                await hrFeedbackApi.updateQuestionBankItem(form.id, payload);
                setSuccess(targetStatus === 'ACTIVE' ? 'Question published.' : 'Draft saved.');
            } else {
                await hrFeedbackApi.createQuestionBankItem(payload);
                setSuccess(targetStatus === 'ACTIVE' ? 'Question created and published.' : 'Question saved as draft.');
            }
            closeEditor();
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save question.');
        } finally {
            setBusy(false);
        }
    };

    const createCompetency = async (payload: FeedbackCompetencyPayload) => {
        resetMessages();
        setBusy(true);
        try {
            await hrFeedbackApi.createFeedbackCompetency(payload);
            setSuccess('Competency added.');
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add competency.');
        } finally {
            setBusy(false);
        }
    };

    const updateCompetency = async (competencyId: number, payload: FeedbackCompetencyPayload) => {
        resetMessages();
        setBusy(true);
        try {
            await hrFeedbackApi.updateFeedbackCompetency(competencyId, payload);
            setSuccess('Competency updated.');
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update competency.');
        } finally {
            setBusy(false);
        }
    };

    const changeQuestionStatus = async (question: QuestionBankItem, status: QuestionLifecycleStatus) => {
        resetMessages();
        setBusy(true);
        try {
            await hrFeedbackApi.updateQuestionBankStatus(question.id, status);
            const statusLabel = status === 'ACTIVE' ? 'published' : status === 'DRAFT' ? 'saved as draft' : status.toLowerCase();
            setSuccess(`Question ${statusLabel}.`);
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update question status.');
        } finally {
            setBusy(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedCompetency('ALL');
        setStatusFilter('ALL');
        setSortBy('UPDATED_DESC');
    };

    return (
        <div className="hfdqb-page hfdqb-clean-page">
            <header className="hfdqb-clean-header">
                <div>
                    <h2>Question Bank</h2>
                    <p>Manage reusable feedback questions and the competencies they belong to.</p>
                    <div className="hfdqb-clean-meta">
                        <span>{currentQuestions.length} questions</span>
                        <span>{activeQuestions} active</span>
                        <span>{draftQuestions} draft</span>
                        <span>{competencies.length} competencies</span>
                        {readiness?.issues?.length ? <span>{readiness.issues.length} review notes</span> : null}
                    </div>
                </div>
                <div className="hfdqb-clean-actions">
                    <button type="button" className="hfdqb-secondary-btn" onClick={() => setCompetencyManagerOpen(true)} disabled={loading || busy}>
                        Manage competencies
                    </button>
                    <button type="button" className="hfdqb-primary-btn" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                        <i className="bi bi-plus-lg" /> Add question
                    </button>
                </div>
            </header>

            {error ? <div className="hfd-alert hfd-alert-error hfdqb-clean-alert"><i className="bi bi-exclamation-triangle" />{error}</div> : null}
            {success ? (
                <div className="hfdqb-toast-stack" role="status" aria-live="polite">
                    <div className="hfdqb-toast success">
                        <i className="bi bi-check-circle-fill" />
                        <span>{success}</span>
                        <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss notification">
                            <i className="bi bi-x" />
                        </button>
                    </div>
                </div>
            ) : null}

            <section className="hfdqb-clean-toolbar" aria-label="Question filters">
                <label className="hfdqb-clean-search">
                    <i className="bi bi-search" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by question, code, or competency" />
                </label>
                <select value={selectedCompetency} onChange={(event) => setSelectedCompetency(event.target.value)} aria-label="Filter by competency">
                    <option value="ALL">All competencies</option>
                    {competencies.map((competency, index) => (
                        <option key={`question-bank-competency-filter-${competency.id || index}-${competency.code}`} value={competency.code}>
                            {competency.name}
                        </option>
                    ))}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="RETIRED">Retired</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort questions">
                    <option value="UPDATED_DESC">Recently updated</option>
                    <option value="QUESTION_ASC">Question A–Z</option>
                    <option value="COMPETENCY_ASC">Competency A–Z</option>
                    <option value="STATUS_ASC">Status A–Z</option>
                </select>
                <button type="button" className="hfdqb-text-btn" onClick={clearFilters}>Clear</button>
                <button type="button" className="hfdqb-icon-btn hfdqb-refresh-btn" onClick={loadQuestionBank} disabled={loading} title="Refresh">
                    <i className="bi bi-arrow-clockwise" />
                </button>
            </section>

            {selectedCompetency !== 'ALL' || statusFilter !== 'ALL' || search.trim() ? (
                <div className="hfdqb-filter-summary">
                    <span>Showing {filteredQuestions.length} question{filteredQuestions.length === 1 ? '' : 's'}</span>
                    <em>{selectedCompetencyName}</em>
                    {statusFilter !== 'ALL' ? <em>{statusFilter.toLowerCase()}</em> : null}
                    {search.trim() ? <em>Search: {search.trim()}</em> : null}
                </div>
            ) : null}

            <section className="hfdqb-clean-list-panel">
                <div className="hfdqb-clean-list-head">
                    <div>
                        <h3>Questions</h3>
                        <p>{filteredQuestions.length} result{filteredQuestions.length === 1 ? '' : 's'} · {selectedCompetencyName}</p>
                    </div>
                    <button type="button" className="hfdqb-primary-btn compact" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                        <i className="bi bi-plus-lg" /> Add question
                    </button>
                </div>

                {loading ? (
                    <div className="hfd-spinner hfdqb-clean-loading"><i className="bi bi-arrow-repeat" /> Loading question bank...</div>
                ) : (
                    <>
                        <QuestionCatalogTable
                            questions={pagedQuestions}
                            competencies={competencies}
                            selectedQuestionId={selectedQuestion?.id}
                            onSelectQuestion={openEditEditor}
                            onChangeStatus={changeQuestionStatus}
                        />
                        <footer className="hfdqb-pagination hfdqb-clean-pagination">
                            <span>Showing {filteredQuestions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length}</span>
                            <div>
                                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>‹</button>
                                <strong>{currentPage}</strong>
                                <span>of {totalPages}</span>
                                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>›</button>
                            </div>
                        </footer>
                    </>
                )}
            </section>

            <QuestionEditorDrawer
                open={editorOpen}
                mode={editorMode}
                form={form}
                competencies={competencies}
                issues={displayedIssues}
                busy={busy}
                onChange={patchForm}
                onClose={closeEditor}
                onSaveDraft={() => saveQuestion('DRAFT')}
                onPublish={() => saveQuestion('ACTIVE')}
            />

            <CompetencyManagerModal
                open={competencyManagerOpen}
                competencies={competencies}
                busy={busy}
                onClose={() => setCompetencyManagerOpen(false)}
                onCreate={createCompetency}
                onUpdate={updateCompetency}
            />
        </div>
    );
}
