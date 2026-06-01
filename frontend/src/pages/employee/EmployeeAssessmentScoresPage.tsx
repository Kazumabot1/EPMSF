import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentItem,
  AssessmentRequest,
  EmployeeAssessment,
} from '../../types/employeeAssessment';

const ratingOptions = [1, 2, 3, 4, 5];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    return response?.data?.message || response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const flattenItems = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

const answerIsMissing = (item: AssessmentItem) => {
  const responseType = item.responseType ?? 'RATING';

  if (item.isRequired === false) {
    return false;
  }

  if (responseType === 'TEXT') {
    return !item.comment?.trim();
  }

  if (responseType === 'YES_NO') {
    return item.yesNoAnswer === null || item.yesNoAnswer === undefined;
  }

  return item.rating === null || item.rating === undefined;
};

const buildPayload = (assessment: EmployeeAssessment): AssessmentRequest => ({
  period: assessment.period,
  remarks: assessment.remarks || '',
  items: flattenItems(assessment).map((item) => ({
    id: item.id ?? null,
    sectionTitle: item.sectionTitle,
    questionText: item.questionText,
    itemOrder: item.itemOrder,
    rating: item.rating ?? null,
    comment: item.comment || '',
    responseType: item.responseType ?? 'RATING',
    yesNoAnswer: item.yesNoAnswer ?? null,
  })),
});

