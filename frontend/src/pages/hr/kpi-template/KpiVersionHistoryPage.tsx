import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateResponse, KpiVersionDetail, KpiVersionSummary } from '../../../types/kpiTemplate';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-');

const rowStatusLabel = (status?: string | null) => {
  if (status === 'INITIAL') return 'Initial';
  if (status === 'UNCHANGED') return 'Unchanged';
  if (status === 'ADDED') return 'Added';
  if (status === 'REMOVED') return 'Removed';
  return 'Changed';
};

const rowStatusClass = (status?: string | null) => {
  if (status === 'ADDED') return 'added';
  if (status === 'REMOVED') return 'removed';
  if (status === 'INITIAL') return 'initial';
  return 'unchanged';
};

const KpiVersionHistoryPage = () => {
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [versions, setVersions] = useState<KpiVersionSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<KpiVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [templateRows, historyRows] = await Promise.all([
          kpiTemplateService.getAllTemplates(),
          kpiTemplateService.getVersionHistory(),
        ]);
        setTemplates(templateRows);
        setVersions(historyRows);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load KPI version history.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return versions.filter((version) => {
      const matchesTemplate = selectedTemplateId === '' || version.templateId === selectedTemplateId;
      const text = `Version ${version.versionNumber} ${version.versionTitle} ${version.templateTitle} ${version.positionName ?? ''}`.toLowerCase();
      return matchesTemplate && (!q || text.includes(q));
    });
  }, [query, selectedTemplateId, versions]);

  const openDetail = async (version: KpiVersionSummary) => {
    try {
      setDetailLoading(true);
      setDetail(await kpiTemplateService.getTemplateVersionDetail(version.templateId, version.versionNumber));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load version detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <header className="kpi-tpl-card--hero p-6 sm:p-8">
          <div className="relative">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">KPI Management</p>
              <h1>KPI Version History</h1>
              <p>Review KPI template versions created when HR adds or removes KPI rows.</p>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value ? Number(event.target.value) : '')}
              className="kpi-tpl-input rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
              aria-label="Filter by template"
            >
              <option value="">All KPI templates</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search version title or position..."
              className="kpi-tpl-input rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>

          <div className="kpi-tpl-card overflow-hidden p-0">
            {loading ? (
              <div className="p-12 text-center text-sm font-semibold text-gray-600">Loading version history...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm font-semibold text-gray-600">No KPI version history found.</div>
            ) : (
              <div className="kpi-tpl-table-wrap">
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left text-sm">
                    <thead className="kpi-tpl-thead">
                      <tr>
                        <th className="px-5 py-4">Version</th>
                        <th className="px-5 py-4">Template</th>
                        <th className="px-5 py-4">Position</th>
                        <th className="px-5 py-4">Edited date</th>
                        <th className="px-5 py-4">Edited by</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filtered.map((version) => (
                        <tr key={`${version.templateId}-${version.versionNumber}`} className="hover:bg-blue-50/25">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => void openDetail(version)}
                              className="text-left font-bold text-blue-700 hover:underline"
                            >
                              Version {version.versionNumber}
                            </button>
                            <p className="mt-1 text-xs text-gray-500">
                              {version.versionNumber === 1 ? 'Initial collection' : `${version.changeCount} row change(s)`}
                            </p>
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-900">{version.templateTitle}</td>
                          <td className="px-5 py-4 text-gray-700">{version.positionName ?? '-'}</td>
                          <td className="px-5 py-4 text-gray-700">{formatDate(version.editedAt)}</td>
                          <td className="px-5 py-4 text-gray-700">{version.editedBy ?? '-'}</td>
                          <td className="px-5 py-4 text-right">
                            <button type="button" onClick={() => void openDetail(version)} className="kpi-tpl-btn-secondary">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      {(detail || detailLoading) && (
        <VersionDetailModal detail={detail} loading={detailLoading} onClose={() => setDetail(null)} />
      )}
    </div>
  );
};

const VersionDetailModal = ({
  detail,
  loading,
  onClose,
}: {
  detail: KpiVersionDetail | null;
  loading: boolean;
  onClose: () => void;
}) =>
  createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kpi-tpl-modal">
        <div className="kpi-tpl-modal-header">
          <div>
            <p className="kpi-tpl-modal-kicker">Version detail</p>
            <h2>{detail ? `Version ${detail.versionNumber}` : 'Loading...'}</h2>
          </div>
          <button type="button" onClick={onClose} className="kpi-tpl-btn-secondary">Close</button>
        </div>
        {loading || !detail ? (
          <div className="kpi-tpl-modal-loading">Loading version detail...</div>
        ) : (
          <div className="kpi-tpl-modal-body">
            <div className="grid gap-3 md:grid-cols-2">
              <p><strong>Template:</strong> {detail.templateTitle}</p>
              <p><strong>Position:</strong> {detail.positionName ?? '-'}</p>
              <p><strong>Created:</strong> {formatDate(detail.createdAt)}</p>
              <p><strong>Edited:</strong> {formatDate(detail.editedAt)}</p>
              <p><strong>Edited by:</strong> {detail.editedBy ?? '-'}</p>
            </div>
            <div className="kpi-tpl-table-wrap">
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="kpi-tpl-thead">
                    <tr>
                      <th className="px-4 py-3.5">Change</th>
                      <th className="px-4 py-3.5">KPI</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5 text-right">Target</th>
                      <th className="px-4 py-3.5">Unit</th>
                      <th className="px-4 py-3.5 text-right">Weight</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {detail.changes.map((change) => {
                      const status = change.rowStatus ?? (change.initialVersion ? 'INITIAL' : change.changeType === 'DELETED' ? 'REMOVED' : 'ADDED');
                      const removed = status === 'REMOVED';
                      const added = status === 'ADDED';
                      const row = change.row;
                      return (
                        <tr
                          key={change.historyId}
                          className={removed ? 'kpi-tpl-row-removed' : added ? 'kpi-tpl-row-added' : 'hover:bg-blue-50/25'}
                        >
                          <td className="px-4 py-3.5">
                            <span className={`kpi-tpl-change-pill ${rowStatusClass(status)}`}>
                              {rowStatusLabel(status)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-gray-900">{row?.kpiName ?? '-'}</td>
                          <td className="px-4 py-3.5">{row?.kpiCategoryName ?? '-'}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums">{row?.target ?? '-'}</td>
                          <td className="px-4 py-3.5">{row?.kpiUnitName ?? '-'}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums">{row?.weight ?? '-'}</td>
                          <td className="px-4 py-3.5">{change.reason ?? '-'}</td>
                          <td className="px-4 py-3.5">{formatDate(change.changedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );

export default KpiVersionHistoryPage;
