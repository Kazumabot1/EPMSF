import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../../../components/hr/kpi-template/kpi-template.css';
import { departmentKpiTemplateService } from '../../../services/departmentKpiService';
import type { DepartmentKpiTemplate } from '../../../types/departmentKpi';

const DepartmentKpiTemplateListPage = () => {
  const [templates, setTemplates] = useState<DepartmentKpiTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setTemplates(await departmentKpiTemplateService.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Department KPI templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const archive = async (id: number) => {
    if (!window.confirm('Archive this Department KPI template?')) return;
    try {
      await departmentKpiTemplateService.delete(id);
      toast.success('Department KPI template archived.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed.');
    }
  };

  return (
    <div className="kpi-tpl-page">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Department KPI</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Department KPI Templates</h1>
          </div>
          <Link to="/hr/department-kpi-template/new" className="kpi-tpl-btn-primary no-underline">New Template</Link>
        </header>
        <div className="kpi-tpl-card overflow-hidden p-0">
          <table className="w-full border-collapse text-sm">
            <thead className="kpi-tpl-thead"><tr><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Departments</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr> : templates.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No Department KPI templates yet.</td></tr> : templates.map((template) => (
                <tr key={template.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{template.title}</td>
                  <td className="px-4 py-3 text-gray-600">{template.departments.map((d) => d.departmentName).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{template.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="kpi-tpl-btn-secondary mr-2 inline-flex no-underline" to={`/hr/department-kpi-template/${template.id}/edit`}>Edit</Link>
                    <button className="kpi-tpl-btn-secondary" onClick={() => void archive(template.id)}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentKpiTemplateListPage;
