
import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentItem,
  AssessmentScoreBand,
  AssessmentScoreRow,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import '../appraisal/appraisal.css';

const ratingOptions = [5, 4, 3, 2, 1];

const defaultScoreBands: AssessmentScoreBand[] = [
  {
    minScore: 86,
    maxScore: 100,
    label: 'Outstanding',
    description:
      'Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.',
    sortOrder: 1,
  },
  {
    minScore: 71,
    maxScore: 85,
    label: 'Good',
    description: 'Performance is consistent. Clearly meets essential requirements of job.',
    sortOrder: 2,
  },
  {
    minScore: 60,
    maxScore: 70,
    label: 'Meet Requirement',
    description: 'Performance is satisfactory. Meets requirements of the job.',
    sortOrder: 3,
  },
  {
    minScore: 40,
    maxScore: 59,
    label: 'Need Improvement',
    description:
      'Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.',
    sortOrder: 4,
  },
  {
    minScore: 0,
    maxScore: 39,
    label: 'Unsatisfactory',
    description: 'Performance does not meet the minimum requirement of the job.',
    sortOrder: 5,
  },
];

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

  return error instanceof Error ? error.message || fallback : fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const signatureSrc = (imageData?: string | null, imageType?: string | null) => {
  if (!imageData) return '';
  return imageData.startsWith('data:')
    ? imageData
    : `data:${imageType || 'image/png'};base64,${imageData}`;
};

const flattenItems = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'PENDING_MANAGER':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800';
    case 'PENDING_DEPARTMENT_HEAD':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'PENDING_HR':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'APPROVED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'DECLINED':
    case 'REJECTED':
        case 'CLOSED_REJECTED':

      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

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

const EmployeeSignatureSlot = ({ assessment }: { assessment: EmployeeAssessment }) => (
  <div className="appraisal-signature-slot">
    {assessment.employeeSignatureImageData ? (
      <>
        <img
          src={signatureSrc(
            assessment.employeeSignatureImageData,
            assessment.employeeSignatureImageType,
          )}
          alt={assessment.employeeSignatureName || assessment.employeeName || 'Employee signature'}
          className="appraisal-signature-image"
        />
        <p className="appraisal-signature-date">
          Date: {formatDate(assessment.employeeSignedAt || assessment.submittedAt)}
        </p>
        <small className="appraisal-signature-name">
          {assessment.employeeSignatureName || assessment.employeeName || 'Employee'}
        </small>
      </>
    ) : (
      <span className="appraisal-signature-placeholder">Employee signature not found</span>
    )}
  </div>
);

const ReviewModal = ({
  assessment,
  onClose,
  onSaved,
}: {
  assessment: EmployeeAssessment;
  onClose: () => void;
  onSaved: (assessment: EmployeeAssessment) => void;
}) => {
const [comment, setComment] = useState(assessment.managerComment || '');
const [rejectReason, setRejectReason] = useState('');
const [saving, setSaving] = useState(false);
const [actionError, setActionError] = useState('');
const [actionMessage, setActionMessage] = useState('');
  const items = flattenItems(assessment);
  const scoreBands = assessment.scoreBands?.length ? assessment.scoreBands : defaultScoreBands;
const canManagerAct =
  ['PENDING_MANAGER', 'SUBMITTED'].includes(assessment.status) &&
  Boolean(assessment.id);

const canSaveRemark = canManagerAct;

  const handleSaveRemark = async () => {
    if (!assessment.id) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.managerRemark(
        assessment.id,
        comment.trim() || undefined,
      );
      setActionMessage('Manager signature completed. The form has been sent to HR for final confirmation.');
      onSaved(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to save manager remarks.'));
    } finally {
      setSaving(false);
    }
  };

const handleManagerDecline = async () => {
  if (!assessment.id) return;

  const reason = rejectReason.trim();

  if (!reason) {
    setActionError('Rejection reason is required.');
    return;
  }

  setSaving(true);
  setActionError('');
  setActionMessage('');

  try {
    const updated = await employeeAssessmentService.managerDecline(
      assessment.id,
      reason,
      comment.trim() || undefined,
    );

    setActionMessage('Assessment rejected and saved as an audit record. HR can allow resubmission while the form period is still open.');

    onSaved(updated);
  } catch (err) {
    setActionError(getErrorMessage(err, 'Unable to reject assessment.'));
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Manager Assessment Review</h2>
            <p className="text-sm text-slate-500">Review the employee submission, then approve or reject with clear notes.</p>
          </div>

          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="appraisal-page-shell" style={{ padding: 16 }}>
          <div className="appraisal-card appraisal-form-sheet">
            <div className="appraisal-template-banner">
              <h2>{assessment.formName || 'Employee Self-assessment Form'}</h2>
              <p>{assessment.companyName || 'ACE Data Systems Ltd.'}</p>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Employee Information</h4>
                <p><strong>Employee Name:</strong> {assessment.employeeName || '-'}</p>
                <p><strong>Employee ID:</strong> {assessment.employeeCode || '-'}</p>
                <p><strong>Current Position:</strong> {assessment.currentPosition || '-'}</p>
                <p><strong>Department:</strong> {assessment.departmentName || '-'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Assessment Information</h4>
                <p><strong>Assessment Date:</strong> {formatDate(assessment.assessmentDate)}</p>
                <p><strong>Period:</strong> {assessment.period || '-'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(assessment.status)}`}>
                    {assessment.status}
                  </span>
                </p>
                <p><strong>Score:</strong> {assessment.scorePercent ?? 0}% ({assessment.totalScore ?? 0}/{assessment.maxScore ?? 0})</p>
                <p><strong>Performance:</strong> {assessment.performanceLabel || '-'}</p>
              </div>
            </div>

            <section className="appraisal-section-card">
              <div className="appraisal-section-header">
                <strong>Assessment Subjects</strong>
                <span className="appraisal-muted">{items.length} question(s)</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="self-assessment-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No.</th>
                      <th rowSpan={2}>Assessment Subject</th>
                      <th rowSpan={2}>Yes</th>
                      <th rowSpan={2}>No</th>
                      <th colSpan={5}>Rating</th>
                    </tr>
                    <tr>
                      {ratingOptions.map((rating) => (
                        <th key={rating}>{rating}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.itemOrder}-${item.questionId ?? item.id ?? item.questionText}`}>
                        <td>{item.itemOrder}</td>
                        <td><strong>{item.questionText}</strong></td>
                        <td>{item.yesNoAnswer === true ? '✓' : ''}</td>
                        <td>{item.yesNoAnswer === false ? '✓' : ''}</td>
                        {ratingOptions.map((rating) => (
                          <td key={rating}>{item.rating === rating ? '●' : ''}</td>
                        ))}
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Employee Remarks</h4>
                <p>{assessment.remarks || '-'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Score Explanation</h4>
                <table className="self-assessment-score-table">
                  <tbody>
                    {scoreBands.map((band) => (
                      <tr key={`${band.minScore}-${band.maxScore}-${band.label}`}>
                        <td><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></td>
                        <td>
                          <strong>{band.label}</strong>
                          <br />
                          <span className="appraisal-muted">{band.description}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Employee Signature</h4>
                <EmployeeSignatureSlot assessment={assessment} />
              </div>

              <div className="appraisal-review-block">
                <h4>Current Manager Remarks</h4>
                <p>{assessment.managerComment || 'No manager remarks yet.'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="mb-2 text-base font-bold text-slate-900">Manager Remarks</h4>
              <p className="mb-4 text-sm text-slate-500">
                Approve to send the form to HR, or reject it with a clear reason. Rejected forms stay saved as audit records.
              </p>

              <textarea
                value={comment}
                disabled={!canSaveRemark || saving}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                placeholder="Optional manager remarks..."
              />

{canSaveRemark ? (
  <div className="mt-4 space-y-4">
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSaveRemark()}
        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Sign & Send to HR'}
      </button>
    </div>

    <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
      <h5 className="mb-1 text-sm font-black text-red-800">
        Reject Assessment
      </h5>

      <p className="mb-3 text-sm font-semibold text-red-700">
        If the assessment period is still open, this will return the form to the employee for correction. If the period has ended, it will be closed as rejected.
      </p>

      <textarea
        value={rejectReason}
        disabled={saving}
        onChange={(event) => setRejectReason(event.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
        placeholder="Enter rejection reason..."
      />

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleManagerDecline()}
        className="mt-3 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
      >
        {saving ? 'Rejecting...' : 'Reject Assessment'}
      </button>
    </div>
  </div>
) : (
  <p className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
    Manager actions are locked because this assessment has already moved past manager review.
  </p>
)}

              {actionMessage && (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {actionMessage}
                </p>
              )}
              {actionError && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {actionError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerAssessmentReviewPage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<EmployeeAssessment | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'TO_APPROVE' | 'APPROVED' | 'REJECTED'>('TO_APPROVE');

  const loadRows = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await employeeAssessmentService.scoreTable();
      setRows(data.filter((row) => row.status !== 'DRAFT'));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load assigned assessments.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const toApproveRows = useMemo(
    () => rows.filter((row) => ['PENDING_MANAGER', 'SUBMITTED'].includes(row.status)),
    [rows],
  );

  const approvedRows = useMemo(
    () => rows.filter((row) => Boolean(row.managerSigned) && row.rejectedByRole !== 'MANAGER'),
    [rows],
  );

  const rejectedRows = useMemo(
    () => rows.filter((row) => row.status === 'REJECTED' && row.rejectedByRole === 'MANAGER'),
    [rows],
  );

  const tabRows = useMemo(() => {
    if (activeTab === 'APPROVED') return approvedRows;
    if (activeTab === 'REJECTED') return rejectedRows;
    return toApproveRows;
  }, [activeTab, approvedRows, rejectedRows, toApproveRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return tabRows;

    return tabRows.filter((row) =>
      row.employeeName?.toLowerCase().includes(normalizedSearch) ||
      row.employeeCode?.toLowerCase().includes(normalizedSearch) ||
      row.departmentName?.toLowerCase().includes(normalizedSearch) ||
      row.period?.toLowerCase().includes(normalizedSearch) ||
      row.status?.toLowerCase().includes(normalizedSearch) ||
      row.performanceLabel?.toLowerCase().includes(normalizedSearch) ||
      row.formName?.toLowerCase().includes(normalizedSearch),
    );
  }, [search, tabRows]);

  const openDetails = async (row: AssessmentScoreRow) => {
    try {
      setDetailLoadingId(row.id);
      setError('');
      const data = await employeeAssessmentService.getById(row.id);
      setSelectedAssessment(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to open assessment details.'));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleSaved = async (updated: EmployeeAssessment) => {
    setSelectedAssessment(updated);
    await loadRows();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50 p-6">
      {selectedAssessment && (
        <ReviewModal
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onSaved={(updated) => void handleSaved(updated)}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 shadow-xl">
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <i className="bi bi-person-check" />
                Manager Review Queue
              </p>

              <h1 className="text-3xl font-bold text-white">Assessment Review</h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                Review employee self-assessments assigned to you. Approve items move to HR; rejected items stay visible as audit records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadRows()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <i className={`bi bi-arrow-repeat ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Assigned Records</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">To Approve</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{toApproveRows.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Approved by Manager</p>
            <p className="mt-2 text-3xl font-bold text-teal-600">{approvedRows.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-3xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur">
          {[
            { key: 'TO_APPROVE' as const, label: 'TO APPROVE', count: toApproveRows.length },
            { key: 'APPROVED' as const, label: 'APPROVED', count: approvedRows.length },
            { key: 'REJECTED' as const, label: 'REJECTED', count: rejectedRows.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="relative">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Search employee, code, department, form, period, status, label..."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            <i className="bi bi-exclamation-triangle mr-2" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Assigned Self-Assessments</h2>
              <p className="text-sm text-slate-500">Use TO APPROVE, APPROVED, and REJECTED to track your manager review audit.</p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Manager review
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              <i className="bi bi-arrow-repeat mb-3 block animate-spin text-3xl text-emerald-600" />
              Loading assessment review queue...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-3xl text-emerald-600">
                <i className="bi bi-clipboard-check" />
              </div>
              <h3 className="font-bold text-slate-900">No assigned assessments found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Assessments assigned to you will appear here after employees submit.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Form</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Performance</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={`${row.id}-${row.employeeId ?? row.employeeCode ?? row.employeeName}`} className="transition hover:bg-emerald-50/40">
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">{row.employeeName || 'Unknown Employee'}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.employeeCode || 'No employee code'}</div>
                      </td>
                      <td className="px-6 py-5 text-slate-600">{row.formName || '-'}</td>
                      <td className="px-6 py-5 text-slate-600">{row.departmentName || 'No department'}</td>
                      <td className="px-6 py-5 font-medium text-slate-700">{row.period || '—'}</td>
                      <td className="px-6 py-5">
                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-slate-900">{row.scorePercent ?? 0}%</span>
                            <span className="text-xs text-slate-500">{row.totalScore ?? 0}/{row.maxScore ?? 0}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${Math.min(Number(row.scorePercent || 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${scoreBadgeClass(row.performanceLabel)}`}>
                          {row.performanceLabel || 'Not scored'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(row.status)}`}>
                          {row.status || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-slate-500">{formatDateTime(row.submittedAt)}</td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          disabled={detailLoadingId === row.id}
                          onClick={() => void openDetails(row)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {detailLoadingId === row.id
                            ? 'Opening...'
                            : ['PENDING_MANAGER', 'SUBMITTED'].includes(row.status)
                              ? 'Review / Remarks'
                              : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerAssessmentReviewPage;
