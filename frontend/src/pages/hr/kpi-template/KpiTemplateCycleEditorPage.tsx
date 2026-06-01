import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiRowReasonModal from '../../../components/hr/kpi-template/KpiRowReasonModal';
import {
  calculateKpiCycleEndDate,
  collectFormIdsInRunningKpiCycles,
  DEFAULT_KPI_CYCLE_DURATION_YEARS,
  inferKpiCycleDurationYears,
  KPI_CYCLE_DURATION_OPTIONS,
  filterKpiFormsForCycleSelection,
  formatTemplatePositionLabels,
  kpiStatusBadgeClass,
  type KpiCycleDurationYears,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateCycleRequest, KpiTemplateCycleResponse } from '../../../types/kpiTemplateCycle';
import type { KpiTemplateResponse } from '../../../types/kpiTemplate';

const fieldClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100';

const btnSecondary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 no-underline shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

const btnPrimary =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 disabled:cursor-not-allowed disabled:opacity-50';

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</span>
);

type CycleEditorLocationState = {
  preselectFormId?: number;
};

const KpiTemplateCycleEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id) && id !== 'new';
  const cycleId = id && id !== 'new' ? Number(id) : NaN;
  const preselectFormId = (location.state as CycleEditorLocationState | null)?.preselectFormId;

  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationYears, setDurationYears] = useState<KpiCycleDurationYears>(DEFAULT_KPI_CYCLE_DURATION_YEARS);
  const [selectedFormIds, setSelectedFormIds] = useState<number[]>([]);
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [cycles, setCycles] = useState<KpiTemplateCycleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<KpiTemplateCycleRequest | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const [allTemplates, allCycles] = await Promise.all([
          kpiTemplateService.getAllTemplates(),
          kpiTemplateCycleService.list(),
        ]);
        setTemplates(allTemplates);
        setCycles(allCycles);

        if (isEdit && !Number.isNaN(cycleId)) {
          const cycle = await kpiTemplateCycleService.getById(cycleId);
          if (cycle.status === 'ACTIVE') {
            toast.error('Active cycles cannot be edited.');
            navigate('/hr/kpi-template-cycle');
            return;
          }
          setCycleName(cycle.cycleName);
          const nextStart = cycle.startDate?.slice(0, 10) ?? '';
          const nextEnd = cycle.endDate?.slice(0, 10) ?? '';
          setStartDate(nextStart);
          setEndDate(nextEnd);
          setDurationYears((cycle.durationYears ?? inferKpiCycleDurationYears(nextStart, nextEnd)) as KpiCycleDurationYears);
          setSelectedFormIds(cycle.kpiForms.map((form) => form.id));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load cycle form.');
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [isEdit, cycleId, navigate]);

  useEffect(() => {
    if (preselectFormId == null || loading) {
      return;
    }
    const exists = templates.some((template) => template.id === preselectFormId);
    if (!exists) {
      return;
    }
    setSelectedFormIds((prev) =>
      prev.includes(preselectFormId) ? prev : [...prev, preselectFormId],
    );
    navigate(location.pathname, { replace: true, state: {} });
  }, [preselectFormId, templates, loading, navigate, location.pathname]);

  const unavailableFormIds = useMemo(
    () => collectFormIdsInRunningKpiCycles(cycles, isEdit && !Number.isNaN(cycleId) ? cycleId : undefined),
    [cycles, isEdit, cycleId],
  );

  const selectableTemplates = useMemo(
    () =>
      [...filterKpiFormsForCycleSelection(templates, selectedFormIds, unavailableFormIds)].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    [templates, selectedFormIds, unavailableFormIds],
  );

  const handleDurationChange = (value: KpiCycleDurationYears) => {
    setDurationYears(value);
    setEndDate(calculateKpiCycleEndDate(startDate, value));
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setEndDate(calculateKpiCycleEndDate(value, durationYears));
  };

  const toggleFormSelection = (formId: number) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId],
    );
  };

  const validate = (): string | null => {
    if (!cycleName.trim()) return 'Cycle name is required.';
    if (!startDate || !endDate) return 'Start date is required.';
    if (selectedFormIds.length === 0) return 'Select at least one KPI form.';
    const selectedTemplates = templates.filter((template) => selectedFormIds.includes(template.id));
    const inactiveTemplate = selectedTemplates.find((template) => template.status !== 'ACTIVE');
    if (inactiveTemplate) {
      return `Remove "${inactiveTemplate.title}" before saving. KPI template cycles can only use active forms.`;
    }
    return null;
  };

  const buildPayload = (): KpiTemplateCycleRequest => ({
    cycleName: cycleName.trim(),
    startDate,
    durationYears,
    kpiFormIds: selectedFormIds,
  });

  const persistSave = async (payload: KpiTemplateCycleRequest, editReason?: string) => {
    try {
      setSaving(true);
      if (isEdit && !Number.isNaN(cycleId)) {
        await kpiTemplateCycleService.update(cycleId, { ...payload, editReason });
        toast.success('Cycle saved.');
      } else {
        await kpiTemplateCycleService.create(payload);
        toast.success('Cycle draft saved.');
      }
      navigate('/hr/kpi-template-cycle');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
      setReasonModalOpen(false);
      setPendingPayload(null);
    }
  };

  const saveDraft = () => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    const payload = buildPayload();
    if (isEdit && !Number.isNaN(cycleId)) {
      setPendingPayload(payload);
      setReasonModalOpen(true);
      return;
    }
    void persistSave(payload);
  };

  const confirmEditWithReason = (reason: string) => {
    if (!pendingPayload) return;
    void persistSave(pendingPayload, reason);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 text-slate-600"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-hidden />
          <p className="text-sm font-medium">Loading cycle form…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_92%_16%,rgba(37,99,235,0.1),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-arrow-repeat text-sm" aria-hidden />
                {isEdit ? 'Edit cycle' : 'Create cycle'}
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-950">KPI template cycle</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Pick active KPI forms saved with &quot;Use Form&quot;. The cycle stays draft until you activate it from
                the list.
              </p>
            </div>
            <Link to="/hr/kpi-template-cycle" className={`${btnSecondary} shrink-0 self-start`}>
              <i className="bi bi-arrow-left text-base" aria-hidden />
              Back to list
            </Link>
          </div>
        </header>

        <form noValidate className="mt-4 space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-lg text-blue-700">
                <i className="bi bi-calendar3" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Cycle details</h2>
                <p className="text-sm text-slate-500">Name, start date, and evaluation period</p>
              </div>
            </div>

            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <FieldLabel>Cycle name</FieldLabel>
                <input
                  required
                  value={cycleName}
                  onChange={(event) => setCycleName(event.target.value)}
                  placeholder="e.g. FY2026 H1 KPI Cycle"
                  className={fieldClass}
                />
              </label>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <FieldLabel>Start date</FieldLabel>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <FieldLabel>Cycle period</FieldLabel>
                  <select
                    value={durationYears}
                    onChange={(event) => handleDurationChange(Number(event.target.value) as KpiCycleDurationYears)}
                    className={`${fieldClass} cursor-pointer`}
                  >
                    {KPI_CYCLE_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <FieldLabel>End date</FieldLabel>
                  <input required type="date" value={endDate} disabled className={fieldClass} />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-lg text-blue-700">
                  <i className="bi bi-ui-checks" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">KPI forms</h2>
                  <p className="mt-0.5 max-w-xl text-sm text-slate-500">
                    Select available active forms. Forms on another running cycle are not shown.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected</p>
                <p className="text-2xl font-bold tabular-nums text-slate-950">{selectedFormIds.length}</p>
              </div>
            </div>

            {selectableTemplates.length === 0 ? (
              <div className="flex items-start gap-3 p-5 sm:p-6">
                <i
                  className="bi bi-exclamation-triangle grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-xl text-amber-700"
                  aria-hidden
                />
                <div className="text-sm text-amber-900">
                  <strong className="block font-semibold text-amber-950">No active KPI forms available</strong>
                  <p className="mt-1 text-amber-800/90">
                    Create a template and click <strong>Use Form</strong> to activate it, then return here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-b-xl border-t border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="w-14 px-4 py-3 text-center">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="px-4 py-3">KPI form</th>
                        <th className="px-4 py-3">Position(s)</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectableTemplates.map((template, index) => {
                        const checked = selectedFormIds.includes(template.id);
                        const invalidSelection = checked && template.status !== 'ACTIVE';
                        return (
                          <tr
                            key={template.id}
                            tabIndex={0}
                            role="button"
                            onClick={() => toggleFormSelection(template.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleFormSelection(template.id);
                              }
                            }}
                            className={`cursor-pointer transition hover:bg-blue-50/60 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                              index % 2 === 1 ? 'bg-slate-50/50' : ''
                            } ${invalidSelection ? 'bg-red-50/50' : checked ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFormSelection(template.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                aria-label={`Select ${template.title}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-950">{template.title}</span>
                              {invalidSelection && (
                                <p className="mt-1 text-xs font-semibold text-red-700">
                                  Remove before saving. Only active forms can be used.
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatTemplatePositionLabels(template.positions)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <Link to="/hr/kpi-template-cycle" className={btnSecondary}>
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              className={btnPrimary}
            >
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>

      <KpiRowReasonModal
        open={reasonModalOpen}
        title="Reason for cycle change"
        confirmText="Save"
        onCancel={() => {
          setReasonModalOpen(false);
          setPendingPayload(null);
        }}
        onConfirm={confirmEditWithReason}
      />
    </div>
  );
};

export default KpiTemplateCycleEditorPage;
