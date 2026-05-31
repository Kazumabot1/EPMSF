/*Z*/import { useEffect, useMemo, useState } from 'react';
import {
  assessmentFormService,
  type AssessmentFormPayload,
  type AssessmentFormResponse,
  type AssessmentQuestionPayload,
} from '../../../services/assessmentFormService';

const HIDDEN_SECTION_TITLE = 'Assessment Subjects';
const toDateTimeLocalValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const nowDateTimeLocal = () => toDateTimeLocalValue(new Date());

const oneYearFromNowDateTimeLocal = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return toDateTimeLocalValue(date);
};

const normalizeDateTimeForApi = (value: string) => {
  if (!value) return value;

  /*
   * datetime-local gives yyyy-MM-ddTHH:mm.
   * Java LocalDateTime accepts yyyy-MM-ddTHH:mm:ss too.
   */
  return value.length === 16 ? `${value}:00` : value;
};

const emptySubject = (): AssessmentQuestionPayload => ({
  questionText: '',
  responseType: 'YES_NO_RATING',
  isRequired: true,
  weight: 1,
});

const emptyForm = (): AssessmentFormPayload => ({
  formName: '',
  companyName: '',
  description: '',
  startDate: null,
  endDate: null,
  targetRoles: ['Employee'],
  targetDepartmentIds: [],
  scoreBands: [],
  sections: [
    {
      title: HIDDEN_SECTION_TITLE,
      orderNo: 1,
      questions: [emptySubject()],
    },
  ],
});

const formatDate = (value?: string | null) => {
  if (!value) return 'Not scheduled';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.replace('T', ' ');
  }

  return parsed.toLocaleString();
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const anyError = err as any;
  return (
    anyError?.response?.data?.message ??
    anyError?.response?.data?.data?.message ??
    anyError?.message ??
    fallback
  );
};

const getSubjects = (payload: AssessmentFormPayload) => {
  return payload.sections?.[0]?.questions ?? [];
};

const normalizeSubject = (subject: AssessmentQuestionPayload): AssessmentQuestionPayload => ({
  ...subject,
  responseType: 'YES_NO_RATING',
  isRequired: true,
  weight: 1,
});

