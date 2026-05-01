import { useEffect, useState } from 'react';
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

const EmployeeAssessmentScoresPage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        setRows(await employeeAssessmentService.myScores());
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load assessment scores.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <i className="bi bi-table" /> Employee Score Table
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Assessment Scores</h1>
          <p className="mt-1 text-sm text-slate-500">Submitted self-assessments and calculated performance scores.</p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading scores...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No submitted assessment scores yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.period}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.totalScore} / {row.maxScore}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.scorePercent}%</td>
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

export default EmployeeAssessmentScoresPage;
