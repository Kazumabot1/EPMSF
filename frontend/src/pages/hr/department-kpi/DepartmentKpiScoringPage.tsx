import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiWorkflowService } from '../../../services/departmentKpiService';
import type { DepartmentKpiResult, DepartmentKpiTemplateSummary } from '../../../types/departmentKpi';

type Drafts = Record<number, Record<number, string>>;

const keyFor = (row: DepartmentKpiTemplateSummary) => `${row.templateId}:${row.cyclePeriodId ?? 'legacy'}`;

const DepartmentKpiScoringPage = () => {
  const [summaries, setSummaries] = useState<DepartmentKpiTemplateSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [results, setResults] = useState<DepartmentKpiResult[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadSummaries = async () => {
    const rows = await departmentKpiWorkflowService.templates();
    setSummaries(rows);
    setSelectedKey((prev) => prev || (rows[0] ? keyFor(rows[0]) : ''));
  };

  useEffect(() => {
    void loadSummaries().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI scoring list.'));
  }, []);

  const selected = useMemo(() => summaries.find((row) => keyFor(row) === selectedKey), [selectedKey, summaries]);

  const loadResults = async (summary: DepartmentKpiTemplateSummary) => {
    const rows = await departmentKpiWorkflowService.assignments(summary.templateId, summary.cyclePeriodId);
    setResults(rows);
    const next: Drafts = {};
    rows.forEach((result) => {
      next[result.departmentKpiResultId] = {};
      result.lines.forEach((line) => {
        next[result.departmentKpiResultId][line.templateRowId] = line.actualValue == null ? '' : String(line.actualValue);
      });
    });
    setDrafts(next);
  };

  useEffect(() => {
    if (!selected) return;
    void loadResults(selected).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI assignments.'));
  }, [selected]);

  const updateDraft = (resultId: number, rowId: number, value: string) => {
    if (value !== '' && (!/^\d+(\.\d*)?$/.test(value) || !Number.isFinite(Number(value)))) return;
    setDrafts((prev) => ({ ...prev, [resultId]: { ...(prev[resultId] ?? {}), [rowId]: value } }));
  };

  const save = async (result: DepartmentKpiResult) => {
    const scores = result.lines.map((line) => {
      const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId]?.trim() ?? '';
      return { templateRowId: line.templateRowId, actualValue: raw === '' ? null : Number(raw) };
    });
    if (scores.some((row) => row.actualValue != null && (Number.isNaN(row.actualValue) || row.actualValue < 0))) {
      toast.error('Actual values must be zero or greater.');
      return;
    }
    for (let i = 0; i < result.lines.length; i += 1) {
      const line = result.lines[i];
      const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId]?.trim() ?? '';
      if (raw === '') continue;
      const actual = Number(raw);
      if (line.target != null && Number.isFinite(actual) && actual > line.target) {
        toast.error(`Row ${i + 1}: Actual % must be less than or equal to Target %.`);
        return;
      }
      if (line.target != null && line.target > 0 && line.weight != null && Number.isFinite(actual)) {
        const weightScore = ((actual / line.target) * 100 * line.weight) / 100;
        if (weightScore > line.weight) {
          toast.error(`Row ${i + 1}: Weight Score must be less than or equal to Weight %.`);
          return;
        }
      }
    }
    try {
      setSavingId(result.departmentKpiResultId);
      const updated = await departmentKpiWorkflowService.updateScores(result.departmentKpiResultId, scores);
      setResults((prev) => prev.map((row) => row.departmentKpiResultId === updated.departmentKpiResultId ? updated : row));
      toast.success(`Saved scores for ${updated.departmentName}.`);
      await loadSummaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSavingId(null);
    }
  };

  const finalizeOne = async (result: DepartmentKpiResult) => {
    try {
      setSavingId(result.departmentKpiResultId);
      const updated = await departmentKpiWorkflowService.finalizeResult(result.departmentKpiResultId);
      setResults((prev) => prev.map((row) => row.departmentKpiResultId === updated.departmentKpiResultId ? updated : row));
      toast.success(`Finalized ${updated.departmentName}.`);
      await loadSummaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Finalize failed.');
    } finally {
      setSavingId(null);
    }
  };

  const finalizeAll = async () => {
    if (!selected) return;
    if (!window.confirm('Finalize all complete Department KPI results for this template/period?')) return;
    try {
      const count = await departmentKpiWorkflowService.finalizeTemplate(selected.templateId, selected.cyclePeriodId);
      toast.success(`Finalized ${count} department result(s).`);
      await loadSummaries();
      await loadResults(selected);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Finalize failed.');
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p><h1 className="mt-1 text-2xl font-bold text-gray-900">HR Department KPI Scoring</h1></div>
          <button className="kpi-tpl-btn-primary" disabled={!selected || selected.openAssignments === 0} onClick={() => void finalizeAll()}>Finalize All</button>
        </header>
        <div className="mb-5 max-w-xl">
          <select className="kpi-tpl-input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {summaries.length === 0 ? <option value="">No active Department KPI results</option> : summaries.map((summary) => <option key={keyFor(summary)} value={keyFor(summary)}>{summary.title} {summary.periodStartDate ? `- ${summary.periodStartDate}` : ''} ({summary.openAssignments} open)</option>)}
          </select>
        </div>
        <div className="space-y-5">
          {results.map((result) => {
            const finalized = result.status === 'FINALIZED';
            const complete = result.lines.every((line) => {
              const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId]?.trim() ?? '';
              return raw !== '' || line.score != null;
            });
            return (
              <section key={result.departmentKpiResultId} className="kpi-tpl-card overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div><h2 className="font-semibold text-gray-900">{result.departmentName}</h2><p className="text-sm text-gray-500">{result.status} · Weighted total {result.totalWeightedScore == null ? '-' : result.totalWeightedScore.toFixed(2)}</p></div>
                  <div className="flex gap-2"><button className="kpi-tpl-btn-secondary" disabled={finalized || savingId === result.departmentKpiResultId} onClick={() => void save(result)}>Save</button><button className="kpi-tpl-btn-primary" disabled={finalized || !complete || savingId === result.departmentKpiResultId} onClick={() => void finalizeOne(result)}>Finalize</button></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] border-collapse text-sm">
                    <thead className="kpi-tpl-thead"><tr><th className="px-4 py-3 text-left">KPI</th><th className="px-4 py-3 text-right">Target %</th><th className="px-4 py-3 text-right">Actual %</th><th className="px-4 py-3 text-right">Score %</th><th className="px-4 py-3 text-right">Weight %</th><th className="px-4 py-3 text-right">Weight Score</th></tr></thead>
                    <tbody>{result.lines.map((line) => {
                      const raw = drafts[result.departmentKpiResultId]?.[line.templateRowId] ?? '';
                      const preview = raw.trim() !== '' && line.target ? (Number(raw) / line.target) * 100 : line.score;
                      const actual = raw.trim() === '' ? null : Number(raw);
                      const actualInvalid = actual != null && line.target != null && Number.isFinite(actual) && actual > line.target;
                      const previewWeightScore =
                        preview != null && line.weight != null ? (preview * line.weight) / 100 : line.weightedScore;
                      return (
                        <tr key={line.templateRowId} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-800">{line.kpiLabel}{line.unitName ? ` (${line.unitName})` : ''}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{line.target ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              className={`w-28 rounded-lg border px-2 py-1 text-right ${actualInvalid ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-300'}`}
                              disabled={finalized}
                              value={raw}
                              onChange={(e) => updateDraft(result.departmentKpiResultId, line.templateRowId, e.target.value)}
                            />
                            {actualInvalid && <div className="mt-1 text-xs text-red-700">Max {line.target}</div>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{preview == null ? '-' : preview.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{line.weight ?? '-'}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{previewWeightScore == null ? '-' : previewWeightScore.toFixed(2)}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </section>
            );
          })}
          {selected && results.length === 0 && <div className="kpi-tpl-card p-8 text-center text-gray-500">No Department KPI results for this template yet. Activate a Department KPI Cycle to create assignments.</div>}
        </div>
      </div>
    </div>
  );
};

export default DepartmentKpiScoringPage;
