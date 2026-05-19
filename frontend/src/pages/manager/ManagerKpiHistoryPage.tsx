import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../services/kpiWorkflowService';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';

const formatWhen = (value: string | null | undefined) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const ManagerKpiHistoryPage = () => {
  const [rows, setRows] = useState<ManagerKpiAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await kpiWorkflowService.managerHistory();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load KPI history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        `${b.finalizedAt ?? ''}\t${b.employeeName}`.localeCompare(
          `${a.finalizedAt ?? ''}\t${a.employeeName}`,
          undefined,
          { sensitivity: 'base' },
        ),
      ),
    [rows],
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '1.4rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            background: '#eef2ff',
            color: '#3730a3',
            fontSize: '.75rem',
            fontWeight: 700,
            padding: '.3rem .75rem',
            borderRadius: '999px',
            marginBottom: '.75rem',
          }}
        >
          <i className="bi bi-clock-history" /> KPI Management
        </span>
        <h1 style={{ fontSize: '1.65rem', color: '#1e293b', margin: '0 0 .35rem' }}>Employee KPI History</h1>
        <p style={{ color: '#64748b', margin: 0, maxWidth: '720px' }}>
          Finalized KPI records for employees in your department. Assigned and in-progress forms stay under Employee KPI Form.
        </p>
      </header>

      {loading && <p style={{ color: '#64748b' }}>Loading...</p>}

      {!loading && sorted.length === 0 && (
        <div
          style={{
            padding: '2rem',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            background: '#f8fafc',
            color: '#64748b',
          }}
        >
          No finalized employee KPI records yet.
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Position</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>KPI template</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Weighted total</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Finalized</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Reason</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0', width: '90px' }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <Fragment key={row.employeeKpiFormId}>
                  <tr>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontWeight: 700 }}>
                      {row.employeeName}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {row.positionTitle ?? '-'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {row.kpiTitle ?? '-'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a' }}>
                      {row.totalWeightedScore != null ? row.totalWeightedScore.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatWhen(row.finalizedAt)}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569', maxWidth: '240px' }}>
                      {row.earlyFinalizedReason ? <span title={row.earlyFinalizedReason}>{row.earlyFinalizedReason}</span> : '-'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedId((prev) => (prev === row.employeeKpiFormId ? null : row.employeeKpiFormId))}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          borderRadius: '8px',
                          padding: '.35rem .6rem',
                          fontSize: '.78rem',
                          cursor: 'pointer',
                          color: '#334155',
                        }}
                      >
                        {expandedId === row.employeeKpiFormId ? 'Hide' : 'Lines'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === row.employeeKpiFormId && (
                    <tr>
                      <td colSpan={7} style={{ padding: '0 1rem 1rem', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ overflowX: 'auto', paddingTop: '.75rem' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>KPI</th>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>Target</th>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>Weight %</th>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>Actual</th>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>Achievement %</th>
                                <th style={{ padding: '.4rem', borderBottom: '1px solid #e2e8f0' }}>Weighted score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.lines.map((line) => (
                                <tr key={line.kpiFormItemId}>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>{line.kpiLabel ?? '-'}</td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>{line.target ?? '-'}</td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>{line.weight ?? '-'}</td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>{line.actualValue ?? '-'}</td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.score != null ? line.score.toFixed(2) : '-'}
                                  </td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.weightedScore != null ? line.weightedScore.toFixed(2) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManagerKpiHistoryPage;

