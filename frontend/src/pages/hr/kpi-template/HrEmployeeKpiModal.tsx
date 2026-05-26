import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HrEmployeeKpiRow } from '../../../types/kpiWorkflow';

type Props = {
  open: boolean;
  row: HrEmployeeKpiRow | null;
  onClose: () => void;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const HrEmployeeKpiModal = ({ open, row, onClose }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || row == null) return null;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-kpi-modal-title"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: 'min(90vh, 920px)',
          overflow: 'auto',
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div>
            <h2 id="hr-kpi-modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
              {row.employeeName}
            </h2>
            <p style={{ margin: '.4rem 0 0', fontSize: '.82rem', color: '#64748b' }}>
              {row.departmentName && <span>{row.departmentName} · </span>}
              {row.positionTitle && <span>{row.positionTitle} · </span>}
              KPI: <strong>{row.kpiTitle}</strong>
            </p>
            {row.periodStartDate && row.periodEndDate && (
              <p style={{ margin: '.3rem 0 0', fontSize: '.8rem', color: '#475569' }}>
                Period:{' '}
                <strong>
                  {formatDate(row.periodStartDate)} – {formatDate(row.periodEndDate)}
                </strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              border: 'none',
              background: '#f1f5f9',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Summary strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '.75rem 1.25rem',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            fontSize: '.82rem',
            color: '#475569',
          }}
        >
          <span>
            Status: <strong style={{ color: '#0f172a' }}>{row.status ?? '—'}</strong>
          </span>
          {row.totalScore != null && (
            <span>
              Avg achievement %: <strong style={{ color: '#0f172a' }}>{row.totalScore.toFixed(2)}</strong>
            </span>
          )}
          {row.totalWeightedScore != null && (
            <span>
              Weighted score: <strong style={{ color: '#0f172a' }}>{row.totalWeightedScore.toFixed(2)}</strong>
            </span>
          )}
          {row.finalizedAt && (
            <span>
              Finalized: <strong style={{ color: '#0f172a' }}>{formatDate(row.finalizedAt)}</strong>
            </span>
          )}
          {row.earlyFinalizedReason && (
            <span>
              Reason: <strong style={{ color: '#0f172a' }}>{row.earlyFinalizedReason}</strong>
            </span>
          )}
        </div>

        {/* KPI lines table */}
        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>KPI</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Target</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Weight %</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actual</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Achievement %</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Weighted score</th>
                </tr>
              </thead>
              <tbody>
                {row.lines.map((line) => (
                  <tr key={line.kpiFormItemId}>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      {line.kpiLabel ?? '—'}
                      {line.unitName ? <span style={{ color: '#94a3b8' }}> ({line.unitName})</span> : null}
                    </td>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.target != null ? line.target : '—'}
                    </td>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.weight != null ? line.weight : '—'}
                    </td>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.actualValue != null ? line.actualValue : '—'}
                    </td>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.score != null ? line.score.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {line.weightedScore != null ? line.weightedScore.toFixed(4) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '.55rem 1.2rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default HrEmployeeKpiModal;

