import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type { AssessmentScoreRow } from '../../types/employeeAssessment';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message;
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

const ProjectManagerDashboard = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const scoreRows = await employeeAssessmentService.scoreTable();
        setRows(scoreRows);
      } catch (err) {
        setRows([]);
        setError(
          getErrorMessage(
            err,
            'Unable to load project manager dashboard data.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const totalSubmissions = rows.length;

    const averageScore =
      totalSubmissions === 0
        ? 0
        : Number(
            (
              rows.reduce((sum, row) => sum + Number(row.scorePercent || 0), 0) /
              totalSubmissions
            ).toFixed(2)
          );

    const highPerformers = rows.filter(
      (row) =>
        row.performanceLabel === 'Outstanding' ||
        row.performanceLabel === 'Good'
    ).length;

    const needSupport = rows.filter(
      (row) =>
        row.performanceLabel === 'Need Improvement' ||
        row.performanceLabel === 'Unsatisfactory'
    ).length;

    return {
      totalSubmissions,
      averageScore,
      highPerformers,
      needSupport,
    };
  }, [rows]);

  const recentRows = rows.slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <i className="bi bi-kanban" />
            Project Manager
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Project Manager Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor project performance, employee assessment status, and team support needs.
              </p>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
              <i className="bi bi-info-circle me-2" />
              Project-level KPI and stakeholder feedback modules can be connected here next.
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Submitted Assessments
                </p>

                <p className="mt-2 text-3xl font-black text-slate-800">
                  {loading ? '—' : summary.totalSubmissions}
                </p>
              </div>

              <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <i className="bi bi-clipboard-check text-xl" />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Average Score
                </p>

                <p className="mt-2 text-3xl font-black text-slate-800">
                  {loading ? '—' : `${summary.averageScore}%`}
                </p>
              </div>

              <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <i className="bi bi-graph-up-arrow text-xl" />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  High Performers
                </p>

                <p className="mt-2 text-3xl font-black text-slate-800">
                  {loading ? '—' : summary.highPerformers}
                </p>
              </div>

              <span className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <i className="bi bi-trophy text-xl" />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Need Support
                </p>

                <p className="mt-2 text-3xl font-black text-slate-800">
                  {loading ? '—' : summary.needSupport}
                </p>
              </div>

              <span className="rounded-2xl bg-red-50 p-3 text-red-600">
                <i className="bi bi-exclamation-triangle text-xl" />
              </span>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-800">Recent Team Assessment Scores</h2>
              <p className="text-xs text-slate-500">
                Latest submitted assessments visible to Project Manager role.
              </p>
            </div>

            {loading ? (
              <div className="p-5 text-sm text-slate-500">Loading scores...</div>
            ) : recentRows.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                No submitted assessment scores found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Performance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recentRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">
                            {row.employeeName}
                          </p>

                          <p className="text-xs text-slate-500">
                            {row.employeeCode || row.employeeId || '-'}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.departmentName || '-'}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.period}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {row.scorePercent}%
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBadgeClass(
                              row.performanceLabel
                            )}`}
                          >
                            {row.performanceLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Project Manager Actions</h2>

            <p className="mt-1 text-sm text-slate-500">
              These cards prepare your project manager workflow.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-violet-50 p-2 text-violet-600">
                    <i className="bi bi-kanban" />
                  </span>

                  <div>
                    <p className="font-semibold text-slate-800">Project Performance</p>
                    <p className="text-xs text-slate-500">
                      Connect project KPI data here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <i className="bi bi-chat-square-text" />
                  </span>

                  <div>
                    <p className="font-semibold text-slate-800">Stakeholder Feedback</p>
                    <p className="text-xs text-slate-500">
                      Use this for project stakeholder evaluation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <i className="bi bi-file-earmark-bar-graph" />
                  </span>

                  <div>
                    <p className="font-semibold text-slate-800">Project Reports</p>
                    <p className="text-xs text-slate-500">
                      Add exportable project performance reports next.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard;