import { useCallback, useEffect, useMemo, useState } from 'react';
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
    getStatusLabel,
    normalizeQuestionStatus,
    normalizeText,
    toQuestionForm,
    toQuestionPayload,
    type QuestionEditorFormState,
    type QuestionLifecycleStatus,
} from './question-bank/questionBankConfig';
import { buildLocalQualityIssues } from './question-bank/utils/questionQuality';

type EditorMode = 'create' | 'edit';

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
                description: null,
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
        return copy.sort((a, b) => normalizeQuestionStatus(a.status).localeCompare(normalizeQuestionStatus(b.status)) || a.questionText.localeCompare(b.questionText));
    }

    return copy.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime || b.id - a.id;
    });
};

const cardClass = 'rounded-3xl border border-slate-200 bg-white shadow-sm';
const controlClass = 'h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60';

export default function DynamicQuestionBankTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [competencies, setCompetencies] = useState<FeedbackCompetencyItem[]>([]);
    const [readiness, setReadiness] = useState<FeedbackQuestionBankReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | QuestionLifecycleStatus>('ALL');
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

    const activeQuestions = useMemo(() => questions.filter((question) => normalizeQuestionStatus(question.status) === 'ACTIVE').length, [questions]);
    const draftQuestions = useMemo(() => questions.filter((question) => normalizeQuestionStatus(question.status) === 'DRAFT').length, [questions]);
    const inactiveQuestions = useMemo(() => questions.filter((question) => normalizeQuestionStatus(question.status) === 'INACTIVE').length, [questions]);
    const currentQuestions = useMemo(() => questions.filter((question) => normalizeQuestionStatus(question.status) !== 'ARCHIVED'), [questions]);

    const filteredQuestions = useMemo(() => {
        const query = normalizeText(search);
        const filtered = questions.filter((question) => {
            const questionStatus = normalizeQuestionStatus(question.status);
            const competencyName = getCompetencyName(question.competencyCode, competencies);
            const matchesSearch = !query || [question.questionCode, question.questionText, question.competencyCode, competencyName]
                .some((value) => normalizeText(value).includes(query));
            const matchesCompetency = selectedCompetency === 'ALL' || question.competencyCode === selectedCompetency;
            const matchesStatus = statusFilter === 'ALL'
                ? questionStatus !== 'ARCHIVED'
                : questionStatus === statusFilter;
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
                setSuccess(targetStatus === 'ACTIVE' ? 'Question saved as active.' : 'Draft saved.');
            } else {
                await hrFeedbackApi.createQuestionBankItem(payload);
                setSuccess(targetStatus === 'ACTIVE' ? 'Question created as active.' : 'Question saved as draft.');
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
            await hrFeedbackApi.createFeedbackCompetency({ name: payload.name });
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
            await hrFeedbackApi.updateFeedbackCompetency(competencyId, { name: payload.name });
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
            const normalized = normalizeQuestionStatus(status);
            await hrFeedbackApi.updateQuestionBankStatus(question.id, normalized);
            const statusLabel = normalized === 'ACTIVE'
                ? 'active'
                : normalized === 'DRAFT'
                    ? 'draft'
                    : normalized === 'INACTIVE'
                        ? 'inactive'
                        : normalized.toLowerCase();
            setSuccess(`Question status changed to ${statusLabel}.`);
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
        <div className="min-h-[calc(100vh-9rem)] min-w-0 bg-slate-50 px-3 py-5 sm:px-4 lg:px-5 xl:px-6">
            <div className="grid w-full min-w-0 max-w-none gap-5 xl:gap-6">
                <header className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
                    <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Question library</p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Question Bank</h2>
                            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">Manage reusable feedback questions and the competencies they belong to.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{currentQuestions.length} questions</span>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{activeQuestions} active</span>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{draftQuestions} draft</span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{inactiveQuestions} inactive</span>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{competencies.length} competencies</span>
                                {readiness?.issues?.length ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{readiness.issues.length} review notes</span> : null}
                            </div>
                        </div>
                        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row xl:w-auto xl:flex-shrink-0 xl:justify-end">
                            <button type="button" className="w-full whitespace-nowrap rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" onClick={() => setCompetencyManagerOpen(true)} disabled={loading || busy}>
                                Manage competencies
                            </button>
                            <button type="button" className="w-full whitespace-nowrap rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                                <i className="bi bi-plus-lg mr-2" /> Add question
                            </button>
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        <i className="bi bi-exclamation-triangle mt-0.5" />
                        <span>{error}</span>
                    </div>
                ) : null}
                {success ? (
                    <div className="fixed right-5 top-5 z-[60] flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-2xl" role="status" aria-live="polite">
                        <i className="bi bi-check-circle-fill" />
                        <span>{success}</span>
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setSuccess('')} aria-label="Dismiss notification">
                            <i className="bi bi-x" />
                        </button>
                    </div>
                ) : null}

                <section className={`${cardClass} grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(190px,240px)_minmax(150px,190px)_minmax(170px,220px)_auto_auto] xl:items-center`} aria-label="Question filters">
                    <label className="relative">
                        <i className="bi bi-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={`${controlClass} w-full pl-11`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by question, code, or competency" />
                    </label>
                    <select className={`${controlClass} w-full min-w-0`} value={selectedCompetency} onChange={(event) => setSelectedCompetency(event.target.value)} aria-label="Filter by competency">
                        <option value="ALL">All competencies</option>
                        {competencies.map((competency, index) => (
                            <option key={`question-bank-competency-filter-${competency.id || index}-${competency.code}`} value={competency.code}>
                                {competency.name}
                            </option>
                        ))}
                    </select>
                    <select className={`${controlClass} w-full min-w-0`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | QuestionLifecycleStatus)} aria-label="Filter by status">
                        <option value="ALL">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                    <select className={`${controlClass} w-full min-w-0`} value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort questions">
                        <option value="UPDATED_DESC">Recently updated</option>
                        <option value="QUESTION_ASC">Question A–Z</option>
                        <option value="COMPETENCY_ASC">Competency A–Z</option>
                        <option value="STATUS_ASC">Status A–Z</option>
                    </select>
                    <button type="button" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 xl:w-auto" onClick={clearFilters}>Clear</button>
                    <button type="button" className="grid h-12 w-full place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-12" onClick={loadQuestionBank} disabled={loading} title="Refresh">
                        <i className="bi bi-arrow-clockwise" />
                    </button>
                </section>

                {selectedCompetency !== 'ALL' || statusFilter !== 'ALL' || search.trim() ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                        <span>Showing {filteredQuestions.length} question{filteredQuestions.length === 1 ? '' : 's'}</span>
                        <em className="not-italic rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{selectedCompetencyName}</em>
                        {statusFilter !== 'ALL' ? <em className="not-italic rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{getStatusLabel(statusFilter)}</em> : null}
                        {search.trim() ? <em className="not-italic rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Search: {search.trim()}</em> : null}
                    </div>
                ) : null}

                <section className="grid min-w-0 gap-4">
                    <div className={`${cardClass} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                        <div>
                            <h3 className="text-lg font-bold text-slate-950">Questions</h3>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{filteredQuestions.length} result{filteredQuestions.length === 1 ? '' : 's'} · {selectedCompetencyName}</p>
                        </div>
                        <button type="button" className="w-full whitespace-nowrap rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                            <i className="bi bi-plus-lg mr-2" /> Add question
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
                            <span><i className="bi bi-arrow-repeat mr-2 animate-spin" /> Loading question bank...</span>
                        </div>
                    ) : (
                        <>
                            <QuestionCatalogTable
                                questions={pagedQuestions}
                                competencies={competencies}
                                selectedQuestionId={selectedQuestion?.id}
                                onSelectQuestion={openEditEditor}
                                onChangeStatus={changeQuestionStatus}
                            />
                            <footer className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                <span>Showing {filteredQuestions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length}</span>
                                <div className="flex items-center gap-2">
                                    <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>‹</button>
                                    <strong className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">{currentPage}</strong>
                                    <span>of {totalPages}</span>
                                    <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>›</button>
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
        </div>
    );
}
