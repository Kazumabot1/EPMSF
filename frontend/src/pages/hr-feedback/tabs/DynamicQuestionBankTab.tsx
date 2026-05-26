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
import CompetencyLibraryPanel from './question-bank/components/CompetencyLibraryPanel';
import CompetencyManagerModal from './question-bank/components/CompetencyManagerModal';
import QuestionBankStatCard from './question-bank/components/QuestionBankStatCard';
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

const PAGE_SIZE = 10;

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
    const [page, setPage] = useState(1);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode>('create');
    const [competencyManagerOpen, setCompetencyManagerOpen] = useState(false);
    const [competencyPanelCollapsed, setCompetencyPanelCollapsed] = useState(false);
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
            setError(e instanceof Error ? e.message : 'Failed to load Question Bank.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadQuestionBank();
    }, [loadQuestionBank]);

    const competencyCodes = useMemo(
        () => competencies.map((competency) => competency.code).filter(Boolean),
        [competencies],
    );

    const localIssues = useMemo(() => buildLocalQualityIssues(form, competencies), [form, competencies]);
    const displayedIssues: FeedbackQuestionQualityIssue[] = serverQuality?.issues ?? localIssues;

    const stats = useMemo(() => {
        const active = questions.filter((question) => question.status === 'ACTIVE').length;
        const draft = questions.filter((question) => question.status === 'DRAFT').length;
        const currentQuestions = questions.filter((question) => question.status !== 'ARCHIVED');
        const retired = currentQuestions.filter((question) => question.status === 'RETIRED').length;
        const review = currentQuestions.filter((question) => question.status === 'DRAFT').length + (readiness?.issues?.length ?? 0);
        return { total: currentQuestions.length, active, draft, retired, review };
    }, [questions, readiness]);

    const filteredQuestions = useMemo(() => {
        const query = normalizeText(search);
        return questions.filter((question) => {
            const matchesSearch = !query || [question.questionCode, question.questionText, question.competencyCode, getCompetencyName(question.competencyCode, competencies)]
                .some((value) => normalizeText(value).includes(query));
            const matchesCompetency = selectedCompetency === 'ALL' || question.competencyCode === selectedCompetency;
            const matchesStatus = statusFilter === 'ALL'
                ? question.status !== 'ARCHIVED'
                : question.status === statusFilter;
            return matchesSearch && matchesCompetency && matchesStatus;
        });
    }, [competencies, questions, search, selectedCompetency, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, selectedCompetency, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pagedQuestions = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selectedQuestion = questions.find((question) => question.id === form.id) ?? null;

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const openCreateEditor = () => {
        resetMessages();
        setEditorMode('create');
        setForm(emptyQuestionForm(selectedCompetency !== 'ALL' ? selectedCompetency : competencyCodes[0] ?? ''));
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
        setForm(emptyQuestionForm(competencyCodes[0] ?? ''));
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
                setError(validation.issues.find((issue) => issue.severity === 'ERROR')?.message ?? 'Question does not pass required checks.');
                return;
            }
            if (form.id) {
                await hrFeedbackApi.updateQuestionBankItem(form.id, payload);
                setSuccess(targetStatus === 'ACTIVE' ? 'Question saved and published.' : 'Question saved as draft.');
            } else {
                await hrFeedbackApi.createQuestionBankItem(payload);
                setSuccess(targetStatus === 'ACTIVE' ? 'Question created and published.' : 'Question created as draft.');
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
            setSuccess('Competency created.');
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create competency.');
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
            setSuccess(`Question moved to ${status.toLowerCase()}.`);
            await loadQuestionBank();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update question status.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="hfdqb-page hfdqb-page-simple">
            <header className="hfdqb-header">
                <div>
                    <span className="hfdqb-kicker">360 Feedback · Performance Evaluation</span>
                    <h2>Question Bank</h2>
                    <p>Create and maintain competency-mapped questions for performance 360 feedback.</p>
                </div>
                <div className="hfdqb-header-actions">
                    <button type="button" className="hfdqb-secondary-btn" onClick={() => setCompetencyManagerOpen(true)} disabled={loading || busy}>
                        <i className="bi bi-diagram-3" /> Manage Competencies
                    </button>
                    <button type="button" className="hfdqb-primary-btn" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                        <i className="bi bi-plus-lg" /> New Question
                    </button>
                </div>
            </header>

            {error ? <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div> : null}
            {success ? <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div> : null}

            <section className="hfdqb-stat-grid hfdqb-stat-grid-simple">
                <QuestionBankStatCard icon="bi bi-collection" label="Total Questions" value={stats.total} note="All question statuses" tone="indigo" />
                <QuestionBankStatCard icon="bi bi-check2-circle" label="Active" value={stats.active} note="Usable for rules" tone="emerald" />
                <QuestionBankStatCard icon="bi bi-pencil-square" label="Draft" value={stats.draft} note="Needs review" tone="violet" />
                <QuestionBankStatCard icon="bi bi-archive" label="Retired" value={stats.retired} note="Kept for history" tone="orange" />
                <QuestionBankStatCard icon="bi bi-shield-check" label="Needs Review" value={stats.review} note="Drafts or data issues" tone="cyan" />
            </section>

            <section className="hfdqb-toolbar hfdqb-toolbar-simple">
                <label className="hfdqb-search">
                    <i className="bi bi-search" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions by text, code, or competency..." />
                </label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="RETIRED">Retired</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
                <button type="button" className="hfdqb-filter-btn" onClick={() => { setSearch(''); setSelectedCompetency('ALL'); setStatusFilter('ALL'); }}>
                    <i className="bi bi-filter" /> Clear
                </button>
                <button type="button" className="hfdqb-icon-btn" onClick={loadQuestionBank} disabled={loading} title="Refresh">
                    <i className="bi bi-arrow-clockwise" />
                </button>
            </section>

            <main className={`hfdqb-management-layout ${competencyPanelCollapsed ? 'competency-collapsed' : ''}`}>
                <CompetencyLibraryPanel
                    competencies={competencies}
                    selectedCompetency={selectedCompetency}
                    collapsed={competencyPanelCollapsed}
                    onToggleCollapsed={() => setCompetencyPanelCollapsed((value) => !value)}
                    onSelectCompetency={setSelectedCompetency}
                    onManageCompetencies={() => setCompetencyManagerOpen(true)}
                />

                <section className="hfdqb-catalog-panel hfdqb-question-library-panel">
                    <div className="hfdqb-panel-head hfdqb-question-library-head">
                        <div>
                            <p>Question Library</p>
                            <h3>{filteredQuestions.length} question{filteredQuestions.length === 1 ? '' : 's'}</h3>
                            <small>
                                {selectedCompetency === 'ALL' ? 'Showing all competencies' : `Filtered by ${getCompetencyName(selectedCompetency, competencies)}`}
                            </small>
                        </div>
                        <div className="hfdqb-panel-actions">
                            <span>Sort by: Recently updated</span>
                            <button type="button" className="hfdqb-primary-btn compact" onClick={openCreateEditor} disabled={loading || busy || competencies.length === 0}>
                                <i className="bi bi-plus-lg" /> New Question
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading question bank...</div>
                    ) : (
                        <>
                            <QuestionCatalogTable
                                questions={pagedQuestions}
                                competencies={competencies}
                                selectedQuestionId={selectedQuestion?.id}
                                onSelectQuestion={openEditEditor}
                                onChangeStatus={changeQuestionStatus}
                            />
                            <footer className="hfdqb-pagination">
                                <span>Showing {filteredQuestions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length} questions</span>
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
            </main>

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
