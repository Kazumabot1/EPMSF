import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiCycleService } from '../../../services/departmentKpiService';
import type { DepartmentKpiCycle } from '../../../types/departmentKpi';

const DepartmentKpiCycleListPage = () => {
  const [cycles, setCycles] = useState<DepartmentKpiCycle[]>([]);

  const load = async () => {
    try {
      setCycles(await departmentKpiCycleService.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI cycles.');
    }
  };

  useEffect(() => { void load(); }, []);

  const toggle = async (cycle: DepartmentKpiCycle) => {
    try {
      const active = cycle.status !== 'ACTIVE';
      await departmentKpiCycleService.updateStatus(cycle.id, active);
      toast.success(active ? 'Department KPI cycle activated.' : 'Department KPI cycle deactivated.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status update failed.');
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Department KPI Cycles</h1></div>
          <Link to="/hr/department-kpi-cycle/new" className="kpi-tpl-btn-primary no-underline">New Cycle</Link>
        </header>
        <div className="kpi-tpl-card overflow-hidden p-0">
          <table className="w-full border-collapse text-sm">
            <thead className="kpi-tpl-thead"><tr><th className="px-4 py-3 text-left">Cycle</th><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-left">Templates</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>{cycles.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No Department KPI cycles yet.</td></tr> : cycles.map((cycle) => (
              <tr key={cycle.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900">{cycle.cycleName}</td>
                <td className="px-4 py-3 text-gray-600">{cycle.startDate} - {cycle.endDate}</td>
                <td className="px-4 py-3 text-gray-600">{cycle.templates.map((t) => t.title).join(', ') || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{cycle.status}</td>
                <td className="px-4 py-3 text-right"><Link className="kpi-tpl-btn-secondary mr-2 inline-flex no-underline" to={`/hr/department-kpi-cycle/${cycle.id}/edit`}>Edit</Link><button className="kpi-tpl-btn-primary" onClick={() => void toggle(cycle)}>{cycle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentKpiCycleListPage;
