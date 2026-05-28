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
    description: string;
    questionCount?: number;
};

type EditingState = Record<string, boolean>;

const emptyNewCompetency = () => ({
    name: '',
    description: '',
});

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
            description: competency.description ?? '',
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
        ? rows.filter((row) => `${row.name} ${row.description}`.toLowerCase().includes(normalizedSearch))
        : rows;

    const patchRow = (rowKey: string, patch: Partial<DraftRow>) => {
        setRows((current) => current.map((row) => row.rowKey === rowKey ? { ...row, ...patch } : row));
    };

    const resetRow = (rowKey: string) => {
        const original = persistedCompetencies.find((competency, index) => buildRowKey(competency, index) === rowKey);
        if (!original) return;
        patchRow(rowKey, {
            name: original.name,
            description: original.description ?? '',
            questionCount: original.questionCount,
        });
        setEditing((current) => ({ ...current, [rowKey]: false }));
    };

    const saveExisting = async (row: DraftRow) => {
        if (!row.id || !row.name.trim()) return;
        setSavingKey(row.rowKey);
        try {
            await onUpdate(row.id, {
                name: row.name.trim(),
                description: row.description.trim() || null,
            });
            setEditing((current) => ({ ...current, [row.rowKey]: false }));
        } finally {
            setSavingKey(null);
        }
    };

    const createNew = async () => {
        if (!newCompetency.name.trim()) return;
        await onCreate({
            name: newCompetency.name.trim(),
            description: newCompetency.description.trim() || null,
        });
        setNewCompetency(emptyNewCompetency());
        setShowCreate(false);
    };

    return (
        <div className="hfdqb-drawer-shell hfdqb-clean-modal-shell" role="dialog" aria-modal="true" aria-labelledby="hfdqb-competency-manager-title">
            <button type="button" className="hfdqb-drawer-backdrop" aria-label="Close competency manager" onClick={onClose} />
            <section className="hfdqb-clean-modal hfdqb-clean-competency-modal">
                <header className="hfdqb-clean-modal-head">
                    <div>
                        <h3 id="hfdqb-competency-manager-title">Manage competencies</h3>
                        <p>Add, rename, or describe competencies used to group 360 feedback questions.</p>
                    </div>
                    <button type="button" className="hfdqb-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="hfdqb-competency-toolbar">
                    <label className="hfdqb-clean-search">
                        <i className="bi bi-search" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search competencies" />
                    </label>
                    <button type="button" className="hfdqb-secondary-btn" onClick={() => setShowCreate((value) => !value)} disabled={busy}>
                        {showCreate ? 'Cancel add' : 'Add competency'}
                    </button>
                </div>

                {showCreate ? (
                    <section className="hfdqb-competency-create-inline">
                        <label>
                            <span>Competency name</span>
                            <input
                                className="hfd-input"
                                minLength={2}
                                maxLength={120}
                                value={newCompetency.name}
                                onChange={(event) => setNewCompetency((current) => ({ ...current, name: event.target.value }))}
                                disabled={busy}
                                placeholder="Example: Communication Skills"
                            />
                        </label>
                        <label>
                            <span>Description <em>optional</em></span>
                            <textarea
                                className="hfd-input hfd-textarea"
                                rows={2}
                                maxLength={300}
                                value={newCompetency.description}
                                onChange={(event) => setNewCompetency((current) => ({ ...current, description: event.target.value }))}
                                disabled={busy}
                                placeholder="Short description shown to HR users"
                            />
                        </label>
                        <button type="button" className="hfdqb-primary-btn compact" onClick={createNew} disabled={busy || !newCompetency.name.trim()}>
                            Add
                        </button>
                    </section>
                ) : null}

                <div className="hfdqb-competency-list-clean">
                    {rows.length === 0 ? (
                        <div className="hfdqb-empty-table hfdqb-clean-empty">
                            <i className="bi bi-diagram-3" />
                            <strong>No competencies yet</strong>
                            <span>Add a competency before creating questions.</span>
                        </div>
                    ) : visibleRows.length === 0 ? (
                        <div className="hfdqb-empty-table hfdqb-clean-empty">
                            <i className="bi bi-search" />
                            <strong>No matching competencies</strong>
                            <span>Try another search term.</span>
                        </div>
                    ) : (
                        visibleRows.map((row) => {
                            const isEditing = Boolean(editing[row.rowKey]);
                            return (
                                <article key={row.rowKey} className="hfdqb-competency-row-clean">
                                    <div className="hfdqb-competency-row-main">
                                        {isEditing ? (
                                            <>
                                                <label>
                                                    <span>Name</span>
                                                    <input
                                                        className="hfd-input"
                                                        minLength={2}
                                                        maxLength={120}
                                                        value={row.name}
                                                        onChange={(event) => patchRow(row.rowKey, { name: event.target.value })}
                                                        disabled={busy}
                                                    />
                                                </label>
                                                <label>
                                                    <span>Description <em>optional</em></span>
                                                    <textarea
                                                        className="hfd-input hfd-textarea"
                                                        rows={2}
                                                        maxLength={300}
                                                        value={row.description}
                                                        onChange={(event) => patchRow(row.rowKey, { description: event.target.value })}
                                                        disabled={busy}
                                                    />
                                                </label>
                                            </>
                                        ) : (
                                            <>
                                                <h4>{row.name}</h4>
                                                <p>{row.description || 'No description added.'}</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="hfdqb-competency-row-side">
                                        <span>{row.questionCount ?? 0} question{(row.questionCount ?? 0) === 1 ? '' : 's'}</span>
                                        {isEditing ? (
                                            <div className="hfdqb-row-actions">
                                                <button type="button" className="hfdqb-row-action" onClick={() => resetRow(row.rowKey)} disabled={busy}>Cancel</button>
                                                <button type="button" className="hfdqb-row-action primary" onClick={() => saveExisting(row)} disabled={busy || savingKey === row.rowKey || !row.name.trim()}>
                                                    {savingKey === row.rowKey ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" className="hfdqb-row-action primary" onClick={() => setEditing((current) => ({ ...current, [row.rowKey]: true }))} disabled={busy}>
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}
