import { useEffect, useMemo, useState, type FormEvent } from 'react';
import KpiUnitForm from '../../../../components/hr/performance-kpi/KpiUnitForm';
import { kpiUnitService } from '../../../../services/kpiUnitService';
import type { KpiUnit } from '../../../../types/kpiUnit';
import '../kpi-ui.css';

const KpiUnitPage = () => {
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<KpiUnit | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadUnits = async () => {
    try {
      setLoading(true);
      setError('');
      setUnits(await kpiUnitService.getAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load KPI units.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUnits();
  }, []);

  const filteredUnits = useMemo(
    () => units.filter((unit) => unit.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, units],
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (unit: KpiUnit) => {
    setEditing(unit);
    setName(unit.name);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setName('');
    setFormError('');
  };

  const validate = (): string => {
    if (!name.trim()) {
      return 'Unit name is required.';
    }
    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      const payload = { name: name.trim() };
      if (editing) {
        await kpiUnitService.update(editing.id, payload);
      } else {
        await kpiUnitService.create(payload);
      }
      closeModal();
      await loadUnits();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Failed to save KPI unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this KPI unit?')) {
      return;
    }
    try {
      await kpiUnitService.remove(id);
      await loadUnits();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI unit.');
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI - Unit</h1>
            <p>Manage KPI units used in KPI forms.</p>
          </div>
          <button type="button" onClick={openCreate} className="kpi-btn-primary">
            <i className="bi bi-plus-circle mr-2" />
            Add Unit
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search unit..."
            className="kpi-input max-w-sm"
          />
          <button type="button" onClick={() => void loadUnits()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
        </div>

        {loading && <p className="kpi-state info">Loading KPI units...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredUnits.length === 0 && <p className="kpi-state info">No KPI units found.</p>}

        {!loading && !error && filteredUnits.length > 0 && (
          <div className="kpi-table-wrap">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.id}</td>
                    <td>{unit.name}</td>
                    <td>
                      <div className="kpi-row-actions">
                        <button type="button" onClick={() => openEdit(unit)} className="kpi-icon-btn">
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button type="button" onClick={() => void handleDelete(unit.id)} className="kpi-icon-btn danger">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="kpi-modal-backdrop">
          <div className="kpi-modal max-w-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editing ? 'Edit KPI Unit' : 'Create KPI Unit'}</h2>
            <KpiUnitForm
              value={name}
              error={formError}
              saving={saving}
              submitLabel={editing ? 'Update Unit' : 'Create Unit'}
              onChange={setName}
              onSubmit={(event) => void handleSubmit(event)}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiUnitPage;
