import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  rowLabel?: string;
  confirmText: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

const KpiRowReasonModal = ({ open, title, rowLabel, confirmText, onConfirm, onCancel }: Props) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const trimmed = reason.trim();
  const showError = touched && trimmed.length === 0;

  return createPortal(
    <div className="kpi-tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kpi-tpl-reason-modal">
        <div className="kpi-tpl-modal-header">
          <div>
            <p className="kpi-tpl-modal-kicker">Reason required</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onCancel} className="kpi-tpl-btn-secondary">
            <i className="bi bi-x-lg" aria-hidden />
            Close
          </button>
        </div>
        <div className="kpi-tpl-modal-body">
          {rowLabel && <p className="kpi-tpl-reason-row">{rowLabel}</p>}
          <label className="kpi-tpl-reason-field">
            Reason
            <textarea
              value={reason}
              onBlur={() => setTouched(true)}
              onChange={(event) => setReason(event.target.value)}
              className="kpi-tpl-input"
              rows={4}
              autoFocus
              placeholder="Enter the reason for this row change"
            />
          </label>
          {showError && <p className="kpi-tpl-reason-error">Reason is required.</p>}
        </div>
        <div className="kpi-tpl-modal-footer kpi-tpl-reason-footer">
          <button type="button" onClick={onCancel} className="kpi-tpl-btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setTouched(true);
              if (trimmed.length > 0) {
                onConfirm(trimmed);
              }
            }}
            className="kpi-tpl-btn-primary"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default KpiRowReasonModal;