const AssessmentFormBuilderPage = () => {
  const [forms, setForms] = useState<AssessmentFormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssessmentFormPayload>(emptyForm());
  const [activationTarget, setActivationTarget] = useState<AssessmentFormResponse | null>(null);
 const [activationStartDate, setActivationStartDate] = useState(nowDateTimeLocal());
 const [activationEndDate, setActivationEndDate] = useState(nowDateTimeLocal());
  const [activationWarningAccepted, setActivationWarningAccepted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const subjects = getSubjects(form);

  const activeForms = useMemo(
    () => forms.filter((item) => item.isActive),
    [forms],
  );

  const totalSubjects = useMemo(() => {
    return forms.reduce((total, item) => {
      return (
        total +
        (item.sections?.reduce(
          (sectionTotal, section) => sectionTotal + (section.questions?.length ?? 0),
          0,
        ) ?? 0)
      );
    }, 0);
  }, [forms]);

  const activeFormExists = activeForms.length > 0;

  const getQuestionCount = (item: AssessmentFormResponse) => {
    return (
      item.sections?.reduce(
        (total, section) => total + (section.questions?.length ?? 0),
        0,
      ) ?? 0
    );
  };

  const loadForms = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await assessmentFormService.getAll();
      setForms(data);
    } catch (err) {
      console.error('Failed to load assessment forms', err);
      setError(getErrorMessage(err, 'Failed to load assessment forms.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForms();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setViewOnly(false);
    setError('');
    setSuccessMessage('');
    setModalOpen(true);
  };

  const openView = (item: AssessmentFormResponse) => {
    setEditingId(item.id);
    setViewOnly(true);

    const flattenedSubjects =
      item.sections?.flatMap((section) => section.questions ?? [])?.map(normalizeSubject) ?? [];

    setForm({
      formName: item.formName,
      companyName: item.companyName ?? '',
      description: item.description ?? '',
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      targetRoles: ['Employee'],
      targetDepartmentIds: item.targetDepartmentIds ?? [],
      scoreBands: item.scoreBands ?? [],
      sections: [
        {
          title: HIDDEN_SECTION_TITLE,
          orderNo: 1,
          questions: flattenedSubjects.length ? flattenedSubjects : [emptySubject()],
        },
      ],
    });

    setError('');
    setSuccessMessage('');
    setModalOpen(true);
  };

  const setSubjects = (nextSubjects: AssessmentQuestionPayload[]) => {
    setForm((prev) => ({
      ...prev,
      sections: [
        {
          ...(prev.sections?.[0] ?? { title: HIDDEN_SECTION_TITLE, orderNo: 1 }),
          title: HIDDEN_SECTION_TITLE,
          orderNo: 1,
          questions: nextSubjects.map(normalizeSubject),
        },
      ],
    }));
  };

  const updateSubject = (index: number, value: string) => {
    if (viewOnly) return;

    setSubjects(
      subjects.map((subject, subjectIndex) =>
        subjectIndex === index
          ? normalizeSubject({ ...subject, questionText: value })
          : normalizeSubject(subject),
      ),
    );
  };

  const addSubject = () => {
    if (viewOnly) return;
    setSubjects([...subjects, emptySubject()]);
  };

  const removeSubject = (index: number) => {
    if (viewOnly) return;
    if (subjects.length === 1) return;
    setSubjects(subjects.filter((_, subjectIndex) => subjectIndex !== index));
  };

  const moveSubject = (index: number, direction: -1 | 1) => {
    if (viewOnly) return;

    const target = index + direction;
    if (target < 0 || target >= subjects.length) return;

    const next = [...subjects];
    [next[index], next[target]] = [next[target], next[index]];
    setSubjects(next);
  };

  const validateCreate = () => {
    if (!form.formName.trim()) return 'Form name is required.';

    const cleanedSubjects = subjects
      .map((subject) => subject.questionText.trim())
      .filter(Boolean);

    if (!cleanedSubjects.length) return 'Add at least one assessment subject.';

    const duplicate = cleanedSubjects.find((subject, index) => {
      return cleanedSubjects.findIndex((item) => item.toLowerCase() === subject.toLowerCase()) !== index;
    });

    if (duplicate) return `Duplicate assessment subject found: ${duplicate}`;

    return '';
  };

  const saveForm = async () => {
    if (viewOnly || editingId !== null) {
      setError('Created forms are locked. Create a new form when changes are needed.');
      return;
    }

    const validationError = validateCreate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const payload: AssessmentFormPayload = {
        ...form,
        formName: form.formName.trim(),
        companyName: form.companyName?.trim(),
        description: form.description?.trim(),
        startDate: null,
        endDate: null,
        targetRoles: ['Employee'],
        sections: [
          {
            title: HIDDEN_SECTION_TITLE,
            orderNo: 1,
            questions: subjects
              .filter((subject) => subject.questionText.trim())
              .map((subject) => ({
                ...subject,
                questionText: subject.questionText.trim(),
                responseType: 'YES_NO_RATING',
                isRequired: true,
                weight: 1,
              })),
          },
        ],
      };

      await assessmentFormService.create(payload);

      setModalOpen(false);
      setSuccessMessage('Form created successfully. Activate it when you are ready to set the assessment period.');
      await loadForms();
    } catch (err) {
      console.error('Failed to save assessment form', err);
      setError(getErrorMessage(err, 'Failed to save assessment form.'));
    } finally {
      setSaving(false);
    }
  };

const openActivation = (item: AssessmentFormResponse) => {
  const start = new Date();
  const end = new Date();

  end.setHours(end.getHours() + 1);

  setActivationTarget(item);
  setActivationStartDate(toDateTimeLocalValue(start));
  setActivationEndDate(toDateTimeLocalValue(end));
  setActivationWarningAccepted(false);
  setError('');
  setSuccessMessage('');
};

  const closeActivation = () => {
    if (saving) return;
    setActivationTarget(null);
    setActivationWarningAccepted(false);
  };

const validateActivation = () => {
  if (!activationStartDate) return 'Start date and time are required.';
  if (!activationEndDate) return 'End date and time are required.';

  const start = new Date(activationStartDate);
  const end = new Date(activationEndDate);
  const current = new Date();
  const maxAllowed = new Date();
  maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);

  if (Number.isNaN(start.getTime())) return 'Start date and time is invalid.';
  if (Number.isNaN(end.getTime())) return 'End date and time is invalid.';

  if (start < current) return 'Start date and time cannot be in the past.';
  if (end <= start) return 'End date and time must be after the start date and time.';
  if (start > maxAllowed || end > maxAllowed) {
    return 'The assessment period must be within one year from now.';
  }

  if (!activationWarningAccepted) {
    return 'Please confirm that this schedule will become active for employees.';
  }

  return '';
};

  const activate = async () => {
    if (!activationTarget) return;

    const validationError = validateActivation();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

 await assessmentFormService.activate(activationTarget.id, {
   startDate: normalizeDateTimeForApi(activationStartDate),
   endDate: normalizeDateTimeForApi(activationEndDate),
 });

      setActivationTarget(null);
      setActivationWarningAccepted(false);
      setSuccessMessage('Assessment form activated successfully.');
      await loadForms();
    } catch (err) {
      console.error('Failed to activate assessment form', err);
      setError(getErrorMessage(err, 'Failed to activate assessment form.'));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (item: AssessmentFormResponse) => {
    const ok = window.confirm(
      'Set this form to inactive? This is only allowed before the assessment start date.',
    );

    if (!ok) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await assessmentFormService.deactivate(item.id);
      setSuccessMessage('Assessment form set to inactive.');
      await loadForms();
    } catch (err) {
      console.error('Failed to deactivate assessment form', err);
      setError(getErrorMessage(err, 'Failed to deactivate assessment form.'));
    } finally {
      setSaving(false);
    }
  };

const canDeactivate = (item: AssessmentFormResponse) => {
  if (!item.isActive) return false;
  if (!item.startDate) return true;

  return new Date(item.startDate) > new Date();
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-sky-700 p-6 shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <i className="bi bi-ui-checks-grid" />
                HR Assessment Forms
              </p>

              <h1 className="text-3xl font-bold text-white">
                Self-Assessment Form Builder
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                Create reusable self-assessment forms first. Activate a form only when the assessment period is ready.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <i className="bi bi-plus-circle" />
              Create Form
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Active Forms</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{activeForms.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Created Forms</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{forms.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Assessment Subjects</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalSubjects}</p>
          </div>
        </div>

        {activeFormExists && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <div className="flex gap-3">
              <i className="bi bi-exclamation-triangle-fill text-lg" />
              <div>
                <p className="font-black">Only one self-assessment form can be active for the same period.</p>
                <p className="mt-1 leading-6">
                  New forms can still be created, but activation will be blocked when the selected dates overlap an existing active form.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Created Forms</h2>
              <p className="text-sm text-slate-500">
                Forms are created as inactive. Activate a form to set the start and end date.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading forms...</div>
          ) : forms.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                <i className="bi bi-ui-checks" />
              </div>
              <h3 className="font-black text-slate-900">No assessment forms yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create a form, then activate it when ready.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {forms.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{item.formName}</h3>

                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">Employee</span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">{item.description || 'No description'}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700">
                        {getQuestionCount(item)} assessment subject(s)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openView(item)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      View
                    </button>

                    {item.isActive ? (
                      <button
                        type="button"
                        onClick={() => deactivate(item)}
                        disabled={!canDeactivate(item) || saving}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Set Inactive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openActivation(item)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {viewOnly ? 'View Assessment Form' : 'Create Self-Assessment Form'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {viewOnly
                    ? 'Created forms are locked for safety.'
                    : 'Start date and end date are added only when the form is activated.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-black text-slate-700">Form Name</span>
                  <input
                    value={form.formName}
                    onChange={(event) => setForm((prev) => ({ ...prev, formName: event.target.value }))}
                    disabled={viewOnly}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                    placeholder="Employee Self-assessment Form"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-black text-slate-700">Company Name</span>
                  <input
                    value={form.companyName ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                    disabled={viewOnly}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                    placeholder="ACE Data Systems Ltd."
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-black text-slate-700">Description</span>
                <textarea
                  value={form.description ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  disabled={viewOnly}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                  placeholder="Short description for HR reference"
                />
              </label>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Assessment Subjects</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Each subject automatically uses Yes / No and Rating 1-5. All subjects are required.
                    </p>
                  </div>

                  {!viewOnly && (
                    <button
                      type="button"
                      onClick={addSubject}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      <i className="bi bi-plus-circle" />
                      Add Assessment
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {subjects.map((subject, index) => (
                    <div key={`${subject.id ?? 'new'}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">
                          {index + 1}
                        </div>

                        <textarea
                          value={subject.questionText}
                          onChange={(event) => updateSubject(index, event.target.value)}
                          disabled={viewOnly}
                          rows={2}
                          className="min-h-[72px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                          placeholder="Type assessment subject, for example: I completed my assigned tasks on time"
                        />

                        {!viewOnly && (
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => moveSubject(index, -1)}
                              disabled={index === 0}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Move up"
                            >
                              <i className="bi bi-arrow-up" />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveSubject(index, 1)}
                              disabled={index === subjects.length - 1}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Move down"
                            >
                              <i className="bi bi-arrow-down" />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeSubject(index)}
                              disabled={subjects.length === 1}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Remove"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {viewOnly ? 'Close' : 'Cancel'}
              </button>

              {!viewOnly && (
                <button
                  type="button"
                  onClick={saveForm}
                  disabled={saving}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Create Form'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-black text-slate-900">Activate Assessment Form</h2>
              <p className="mt-1 text-sm text-slate-500">
                Set the assessment period for <span className="font-bold text-slate-700">{activationTarget.formName}</span>.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex gap-3">
                  <i className="bi bi-exclamation-triangle-fill text-lg" />
                  <div>
                    <p className="font-black">Activation notice</p>
                    <p className="mt-1 leading-6">
                      Activating this form will make it available to eligible employees during the selected period. If the selected period overlaps another active form, activation will be blocked.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-black text-slate-700">Start Date & Time
</span>
                 <input
                   type="datetime-local"
                   value={activationStartDate}
                   min={nowDateTimeLocal()}
                   max={oneYearFromNowDateTimeLocal()}
                   onChange={(event) => setActivationStartDate(event.target.value)}
                   className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                 />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-black text-slate-700">End Date & Time</span>
                 <input
                   type="datetime-local"
                   value={activationEndDate}
                   min={activationStartDate || nowDateTimeLocal()}
                   max={oneYearFromNowDateTimeLocal()}
                   onChange={(event) => setActivationEndDate(event.target.value)}
                   className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                 />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={activationWarningAccepted}
                  onChange={(event) => setActivationWarningAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>
                  I understand this form will become active for the selected period and can only be set inactive before the start date.
                </span>
              </label>
            </div>

            <div className="flex flex-col justify-end gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row">
              <button
                type="button"
                onClick={closeActivation}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={activate}
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Activating...' : 'Activate Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentFormBuilderPage;