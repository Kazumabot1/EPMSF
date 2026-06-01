import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ConfirmModal from '../../../../components/ConfirmModal';
import KpiItemForm from '../../../../components/hr/performance-kpi/KpiItemForm';
import { kpiCategoryService } from '../../../../services/kpiCategoryService';
import { kpiItemService } from '../../../../services/kpiItemService';
import type { KpiCategory } from '../../../../types/kpiCategory';
import type { KpiItem } from '../../../../types/kpiItem';

const PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const btnSecondary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

const btnPrimary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 disabled:cursor-not-allowed disabled:opacity-50';

const KpiItemPage = () => {
  const [items, setItems] = useState<KpiItem[]>([]);
  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [editing, setEditing] = useState<KpiItem | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KpiItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [itemResponse, categoryResponse] = await Promise.all([
        kpiItemService.getAll(),
        kpiCategoryService.getAll(),
      ]);
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
    return [...items]
      .sort((a, b) => a.id - b.id)
      .filter((item) => {
        const matchesCategory = categoryFilter === '' || item.kpiCategoryId === categoryFilter;
        const matchesQuery =
          !normalized ||
          item.name.toLowerCase().includes(normalized) ||
          item.kpiCategoryName.toLowerCase().includes(normalized);
        return matchesCategory && matchesQuery;
      });
  }, [items, query, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredItems.length);

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

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await kpiItemService.remove(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_92%_16%,rgba(37,99,235,0.1),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-card-checklist text-sm" aria-hidden />
                Performance KPI
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-950">KPI Items</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Manage KPI items and map each item to a category for use in KPI templates.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {!loading && (
                <div className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-center shadow-sm">
                  <strong className="block text-2xl font-bold tabular-nums leading-none text-slate-950">
                    {filteredItems.length}
                  </strong>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Items
                  </span>
                </div>
              )}
              <button type="button" onClick={openCreate} className={btnPrimary}>
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                Add item
              </button>
            </div>
          </div>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="KPI item filters"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Search
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Item name or category…"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Category
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value ? Number(event.target.value) : '')
                }
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:min-w-[120px]"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button type="button" onClick={() => void loadData()} className={`${btnSecondary} w-full justify-center`}>
                <i className="bi bi-arrow-clockwise text-base text-slate-400" aria-hidden />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading KPI items…</span>
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <i
              className="bi bi-exclamation-triangle grid h-10 w-10 place-items-center rounded-lg bg-red-100 text-xl text-red-700"
              aria-hidden
            />
            <div>
              <strong className="block text-slate-950">Could not load KPI items</strong>
              <p className="mt-1 text-sm text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-3 text-sm font-bold text-red-800 underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-card-checklist mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />
            <h2 className="text-xl font-bold text-slate-950">
              {items.length === 0 ? 'No KPI items yet' : 'No matching items'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {items.length === 0
                ? 'Add your first KPI item and link it to a category.'
                : 'Try adjusting your search or category filter.'}
            </p>
            {items.length === 0 && (
              <button type="button" onClick={openCreate} className={`${btnPrimary} mt-6`}>
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                Add item
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="w-16 px-4 py-3 text-center">No.</th>
                      <th className="px-4 py-3">Item name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`transition hover:bg-blue-50/50 ${index % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                      >
                        <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                          {rangeStart + index}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-950">{item.name}</td>
                        <td className="px-4 py-3 text-slate-700">{item.kpiCategoryName}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <i className="bi bi-pencil-square text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <i className="bi bi-trash text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing <strong className="text-slate-900">{rangeStart}</strong>–
                <strong className="text-slate-900">{rangeEnd}</strong> of{' '}
                <strong className="text-slate-900">{filteredItems.length}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {showModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <h2 className="text-lg font-bold text-slate-950">
              {editing ? 'Edit KPI item' : 'Create KPI item'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Link the item to a KPI category.</p>
            <div className="mt-4">
              <KpiItemForm
                name={name}
                categoryId={categoryId}
                categories={categories}
                error={formError}
                saving={saving}
                submitLabel={editing ? 'Update item' : 'Create item'}
                onNameChange={setName}
                onCategoryChange={setCategoryId}
                onSubmit={(event) => void handleSubmit(event)}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={itemToDelete !== null}
        title="Delete KPI item"
        message={`Delete "${itemToDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => {
          if (!deleting) setItemToDelete(null);
        }}
      />
    </div>
  );
};

export default KpiItemPage;
