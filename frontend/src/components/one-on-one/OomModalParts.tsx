import type { ReactNode } from 'react';
import { OOM_FONT, oomModalOverlay, oomModalPanel } from './oneOnOneUi';

type OomModalProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
};

export function OomModal({ title, subtitle, onClose, children, footer, danger }: OomModalProps) {
  return (
    <div
      className={oomModalOverlay}
      role="dialog"
      aria-modal="true"
      style={{ fontFamily: OOM_FONT }}
      onClick={onClose}
    >
      <div
        className={`${oomModalPanel} ${danger ? 'max-w-md' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {subtitle && (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2563eb]">{subtitle}</p>
            )}
            <h2 className="text-base font-bold text-[#0f172a] sm:text-lg">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dbe7f6] bg-[#f1f5f9] text-[#334155] transition hover:bg-[#e2e8f0]"
            aria-label="Close"
          >
            <i className="bi bi-x-lg text-sm" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function OomInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[#f1f5f9] py-2.5 sm:grid-cols-[140px_1fr] sm:gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-[#64748b]">{label}</span>
      <span className="text-sm text-[#0f172a]">{value}</span>
    </div>
  );
}

export function OomTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-bold text-[#334155]">{label}</p>
      <p className="whitespace-pre-wrap rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[#475569]">
        {value}
      </p>
    </div>
  );
}
