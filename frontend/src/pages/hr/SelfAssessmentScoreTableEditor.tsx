import { useEffect, useMemo, useState } from 'react';
import {
  selfAssessmentScoreTableService,
  type SelfAssessmentScoreBand,
  type SelfAssessmentScoreBandAudit,
} from '../../services/selfAssessmentScoreTableService';
import './self-assessment-score-table-editor.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

type EditState = {
  original: SelfAssessmentScoreBand;
  draft: SelfAssessmentScoreBand;
  reason: string;
  activeWarningAccepted: boolean;
};

const formatScore = (band: SelfAssessmentScoreBand) => {
  return `${String(band.minScore).padStart(2, '0')}-${band.maxScore}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const anyError = error as any;

  return (
    anyError?.response?.data?.message ??
    anyError?.response?.data?.error ??
    anyError?.response?.data?.data?.message ??
    anyError?.message ??
    fallback
  );
};

const bandColorClass = (sortOrder: number) => {
  if (sortOrder <= 2) return 'sat-band-green';
  if (sortOrder <= 4) return 'sat-band-yellow';
  return 'sat-band-red';
};

const applyEditedBand = (
  currentBands: SelfAssessmentScoreBand[],
  editedBand: SelfAssessmentScoreBand,
): SelfAssessmentScoreBand[] => {
  const sorted = currentBands
    .map((band) => ({ ...band }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const index = sorted.findIndex((band) => band.id === editedBand.id);

  if (index < 0) return sorted;

  sorted[index] = { ...editedBand };

  /*
   * Keep the table continuous without resetting affected rows to 00-00.
   * Rows are sorted from highest score band to lowest score band.
   *
   * Example:
   * 70-100 edited to 50-100
   * 40-69 automatically becomes 40-49
   * lower rows remain unchanged when they still fit.
   */
  for (let upperIndex = index - 1; upperIndex >= 0; upperIndex -= 1) {
    const rowBelow = sorted[upperIndex + 1];
    const current = sorted[upperIndex];
    const nextMin = rowBelow.maxScore + 1;

    sorted[upperIndex] = {
      ...current,
      minScore: nextMin,
      maxScore: Math.max(current.maxScore, nextMin),
    };
  }

  for (let lowerIndex = index + 1; lowerIndex < sorted.length; lowerIndex += 1) {
    const rowAbove = sorted[lowerIndex - 1];
    const current = sorted[lowerIndex];
    const nextMax = rowAbove.minScore - 1;

    sorted[lowerIndex] = {
      ...current,
      minScore: Math.min(current.minScore, nextMax),
      maxScore: nextMax,
    };
  }

  return sorted;
};

const validateBands = (bands: SelfAssessmentScoreBand[]) => {
  const errors: string[] = [];
  const sorted = [...bands].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sorted.length !== 5) {
    errors.push('Score table must contain exactly 5 rows.');
    return errors;
  }

  sorted.forEach((band) => {
    if (band.minScore === 0 && band.maxScore === 0) {
      errors.push(`Row ${band.sortOrder}: Score cannot be 00-00.`);
    }

    if (band.minScore < 0 || band.maxScore > 100) {
      errors.push(`Row ${band.sortOrder}: Score must be between 0 and 100.`);
    }

    if (band.minScore > band.maxScore) {
      errors.push(`Row ${band.sortOrder}: Minimum score cannot be higher than maximum score.`);
    }

    if (!band.label.trim()) {
      errors.push(`Row ${band.sortOrder}: Explanation title is required.`);
    }

    if (!band.description.trim()) {
      errors.push(`Row ${band.sortOrder}: Explanation details are required.`);
    }
  });

  if (sorted[0]?.maxScore !== 100) {
    errors.push('The highest score row must end at 100.');
  }

  if (sorted[sorted.length - 1]?.minScore !== 0) {
    errors.push('The lowest score row must start from 0.');
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const upper = sorted[index];
    const lower = sorted[index + 1];

    if (upper.minScore !== lower.maxScore + 1) {
      errors.push(`Rows ${upper.sortOrder} and ${lower.sortOrder} must connect without overlap or gap.`);
    }
  }

  return errors;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const SelfAssessmentScoreTableEditor = ({ open, onClose, onUpdated }: Props) => {
  const [bands, setBands] = useState<SelfAssessmentScoreBand[]>([]);
  const [audits, setAudits] = useState<SelfAssessmentScoreBandAudit[]>([]);
  const [activeFormExists, setActiveFormExists] = useState(false);
  const [activeFormCount, setActiveFormCount] = useState(0);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const proposedBands = useMemo(() => {
    if (!editState) return bands;
    return applyEditedBand(bands, editState.draft);
  }, [bands, editState]);

  const validationErrors = useMemo(() => validateBands(proposedBands), [proposedBands]);

  const loadTable = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await selfAssessmentScoreTableService.getTable();

      setBands(response.bands);
      setAudits(response.audits);
      setActiveFormExists(response.activeFormExists);
      setActiveFormCount(response.activeFormCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load score table.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadTable();
    }
  }, [open]);

  if (!open) return null;

  const beginEdit = (band: SelfAssessmentScoreBand) => {
    setError('');
    setMessage('');
    setEditState({
      original: band,
      draft: { ...band },
      reason: '',
      activeWarningAccepted: false,
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditState(null);
  };

  const updateDraft = (patch: Partial<SelfAssessmentScoreBand>) => {
    setEditState((current) => {
      if (!current) return current;

      return {
        ...current,
        draft: {
          ...current.draft,
          ...patch,
        },
      };
    });
  };

  const saveEdit = async () => {
    if (!editState) return;

    if (!editState.reason.trim()) {
      setError('Reason is required before saving this change.');
      return;
    }

    if (activeFormExists && !editState.activeWarningAccepted) {
      setError('Please confirm that this update will apply to active self-assessment forms.');
      return;
    }

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await selfAssessmentScoreTableService.updateTable({
        editedBandId: editState.original.id,
        reason: editState.reason.trim(),
        bands: proposedBands,
      });

      setBands(response.bands);
      setAudits(response.audits);
      setActiveFormExists(response.activeFormExists);
      setActiveFormCount(response.activeFormCount);
      setEditState(null);
      setMessage('Score table updated successfully.');
      onUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update score table.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sat-backdrop">
      <div className="sat-modal">
        <div className="sat-header">
          <div>
            <p className="sat-eyebrow">
              <i className="bi bi-sliders" />
              HR Score Table Control
            </p>
            <h2>Self-Assessment Score Explanation Table</h2>
            <p>
              Edit score ranges, explanation titles, and details. Every change requires a reason and is recorded in audit history.
            </p>
          </div>

          <button type="button" className="sat-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {error && (
          <div className="sat-alert sat-alert-error">
            <i className="bi bi-exclamation-triangle" />
            {error}
          </div>
        )}

        {message && (
          <div className="sat-alert sat-alert-success">
            <i className="bi bi-check-circle" />
            {message}
          </div>
        )}

        <div className="sat-body">
          {loading ? (
            <div className="sat-empty">
              <i className="bi bi-arrow-repeat sat-spin" />
              Loading score table...
            </div>
          ) : (
            <>
              {activeFormExists && (
                <div className="sat-warning">
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div>
                    <strong>Active form notice</strong>
                    <p>
                      There {activeFormCount === 1 ? 'is' : 'are'} currently {activeFormCount} active self-assessment form
                      {activeFormCount === 1 ? '' : 's'}. Updates to this table will apply to active and past self-assessment records.
                    </p>
                  </div>
                </div>
              )}

              <div className="sat-table-card">
                <div className="sat-section-title">
                  <h3>Current Score Table</h3>
                  <button type="button" className="sat-light-btn" onClick={() => void loadTable()}>
                    <i className="bi bi-arrow-repeat" />
                    Refresh
                  </button>
                </div>

                <div className="sat-table-scroll">
                  <table className="sat-table">
                    <thead>
                      <tr>
                        <th>Score</th>
                        <th>Explanation Title</th>
                        <th>Explanation Details</th>
                        <th className="right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bands.map((band) => (
                        <tr key={band.id} className={bandColorClass(band.sortOrder)}>
                          <td>
                            <strong>{formatScore(band)}</strong>
                          </td>
                          <td>
                            <strong>{band.label}</strong>
                          </td>
                          <td>{band.description}</td>
                          <td className="right">
                            <button type="button" className="sat-primary-btn" onClick={() => beginEdit(band)}>
                              Edit Row
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sat-table-card">
                <div className="sat-section-title">
                  <h3>Audit History</h3>
                  <span>{audits.length} latest record(s)</span>
                </div>

                {audits.length === 0 ? (
                  <div className="sat-empty">
                    <i className="bi bi-clock-history" />
                    No score table audit history yet.
                  </div>
                ) : (
                  <div className="sat-table-scroll">
                    <table className="sat-table sat-audit-table">
                      <thead>
                        <tr>
                          <th>Changed By</th>
                          <th>Part</th>
                          <th>Old Value</th>
                          <th>New Value</th>
                          <th>Reason</th>
                          <th>When</th>
                        </tr>
                      </thead>

                      <tbody>
                        {audits.map((audit) => (
                          <tr key={audit.id}>
                            <td>
                              <strong>{audit.changedByName}</strong>
                              <small>{audit.changedByRole || '-'}</small>
                            </td>
                            <td>{audit.changedPart}</td>
                            <td>{audit.oldValue || '-'}</td>
                            <td>{audit.newValue || '-'}</td>
                            <td>{audit.reason || '-'}</td>
                            <td>{formatDateTime(audit.changedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editState && (
        <div className="sat-nested-backdrop">
          <div className="sat-edit-modal">
            <div className="sat-edit-header">
              <div>
                <h3>Edit Score Row</h3>
                <p>
                  Editing one row automatically adjusts affected neighboring rows so the table stays continuous. If the new range leaves too little space for another row, saving is blocked until the range is corrected.
                </p>
              </div>

              <button type="button" className="sat-close-btn" onClick={closeEdit}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="sat-edit-body">
              {activeFormExists && (
                <div className="sat-warning">
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div>
                    <strong>This update will apply to active forms.</strong>
                    <p>
                      Updating this score table will immediately affect active self-assessment forms and displayed past assessment explanations.
                    </p>
                  </div>
                </div>
              )}

              <div className="sat-edit-grid">
                <label>
                  <span>Minimum Score</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editState.draft.minScore}
                    onChange={(event) => updateDraft({ minScore: Number(event.target.value) })}
                  />
                </label>

                <label>
                  <span>Maximum Score</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editState.draft.maxScore}
                    onChange={(event) => updateDraft({ maxScore: Number(event.target.value) })}
                  />
                </label>
              </div>

              <label className="sat-field">
                <span>Explanation Title</span>
                <input
                  value={editState.draft.label}
                  onChange={(event) => updateDraft({ label: event.target.value })}
                  placeholder="Outstanding"
                />
              </label>

              <label className="sat-field">
                <span>Explanation Details</span>
                <textarea
                  value={editState.draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  rows={4}
                  placeholder="Write the explanation details..."
                />
              </label>

              <label className="sat-field">
                <span>Reason for Change</span>
                <textarea
                  value={editState.reason}
                  onChange={(event) =>
                    setEditState((current) => current ? { ...current, reason: event.target.value } : current)
                  }
                  rows={3}
                  placeholder="Explain why this score row is being changed..."
                />
              </label>

              {activeFormExists && (
                <label className="sat-confirm">
                  <input
                    type="checkbox"
                    checked={editState.activeWarningAccepted}
                    onChange={(event) =>
                      setEditState((current) =>
                        current ? { ...current, activeWarningAccepted: event.target.checked } : current,
                      )
                    }
                  />
                  <span>
                    I understand this change will apply to active self-assessment forms and displayed assessment records.
                  </span>
                </label>
              )}

              <div className="sat-preview">
                <h4>Preview</h4>

                <table className="sat-table">
                  <tbody>
                    {proposedBands.map((band) => (
                      <tr
                        key={band.id}
                        className={`${bandColorClass(band.sortOrder)} ${
                          band.minScore === 0 && band.maxScore === 0 ? 'sat-invalid-row' : ''
                        }`}
                      >
                        <td>
                          <strong>{formatScore(band)}</strong>
                        </td>
                        <td>{band.label || '-'}</td>
                        <td>{band.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {validationErrors.length > 0 && (
                  <div className="sat-validation-list">
                    {validationErrors.slice(0, 4).map((validationError) => (
                      <p key={validationError}>
                        <i className="bi bi-dot" />
                        {validationError}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sat-edit-footer">
              <button type="button" className="sat-light-btn" onClick={closeEdit}>
                Cancel
              </button>

              <button
                type="button"
                className="sat-primary-btn"
                disabled={saving || validationErrors.length > 0}
                onClick={() => void saveEdit()}
              >
                {saving ? 'Saving...' : 'Save Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfAssessmentScoreTableEditor;