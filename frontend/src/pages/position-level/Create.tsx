import { useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import '../position/position-ui.css';

type FormState = {
  levelCode: string;
};

const initialForm: FormState = {
  levelCode: '',
};

const PositionLevelCreate = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string => {
    if (form.levelCode.trim().length === 0) {
      return 'Level code is required.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();
    setFormError(validationMessage);
    setSubmitError('');
    setSuccessMessage('');

    if (validationMessage) {
      return;
    }

    try {
      setIsSubmitting(true);
      const createdLevel = await positionService.createPositionLevel({
        levelCode: form.levelCode.trim(),
      });

      setSuccessMessage(`Position level "${createdLevel.levelCode}" created successfully.`);
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-diagram-3" />
          Hierarchy Setup
        </span>
        <h1>Position Level Create</h1>
        <p>Define reusable level codes to standardize organizational position hierarchy.</p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="position-field">
              <label htmlFor="levelCode">
                Level Code <span className="position-required">*</span>
              </label>
              <input
                id="levelCode"
                type="text"
                value={form.levelCode}
                onChange={(event) => setForm((prev) => ({ ...prev, levelCode: event.target.value }))}
                className="position-input"
                placeholder="Example: L1, SENIOR, EXEC"
                maxLength={50}
              />
            </div>

            {formError && <div className="position-alert error">{formError}</div>}
            {submitError && <div className="position-alert error">{submitError}</div>}
            {successMessage && <div className="position-alert success">{successMessage}</div>}

            <div className="position-form-actions">
              <button type="submit" disabled={isSubmitting} className="position-btn primary">
                <i className={`bi ${isSubmitting ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`} />
                {isSubmitting ? 'Submitting...' : 'Create Position Level'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PositionLevelCreate;
