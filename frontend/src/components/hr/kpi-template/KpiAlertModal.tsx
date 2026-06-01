import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'success' | 'info';
  onClose: () => void;
};

const KpiAlertModal = ({
  open,
  title,
  message,
  confirmText = 'OK',
  variant = 'success',
  onClose,
}: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const iconName = variant === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill';
  const iconWrapClass =
    variant === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600';

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kpi-alert-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl ${iconWrapClass}`}>
            <i className={`bi ${iconName}`} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="kpi-alert-title" className="text-lg font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default KpiAlertModal;
