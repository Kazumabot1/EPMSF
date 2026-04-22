import { useEffect, useMemo, useState, type FormEvent } from 'react';
import KpiItemForm from '../../../../components/hr/performance-kpi/KpiItemForm';
import { kpiCategoryService } from '../../../../services/kpiCategoryService';
import { kpiItemService } from '../../../../services/kpiItemService';
import type { KpiCategory } from '../../../../types/kpiCategory';
import type { KpiItem } from '../../../../types/kpiItem';
import '../kpi-ui.css';

const KpiItemPage = () => {
  const [items, setItems] = useState<KpiItem[]>([]);
  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<KpiItem | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [itemResponse, categoryResponse] = await Promise.all([kpiItemService.getAll(), kpiCategoryService.getAll()]);
      setItems(itemResponse);
      setCategories(categoryResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load KPI item data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter(
      (item) => item.name.toLowerCase().includes(normalized) || item.kpiCategoryName.toLowerCase().includes(normalized),
    );
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCategoryId('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item: KpiItem) => {
    setEditing(item);
    setName(item.name);
    setCategoryId(String(item.kpiCategoryId));
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setName('');
    setCategoryId('');
    setFormError('');
  };

  const validate = (): string => {
    if (!name.trim()) {
      return 'KPI item name is required.';
    }
    if (!categoryId) {
      return 'KPI category is required.';
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
      const payload = { name: name.trim(), kpiCategoryId: Number(categoryId) };
      if (editing) {
        await kpiItemService.update(editing.id, payload);
      } else {
        await kpiItemService.create(payload);
      }
      closeModal();
      await loadData();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Failed to save KPI item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this KPI item?')) {
      return;
    }
    try {
      await kpiItemService.remove(id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI item.');
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI - Item</h1>
            <p>Manage KPI items and category mapping.</p>
          </div>
          <button type="button" onClick={openCreate} className="kpi-btn-primary">
            <i className="bi bi-plus-circle mr-2" />
            Add Item
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search item or category..."
            className="kpi-input max-w-sm"
          />
          <button type="button" onClick={() => void loadData()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
        </div>

        {loading && <p className="kpi-state info">Loading KPI items...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredItems.length === 0 && <p className="kpi-state info">No KPI items found.</p>}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="kpi-table-wrap">
            <table className="kpi-table min-w-[640px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.kpiCategoryName}</td>
                    <td>
                      <div className="kpi-row-actions">
                        <button type="button" onClick={() => openEdit(item)} className="kpi-icon-btn">
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button type="button" onClick={() => void handleDelete(item.id)} className="kpi-icon-btn danger">
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
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editing ? 'Edit KPI Item' : 'Create KPI Item'}</h2>
            <KpiItemForm
              name={name}
              categoryId={categoryId}
              categories={categories}
              error={formError}
              saving={saving}
              submitLabel={editing ? 'Update Item' : 'Create Item'}
              onNameChange={setName}
              onCategoryChange={setCategoryId}
              onSubmit={(event) => void handleSubmit(event)}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiItemPage;