const scoreBadgeClass = (label?: string) => {
  switch (label) {
    case 'Outstanding':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'Good':
      return 'border-blue-300 bg-blue-100 text-blue-800';
    case 'Meet Requirement':
      return 'border-yellow-300 bg-yellow-100 text-yellow-800';
    case 'Need Improvement':
      return 'border-orange-300 bg-orange-100 text-orange-800';
    case 'Unsatisfactory':
      return 'border-red-300 bg-red-100 text-red-800';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
};

const responseTypeLabel = (type?: string) => {
  switch (type) {
    case 'TEXT':
      return 'Text';
    case 'YES_NO':
      return 'Yes / No';
    case 'RATING':
    default:
      return 'Rating';
  }
};

const EmployeeSelfAssessmentPage = () => {
  const [assessment, setAssessment] = useState<EmployeeAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await employeeAssessmentService.getLatestDraft();
        setAssessment(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load self-assessment form.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const preview = useMemo(() => {
    if (!assessment) {
      return {
        answered: 0,
        total: 0,
        totalScore: 0,
        maxScore: 0,
        percent: 0,
        label: 'Not scored',
      };
    }

    const items = flattenItems(assessment);
    const visibleItems = items.filter((item) => item.isRequired !== false);

    const answeredItems = visibleItems.filter((item) => {
      const responseType = item.responseType ?? 'RATING';

      if (responseType === 'TEXT') {
        return Boolean(item.comment?.trim());
      }

      if (responseType === 'YES_NO') {
        return item.yesNoAnswer !== null && item.yesNoAnswer !== undefined;
      }

      return item.rating !== null && item.rating !== undefined;
    });

    const ratingItems = answeredItems.filter(
      (item) => (item.responseType ?? 'RATING') === 'RATING',
    );

    const totalScore = ratingItems.reduce(
      (sum, item) => sum + Number(item.rating || 0) * Number(item.weight || 1),
      0,
    );

    const maxScore = ratingItems.reduce(
      (sum, item) => sum + 5 * Number(item.weight || 1),
      0,
    );

    const percent =
      maxScore === 0 ? 0 : Number(((totalScore * 100) / maxScore).toFixed(2));

    const label =
      percent >= 86
        ? 'Outstanding'
        : percent >= 71
          ? 'Good'
          : percent >= 60
            ? 'Meet Requirement'
            : percent >= 40
              ? 'Need Improvement'
              : answeredItems.length === 0
                ? 'Not scored'
                : 'Unsatisfactory';

    return {
      answered: answeredItems.length,
      total: visibleItems.length,
      totalScore,
      maxScore,
      percent,
      label,
    };
  }, [assessment]);

  const updateAssessmentField = (name: 'period' | 'remarks', value: string) => {
    setAssessment((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const updateItem = (
    sectionTitle: string,
    itemOrder: number,
    patch: Partial<Pick<AssessmentItem, 'rating' | 'comment' | 'yesNoAnswer'>>,
  ) => {
    setAssessment((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.title !== sectionTitle) return section;

          return {
            ...section,
            items: section.items.map((item) =>
              item.itemOrder === itemOrder ? { ...item, ...patch } : item,
            ),
          };
        }),
      };
    });
  };

  const saveDraft = async () => {
    if (!assessment) return null;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const saved = await employeeAssessmentService.saveDraft(
        buildPayload(assessment),
        assessment.id,
      );

      setAssessment(saved);
      setMessage('Draft saved successfully.');
      return saved;
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save self-assessment draft. You may still try Submit Assessment.',
        ),
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submitAssessment = async () => {
    if (!assessment) return;

    const missing = flattenItems(assessment).filter(answerIsMissing);

    if (missing.length) {
      setError('Please answer every required assessment question before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const submitted = await employeeAssessmentService.submit(
        buildPayload(assessment),
      );

      setAssessment(submitted);
      setMessage(
        'Self-assessment submitted successfully. Your score table has been updated.',
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit self-assessment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAssessment();
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading self-assessment...
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No self-assessment form is available for your role.
      </div>
    );
  }

  const isSubmitted = assessment.status === 'SUBMITTED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-blue-100 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-3xl border border-white bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <i className="bi bi-pencil-square" />
                Employee Self-Assessment
              </div>

              <h1 className="text-2xl font-bold text-slate-800">
                {assessment.formName || 'Self Assessment'}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Complete your required answers. You can save as draft before final
                submission.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700">
                {assessment.employeeName || 'Employee'}
              </p>
              <p className="text-slate-500">
                {assessment.employeeCode || 'No employee code'}
              </p>
              <p className="text-slate-500">
                {assessment.departmentName || 'No department'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Assessment Period
                  <input
                    type="text"
                    value={assessment.period || ''}
                    disabled={isSubmitted}
                    onChange={(event) =>
                      updateAssessmentField('period', event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="2026 / Q1 2026 / Annual 2026"
                    required
                  />
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">Status:</span>{' '}
                  {assessment.status}

                  {assessment.submittedAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted:{' '}
                      {new Date(assessment.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {assessment.sections.map((section, sectionIndex) => (
              <div
                key={`${section.title}-${sectionIndex}`}
                className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-sm backdrop-blur"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                      {sectionIndex + 1}
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-800">{section.title}</h2>
                      <p className="text-xs text-slate-500">
                        Answer each required question.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {section.items.map((item, itemIndex) => {
                    const responseType = item.responseType ?? 'RATING';

                    return (
                      <div key={`${item.itemOrder}-${itemIndex}`} className="p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                Question {item.itemOrder}
                              </span>

                              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                {responseTypeLabel(responseType)}
                              </span>

                              {item.isRequired !== false && (
                                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                                  Required
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-semibold text-slate-800">
                              {item.questionText}
                            </p>

                            {responseType === 'TEXT' && (
                              <textarea
                                value={item.comment || ''}
                                disabled={isSubmitted}
                                onChange={(event) =>
                                  updateItem(section.title, item.itemOrder, {
                                    comment: event.target.value,
                                  })
                                }
                                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                rows={4}
                                placeholder="Write your answer..."
                              />
                            )}

                            {responseType === 'RATING' && (
                              <textarea
                                value={item.comment || ''}
                                disabled={isSubmitted}
                                onChange={(event) =>
                                  updateItem(section.title, item.itemOrder, {
                                    comment: event.target.value,
                                  })
                                }
                                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                rows={2}
                                placeholder="Optional comment or evidence..."
                              />
                            )}

                            {responseType === 'YES_NO' && (
                              <textarea
                                value={item.comment || ''}
                                disabled={isSubmitted}
                                onChange={(event) =>
                                  updateItem(section.title, item.itemOrder, {
                                    comment: event.target.value,
                                  })
                                }
                                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                rows={2}
                                placeholder="Optional comment or evidence..."
                              />
                            )}
                          </div>

                          {responseType === 'RATING' && (
                            <div className="flex shrink-0 items-center gap-2">
                              {ratingOptions.map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() =>
                                    updateItem(section.title, item.itemOrder, {
                                      rating,
                                    })
                                  }
                                  className={`h-10 w-10 rounded-full border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                    item.rating === rating
                                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                      : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400'
                                  }`}
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                          )}

                          {responseType === 'YES_NO' && (
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                disabled={isSubmitted}
                                onClick={() =>
                                  updateItem(section.title, item.itemOrder, {
                                    yesNoAnswer: true,
                                  })
                                }
                                className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                  item.yesNoAnswer === true
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400'
                                }`}
                              >
                                Yes
                              </button>

                              <button
                                type="button"
                                disabled={isSubmitted}
                                onClick={() =>
                                  updateItem(section.title, item.itemOrder, {
                                    yesNoAnswer: false,
                                  })
                                }
                                className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                  item.yesNoAnswer === false
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400'
                                }`}
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
              <label className="block text-sm font-semibold text-slate-700">
                Overall Remarks
                <textarea
                  value={assessment.remarks || ''}
                  disabled={isSubmitted}
                  onChange={(event) =>
                    updateAssessmentField('remarks', event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  rows={4}
                  placeholder="Summarize achievements, blockers, and development needs..."
                />
              </label>
            </div>

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!isSubmitted && (
              <div className="flex flex-col gap-3 rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={() => void saveDraft()}
                  className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  type="submit"
                  disabled={saving || submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              </div>
            )}
          </form>

          <aside className="space-y-4">
            <div className="sticky top-6 rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Live Score
              </h2>

              <p className="mt-4 text-4xl font-black text-slate-800">
                {preview.percent}%
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {preview.totalScore} / {preview.maxScore || preview.total * 5}{' '}
                rating points
              </p>

              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${scoreBadgeClass(
                  preview.label,
                )}`}
              >
                {preview.label}
              </span>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(preview.percent, 100)}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Answered {preview.answered} of {preview.total} required/visible
                items.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelfAssessmentPage;