import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ManagerKpiAssignment } from '../../types/kpiWorkflow';

export type DraftScores = Record<number, Record<number, string>>;

type Props = {
  open: boolean;
  assignment: ManagerKpiAssignment | null;
  drafts: DraftScores;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (employeeKpiFormId: number, kpiFormItemId: number, value: string) => void;
  onSave: (assignment: ManagerKpiAssignment) => void | Promise<void>;
};

const blockedNumberKeys = new Set(['-', '+', 'e', 'E']);

function isAllowedActualText(value: string) {
  if (value === '') {
    return true;
  }
  return /^\d+(\.\d*)?$/.test(value) && Number.isFinite(Number(value));
}

function isInvalidActualText(value: string) {
  if (value.trim() === '') {
    return false;
  }
  const numericValue = Number(value);
  return !Number.isFinite(numericValue) || numericValue < 1 || numericValue > 100;
}

const ManagerEmployeeKpiScoreModal = ({
  open,
  assignment,
  drafts,
  saving,
  onClose,
  onDraftChange,
  onSave,
}: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || assignment == null) return null;

  const isFinal = assignment.status === 'FINALIZED';

  const overlay = (
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
        aria-labelledby="mgr-kpi-modal-title"
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
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1.25rem 1.25rem 0',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <h2 id="mgr-kpi-modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
              {assignment.employeeName}
            </h2>
            <p style={{ margin: '.4rem 0 0', fontSize: '.82rem', color: '#64748b' }}>
              Status: <strong>{assignment.status}</strong>
              {assignment.totalScore != null && (
                <>
                  {' '}
                  · Avg achievement % (weighted): <strong>{assignment.totalScore.toFixed(2)}</strong>
                </>
              )}
              {assignment.totalWeightedScore != null && (
                <>
                  {' '}
                  · Weighted score total: <strong>{assignment.totalWeightedScore.toFixed(2)}</strong>
                </>
              )}
            </p>
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

        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>KPI</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>Target</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>Weight %</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>Actual</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>Achievement %</th>
                  <th style={{ padding: '.5rem', borderBottom: '1px solid #e2e8f0' }}>Weighted score</th>
                </tr>
              </thead>
              <tbody>
                {assignment.lines.map((line) => {
                  const rawDraft = drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId]?.trim() ?? '';
                  const actualDraft = drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId] ?? '';
                  const actualInvalid = isInvalidActualText(actualDraft);
                  const draftNum = rawDraft === '' ? null : Number(rawDraft);
                  const tgt = line.target != null && line.target > 0 ? line.target : null;
                  const previewPct =
                    draftNum != null && !Number.isNaN(draftNum) && tgt != null ? (draftNum / tgt) * 100 : null;
                  const achievementDisp =
                    previewPct != null
                      ? previewPct.toFixed(2)
                      : line.score != null
                        ? line.score.toFixed(2)
                        : '—';
                  return (
                    <tr key={line.kpiFormItemId}>
                      <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                        {line.kpiLabel ?? '—'}
                        {line.unitName ? <span style={{ color: '#94a3b8' }}> ({line.unitName})</span> : null}
                      </td>
                      <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9' }}>{line.target ?? '—'}</td>
                      <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9' }}>{line.weight ?? '—'}</td>
                      <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={0.01}
                          disabled={isFinal}
                          value={drafts[assignment.employeeKpiFormId]?.[line.kpiFormItemId] ?? ''}
                          onKeyDown={(e) => {
                            if (blockedNumberKeys.has(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (!isAllowedActualText(pasted)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            if (isAllowedActualText(e.target.value)) {
                              onDraftChange(assignment.employeeKpiFormId, line.kpiFormItemId, e.target.value);
                            }
                          }}
                          style={{
                            width: '100px',
                            padding: '.35rem .5rem',
                            borderRadius: '8px',
                            border: actualInvalid ? '1px solid #ef4444' : '1px solid #cbd5e1',
                            background: actualInvalid ? '#fff7f7' : '#fff',
                            color: actualInvalid ? '#991b1b' : '#0f172a',
                            outlineColor: actualInvalid ? '#ef4444' : undefined,
                          }}
                        />
                      </td>
                      <td
                        style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}
                        title="(actual ÷ target) × 100"
                      >
                        {achievementDisp}
                      </td>
                      <td style={{ padding: '.55rem', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                        {line.weightedScore != null ? line.weightedScore.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.65rem', marginTop: '1.1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '.55rem 1rem',
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
            <button
              type="button"
              disabled={isFinal || saving}
              onClick={() => void onSave(assignment)}
              style={{
                padding: '.55rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: isFinal ? '#94a3b8' : '#059669',
                color: '#fff',
                fontWeight: 600,
                cursor: isFinal ? 'not-allowed' : 'pointer',
                opacity: isFinal ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save actuals'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default ManagerEmployeeKpiScoreModal;
