import { useEffect, useMemo, useState } from 'react';
import type { FeedbackCompetencyItem, FeedbackCompetencyPayload } from '../../../../../api/hrFeedbackApi';

type Props = {
    open: boolean;
    competencies: FeedbackCompetencyItem[];
    busy: boolean;
    onClose: () => void;
    onCreate: (payload: FeedbackCompetencyPayload) => Promise<void>;
    onUpdate: (competencyId: number, payload: FeedbackCompetencyPayload) => Promise<void>;
};

type DraftRow = {
    id: number;
    rowKey: string;
    name: string;
    questionCount?: number;
};

type EditingState = Record<string, boolean>;

const emptyNewCompetency = () => ({ name: '' });

const buildRowKey = (competency: FeedbackCompetencyItem, index: number) =>
    `competency-manager-${competency.id && competency.id > 0 ? `id-${competency.id}` : `index-${index}`}-${competency.code || competency.name || 'unknown'}`;

export default function CompetencyManagerModal({ open, competencies, busy, onClose, onCreate, onUpdate }: Props) {
    const persistedCompetencies = useMemo(
        () => competencies.filter((competency) => competency.id > 0),
        [competencies],
    );

    const [rows, setRows] = useState<DraftRow[]>([]);
    const [editing, setEditing] = useState<EditingState>({});
    const [newCompetency, setNewCompetency] = useState(emptyNewCompetency());
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setRows(persistedCompetencies.map((competency, index) => ({
            id: competency.id,
            rowKey: buildRowKey(competency, index),
            name: competency.name,
            questionCount: competency.questionCount,
        })));
        setEditing({});
        setNewCompetency(emptyNewCompetency());
        setSearch('');
        setShowCreate(false);
    }, [persistedCompetencies, open]);

    if (!open) return null;

    const normalizedSearch = search.trim().toLowerCase();
    const visibleRows = normalizedSearch
        ? rows.filter((row) => row.name.toLowerCase().includes(normalizedSearch))
        : rows;

    const patchRow = (rowKey: string, patch: Partial<DraftRow>) => {
        setRows((current) => current.map((row) => row.rowKey === rowKey ? { ...row, ...patch } : row));
    };

    const resetRow = (rowKey: string) => {
        const original = persistedCompetencies.find((competency, index) => buildRowKey(competency, index) === rowKey);
        if (!original) return;
        patchRow(rowKey, {
            name: original.name,
            questionCount: original.questionCount,
        });
        setEditing((current) => ({ ...current, [rowKey]: false }));
    };

    const saveExisting = async (row: DraftRow) => {
        if (!row.id || !row.name.trim()) return;
        setSavingKey(row.rowKey);
        try {
            await onUpdate(row.id, { name: row.name.trim() });
            setEditing((current) => ({ ...current, [row.rowKey]: false }));
        } finally {
            setSavingKey(null);
        }
    };

    const createNew = async () => {
        if (!newCompetency.name.trim()) return;
        await onCreate({ name: newCompetency.name.trim() });
        setNewCompetency(emptyNewCompetency());
        setShowCreate(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="question-bank-competency-manager-title">
            <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close competency manager" onClick={onClose} />
            <section className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <h3 id="question-bank-competency-manager-title" className="text-xl font-bold tracking-tight text-slate-950">Manage competencies</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">Add or rename competencies used to group 360 feedback questions.</p>
                    </div>
                    <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center">
                    <label className="relative flex-1">
                        <i className="bi bi-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search competencies"
                        />
                    </label>
                    <button type="button" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setShowCreate((value) => !value)} disabled={busy}>
                        {showCreate ? 'Cancel add' : 'Add competency'}
                    </button>
                </div>

                {showCreate ? (
                    <section className="grid gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 md:grid-cols-[1fr_auto] md:items-end">
                        <label className="grid gap-2">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Competency name</span>
                            <input
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                minLength={2}
                                maxLength={120}
                                value={newCompetency.name}
                                onChange={(event) => setNewCompetency({ name: event.target.value })}
                                disabled={busy}
                                placeholder="Example: Communication Skills"
                            />
                        </label>
                        <button type="button" className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={createNew} disabled={busy || !newCompetency.name.trim()}>
                            Add
                        </button>
                    </section>
                ) : null}

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {rows.length === 0 ? (
                        <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                            <i className="bi bi-diagram-3 text-3xl text-blue-600" />
                            <strong className="mt-3 text-base font-bold text-slate-900">No competencies yet</strong>
                            <span className="mt-1 text-sm font-medium text-slate-500">Add a competency before creating questions.</span>
                        </div>
                    ) : visibleRows.length === 0 ? (
                        <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                            <i className="bi bi-search text-3xl text-blue-600" />
                            <strong className="mt-3 text-base font-bold text-slate-900">No matching competencies</strong>
                            <span className="mt-1 text-sm font-medium text-slate-500">Try another search term.</span>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {visibleRows.map((row) => {
                                const isEditing = Boolean(editing[row.rowKey]);
                                return (
                                    <article key={row.rowKey} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
                                        <div>
                                            {isEditing ? (
                                                <label className="grid gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Name</span>
                                                    <input
                                                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                                        minLength={2}
                                                        maxLength={120}
                                                        value={row.name}
                                                        onChange={(event) => patchRow(row.rowKey, { name: event.target.value })}
                                                        disabled={busy}
                                                    />
                                                </label>
                                            ) : (
                                                <>
                                                    <h4 className="text-base font-bold text-slate-950">{row.name}</h4>
                                                    <p className="mt-1 text-sm font-semibold text-slate-500">{row.questionCount ?? 0} question{(row.questionCount ?? 0) === 1 ? '' : 's'}</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 md:justify-end">
                                            {isEditing ? (
                                                <>
                                                    <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => resetRow(row.rowKey)} disabled={busy}>Cancel</button>
                                                    <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => saveExisting(row)} disabled={busy || savingKey === row.rowKey || !row.name.trim()}>
                                                        {savingKey === row.rowKey ? 'Saving...' : 'Save'}
                                                    </button>
                                                </>
                                            ) : (
                                                <button type="button" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setEditing((current) => ({ ...current, [row.rowKey]: true }))} disabled={busy}>
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
