import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signatureService } from '../../services/signatureService';
import type { Signature, SignatureSourceType } from '../../types/signature';
import SignatureCanvas from './SignatureCanvas';
import SignatureUpload from './SignatureUpload';

export type FormSignatureValue = {
  signatureId: number;
  imageData: string | null;
  imageType: string | null;
};

type FormSignaturePickerProps = {
  value: FormSignatureValue;
  onChange: (value: FormSignatureValue) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const NEW_SIGNATURE_VALUE = '__new__';

const toImageSrc = (imageData?: string | null, imageType?: string | null) => {
  if (!imageData || !imageType) return null;
  return imageData.startsWith('data:') ? imageData : `data:${imageType};base64,${imageData}`;
};

const FormSignaturePicker = ({
  value,
  onChange,
  disabled = false,
  label = 'Your signature',
  className = '',
}: FormSignaturePickerProps) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mode, setMode] = useState<'select' | 'create' | 'update'>('select');
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SignatureSourceType>('DRAWN');
  const [draftImageData, setDraftImageData] = useState<string | null>(null);
  const [draftImageType, setDraftImageType] = useState<string | null>(null);
  const autoSelectedRef = useRef(false);

  const previewSrc = useMemo(
    () => toImageSrc(value.imageData, value.imageType),
    [value.imageData, value.imageType],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await signatureService.list();
      setSignatures(items);
      return items;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load signatures.');
      setSignatures([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (value.signatureId > 0) {
      autoSelectedRef.current = true;
      return;
    }

    if (loading || signatures.length === 0 || autoSelectedRef.current) return;

    const defaultSignature = signatures.find((item) => item.isDefault) ?? signatures[0];
    if (!defaultSignature) return;

    autoSelectedRef.current = true;
    onChange({
      signatureId: defaultSignature.id,
      imageData: defaultSignature.imageData,
      imageType: defaultSignature.imageType,
    });
  }, [loading, signatures, value.signatureId, onChange]);

  const applySignature = (signature: Signature) => {
    onChange({
      signatureId: signature.id,
      imageData: signature.imageData,
      imageType: signature.imageType,
    });
    setMode('select');
    setSuccess(`Using "${signature.name}".`);
    setError('');
  };

  const handleSelectChange = (raw: string) => {
    if (raw === NEW_SIGNATURE_VALUE) {
      setMode('create');
      setName('');
      setDraftImageData(null);
      setDraftImageType(null);
      setSourceType('DRAWN');
      setError('');
      setSuccess('');
      return;
    }

    const signatureId = Number(raw);
    const signature = signatures.find((item) => item.id === signatureId);
    if (!signature) {
      onChange({ signatureId: 0, imageData: null, imageType: null });
      return;
    }

    applySignature(signature);
  };

  const startUpdateSelected = () => {
    const selected = signatures.find((item) => item.id === value.signatureId);
    if (!selected) {
      setMode('create');
      setName('');
      setDraftImageData(null);
      setDraftImageType(null);
      return;
    }

    setMode('update');
    setName(selected.name);
    setSourceType(selected.sourceType);
    setDraftImageData(selected.imageData);
    setDraftImageType(selected.imageType);
    setError('');
    setSuccess('');
  };

  const saveSignature = async () => {
    if (!name.trim()) {
      setError('Signature name is required.');
      return;
    }
    if (!draftImageData || !draftImageType) {
      setError('Please draw or upload your signature.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (mode === 'update' && value.signatureId > 0) {
        const updated = await signatureService.update(value.signatureId, {
          name: name.trim(),
          imageData: draftImageData,
          imageType: draftImageType,
          sourceType,
        });
        await refresh();
        applySignature(updated);
        setSuccess('Signature updated in your profile.');
        return;
      }

      const created = await signatureService.create({
        name: name.trim(),
        imageData: draftImageData,
        imageType: draftImageType,
        sourceType,
        isDefault: signatures.length === 0,
      });

      if (signatures.length > 0) {
        await signatureService.setDefault(created.id);
      }

      const items = await refresh();
      const saved = items.find((item) => item.id === created.id) ?? created;
      applySignature(saved);
      setSuccess('Signature saved to your profile.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save signature.');
    } finally {
      setSaving(false);
    }
  };

  const showCreator = mode === 'create' || mode === 'update' || signatures.length === 0;

  return (
    <div className={`form-signature-picker ${className}`.trim()}>
      <p className="appraisal-signature-role-label">{label}</p>

      {signatures.length > 0 && mode === 'select' ? (
        <label className="appraisal-field compact">
          <span>Saved signatures</span>
          <select
            value={value.signatureId || ''}
            onChange={(event) => handleSelectChange(event.target.value)}
            disabled={disabled || loading || saving}
          >
            <option value="">{loading ? 'Loading signatures...' : 'Select signature'}</option>
            {signatures.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isDefault ? ' (Default)' : ''}
              </option>
            ))}
            <option value={NEW_SIGNATURE_VALUE}>+ Create new signature</option>
          </select>
        </label>
      ) : null}

      {signatures.length === 0 && !loading && mode === 'select' ? (
        <p className="appraisal-muted">You do not have a signature yet. Create one below — it will be saved to your profile.</p>
      ) : null}

      {showCreator ? (
        <div className="form-signature-picker-creator">
          <div className="form-signature-picker-creator-head">
            <strong>{mode === 'update' ? 'Update signature' : 'Create signature'}</strong>
            {signatures.length > 0 ? (
              <button
                type="button"
                className="form-signature-picker-link"
                onClick={() => setMode('select')}
                disabled={disabled || saving}
              >
                Back to saved signatures
              </button>
            ) : null}
          </div>

          <label className="appraisal-field compact">
            <span>Signature name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={disabled || saving}
              placeholder="e.g. Official Signature"
              className="form-signature-picker-input"
            />
          </label>

          <div className="form-signature-picker-tabs">
            <button
              type="button"
              className={sourceType === 'DRAWN' ? 'active' : ''}
              onClick={() => setSourceType('DRAWN')}
              disabled={disabled || saving}
            >
              Draw
            </button>
            <button
              type="button"
              className={sourceType === 'UPLOADED' ? 'active' : ''}
              onClick={() => setSourceType('UPLOADED')}
              disabled={disabled || saving}
            >
              Upload
            </button>
          </div>

          {sourceType === 'DRAWN' ? (
            <SignatureCanvas
              disabled={disabled || saving}
              onChange={(imageData, imageType) => {
                setDraftImageData(imageData);
                setDraftImageType(imageType);
              }}
            />
          ) : (
            <SignatureUpload
              disabled={disabled || saving}
              onChange={(imageData, imageType, uploadError) => {
                setDraftImageData(imageData);
                setDraftImageType(imageType);
                if (uploadError) setError(uploadError);
              }}
            />
          )}

          <button
            type="button"
            className="form-signature-picker-save"
            onClick={() => void saveSignature()}
            disabled={disabled || saving}
          >
            {saving ? 'Saving...' : mode === 'update' ? 'Update profile signature' : 'Save to profile'}
          </button>
        </div>
      ) : null}

      {mode === 'select' && value.signatureId > 0 ? (
        <button
          type="button"
          className="form-signature-picker-link"
          onClick={startUpdateSelected}
          disabled={disabled || saving}
        >
          Draw or upload a different signature
        </button>
      ) : null}

      {previewSrc ? (
        <img src={previewSrc} alt={label} className="appraisal-signature-image" />
      ) : (
        <span className="appraisal-signature-placeholder">No signature selected</span>
      )}

      {error ? <small className="appraisal-error-text">{error}</small> : null}
      {success ? <small className="appraisal-success-text">{success}</small> : null}
    </div>
  );
};

export default FormSignaturePicker;
