import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiWorkflowService } from '../../../services/departmentKpiService';
import type { DepartmentKpiResult } from '../../../types/departmentKpi';

type Props = { departmentHead?: boolean };

const DepartmentKpiResultsPage = ({ departmentHead = false }: Props) => {
  const [rows, setRows] = useState<DepartmentKpiResult[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setRows(departmentHead ? await departmentKpiWorkflowService.departmentHeadResults() : await departmentKpiWorkflowService.finalizedResults());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI results.');
      }
    };
    void load();
  }, [departmentHead]);

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">Department KPI</p><h1 className="mt-1 text-2xl font-bold text-gray-900">{departmentHead ? 'My Department KPI Results' : 'Department KPI Results'}</h1></header>
        <div className="space-y-5">
          {rows.length === 0 ? <div className="kpi-tpl-card p-8 text-center text-gray-500">No finalized Department KPI results yet.</div> : rows.map((result) => (
            <section key={result.departmentKpiResultId} className="kpi-tpl-card overflow-hidden p-0">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3"><h2 className="font-semibold text-gray-900">{result.departmentName} · {result.templateTitle}</h2><p className="text-sm text-gray-500">Weighted total {result.totalWeightedScore == null ? '-' : result.totalWeightedScore.toFixed(2)} · Finalized {result.finalizedAt ? new Date(result.finalizedAt).toLocaleString() : '-'}</p></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse text-sm"><thead className="kpi-tpl-thead"><tr><th className="px-4 py-3 text-left">KPI</th><th className="px-4 py-3 text-right">Target</th><th className="px-4 py-3 text-right">Actual</th><th className="px-4 py-3 text-right">Score %</th><th className="px-4 py-3 text-right">Weighted</th></tr></thead><tbody>{result.lines.map((line) => <tr key={line.templateRowId} className="border-t border-gray-100"><td className="px-4 py-3 font-medium text-gray-800">{line.kpiLabel}</td><td className="px-4 py-3 text-right">{line.target ?? '-'}</td><td className="px-4 py-3 text-right">{line.actualValue ?? '-'}</td><td className="px-4 py-3 text-right">{line.score == null ? '-' : line.score.toFixed(2)}</td><td className="px-4 py-3 text-right">{line.weightedScore == null ? '-' : line.weightedScore.toFixed(2)}</td></tr>)}</tbody></table></div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DepartmentKpiResultsPage;
