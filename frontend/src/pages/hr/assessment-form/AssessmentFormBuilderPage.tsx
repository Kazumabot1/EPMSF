
import { useEffect, useMemo, useState } from 'react';
import {
  assessmentFormService,
  type AssessmentFormPayload,
  type AssessmentFormResponse,
  type AssessmentTargetRole,
} from '../../../services/assessmentFormService';

const TARGET_ROLES: { label: string; value: AssessmentTargetRole }[] = [
  { label: 'Employee', value: 'Employee' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Department Head', value: 'DepartmentHead' },
];

const RATING_OPTIONS = [1, 2, 3, 4, 5];

const today = () => new Date().toISOString().slice(0, 10);

const defaultEndDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const newQuestion = () => ({
  questionText: '',
  responseType: 'YES_NO_RATING' as const,
  isRequired: true,
  weight: 1,
});

const emptyForm = (): AssessmentFormPayload => ({
  formName: '',
  companyName: '',
  description: '',
  startDate: today(),
  endDate: defaultEndDate(),
  targetRoles: ['Employee'],
  targetDepartmentIds: [],
  scoreBands: [],
  sections: [
    {
      title: 'Performance',
      orderNo: 1,
      questions: [newQuestion()],
    },
  ],
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const AssessmentFormBuilderPage = () => {
  const [forms, setForms] = useState<AssessmentFormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssessmentFormPayload>(emptyForm());
  const [error, setError] = useState('');

  const isLocked = editingId !== null;

  const activeForms = useMemo(
    () => forms.filter((item) => item.isActive !== false),
    [forms],
  );

  const totalSections = useMemo(() => {
    return forms.reduce((total, item) => total + (item.sections?.length ?? 0), 0);
  }, [forms]);

  const totalQuestions = useMemo(() => {
    return forms.reduce((total, item) => {
      return (
        total +
        (item.sections?.reduce(
          (sectionTotal, section) =>
            sectionTotal + (section.questions?.length ?? 0),
          0,
        ) ?? 0)
      );
    }, 0);
  }, [forms]);

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
      setError('Failed to load assessment forms.');
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
    setError('');
    setPreviewOpen(false);
    setModalOpen(true);
  };

  const openEdit = (item: AssessmentFormResponse) => {
    setEditingId(item.id);

    setForm({
      formName: item.formName,
      companyName: item.companyName ?? '',
      description: item.description ?? '',
      startDate: item.startDate ?? today(),
      endDate: item.endDate ?? defaultEndDate(),
      targetRoles: item.targetRoles?.length ? item.targetRoles : ['Employee'],
      targetDepartmentIds: item.targetDepartmentIds ?? [],
      scoreBands: item.scoreBands ?? [],
      sections: item.sections?.length
        ? item.sections.map((section, sectionIndex) => ({
            id: section.id,
            title: section.title,
            orderNo: section.orderNo ?? sectionIndex + 1,
            questions: section.questions?.length
              ? section.questions.map((question) => ({
                  id: question.id,
                  questionText: question.questionText,
                  responseType: 'YES_NO_RATING',
                  isRequired: question.isRequired ?? true,
                  weight: 1,
                }))
              : [newQuestion()],
          }))
        : emptyForm().sections,
    });

    setError('');
    setPreviewOpen(true);
    setModalOpen(true);
  };

  const updateRole = (role: AssessmentTargetRole) => {
    if (isLocked) return;

    setForm((prev) => {
      const exists = prev.targetRoles.includes(role);

      const nextRoles = exists
        ? prev.targetRoles.filter((item) => item !== role)
        : [...prev.targetRoles, role];

      return {
        ...prev,
        targetRoles: nextRoles.length ? nextRoles : prev.targetRoles,
      };
    });
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex ? { ...section, title } : section,
      ),
    }));
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    patch: Partial<AssessmentFormPayload['sections'][number]['questions'][number]>,
  ) => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((question, qIndex) =>
                qIndex === questionIndex
                  ? {
                      ...question,
                      ...patch,
                      responseType: 'YES_NO_RATING',
                      weight: 1,
                    }
                  : question,
              ),
            }
          : section,
      ),
    }));
  };

  const addSection = () => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: `Section ${prev.sections.length + 1}`,
          orderNo: prev.sections.length + 1,
          questions: [newQuestion()],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    if (isLocked) return;

    setForm((prev) => {
      if (prev.sections.length === 1) return prev;

      return {
        ...prev,
        sections: prev.sections
          .filter((_, index) => index !== sectionIndex)
          .map((section, index) => ({
            ...section,
            orderNo: index + 1,
          })),
      };
    });
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    if (isLocked) return;

    setForm((prev) => {
      const target = sectionIndex + direction;

      if (target < 0 || target >= prev.sections.length) {
        return prev;
      }

      const next = [...prev.sections];
      [next[sectionIndex], next[target]] = [next[target], next[sectionIndex]];

      return {
        ...prev,
        sections: next.map((section, index) => ({
          ...section,
          orderNo: index + 1,
        })),
      };
    });
  };

  const addQuestion = (sectionIndex: number) => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: [...section.questions, newQuestion()],
            }
          : section,
      ),
    }));
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        if (section.questions.length === 1) return section;

        return {
          ...section,
          questions: section.questions.filter((_, qIndex) => qIndex !== questionIndex),
        };
      }),
    }));
  };

  const validate = () => {
    if (!form.formName.trim()) return 'Form name is required.';
    if (!form.startDate) return 'Start date is required.';
    if (!form.endDate) return 'End date is required.';

    if (new Date(form.startDate) > new Date(form.endDate)) {
      return 'Start date cannot be later than end date.';
    }

    if (!form.targetRoles.length) return 'Select at least one target role.';
    if (!form.sections.length) return 'Add at least one section.';

    for (const section of form.sections) {
      if (!section.title.trim()) return 'Every section needs a title.';
      if (!section.questions.length) return 'Every section needs at least one question.';

      for (const question of section.questions) {
        if (!question.questionText.trim()) return 'Every question needs text.';
      }
    }

    return '';
  };

  const saveForm = async () => {
    if (isLocked) {
      setError('This assessment form is locked after creation. Create a new form instead.');
      return;
    }

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload: AssessmentFormPayload = {
        ...form,
        formName: form.formName.trim(),
        companyName: form.companyName?.trim(),
        description: form.description?.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        sections: form.sections.map((section, sectionIndex) => ({
          ...section,
          title: section.title.trim(),
          orderNo: sectionIndex + 1,
          questions: section.questions.map((question) => ({
            ...question,
            questionText: question.questionText.trim(),
            responseType: 'YES_NO_RATING',
            weight: 1,
          })),
        })),
      };

      await assessmentFormService.create(payload);

      setModalOpen(false);
      setPreviewOpen(false);
      await loadForms();
    } catch (err) {
      console.error('Failed to save assessment form', err);
      setError('Failed to save assessment form.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: number) => {
    const ok = window.confirm('Deactivate this assessment form?');
    if (!ok) return;

    try {
      setError('');
      await assessmentFormService.deactivate(id);
      await loadForms();
    } catch (err) {
      console.error('Failed to deactivate assessment form', err);
      setError('Failed to deactivate assessment form.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 shadow-xl">
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

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Create locked self-assessment forms by role. Every subject uses Yes / No and Rating together. Weight and text answers are removed.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50"
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Active Forms</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{activeForms.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Sections</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalSections}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Assessment Subjects</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalQuestions}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Created Forms</h2>
              <p className="text-sm text-slate-500">Existing forms are locked after creation.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading forms...</div>
          ) : forms.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
                <i className="bi bi-ui-checks" />
              </div>
              <h3 className="font-black text-slate-900">No assessment forms yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create a form to start self-assessment.</p>
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

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Locked</span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">{item.description || 'No description'}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700">{getQuestionCount(item)} question(s)</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{item.targetRoles?.join(', ') || 'Employee'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(item)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      View Locked Form
                    </button>

                    {item.isActive && (
                      <button type="button" onClick={() => void deactivate(item.id)} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100">
                        Deactivate
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {isLocked ? 'View Locked Assessment Form' : 'Create Assessment Form'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isLocked ? 'This form is locked after creation and cannot be edited.' : 'Questions are fixed to Yes / No + Rating. Weight is removed.'}
                </p>
              </div>

              <button type="button" onClick={() => setModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Form Name</span>
                    <input disabled={isLocked} value={form.formName} onChange={(e) => setForm((prev) => ({ ...prev, formName: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" placeholder="Employee Self-assessment" />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Company Name</span>
                    <input disabled={isLocked} value={form.companyName ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" placeholder="ACE Data Systems Ltd." />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Description</span>
                    <textarea disabled={isLocked} value={form.description ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" rows={3} placeholder="Describe this assessment form..." />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Start Date</span>
                    <input disabled={isLocked} type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">End Date</span>
                    <input disabled={isLocked} type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4">
                    <h3 className="font-black text-slate-900">Target Roles</h3>
                    <p className="text-sm text-slate-500">Selected roles can fill this self-assessment form.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {TARGET_ROLES.map((role) => (
                      <button key={role.value} type="button" disabled={isLocked} onClick={() => updateRole(role.value)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-75 ${form.targetRoles.includes(role.value) ? 'border-indigo-300 bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                        <i className="bi bi-check2-circle mr-2" />
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {form.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <label className="flex-1">
                          <span className="mb-1 block text-sm font-black text-slate-700">Section {sectionIndex + 1}</span>
                          <input disabled={isLocked} value={section.title} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" placeholder="Section title" />
                        </label>

                        {!isLocked && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                            <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === form.sections.length - 1} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                            <button type="button" onClick={() => removeSection(sectionIndex)} disabled={form.sections.length === 1} className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {section.questions.map((question, questionIndex) => (
                          <div key={questionIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h4 className="text-sm font-black text-slate-800">Question {questionIndex + 1}</h4>
                              {!isLocked && (
                                <button type="button" onClick={() => removeQuestion(sectionIndex, questionIndex)} disabled={section.questions.length === 1} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                              )}
                            </div>

                            <label className="block">
                              <span className="mb-1 block text-sm font-bold text-slate-700">Assessment Subject</span>
                              <textarea disabled={isLocked} value={question.questionText} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { questionText: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" rows={3} placeholder="Write the assessment subject..." />
                            </label>

                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Yes / No + Rating</div>

                              <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                                <input type="checkbox" disabled={isLocked} checked={question.isRequired} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { isRequired: e.target.checked })} />
                                Required
                              </label>
                            </div>

                            <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-3">
                              <p className="mb-2 text-xs font-black uppercase tracking-wide text-indigo-600">Rating options</p>
                              <div className="flex flex-wrap gap-3">
                                {RATING_OPTIONS.map((rating) => (
                                  <label key={rating} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                                    <input type="radio" disabled />
                                    {rating}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">Yes</span>
                              <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">No</span>
                            </div>
                          </div>
                        ))}

                        {!isLocked && (
                          <button type="button" onClick={() => addQuestion(sectionIndex)} className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">
                            <i className="bi bi-plus-circle" />
                            Add Question
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isLocked && (
                  <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                    <i className="bi bi-plus-circle" />
                    Add Section
                  </button>
                )}

                {previewOpen && (
                  <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-black text-indigo-950">Live Preview</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">{form.sections.length} section(s)</span>
                    </div>

                    <div className="space-y-5 rounded-3xl bg-white p-5 shadow-sm">
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{form.formName || 'Untitled Form'}</h4>
                        <p className="mt-1 text-sm text-slate-500">{form.description || 'No description'}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">Period: {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {form.targetRoles.map((role) => (
                            <span key={role} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{role}</span>
                          ))}
                        </div>
                      </div>

                      {form.sections.map((section, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 p-4">
                          <h5 className="mb-4 font-black text-slate-900">{index + 1}. {section.title || 'Untitled Section'}</h5>
                          <div className="space-y-4">
                            {section.questions.map((question, qIndex) => (
                              <div key={qIndex} className="rounded-xl bg-slate-50 p-4">
                                <p className="text-sm font-black text-slate-800">{qIndex + 1}. {question.questionText || 'Untitled question'}{question.isRequired && <span className="text-red-500"> *</span>}</p>
                                <p className="mt-1 text-xs font-medium text-slate-400">Yes / No + Rating</p>
                                <div className="mt-3 flex gap-2">
                                  <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">Yes</span>
                                  <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">No</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {RATING_OPTIONS.map((rating) => (
                                    <label key={rating} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600">
                                      <input type="radio" disabled />
                                      {rating}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPreviewOpen((prev) => !prev)} className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                {previewOpen ? 'Hide Preview' : 'Preview'}
              </button>

              <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Close</button>

              {!isLocked && (
                <button type="button" onClick={() => void saveForm()} disabled={saving} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? (
                    <>
                      <i className="bi bi-arrow-repeat mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Create Form'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentFormBuilderPage;
