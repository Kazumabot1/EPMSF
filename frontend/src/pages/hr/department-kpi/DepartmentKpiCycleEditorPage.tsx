import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiRowReasonModal from '../../../components/hr/kpi-template/KpiRowReasonModal';
import '../../../components/hr/kpi-template/kpi-template.css';
import {
  collectTemplateIdsInActiveDepartmentCycles,
  filterDepartmentTemplatesForCycleSelection,
} from '../../../components/hr/kpi-template/kpiTemplateUi';
import { departmentKpiCycleService, departmentKpiTemplateService } from '../../../services/departmentKpiService';
import type { DepartmentKpiCycle, DepartmentKpiCycleRequest, DepartmentKpiTemplate } from '../../../types/departmentKpi';

const fieldClass = 'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm';

const DepartmentKpiCycleEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';
  const cycleId = isEdit ? Number(id) : NaN;
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(3);
  const [templateIds, setTemplateIds] = useState<number[]>([]);
  const [templates, setTemplates] = useState<DepartmentKpiTemplate[]>([]);
  const [cycles, setCycles] = useState<DepartmentKpiCycle[]>([]);
  const [saving, setSaving] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<DepartmentKpiCycleRequest | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [rows, allCycles] = await Promise.all([
          departmentKpiTemplateService.list(),
          departmentKpiCycleService.list(),
        ]);
        setTemplates(rows.filter((t) => t.status === 'ACTIVE' || t.status === 'FINALIZED'));
        setCycles(allCycles);
        if (isEdit && !Number.isNaN(cycleId)) {
          const cycle = await departmentKpiCycleService.get(cycleId);
          if (cycle.status === 'ACTIVE') {
            toast.error('Active cycles cannot be edited.');
            navigate('/hr/department-kpi-cycle');
            return;
          }
          setCycleName(cycle.cycleName);
          setStartDate(cycle.startDate);
          setDurationMonths(cycle.durationMonths);
          setTemplateIds(cycle.templates.map((t) => t.id));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI cycle.');
      }
    };
    void load();
  }, [cycleId, isEdit, navigate]);

  const unavailableTemplateIds = useMemo(
    () => collectTemplateIdsInActiveDepartmentCycles(cycles, isEdit && !Number.isNaN(cycleId) ? cycleId : undefined),
    [cycles, isEdit, cycleId],
  );

  const selectableTemplates = useMemo(
    () => filterDepartmentTemplatesForCycleSelection(templates, templateIds, unavailableTemplateIds),
    [templates, templateIds, unavailableTemplateIds],
  );

  const buildPayload = (): DepartmentKpiCycleRequest => ({
    cycleName: cycleName.trim(),
    startDate,
    durationMonths,
    templateIds,
  });

  const persistSave = async (payload: DepartmentKpiCycleRequest, editReason?: string) => {
    try {
      setSaving(true);
      if (isEdit && !Number.isNaN(cycleId)) {
        await departmentKpiCycleService.update(cycleId, { ...payload, editReason });
        toast.success('Department KPI cycle updated.');
      } else {
        await departmentKpiCycleService.create(payload);
        toast.success('Department KPI cycle created.');
      }
      navigate('/hr/department-kpi-cycle');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save Department KPI cycle.');
    } finally {
      setSaving(false);
      setReasonModalOpen(false);
      setPendingPayload(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cycleName.trim() || !startDate || templateIds.length === 0) {
      toast.error('Cycle name, start date, and templates are required.');
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

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">Department KPI</p><h1 className="mt-1 text-2xl font-bold text-gray-900">{isEdit ? 'Edit Department KPI Cycle' : 'New Department KPI Cycle'}</h1></div>
          <Link to="/hr/department-kpi-cycle" className="kpi-tpl-btn-secondary no-underline">Back</Link>
        </header>
        <form onSubmit={submit} className="kpi-tpl-card space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="flex flex-col gap-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cycle name</span><input className={fieldClass} value={cycleName} onChange={(e) => setCycleName(e.target.value)} /></label>
            <label className="flex flex-col gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</span><select className={fieldClass} value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))}>{[3,4,5,6,7,8,9,10,11,12].map((m) => <option key={m} value={m}>{m === 12 ? '1 year' : `${m} months`}</option>)}</select></label>
            <label className="flex flex-col gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start date</span><input className={fieldClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Templates</span>
            <p className="mt-1 mb-2 text-sm text-gray-500">
              Only available templates are shown. Templates already on another active cycle are hidden.
            </p>
            {selectableTemplates.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No available Department KPI templates. Create and activate a template, or free it from another active cycle.
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {selectableTemplates.map((template) => (
                  <label key={template.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <input type="checkbox" checked={templateIds.includes(template.id)} onChange={(e) => setTemplateIds((prev) => e.target.checked ? [...prev, template.id] : prev.filter((tid) => tid !== template.id))} />
                    {template.title}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3"><Link to="/hr/department-kpi-cycle" className="kpi-tpl-btn-secondary no-underline">Cancel</Link><button type="submit" className="kpi-tpl-btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Save Cycle'}</button></div>
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

export default DepartmentKpiCycleEditorPage;
