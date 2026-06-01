import type { FeedbackCompetencyItem } from '../../../../../api/hrFeedbackApi';

type Props = {
    competencies: FeedbackCompetencyItem[];
    selectedCompetency: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onSelectCompetency: (code: string) => void;
    onManageCompetencies?: () => void;
};

const buildCompetencyKey = (competency: FeedbackCompetencyItem, index: number) =>
    `competency-filter-${competency.id && competency.id > 0 ? `id-${competency.id}` : `code-${competency.code || index}`}`;

export default function CompetencyLibraryPanel({
                                                   competencies,
                                                   selectedCompetency,
                                                   collapsed = false,
                                                   onToggleCollapsed,
                                                   onSelectCompetency,
                                                   onManageCompetencies,
                                               }: Props) {
    const activeQuestionTotal = competencies.reduce((sum, competency) => sum + (competency.activeQuestionCount ?? 0), 0);

    return (
        <aside className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${collapsed ? 'w-20' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                {!collapsed ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Competency Filter</p>
                        <h3 className="mt-1 text-base font-bold text-slate-950">{competencies.length} competencies</h3>
                    </div>
                ) : null}
                <div className="flex gap-2">
                    {onManageCompetencies ? (
                        <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" title="Manage competencies" onClick={onManageCompetencies}>
                            <i className="bi bi-sliders" />
                        </button>
                    ) : null}
                    {onToggleCollapsed ? (
                        <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" title={collapsed ? 'Expand competency panel' : 'Collapse competency panel'} onClick={onToggleCollapsed}>
                            <i className={`bi ${collapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar-inset-reverse'}`} />
                        </button>
                    ) : null}
                </div>
            </div>

            {!collapsed ? (
                <div className="mt-4 flex gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    <i className="bi bi-info-circle mt-0.5" />
                    <span>Select a competency to filter questions. Edit competency names from Manage Competencies.</span>
                </div>
            ) : null}

            <div className="mt-4 grid gap-2">
                <button
                    type="button"
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${selectedCompetency === 'ALL' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    onClick={() => onSelectCompetency('ALL')}
                    title="All Competencies"
                >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><i className="bi bi-grid-1x2" /></span>
                    {!collapsed ? (
                        <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-bold">All Competencies</strong>
                            <small className="block truncate text-xs font-semibold text-slate-500">Full question bank</small>
                        </span>
                    ) : null}
                    {!collapsed ? <em className="not-italic text-xs font-black text-blue-700">{activeQuestionTotal}</em> : null}
                </button>

                {competencies.map((competency, index) => (
                    <button
                        type="button"
                        key={buildCompetencyKey(competency, index)}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${selectedCompetency === competency.code ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => onSelectCompetency(competency.code)}
                        title={competency.name}
                    >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><i className="bi bi-bullseye" /></span>
                        {!collapsed ? (
                            <span className="min-w-0 flex-1">
                                <strong className="block truncate text-sm font-bold">{competency.name}</strong>
                                <small className="block truncate text-xs font-semibold text-slate-500">{competency.activeQuestionCount ?? 0} active · {competency.questionCount ?? 0} total</small>
                            </span>
                        ) : null}
                        {!collapsed ? <em className="not-italic text-xs font-black text-blue-700">{competency.activeQuestionCount ?? 0}</em> : null}
                    </button>
                ))}
            </div>
        </aside>
    );
}
