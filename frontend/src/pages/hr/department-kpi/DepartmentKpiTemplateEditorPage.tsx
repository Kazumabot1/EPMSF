import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KpiTemplateRowsTable from '../../../components/hr/kpi-template/KpiTemplateRowsTable';
import '../../../components/hr/kpi-template/kpi-template.css';
import { newKpiTemplateRow } from '../../../components/hr/kpi-template/kpiTemplateWorkflow';
import { departmentKpiTemplateService } from '../../../services/departmentKpiService';
import { fetchDepartments, type Department } from '../../../services/departmentService';
import { kpiCategoryService } from '../../../services/kpiCategoryService';
import { kpiItemService } from '../../../services/kpiItemService';
import { kpiUnitService } from '../../../services/kpiUnitService';
import type { KpiCategory } from '../../../types/kpiCategory';
import type { KpiItem } from '../../../types/kpiItem';
import type { KpiFormStatus, KpiTemplateRowDraft } from '../../../types/kpiTemplate';
import type { KpiUnit } from '../../../types/kpiUnit';

const fieldClass = 'kpi-tpl-input min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm';
const TEMPLATE_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const DepartmentKpiTemplateEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';
  const templateId = isEdit ? Number(id) : NaN;

  const [title, setTitle] = useState('');
  const [durationMonths, setDurationMonths] = useState(3);
  const [status, setStatus] = useState<KpiFormStatus>('DRAFT');
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [rows, setRows] = useState<KpiTemplateRowDraft[]>([newKpiTemplateRow()]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<KpiCategory[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [items, setItems] = useState<KpiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [deptRows, cats, unitRows, itemRows] = await Promise.all([
          fetchDepartments(),
          kpiCategoryService.getAll(),
          kpiUnitService.getAll(),
          kpiItemService.getAll(),
        ]);
        setDepartments(deptRows.filter((d) => d.status !== false));
        setCategories(cats);
        setUnits(unitRows);
        setItems(itemRows);
        if (isEdit && !Number.isNaN(templateId)) {
          const template = await departmentKpiTemplateService.get(templateId);
          setTitle(template.title);
          setDurationMonths(template.durationMonths ?? 3);
          setStatus(template.status);
          setDepartmentIds(template.departments.map((d) => d.id));
          setRows(template.items.length > 0 ? template.items.map((line) => ({
            rowId: crypto.randomUUID(),
            id: line.id ?? null,
            kpiItemId: line.kpiItemId,
            kpiLabel: line.kpiLabel ?? '',
            kpiCategoryId: line.kpiCategoryId,
            kpiCategoryLabel: line.kpiCategoryLabel ?? (line.kpiCategoryId == null ? line.kpiCategoryName ?? '' : ''),
            kpiUnitId: line.kpiUnitId,
            kpiUnitLabel: line.kpiUnitLabel ?? (line.kpiUnitId == null ? line.kpiUnitName ?? '' : ''),
            target: line.target,
            weight: line.weight,
          })) : [newKpiTemplateRow()]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI form.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isEdit, templateId]);

  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + (row.weight ?? 0), 0), [rows]);
  const selectedDepartmentLabel = useMemo(() => {
    const selectedNames = departments
      .filter((department) => departmentIds.includes(department.id))
      .map((department) => department.departmentName);

    if (selectedNames.length === 0) return 'Select departments';
    if (selectedNames.length <= 2) return selectedNames.join(', ');
    return `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2} more`;
  }, [departmentIds, departments]);

  const toggleDepartment = (departmentId: number) => {
    setDepartmentIds((prev) => (
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    ));
  };

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
    if (!TEMPLATE_DURATIONS.includes(durationMonths)) return 'Select a valid template duration.';
    if (departmentIds.length === 0) return 'Select at least one department.';
    if (rows.length === 0) return 'Add at least one KPI row.';
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.kpiItemId == null && !row.kpiLabel.trim()) return `Row ${i + 1}: enter a KPI name.`;
      if ((row.kpiCategoryId == null && !row.kpiCategoryLabel.trim()) || (row.kpiUnitId == null && !row.kpiUnitLabel.trim()) || row.target == null || row.weight == null) {
        return `Row ${i + 1}: category, unit, target, and weight are required.`;
      }
    }
    if ((status === 'ACTIVE' || status === 'FINALIZED') && totalWeight !== 100) return 'Total weight must equal 100%.';
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        durationMonths,
        status,
        departmentIds,
        items: rows.map((row, index) => ({
          id: row.id ?? null,
          kpiLabel: row.kpiItemId == null ? row.kpiLabel.trim() || null : null,
          kpiItemId: row.kpiItemId,
          kpiItemName: null,
          kpiCategoryId: row.kpiCategoryId,
          kpiCategoryName: null,
          kpiCategoryLabel: row.kpiCategoryId == null ? row.kpiCategoryLabel.trim() || null : null,
          kpiUnitId: row.kpiUnitId,
          kpiUnitName: null,
          kpiUnitLabel: row.kpiUnitId == null ? row.kpiUnitLabel.trim() || null : null,
          target: row.target,
          weight: row.weight,
          sortOrder: index,
        })),
      };
      if (isEdit && !Number.isNaN(templateId)) {
        await departmentKpiTemplateService.update(templateId, payload);
        toast.success('Department KPI template updated.');
      } else {
        await departmentKpiTemplateService.create(payload);
        toast.success('Department KPI template created.');
      }
      navigate('/hr/department-kpi-template');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save Department KPI template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{isEdit ? 'Edit Department KPI Template' : 'New Department KPI Template'}</h1>
          </div>
          <Link to="/hr/department-kpi-template" className="kpi-tpl-btn-secondary no-underline">Back</Link>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <section className="kpi-tpl-card p-6">
            <div className="grid gap-5 md:grid-cols-4">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</span>
                <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finance Department KPI" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</span>
                <select className={fieldClass} value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))}>
                  {TEMPLATE_DURATIONS.map((months) => (
                    <option key={months} value={months}>{months === 12 ? '1 year' : `${months} months`}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
                <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as KpiFormStatus)}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FINALIZED">FINALIZED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
            </div>
            <div className="relative mt-5 max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Departments</span>
              <button
                type="button"
                disabled={departments.length === 0}
                className={`${fieldClass} mt-2 flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                aria-expanded={departmentMenuOpen}
                onClick={() => setDepartmentMenuOpen((open) => !open)}
              >
                <span className="truncate">{departments.length === 0 ? 'No active departments available' : selectedDepartmentLabel}</span>
                <span className="text-xs text-gray-500">{departmentMenuOpen ? '^' : 'v'}</span>
              </button>
              {departmentMenuOpen && departments.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {departments.map((department) => {
                    const checked = departmentIds.includes(department.id);
                    return (
                      <button
                        key={department.id}
                        type="button"
                        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm ${checked ? 'bg-violet-50 text-violet-800' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => toggleDepartment(department.id)}
                      >
                        <span className="truncate">{department.departmentName}</span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${checked ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300 text-transparent'}`}>
                          x
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <KpiTemplateRowsTable
            rows={rows}
            categories={categories}
            units={units}
            items={items}
            onAddRow={() => setRows((prev) => [...prev, newKpiTemplateRow()])}
            onRemoveRow={(rowId) => setRows((prev) => prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev)}
            onRowChange={(rowId, patch) => setRows((prev) => prev.map((row) => row.rowId === rowId ? { ...row, ...patch } : row))}
          />

          <div className="flex justify-end gap-3">
            <Link to="/hr/department-kpi-template" className="kpi-tpl-btn-secondary no-underline">Cancel</Link>
            <button disabled={loading || saving} className="kpi-tpl-btn-primary" type="submit">{saving ? 'Saving...' : 'Save Template'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentKpiTemplateEditorPage;
