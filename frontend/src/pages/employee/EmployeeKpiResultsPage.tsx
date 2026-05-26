import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { EmployeeKpiResult } from '../../types/kpiWorkflow';

const formatWhen = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
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

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .35rem' }}>My KPI results</h1>
      <p style={{ color: '#64748b', marginBottom: '1.75rem' }}>
        Finalized scores from your manager appear here. New results arrive as in-app notifications.
      </p>

      {loading && <p style={{ color: '#64748b' }}>Loading…</p>}

      {!loading && rows.length === 0 && (
        <div
          style={{
            padding: '2rem',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            background: '#f8fafc',
            color: '#64748b',
          }}
        >
          No finalized KPI results yet.
        </div>
      )}

      {!loading &&
        rows.map((r) => (
          <article
            key={r.employeeKpiFormId}
            style={{
              marginBottom: '1.5rem',
              padding: '1.35rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: '#fff',
            }}
          >
            <header style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>{r.kpiTitle}</h2>
              <p style={{ margin: '.4rem 0 0', fontSize: '.82rem', color: '#64748b' }}>
                {r.positionTitle && (
                  <>
                    Position: <strong style={{ color: '#0f172a' }}>{r.positionTitle}</strong> Â·{' '}
                  </>
                )}
                Finalized {formatWhen(r.finalizedAt)}
                {r.totalScore != null && (
                  <>
                    {' '}
                    · Avg achievement % (weighted):{' '}
                    <strong style={{ color: '#0f172a' }}>{r.totalScore.toFixed(2)}</strong>
                  </>
                )}
                {r.totalWeightedScore != null && (
                  <>
                    {' '}
                    · Weighted score total:{' '}
                    <strong style={{ color: '#0f172a' }}>{r.totalWeightedScore.toFixed(2)}</strong>
                  </>
                )}
              </p>
              {r.earlyFinalizedReason && (
                <p style={{ margin: '.65rem 0 0', fontSize: '.82rem', color: '#475569' }}>
                  Finalization reason: <strong style={{ color: '#0f172a' }}>{r.earlyFinalizedReason}</strong>
                </p>
              )}
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0' }}>KPI</th>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Target</th>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Weight %</th>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actual</th>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Achievement %</th>
                    <th style={{ padding: '.45rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Weighted score</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lines.map((line) => (
                    <tr key={line.kpiFormItemId}>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                        {line.kpiLabel ?? '—'}
                      </td>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{line.target ?? '—'}</td>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{line.weight ?? '—'}</td>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {line.actualValue != null ? line.actualValue : '—'}
                      </td>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {line.score != null ? Number(line.score).toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {line.weightedScore != null ? line.weightedScore.toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
    </div>
  );
};

export default EmployeeKpiResultsPage;

