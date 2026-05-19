import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiTemplateCreateModal from '../../../../components/hr/kpi-template/KpiTemplateCreateModal';
import '../../../../components/hr/kpi-template/kpi-template.css';
import { kpiTemplateService } from '../../../../services/kpiTemplateService';
import { toApiRequestError } from '../../../../services/apiError';
import type { KpiTemplateResponse } from '../../../../types/kpiTemplate';
import '../kpi-ui.css';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiFormPage = () => {
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      setTemplates(await kpiTemplateService.getAllTemplates());
    } catch (loadError) {
      const message = toApiRequestError(loadError, 'Failed to load KPI forms.').message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query, templates],
  );

  const openCreate = () => {
    setModalMode('create');
    setSelectedTemplateId(null);
    setCreateOpen(true);
  };

  const openView = (id: number) => {
    setModalMode('view');
    setSelectedTemplateId(id);
    setCreateOpen(true);
  };

  const openEdit = (id: number) => {
    setModalMode('edit');
    setSelectedTemplateId(id);
    setCreateOpen(true);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete KPI form "${title}"?`)) {
      return;
    }
    try {
      await kpiTemplateService.deleteTemplate(id);
      toast.success('KPI form deleted.');
      await loadTemplates();
    } catch (deleteError) {
      toast.error(toApiRequestError(deleteError, 'Failed to delete KPI form.').message);
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI — Forms</h1>
            <p>Manage KPI form templates (one template per position).</p>
          </div>
          <button type="button" className="kpi-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-circle mr-2" />
            Add Form
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search forms..."
            className="kpi-input max-w-sm"
          />
          <button type="button" onClick={() => void loadTemplates()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
          <Link to="/hr/kpi-template" className="kpi-btn-ghost no-underline">
            Open full template manager
          </Link>
        </div>

        {loading && <p className="kpi-state info">Loading KPI forms...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="py-10 text-center">
            <p className="kpi-state info">No KPI forms found.</p>
            <button type="button" className="kpi-btn-primary mt-4" onClick={openCreate}>
              Create first KPI form
            </button>
          </div>
        )}

        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="kpi-table-wrap">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.id}</td>
                    <td>{template.title}</td>
                    <td>
                      {template.startDate && template.endDate
                        ? `${formatDate(template.startDate)} - ${formatDate(template.endDate)}`
                        : '—'}
                    </td>
                    <td>
                      <span className={`kpi-status ${template.status.toLowerCase()}`}>{template.status}</span>
                    </td>
                    <td>
                      <div className="kpi-row-actions">
                        <button
                          type="button"
                          className="kpi-icon-btn"
                          title="View"
                          onClick={() => openView(template.id)}
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          type="button"
                          className="kpi-icon-btn"
                          title="Edit"
                          onClick={() => openEdit(template.id)}
                        >
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(template.id, template.title)}
                          className="kpi-icon-btn danger"
                          title="Delete"
                        >
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

      <KpiTemplateCreateModal
        open={createOpen}
        mode={modalMode}
        templateId={selectedTemplateId}
        onClose={() => setCreateOpen(false)}
        onSaved={loadTemplates}
      />
    </div>
  );
};

export default KpiFormPage;
