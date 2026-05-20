export type AppraisalPopupType = 'success' | 'error' | 'confirm' | 'info';

interface AppraisalPopupProps {
  open: boolean;
  type?: AppraisalPopupType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const iconByType: Record<AppraisalPopupType, string> = {
  success: 'bi-check-circle',
  error: 'bi-exclamation-circle',
  confirm: 'bi-question-circle',
  info: 'bi-info-circle',
};

const AppraisalPopup = ({
  open,
  type = 'info',
  title,
  message,
  confirmText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}: AppraisalPopupProps) => {
  if (!open) return null;

  const isConfirm = type === 'confirm';
  const close = isConfirm ? onCancel : onClose;

  return (
    <div className="appraisal-popup-backdrop" role="dialog" aria-modal="true" aria-labelledby="appraisal-popup-title">
      <div className={`appraisal-popup-box ${type}`}>
        <div className="appraisal-popup-icon"><i className={`bi ${iconByType[type]}`} /></div>
        <h3 id="appraisal-popup-title">{title}</h3>
        <p>{message}</p>
        <div className="appraisal-popup-actions">
          {isConfirm ? (
            <>
              <button className="appraisal-button secondary" type="button" disabled={loading} onClick={close}>{cancelText}</button>
              <button className="appraisal-button primary" type="button" disabled={loading} onClick={onConfirm}>{loading ? 'Submitting...' : confirmText}</button>
            </>
          ) : (
            <button className="appraisal-button primary" type="button" onClick={close}>Okay</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppraisalPopup;
