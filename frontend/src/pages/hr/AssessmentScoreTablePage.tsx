import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type { AssessmentScoreRow } from '../../types/employeeAssessment';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  return fallback;
};

const scoreBadgeClass = (label: string) => {
  switch (label) {
    case 'Outstanding':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'Good':
      return 'border-blue-300 bg-blue-100 text-blue-800';
    case 'Meet Requirement':
      return 'border-yellow-300 bg-yellow-100 text-yellow-800';
    case 'Need Improvement':
      return 'border-orange-300 bg-orange-100 text-orange-800';
    default:
      return 'border-red-300 bg-red-100 text-red-800';
  }
};

const AssessmentScoreTablePage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        setRows(await employeeAssessmentService.scoreTable());
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load employee assessment score table.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.employeeName, row.employeeCode, row.departmentName, row.period, row.performanceLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, rows]);

  const average = useMemo(() => {
    if (!filteredRows.length) return 0;
    return Number((filteredRows.reduce((sum, row) => sum + row.scorePercent, 0) / filteredRows.length).toFixed(2));
  }, [filteredRows]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <i className="bi bi-clipboard-data" /> HR Assessment Scores
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Employee Assessment Score Table</h1>
              <p className="mt-1 text-sm text-slate-500">Submitted employee self-assessments with calculated score and performance category.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Submissions</p>
                <p className="text-2xl font-bold text-slate-800">{filteredRows.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Average</p>
                <p className="text-2xl font-bold text-slate-800">{average}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <i className="bi bi-search text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employee, code, department, period, or performance..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                <i className="bi bi-x-circle" />
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading score table...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No submitted employee assessments found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{row.employeeName}</p>
                        <p className="text-xs text-slate-500">{row.employeeCode || row.employeeId || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.departmentName || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.period}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.totalScore} / {row.maxScore}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.scorePercent}%</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBadgeClass(row.performanceLabel)}`}>
                          {row.performanceLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentScoreTablePage;
