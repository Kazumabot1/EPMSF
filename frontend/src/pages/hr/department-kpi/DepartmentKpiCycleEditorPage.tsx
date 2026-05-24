import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiCycleService, departmentKpiTemplateService } from '../../../services/departmentKpiService';
import type { DepartmentKpiTemplate } from '../../../types/departmentKpi';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await departmentKpiTemplateService.list();
        setTemplates(rows.filter((t) => t.status === 'ACTIVE' || t.status === 'FINALIZED'));
        if (isEdit && !Number.isNaN(cycleId)) {
          const cycle = await departmentKpiCycleService.get(cycleId);
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
  }, [cycleId, isEdit]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!cycleName.trim() || !startDate || templateIds.length === 0) {
      toast.error('Cycle name, start date, and templates are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = { cycleName: cycleName.trim(), startDate, durationMonths, templateIds };
      if (isEdit && !Number.isNaN(cycleId)) {
        await departmentKpiCycleService.update(cycleId, payload);
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
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p><h1 className="mt-1 text-2xl font-bold text-gray-900">{isEdit ? 'Edit Department KPI Cycle' : 'New Department KPI Cycle'}</h1></div>
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
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {templates.map((template) => (
                <label key={template.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input type="checkbox" checked={templateIds.includes(template.id)} onChange={(e) => setTemplateIds((prev) => e.target.checked ? [...prev, template.id] : prev.filter((id) => id !== template.id))} />
                  {template.title}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3"><Link to="/hr/department-kpi-cycle" className="kpi-tpl-btn-secondary no-underline">Cancel</Link><button className="kpi-tpl-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Cycle'}</button></div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentKpiCycleEditorPage;
