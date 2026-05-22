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
    activeQuestionCount?: number;
};

const emptyNewCompetency = () => ({
    name: '',
    description: '',
});

const buildRowKey = (competency: FeedbackCompetencyItem, index: number) =>
    `competency-manager-${competency.id && competency.id > 0 ? `id-${competency.id}` : `index-${index}`}-${competency.code || competency.name || 'unknown'}`;

export default function CompetencyManagerModal({ open, competencies, busy, onClose, onCreate, onUpdate }: Props) {
    const persistedCompetencies = useMemo(
        () => competencies.filter((competency) => competency.id && competency.id > 0),
        [competencies],
    );

    const [rows, setRows] = useState<DraftRow[]>([]);
    const [newCompetency, setNewCompetency] = useState(emptyNewCompetency());
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!open) return;
        setRows(persistedCompetencies.map((competency, index) => ({
            id: competency.id,
            rowKey: buildRowKey(competency, index),
            name: competency.name,
            description: competency.description ?? '',
            questionCount: competency.questionCount,
            activeQuestionCount: competency.activeQuestionCount,
        })));
        setNewCompetency(emptyNewCompetency());
        setSearch('');
    }, [persistedCompetencies, open]);

    if (!open) return null;

    const normalizedSearch = search.trim().toLowerCase();
    const visibleRows = normalizedSearch
        ? rows.filter((row) => `${row.name} ${row.description}`.toLowerCase().includes(normalizedSearch))
        : rows;

    const patchRow = (rowKey: string, patch: Partial<DraftRow>) => {
        setRows((current) => current.map((row) => row.rowKey === rowKey ? { ...row, ...patch } : row));
    };

    const saveExisting = async (row: DraftRow) => {
        if (!row.id || !row.name.trim()) return;
        setSavingKey(row.rowKey);
        try {
            await onUpdate(row.id, {
                name: row.name.trim(),
                description: row.description.trim() || null,
            });
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
    };

    return (
        <div className="hfdqb-drawer-shell" role="dialog" aria-modal="true" aria-labelledby="hfdqb-competency-manager-title">
            <button type="button" className="hfdqb-drawer-backdrop" aria-label="Close competency manager" onClick={onClose} />
            <section className="hfdqb-drawer hfdqb-modal hfdqb-competency-modal hfdqb-competency-modal-simple">
                <header className="hfdqb-drawer-head">
                    <div>
                        <p>{persistedCompetencies.length} competencies</p>
                        <h3 id="hfdqb-competency-manager-title">Manage Competencies</h3>
                    </div>
                    <button type="button" className="hfdqb-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="hfdqb-drawer-body hfdqb-competency-manager-body">
                    <section className="hfdqb-form-section hfdqb-competency-create-card">
                        <div>
                            <h4>Add Competency</h4>
                            <p>Use competencies to group related feedback questions.</p>
                        </div>
                        <div className="hfdqb-competency-create-simple">
                            <label className="hfdqb-polished-field">
                                <input
                                    className="hfd-input hfdqb-polished-input"
                                    placeholder="Competency name"
                                    minLength={2}
                                    maxLength={120}
                                    value={newCompetency.name}
                                    onChange={(event) => setNewCompetency((current) => ({ ...current, name: event.target.value }))}
                                    disabled={busy}
                                />
                                <span className="hfdqb-field-helper">Required · 2–120 characters</span>
                            </label>
                            <label className="hfdqb-polished-field">
                <textarea
                    className="hfd-input hfd-textarea hfdqb-polished-input"
                    placeholder="Short description optional"
                    rows={2}
                    maxLength={300}
                    value={newCompetency.description}
                    onChange={(event) => setNewCompetency((current) => ({ ...current, description: event.target.value }))}
                    disabled={busy}
                />
                                <span className="hfdqb-field-helper">Optional · {newCompetency.description.length}/300 characters</span>
                            </label>
                            <button type="button" className="hfd-btn hfd-btn-primary" onClick={createNew} disabled={busy || !newCompetency.name.trim()}>Add</button>
                        </div>
                    </section>

                    <section className="hfdqb-form-section hfdqb-competency-list-card">
                        <div className="hfdqb-competency-list-card-head">
                            <div>
                                <h4>Existing Competencies</h4>
                                <span>Edit the name or description shown to HR users.</span>
                            </div>
                            <label className="hfdqb-mini-search">
                                <i className="bi bi-search" />
                                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search competencies" />
                            </label>
                        </div>

                        {rows.length === 0 ? (
                            <div className="hfdqb-empty-table">
                                <i className="bi bi-diagram-3" />
                                <strong>No competencies found</strong>
                                <span>Create a competency before adding questions.</span>
                            </div>
                        ) : visibleRows.length === 0 ? (
                            <div className="hfdqb-empty-table">
                                <i className="bi bi-search" />
                                <strong>No matching competencies</strong>
                                <span>Try another search term.</span>
                            </div>
                        ) : (
                            <div className="hfdqb-competency-admin-list simple">
                                {visibleRows.map((row) => (
                                    <div key={row.rowKey} className="hfdqb-competency-admin-row simple">
                                        <div className="hfdqb-competency-row-meta" title="Questions linked to this competency">
                                            <strong>{row.questionCount ?? 0}</strong>
                                            <span>questions</span>
                                        </div>
                                        <label className="hfdqb-polished-field">
                                            <span>Name</span>
                                            <input className="hfd-input hfdqb-polished-input" minLength={2} maxLength={120} value={row.name} onChange={(event) => patchRow(row.rowKey, { name: event.target.value })} disabled={busy} />
                                            <em className="hfdqb-field-helper">2–120 characters</em>
                                        </label>
                                        <label className="hfdqb-polished-field">
                                            <span>Description</span>
                                            <textarea className="hfd-input hfd-textarea hfdqb-polished-input" rows={2} maxLength={300} value={row.description} onChange={(event) => patchRow(row.rowKey, { description: event.target.value })} disabled={busy} />
                                            <em className="hfdqb-field-helper">Optional · {row.description.length}/300 characters</em>
                                        </label>
                                        <button type="button" className="hfd-btn hfd-btn-secondary" onClick={() => saveExisting(row)} disabled={busy || savingKey === row.rowKey || !row.name.trim()}>
                                            {savingKey === row.rowKey ? 'Saving...' : 'Save'}
                                        </button>
                                        <small>{row.questionCount ?? 0} total questions</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </div>
    );
}
