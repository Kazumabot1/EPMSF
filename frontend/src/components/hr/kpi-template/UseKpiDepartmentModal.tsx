import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchDepartments } from '../../../services/departmentService';
import type { Department } from '../../../services/departmentService';
import { kpiTemplateService } from '../../../services/kpiTemplateService';

type Props = {
  open: boolean;
  templateId: number | null;
  templateTitle: string;
  onClose: () => void;
  onApplied: () => void;
};

type ApplyMode = 'all' | 'pick';

const UseKpiDepartmentModal = ({ open, templateId, templateTitle, onClose, onApplied }: Props) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mode, setMode] = useState<ApplyMode>('all');
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('all');
    setSelectedDeptIds(new Set());
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingDeps(true);
        const data = await fetchDepartments();
        if (!cancelled) setDepartments(data.filter((d) => d.status !== false));
      } catch {
        if (!cancelled) toast.error('Failed to load departments.');
      } finally {
        if (!cancelled) setLoadingDeps(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleDept = (id: number) => {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDepts = () => {
    setSelectedDeptIds(new Set(departments.map((d) => d.id)));
  };

  const clearDepts = () => setSelectedDeptIds(new Set());

  if (!open || templateId == null) return null;

  const submitDisabled =
    submitting || (mode === 'pick' && (loadingDeps || selectedDeptIds.size === 0));

  const submit = async () => {
    if (mode === 'pick' && selectedDeptIds.size === 0) {
      toast.error('Select at least one department.');
      return;
    }
    try {
      setSubmitting(true);
      const payload =
        mode === 'all'
          ? ({ applyToAllDepartments: true } as const)
          : { departmentIds: Array.from(selectedDeptIds).sort((a, b) => a - b) };

      const result = await kpiTemplateService.useForDepartment(templateId, payload);
      const deptNote =
        result.departmentsWithMatches != null && result.departmentsWithMatches > 0
          ? ` Across ${result.departmentsWithMatches} department(s).`
          : '';
      toast.success(
        `Created ${result.assignmentsCreated} assignment(s). Notified ${result.managersNotified} manager(s).${deptNote}`,
      );
      onApplied();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="kpi-tpl-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Use KPI for department</h2>
        <p className="mt-2 text-sm text-gray-600">
          Apply template <span className="font-semibold text-gray-900">{templateTitle}</span> so managers receive a
          notification and can enter scores for matching employees.
        </p>

        <fieldset className="mt-6 space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">Scope</legend>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <input
              type="radio"
              name="kpi-dept-scope"
              className="mt-1"
              checked={mode === 'all'}
              disabled={submitting}
              onChange={() => setMode('all')}
            />
            <span>
              <span className="font-semibold text-gray-900">All departments</span>
              <span className="mt-0.5 block text-sm text-gray-600">
                Every active department that has eligible employees for this template.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <input
              type="radio"
              name="kpi-dept-scope"
              className="mt-1"
              checked={mode === 'pick'}
              disabled={submitting}
              onChange={() => setMode('pick')}
            />
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-gray-900">Selected departments</span>
              <span className="mt-0.5 block text-sm text-gray-600">
                Pick one or more departments (multi-select below).
              </span>
            </span>
          </label>
        </fieldset>

        {mode === 'pick' && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Departments</span>
              <button
                type="button"
                className="text-xs font-semibold text-blue-700 underline-offset-2 hover:underline"
                disabled={loadingDeps || submitting || departments.length === 0}
                onClick={selectAllDepts}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-gray-600 underline-offset-2 hover:underline"
                disabled={submitting || selectedDeptIds.size === 0}
                onClick={clearDepts}
              >
                Clear
              </button>
            </div>

            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
              {loadingDeps && <p className="px-2 py-3 text-sm text-gray-500">Loading departments…</p>}
              {!loadingDeps && departments.length === 0 && (
                <p className="px-2 py-3 text-sm text-gray-500">No departments available.</p>
              )}
              {!loadingDeps &&
                departments.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-blue-50/60"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedDeptIds.has(d.id)}
                      disabled={submitting}
                      onChange={() => toggleDept(d.id)}
                    />
                    <span className="text-gray-900">{d.departmentName}</span>
                  </label>
                ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {selectedDeptIds.size} department{selectedDeptIds.size === 1 ? '' : 's'} selected.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-2">
          <button type="button" className="kpi-tpl-btn-secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="kpi-tpl-btn-primary"
            disabled={submitDisabled}
            onClick={() => void submit()}
          >
            {submitting ? 'Applying…' : 'Apply & notify managers'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UseKpiDepartmentModal;
