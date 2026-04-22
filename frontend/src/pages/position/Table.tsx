import { useEffect, useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import type { PositionLevelResponse, PositionResponse } from '../../types/position';
import './position-ui.css';

type EditFormState = {
  id: number;
  positionTitle: string;
  levelId: string;
  description: string;
  status: boolean;
  createdBy: string;
};

const PositionTable = () => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPositions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await positionService.getPositions();
      setPositions(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load positions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const response = await positionService.getPositionLevels();
        setLevels(response);
      } catch {
        setLevels([]);
      }
    };

    loadLevels();
  }, []);

  const openEditModal = (position: PositionResponse) => {
    setEditForm({
      id: position.id,
      positionTitle: position.positionTitle,
      levelId: String(position.levelId),
      description: position.description || '',
      status: Boolean(position.status),
      createdBy: position.createdBy || '',
    });
    setModalError('');
    setModalSuccess('');
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setEditForm(null);
    setModalError('');
    setModalSuccess('');
  };

  const validateEditForm = (): string => {
    if (!editForm) {
      return 'No position selected.';
    }
    if (editForm.positionTitle.trim().length === 0) {
      return 'Position title is required.';
    }
    if (editForm.levelId.trim().length === 0 || Number.isNaN(Number(editForm.levelId))) {
      return 'Position level is required.';
    }
    if (editForm.createdBy.trim().length === 0) {
      return 'Created by is required.';
    }
    return '';
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    const validationError = validateEditForm();
    if (validationError) {
      setModalError(validationError);
      setModalSuccess('');
      return;
    }

    try {
      setSaving(true);
      setModalError('');
      setModalSuccess('');

      await positionService.updatePosition(editForm.id, {
        positionTitle: editForm.positionTitle.trim(),
        levelId: Number(editForm.levelId),
        description: editForm.description.trim(),
        status: editForm.status,
        createdBy: editForm.createdBy.trim(),
      });

      setModalSuccess('Position updated successfully.');
      await loadPositions();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update position.';
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-table" />
          Live Overview
        </span>
        <h1>Position Table</h1>
        <p>Review role records, level mapping, and ownership details from a clean operational grid.</p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar">
            <button
              type="button"
              onClick={loadPositions}
              disabled={loading}
              className="position-btn secondary"
            >
              <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="position-state">
              <i className="bi bi-hourglass-split" />
              Loading positions...
            </div>
          ) : error ? (
            <div className="position-state">
              <i className="bi bi-exclamation-triangle" />
              <div className="position-alert error">{error}</div>
              <button type="button" onClick={loadPositions} className="position-btn primary" style={{ marginTop: '10px' }}>
                Retry
              </button>
            </div>
          ) : positions.length === 0 ? (
            <div className="position-state">
              <i className="bi bi-inbox" />
              No positions found.
            </div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Position Title</th>
                    <th>Level Code</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id}>
                      <td>{position.id}</td>
                      <td>{position.positionTitle}</td>
                      <td>{position.levelCode}</td>
                      <td>
                        <span className={`position-pill ${position.status ? 'active' : 'inactive'}`}>
                          {position.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{position.createdBy || '-'}</td>
                      <td>{position.createdAt ? new Date(position.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="position-btn ghost"
                          title="View details"
                          onClick={() => openEditModal(position)}
                        >
                          <i className="bi bi-eye" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && editForm && (
        <div className="position-modal-backdrop" role="presentation" onClick={closeEditModal}>
          <div
            className="position-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit position"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="position-modal-header">
              <h2>Edit Position</h2>
              <button type="button" className="position-btn ghost" onClick={closeEditModal}>
                <i className="bi bi-x-lg" />
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="position-form-grid">
                <div className="position-field">
                  <label htmlFor="editPositionTitle">
                    Position Title <span className="position-required">*</span>
                  </label>
                  <input
                    id="editPositionTitle"
                    type="text"
                    className="position-input"
                    value={editForm.positionTitle}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, positionTitle: event.target.value } : prev))
                    }
                  />
                </div>

                <div className="position-field">
                  <label htmlFor="editLevelId">
                    Position Level <span className="position-required">*</span>
                  </label>
                  <select
                    id="editLevelId"
                    className="position-select"
                    value={editForm.levelId}
                    onChange={(event) => setEditForm((prev) => (prev ? { ...prev, levelId: event.target.value } : prev))}
                  >
                    <option value="">Select level</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.levelCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="position-field">
                <label htmlFor="editDescription">Description</label>
                <textarea
                  id="editDescription"
                  className="position-textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                />
              </div>

              <div className="position-form-grid">
                <div className="position-field">
                  <label htmlFor="editCreatedBy">
                    Created By <span className="position-required">*</span>
                  </label>
                  <input
                    id="editCreatedBy"
                    type="text"
                    className="position-input"
                    value={editForm.createdBy}
                    onChange={(event) => setEditForm((prev) => (prev ? { ...prev, createdBy: event.target.value } : prev))}
                  />
                </div>

                <div className="position-checkbox-row">
                  <label className="position-checkbox">
                    <input
                      type="checkbox"
                      checked={editForm.status}
                      onChange={(event) => setEditForm((prev) => (prev ? { ...prev, status: event.target.checked } : prev))}
                    />
                    Active status
                  </label>
                </div>
              </div>

              {modalError && <div className="position-alert error">{modalError}</div>}
              {modalSuccess && <div className="position-alert success">{modalSuccess}</div>}

              <div className="position-modal-actions">
                <button type="button" className="position-btn secondary" onClick={closeEditModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="position-btn primary" disabled={saving}>
                  <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check2'}`} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionTable;
