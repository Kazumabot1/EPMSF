import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import {
  calculateKpiTemplateEndDate,
  DEFAULT_KPI_TEMPLATE_DURATION_MONTHS,
  inferKpiTemplateDurationMonths,
  KPI_TEMPLATE_DURATION_OPTIONS,
  filterKpiFormsForCycleSelection,
  formatKpiFormCycleOptionLabel,
  kpiStatusBadgeClass,
  type KpiTemplateDurationMonths,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import { kpiTemplateCycleService } from '../../../services/kpiTemplateCycleService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';
import type { KpiTemplateCycleRequest } from '../../../types/kpiTemplateCycle';
import type { KpiTemplateResponse } from '../../../types/kpiTemplate';

const fieldClass =
  'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400';

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</span>
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
  const [durationMonths, setDurationMonths] = useState<KpiTemplateDurationMonths>(DEFAULT_KPI_TEMPLATE_DURATION_MONTHS);
  const [selectedFormIds, setSelectedFormIds] = useState<number[]>([]);
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const allTemplates = await kpiTemplateService.getAllTemplates();
        setTemplates(allTemplates);

        if (isEdit && !Number.isNaN(cycleId)) {
          const cycle = await kpiTemplateCycleService.getById(cycleId);
          setCycleName(cycle.cycleName);
          const nextStart = cycle.startDate?.slice(0, 10) ?? '';
          const nextEnd = cycle.endDate?.slice(0, 10) ?? '';
          setStartDate(nextStart);
          setEndDate(nextEnd);
          setDurationMonths(inferKpiTemplateDurationMonths(nextStart, nextEnd));
          setSelectedFormIds(cycle.kpiForms.map((form) => form.id));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load cycle form.');
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [isEdit, cycleId]);

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

  const selectableTemplates = useMemo(
    () =>
      [...filterKpiFormsForCycleSelection(templates, selectedFormIds)].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    [templates, selectedFormIds],
  );

  const handleDurationChange = (value: KpiTemplateDurationMonths) => {
    setDurationMonths(value);
    setEndDate(calculateKpiTemplateEndDate(startDate, value));
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setEndDate(calculateKpiTemplateEndDate(value, durationMonths));
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
    durationMonths,
    kpiFormIds: selectedFormIds,
  });

  const saveDraft = async () => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      if (isEdit && !Number.isNaN(cycleId)) {
        await kpiTemplateCycleService.update(cycleId, payload);
        toast.success('Cycle draft saved.');
      } else {
        await kpiTemplateCycleService.create(payload);
        toast.success('Cycle draft saved.');
      }
      navigate('/hr/kpi-template-cycle');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="kpi-tpl-page">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-28">
          <div className="kpi-tpl-shimmer mb-5 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-300 to-gray-200" />
          <p className="text-sm font-medium text-gray-600">Loading cycle form…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-4xl px-4 py-8 pb-20">
        <div className="mb-10 flex flex-col gap-6 border-b border-gray-200/90 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
              {isEdit ? 'Edit cycle' : 'Create cycle'}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">KPI template cycle</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pick active KPI forms saved with &quot;Use Form&quot;. The cycle stays draft until you activate it from the list.
            </p>
          </div>
          <Link to="/hr/kpi-template-cycle" className="kpi-tpl-btn-secondary inline-flex shrink-0 no-underline">
            <i className="bi bi-arrow-left" aria-hidden />
            Back to list
          </Link>
        </div>

        <form noValidate className="kpi-tpl-card space-y-8 p-6 sm:p-8">
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
              <FieldLabel>Period (months)</FieldLabel>
              <select
                value={durationMonths}
                onChange={(event) => handleDurationChange(Number(event.target.value) as KpiTemplateDurationMonths)}
                className={`${fieldClass} cursor-pointer`}
              >
                {KPI_TEMPLATE_DURATION_OPTIONS.map((option) => (
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

          <div>
            <FieldLabel>KPI forms</FieldLabel>
            <p className="mt-1 mb-3 text-sm text-gray-500">
              Select one or more <strong>active</strong> KPI forms (saved via Use Form on the template screen).
            </p>
            {selectableTemplates.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No active KPI forms yet. Create a template and click <strong>Use Form</strong> to activate it, then
                return here.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {selectableTemplates.map((template) => {
                  const checked = selectedFormIds.includes(template.id);
                  const invalidSelection = checked && template.status !== 'ACTIVE';
                  return (
                    <label
                      key={template.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                        invalidSelection
                          ? 'border-red-300 bg-red-50/80'
                          : checked
                            ? 'border-violet-300 bg-violet-50/80'
                            : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormSelection(template.id)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                        {formatKpiFormCycleOptionLabel(template)}
                        {invalidSelection && (
                          <span className="mt-1 block text-xs font-semibold text-red-700">
                            Remove before saving. Only active forms can be used.
                          </span>
                        )}
                      </span>
                      <span className={kpiStatusBadgeClass(template.status)}>{template.status}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
            <Link to="/hr/kpi-template-cycle" className="kpi-tpl-btn-secondary no-underline">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              className="kpi-tpl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving draft…' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KpiTemplateCycleEditorPage;
