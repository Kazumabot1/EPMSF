import type { Signature } from '../../types/signature';

type SignatureCardProps = {
  item: Signature;
  busy?: boolean;
  onEdit: (item: Signature) => void;
  onDelete: (item: Signature) => void;
  onSetDefault: (item: Signature) => void;
};

const SignatureCard = ({ item, busy = false, onEdit, onDelete, onSetDefault }: SignatureCardProps) => {
  const src = item.imageData.startsWith('data:') ? item.imageData : `data:${item.imageType};base64,${item.imageData}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{item.name}</h4>
        {item.isDefault ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Default
          </span>
        ) : null}
      </div>
      <div className="mb-3 rounded border border-slate-100 bg-slate-50 p-2">
        <img src={src} alt={item.name} className="h-20 w-full object-contain" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(item)}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <i className="bi bi-pencil mr-1" />
          Edit
        </button>
        <button
          type="button"
          disabled={busy || item.isDefault}
          onClick={() => onSetDefault(item)}
          className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          <i className="bi bi-check2-circle mr-1" />
          Set Default
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(item)}
          className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
        >
          <i className="bi bi-trash mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
};

export default SignatureCard;
