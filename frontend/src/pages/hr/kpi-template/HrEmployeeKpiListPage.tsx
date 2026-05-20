import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { kpiWorkflowService } from '../../../services/kpiWorkflowService';
import { fetchDepartments, type Department } from '../../../services/departmentService';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';
import HrEmployeeKpiModal from './HrEmployeeKpiModal';

type HrKpiTab = 'finalized' | 'in_progress';

const formatWhen = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const linesEnteredCount = (r: HrEmployeeKpiRow) =>
  r.lines.filter((l) => l.score != null || l.actualValue != null).length;

const HrEmployeeKpiListPage = () => {
  const [tab, setTab] = useState<HrKpiTab>('finalized');
  const [rows, setRows] = useState<HrEmployeeKpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<HrEmployeeKpiRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDepartments = async () => {
      try {
        const depts = await fetchDepartments();
        if (!cancelled) setDepartments(depts.filter((d) => d.status !== false));
      } catch {
        // non-critical, skip silently
      }
    };
    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setExpandedId(null);
        const data =
          tab === 'finalized'
            ? await kpiWorkflowService.hrFinalizedResults()
            : await kpiWorkflowService.hrInProgressResults();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (selectedDeptId != null) {
      const matched = departments.find((d) => d.id === selectedDeptId);
      if (matched) {
        copy.splice(0, copy.length, ...copy.filter((r) => r.departmentName === matched.departmentName));
      }
    }
    if (tab === 'finalized') {
      copy.sort((a, b) => (b.finalizedAt ?? '').localeCompare(a.finalizedAt ?? ''));
    } else {
      copy.sort((a, b) =>
        `${a.kpiTitle ?? ''}\t${a.employeeName}`.localeCompare(
          `${b.kpiTitle ?? ''}\t${b.employeeName}`,
          undefined,
          { sensitivity: 'base' },
        ),
      );
    }
    return copy;
  }, [rows, tab, selectedDeptId, departments]);

  const colCount = 8;

  const tabBtnStyle = (active: boolean): CSSProperties => ({
    padding: '.45rem .9rem',
    borderRadius: '999px',
    border: active ? '1px solid #059669' : '1px solid #e2e8f0',
    background: active ? '#ecfdf5' : '#fff',
    color: active ? '#047857' : '#64748b',
    fontWeight: 600,
    fontSize: '.82rem',
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ marginBottom: '1rem', fontSize: '.85rem', color: '#64748b' }}>
        <Link to="/hr/kpi-template" style={{ color: '#059669', textDecoration: 'none' }}>
          KPI Templates
        </Link>
        <span style={{ margin: '0 .35rem' }}>/</span>
        <span>Employee KPI</span>
      </nav>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .35rem' }}>Employee KPI</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem', maxWidth: '720px' }}>
        Review KPI assignments across departments. <strong>In progress</strong> shows scores managers have entered before finalization;
        <strong> Finalized</strong> lists locked records (including period-end auto-finalization when you open that tab).
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <label htmlFor="dept-filter" style={{ fontSize: '.82rem', color: '#64748b', fontWeight: 600 }}>
          Department:
        </label>
        <select
          id="dept-filter"
          value={selectedDeptId ?? ''}
          onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : null)}
          style={{
            padding: '.4rem .6rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#334155',
            fontSize: '.82rem',
            cursor: 'pointer',
            minWidth: '180px',
          }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.departmentName}
            </option>
          ))}
        </select>
        {selectedDeptId != null && (
          <button
            type="button"
            onClick={() => setSelectedDeptId(null)}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              borderRadius: '8px',
              padding: '.35rem .65rem',
              fontSize: '.78rem',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.25rem' }}>
        <button type="button" style={tabBtnStyle(tab === 'finalized')} onClick={() => setTab('finalized')}>
          Finalized
        </button>
        <button type="button" style={tabBtnStyle(tab === 'in_progress')} onClick={() => setTab('in_progress')}>
          In progress
        </button>
      </div>

      {loading && <p style={{ color: '#64748b' }}>Loading…</p>}

      {!loading && sorted.length === 0 && (
        <div
          style={{
            padding: '2rem',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            background: '#f8fafc',
            color: '#64748b',
          }}
        >
          {tab === 'finalized'
            ? 'No finalized employee KPI records yet.'
            : 'No in-progress KPI assignments (everyone may already be finalized, or no templates have been applied yet).'}
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Department</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Position</th>
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>KPI template</th>
                {tab === 'in_progress' && (
                  <>
                    <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Workflow status</th>
                    <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Lines entered</th>
                  </>
                )}
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Weighted total</th>
                {tab === 'finalized' && (
                  <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Finalized</th>
                )}
                {tab === 'finalized' && (
                  <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0' }}>Reason</th>
                )}
                <th style={{ padding: '.65rem', borderBottom: '1px solid #e2e8f0', width: '100px' }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Fragment key={r.employeeKpiFormId}>
                  <tr>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRow(r)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          fontSize: '.85rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationColor: '#94a3b8',
                        }}
                      >
                        {r.employeeName}
                      </button>
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {r.departmentName ?? '—'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {r.positionTitle ?? '—'}
                    </td>
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{r.kpiTitle}</td>
                    {tab === 'in_progress' && (
                      <>
                        <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                          {r.status ?? '—'}
                        </td>
                        <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                          {linesEnteredCount(r)}/{r.lines.length}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a' }}>
                      {r.totalWeightedScore != null ? r.totalWeightedScore.toFixed(2) : '—'}
                    </td>
                    {tab === 'finalized' && (
                      <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatWhen(r.finalizedAt)}
                      </td>
                    )}
                    {tab === 'finalized' && (
                      <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9', color: '#475569', maxWidth: '220px' }}>
                        {r.earlyFinalizedReason ? (
                          <span title={r.earlyFinalizedReason}>{r.earlyFinalizedReason}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td style={{ padding: '.65rem', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === r.employeeKpiFormId ? null : r.employeeKpiFormId))
                        }
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
                        {expandedId === r.employeeKpiFormId ? 'Hide' : 'Lines'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.employeeKpiFormId && (
                    <tr>
                      <td
                        colSpan={colCount}
                        style={{ padding: '0 1rem 1rem', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <div style={{ overflowX: 'auto', paddingTop: '.75rem' }}>
                          {tab === 'in_progress' && (
                            <p style={{ margin: '0 0 .5rem', fontSize: '.78rem', color: '#64748b' }}>
                              Draft view — totals update as managers save; numbers are not locked until the department is
                              finalized.
                            </p>
                          )}
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
                              {r.lines.map((line) => (
                                <tr key={line.kpiFormItemId}>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>{line.kpiLabel ?? '—'}</td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.target != null ? line.target : '—'}
                                  </td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.weight != null ? line.weight : '—'}
                                  </td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.actualValue != null ? line.actualValue : '—'}
                                  </td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.score != null ? line.score.toFixed(2) : '—'}
                                  </td>
                                  <td style={{ padding: '.4rem', borderBottom: '1px solid #f1f5f9' }}>
                                    {line.weightedScore != null ? line.weightedScore.toFixed(4) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {r.totalScore != null && (
                            <p style={{ margin: '.75rem 0 0', fontSize: '.78rem', color: '#64748b' }}>
                              Avg achievement % (weighted):{' '}
                              <strong style={{ color: '#0f172a' }}>{r.totalScore.toFixed(2)}</strong>
                            </p>
                          )}
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

      <HrEmployeeKpiModal open={selectedRow !== null} row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
};

export default HrEmployeeKpiListPage;
