import { useEffect, useMemo, useState, type FormEvent } from 'react';
import KpiCategoryForm from '../../../../components/hr/performance-kpi/KpiCategoryForm';
import { kpiCategoryService } from '../../../../services/kpiCategoryService';
import type { KpiCategory } from '../../../../types/kpiCategory';
import '../kpi-ui.css';

const KpiCategoryPage = () => {
  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<KpiCategory | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      setCategories(await kpiCategoryService.getAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load KPI categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, categories],
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (category: KpiCategory) => {
    setEditing(category);
    setName(category.name);
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
      return 'Category name is required.';
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
        await kpiCategoryService.update(editing.id, payload);
      } else {
        await kpiCategoryService.create(payload);
      }
      closeModal();
      await loadCategories();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Failed to save KPI category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this KPI category?')) {
      return;
    }
    try {
      await kpiCategoryService.remove(id);
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI category.');
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI - Category</h1>
            <p>Manage KPI category master data.</p>
          </div>
          <button type="button" onClick={openCreate} className="kpi-btn-primary">
            <i className="bi bi-plus-circle mr-2" />
            Add Category
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search category..."
            className="kpi-input max-w-sm"
          />
          <button type="button" onClick={() => void loadCategories()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
        </div>

        {loading && <p className="kpi-state info">Loading KPI categories...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredCategories.length === 0 && (
          <p className="kpi-state info">No KPI categories found.</p>
        )}

        {!loading && !error && filteredCategories.length > 0 && (
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
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{category.name}</td>
                    <td>
                      <div className="kpi-row-actions">
                        <button type="button" onClick={() => openEdit(category)} className="kpi-icon-btn">
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button type="button" onClick={() => void handleDelete(category.id)} className="kpi-icon-btn danger">
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
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editing ? 'Edit KPI Category' : 'Create KPI Category'}</h2>
            <KpiCategoryForm
              value={name}
              error={formError}
              saving={saving}
              submitLabel={editing ? 'Update Category' : 'Create Category'}
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

export default KpiCategoryPage;
