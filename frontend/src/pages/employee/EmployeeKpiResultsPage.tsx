import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import './employee-kpi-results.css';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { EmployeeKpiResult } from '../../types/kpiWorkflow';

const formatWhen = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const formatPercent = (value?: number | null) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(2)}%`;
};

const average = (values: Array<number | null | undefined>) => {
  const valid = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const EmployeeKpiResultsPage = () => {
  const [rows, setRows] = useState<EmployeeKpiResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await kpiWorkflowService.myFinalizedResults();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load KPIs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const latest = [...rows].sort((a, b) => new Date(b.finalizedAt || '').getTime() - new Date(a.finalizedAt || '').getTime())[0];
    const avgAchievement = average(rows.map((row) => row.totalScore));
    const avgWeighted = average(rows.map((row) => row.totalWeightedScore));
    return {
      total: rows.length,
      latestTitle: latest?.kpiTitle || 'No finalized KPI yet',
      averageAchievement: avgAchievement,
      averageWeighted: avgWeighted,
    };
  }, [rows]);

  return (
    <div className="epms-refined-page employee-kpi-page">
      <section className="epms-refined-hero epms-refined-hero--light">
        <div>
          <p className="epms-refined-eyebrow">My Performance</p>
          <h1>My KPI Results</h1>
          <p>Finalized scores and in-progress actuals entered by your evaluator appear here.</p>
        </div>
        <div className="epms-refined-hero-stat">
          <strong>{stats.total}</strong>
          <span>KPI result(s)</span>
        </div>
      </section>

      <section className="epms-refined-metric-grid epms-refined-metric-grid--three" aria-label="KPI summary">
        <article className="epms-refined-metric-card">
          <span>Latest KPI</span>
          <strong>{stats.latestTitle}</strong>
          <small>Most recent available result</small>
        </article>
        <article className="epms-refined-metric-card">
          <span>Average Achievement</span>
          <strong>{formatPercent(stats.averageAchievement)}</strong>
          <small>Weighted achievement score</small>
        </article>
        <article className="epms-refined-metric-card">
          <span>Weighted Score</span>
          <strong>{formatPercent(stats.averageWeighted)}</strong>
          <small>Average finalized weighted total</small>
        </article>
      </section>

      {loading && <div className="epms-refined-card epms-refined-empty">Loading KPI results…</div>}

      {!loading && rows.length === 0 && (
        <div className="epms-refined-card epms-refined-empty">
          No KPI results yet. Scores appear here once your evaluator records actual values.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="epms-refined-stack">
          {rows.map((r) => (
            <article className="epms-refined-card employee-kpi-result-card" key={r.employeeKpiFormId}>
              <header className="epms-refined-card-header">
                <div>
                  <p className="epms-refined-eyebrow">KPI Result</p>
                  <h2>{r.kpiTitle}</h2>
                  <p>
                    {r.positionTitle && (
                      <>
                        Position: <strong>{r.positionTitle}</strong> ·{' '}
                      </>
                    )}
                    {r.status === 'FINALIZED'
                      ? `Finalized ${formatWhen(r.finalizedAt)}`
                      : `Status: ${r.status?.replace(/_/g, ' ') ?? 'In progress'}`}
                  </p>
                </div>
                <div className="epms-refined-score-pill">
                  <strong>{formatPercent(r.totalWeightedScore ?? r.totalScore)}</strong>
                  <span>Weighted total</span>
                </div>
              </header>

              {r.earlyFinalizedReason && (
                <div className="epms-refined-note">
                  Finalization reason: <strong>{r.earlyFinalizedReason}</strong>
                </div>
              )}

              <div className="epms-refined-table-wrap">
                <table className="epms-refined-table">
                  <thead>
                    <tr>
                      <th>KPI</th>
                      <th className="text-end">Target</th>
                      <th className="text-end">Weight %</th>
                      <th className="text-end">Actual</th>
                      <th className="text-end">Achievement %</th>
                      <th className="text-end">Weighted Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lines.map((line) => (
                      <tr key={line.kpiFormItemId}>
                        <td>{line.kpiLabel ?? '—'}</td>
                        <td className="text-end">{line.target ?? '—'}</td>
                        <td className="text-end">{line.weight ?? '—'}</td>
                        <td className="text-end">{line.actualValue != null ? line.actualValue : '—'}</td>
                        <td className="text-end">{line.score != null ? Number(line.score).toFixed(2) : '—'}</td>
                        <td className="text-end">{line.weightedScore != null ? line.weightedScore.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeKpiResultsPage;
