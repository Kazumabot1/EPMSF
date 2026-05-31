import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Signature, SignatureCreateRequest, SignatureSourceType, SignatureUpdateRequest } from '../../types/signature';
import { signatureService } from '../../services/signatureService';
import SignatureCanvas from './SignatureCanvas';
import SignatureUpload from './SignatureUpload';
import SignatureCard from './SignatureCard';

type SignatureModalProps = {
  open: boolean;
  onClose: () => void;
};

const SignatureModal = ({ open, onClose }: SignatureModalProps) => {
  const [items, setItems] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SignatureSourceType>('DRAWN');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const editing = useMemo(() => items.find((item) => item.id === editingId) ?? null, [items, editingId]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await signatureService.list();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load signatures.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSuccess('');
    void refresh();
  }, [open, refresh]);

  const clearForm = () => {
    setName('');
    setSourceType('DRAWN');
    setImageData(null);
    setImageType(null);
    setEditingId(null);
    setError('');
  };

  const onEdit = (item: Signature) => {
    setEditingId(item.id);
    setName(item.name);
    setSourceType(item.sourceType);
    setImageData(item.imageData);
    setImageType(item.imageType);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Signature name is required.');
      return;
    }
    if (!imageData || !imageType) {
      setError('Please draw or upload a signature image.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (editingId) {
        const payload: SignatureUpdateRequest = {
          name: name.trim(),
          imageData,
          imageType,
          sourceType,
        };
        await signatureService.update(editingId, payload);
        setSuccess('Signature updated.');
      } else {
        const payload: SignatureCreateRequest = {
          name: name.trim(),
          imageData,
          imageType,
          sourceType,
          isDefault: items.length === 0,
        };
        await signatureService.create(payload);
        setSuccess('Signature created.');
      }
      clearForm();
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: Signature) => {
    if (!window.confirm(`Delete signature "${item.name}"?`)) return;
    try {
      setSaving(true);
      setError('');
      await signatureService.remove(item.id);
      setSuccess('Signature deleted.');
      if (editingId === item.id) {
        clearForm();
      }
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const onSetDefault = async (item: Signature) => {
    try {
      setSaving(true);
      setError('');
      await signatureService.setDefault(item.id);
      setSuccess('Default signature updated.');
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to set default signature.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4" onClick={onClose} role="presentation">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="signature-modal-title">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="signature-modal-title" className="text-lg font-semibold text-slate-900">Signature Master Data</h2>
            <p className="text-xs text-slate-500">Create, manage, and select your default signature.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
            <i className="bi bi-x-lg text-lg" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{editing ? 'Update Signature' : 'Create Signature'}</h3>
              {editing ? (
                <button type="button" onClick={clearForm} className="text-xs text-slate-600 underline">
                  Cancel edit
                </button>
              ) : null}
            </div>
            <label className="block text-xs text-slate-700">
              Signature Name
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Official Signature" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${sourceType === 'DRAWN' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700'}`}
                onClick={() => setSourceType('DRAWN')}
              >
                <i className="bi bi-pencil mr-1" />
                Draw
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${sourceType === 'UPLOADED' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700'}`}
                onClick={() => setSourceType('UPLOADED')}
              >
                <i className="bi bi-upload mr-1" />
                Upload
              </button>
            </div>

            {sourceType === 'DRAWN' ? (
              <SignatureCanvas disabled={saving} onChange={(base64, type) => { setImageData(base64); setImageType(type); }} />
            ) : (
              <SignatureUpload disabled={saving} onChange={(base64, type, uploadError) => { setImageData(base64); setImageType(type); if (uploadError) setError(uploadError); }} />
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <i className={`bi ${saving ? 'bi-hourglass-split' : editing ? 'bi-check2-circle' : 'bi-plus-circle'} mr-2`} />
              {saving ? 'Saving...' : editing ? 'Update Signature' : 'Create Signature'}
            </button>
          </section>

          <section className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Saved Signatures</h3>
            {loading ? <p className="text-sm text-slate-500">Loading signatures...</p> : null}
            {!loading && items.length === 0 ? <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No signatures yet. Create your first signature.</p> : null}
            {!loading ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <SignatureCard
                    key={item.id}
                    item={item}
                    busy={saving}
                    onEdit={onEdit}
                    onDelete={(sig) => void onDelete(sig)}
                    onSetDefault={(sig) => void onSetDefault(sig)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        {(error || success) ? (
          <div className={`mx-5 mb-5 rounded-md px-4 py-2 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {error || success}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default SignatureModal;
