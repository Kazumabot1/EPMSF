
import { useEffect, useMemo, useState } from 'react';
import { authStorage } from '../../services/authStorage';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentItem,
  AssessmentScoreBand,
  AssessmentScoreRow,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import '../appraisal/appraisal.css';
import './assessment-score-table.css';

type RoleFlags = {
  isHr: boolean;
  isDepartmentHead: boolean;
};

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

const normalizeRoleName = (role: string) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getCurrentRoleFlags = (): RoleFlags => {
  const user = authStorage.getUser();
  const roles = (user?.roles ?? []).map((role: string) => normalizeRoleName(role));
  const dashboard = normalizeRoleName(String(user?.dashboard ?? ''));

  return {
    isHr:
      roles.includes('HR') ||
      roles.includes('ADMIN') ||
      dashboard.includes('HR') ||
      dashboard.includes('ADMIN'),

    isDepartmentHead:
      roles.includes('DEPARTMENT_HEAD') ||
      roles.includes('DEPARTMENTHEAD') ||
      roles.includes('DEPT_HEAD') ||
      roles.includes('HEAD_OF_DEPARTMENT') ||
      dashboard.includes('DEPARTMENT_HEAD') ||
      dashboard.includes('DEPARTMENTHEAD') ||
      dashboard.includes('DEPT_HEAD'),
  };
};

const scoreBadgeClass = (label?: string) => {
  switch (label) {
    case 'Outstanding':
      return 'ast-score-outstanding';
    case 'Good':
      return 'ast-score-good';
    case 'Meet Requirement':
      return 'ast-score-meet';
    case 'Need Improvement':
      return 'ast-score-improve';
    case 'Unsatisfactory':
      return 'ast-score-bad';
    default:
      return 'ast-score-default';
  }
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return 'ast-status-draft';
    case 'SUBMITTED':
      return 'ast-status-submitted';
    case 'PENDING_MANAGER':
      return 'ast-status-pending-manager';
    case 'PENDING_DEPARTMENT_HEAD':
      return 'ast-status-pending-dept';
    case 'PENDING_HR':
      return 'ast-status-pending-hr';
    case 'APPROVED':
      return 'ast-status-approved';
    case 'DECLINED':
    case 'REJECTED':
      return 'ast-status-declined';
    default:
      return 'ast-status-default';
  }
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

const ratingOptions = [5, 4, 3, 2, 1];

const statusOptions: Array<{ value: 'ALL' | AssessmentStatus; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_MANAGER', label: 'Pending Manager' },
  { value: 'PENDING_DEPARTMENT_HEAD', label: 'Pending Department Head' },
  { value: 'PENDING_HR', label: 'Pending HR' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'REJECTED', label: 'Rejected' },
];

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

const SignatureSlot = ({
  label,
  imageData,
  imageType,
  name,
  signedAt,
}: {
  label: string;
  imageData?: string | null;
  imageType?: string | null;
  name?: string | null;
  signedAt?: string | null;
}) => (
  <div className="appraisal-signature-slot ast-signature-slot">
    {imageData ? (
      <>
        <img
          src={signatureSrc(imageData, imageType)}
          alt={name || label}
          className="appraisal-signature-image"
        />
        <p className="appraisal-signature-date">Date: {formatDate(signedAt)}</p>
        <small className="appraisal-signature-name">{name || label}</small>
      </>
    ) : (
      <span className="appraisal-signature-placeholder">{label} — Pending</span>
    )}
  </div>
);

const SignatureBadges = ({ row }: { row: AssessmentScoreRow }) => {
  const badges = [
    { label: 'Employee', signed: row.employeeSigned },
    { label: 'Dept Head', signed: row.departmentHeadSigned },
    { label: 'HR', signed: row.hrSigned },
  ];

  return (
    <div className="ast-signature-badges">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`ast-signature-badge ${
            badge.signed ? 'ast-signature-done' : 'ast-signature-pending'
          }`}
        >
          <i className={`bi ${badge.signed ? 'bi-check-circle-fill' : 'bi-clock'}`} />
          {badge.label}
        </span>
      ))}
    </div>
  );
};

const AssessmentDetailModal = ({
  assessment,
  roleFlags,
  onClose,
  onChanged,
}: {
  assessment: EmployeeAssessment;
  roleFlags: RoleFlags;
  onClose: () => void;
  onChanged: (assessment: EmployeeAssessment) => void;
}) => {
  const scoreBands = assessment.scoreBands?.length
    ? assessment.scoreBands
    : defaultScoreBands;

  const items = flattenItems(assessment);

  const canDeptHeadSign =
    roleFlags.isDepartmentHead &&
    ['PENDING_DEPARTMENT_HEAD', 'PENDING_MANAGER', 'SUBMITTED'].includes(assessment.status);

  const canHrAct = roleFlags.isHr && assessment.status === 'PENDING_HR';

  const [deptHeadComment, setDeptHeadComment] = useState('');
  const [hrComment, setHrComment] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [submittingAction, setSubmittingAction] = useState<
    'dept-head' | 'approve' | 'decline' | null
  >(null);

  const handleDeptHeadSign = async () => {
    if (!assessment.id) return;

    setSubmittingAction('dept-head');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.departmentHeadSign(
        assessment.id,
        deptHeadComment.trim() || undefined,
      );
      setActionMessage('Assessment signed and forwarded to HR.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to sign assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleHrApprove = async () => {
    if (!assessment.id) return;

    setSubmittingAction('approve');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.hrApprove(
        assessment.id,
        hrComment.trim() || undefined,
      );
      setActionMessage('Assessment approved.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to approve assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleHrDecline = async () => {
    if (!assessment.id) return;

    const reason = declineReason.trim();

    if (!reason) {
      setActionError('Decline reason is required.');
      return;
    }

    setSubmittingAction('decline');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.hrDecline(
        assessment.id,
        reason,
        hrComment.trim() || undefined,
      );
      setActionMessage('Assessment declined.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to decline assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="ast-modal-backdrop">
      <div className="ast-modal">
        <div className="ast-modal-header">
          <div>
            <h2>Self-Assessment Details</h2>
            <p>Review the employee submission, signatures, comments, and workflow actions.</p>
          </div>

          <button className="ast-btn ast-btn-light" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="appraisal-page-shell ast-modal-body">
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
                <p><strong>Assigned Manager:</strong> {assessment.managerName || '-'}</p>
                <p><strong>Department Head:</strong> {assessment.departmentHeadName || '-'}</p>
                <p><strong>Period:</strong> {assessment.period || '-'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`ast-badge ${statusBadgeClass(assessment.status)}`}>
                    {assessment.status}
                  </span>
                </p>
                <p>
                  <strong>Score:</strong> {assessment.scorePercent ?? 0}% ({assessment.totalScore ?? 0}/{assessment.maxScore ?? 0})
                </p>
                <p><strong>Performance:</strong> {assessment.performanceLabel || '-'}</p>
              </div>
            </div>

            <section className="appraisal-section-card">
              <div className="appraisal-section-header">
                <strong>Assessment Subjects</strong>
                <span className="appraisal-muted">{items.length} question(s)</span>
              </div>

              <div className="ast-table-scroll">
                <table className="self-assessment-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No.</th>
                      <th rowSpan={2}>Assessment Subject</th>
                      <th rowSpan={2}>Yes</th>
                      <th rowSpan={2}>No</th>
                      <th colSpan={5}>Rating</th>
                      <th rowSpan={2}>Comment</th>
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

                        <td>{item.comment || '-'}</td>
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
                <h4>Manager's Remarks</h4>
                <p>{assessment.managerComment || 'No manager remarks yet.'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Department Head's Comment</h4>
                <p>{assessment.departmentHeadComment || 'No department head comment yet.'}</p>
              </div>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>HR Comment</h4>
                <p>{assessment.hrComment || 'No HR comment yet.'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Decline Reason</h4>
                <p>{assessment.declineReason || 'Not declined.'}</p>
              </div>
            </div>

            <div className="appraisal-signature-grid self-assessment-signature-grid ast-final-signatures">
              <SignatureSlot
                label="Signature of Employee & Date"
                imageData={assessment.employeeSignatureImageData}
                imageType={assessment.employeeSignatureImageType}
                name={assessment.employeeSignatureName || assessment.employeeName}
                signedAt={assessment.employeeSignedAt || assessment.submittedAt}
              />

              <SignatureSlot
                label="Signature of Dept. Head & Date"
                imageData={assessment.departmentHeadSignatureImageData}
                imageType={assessment.departmentHeadSignatureImageType}
                name={assessment.departmentHeadSignatureName || assessment.departmentHeadName}
                signedAt={assessment.departmentHeadSignedAt}
              />

              <SignatureSlot
                label="Signature of HR & Date"
                imageData={assessment.hrSignatureImageData}
                imageType={assessment.hrSignatureImageType}
                name={assessment.hrSignatureName || 'HR'}
                signedAt={assessment.hrSignedAt || assessment.approvedAt}
              />
            </div>

            {(canDeptHeadSign || canHrAct) && (
              <div className="ast-action-panel">
                <h4>Workflow Action</h4>

                {canDeptHeadSign && (
                  <div className="ast-action-stack">
                    <label className="ast-field">
                      <span>Department head comment optional</span>
                      <textarea
                        value={deptHeadComment}
                        onChange={(event) => setDeptHeadComment(event.target.value)}
                        rows={3}
                        placeholder="Add a comment before forwarding to HR..."
                      />
                    </label>

                    <button
                      type="button"
                      disabled={submittingAction !== null}
                      onClick={() => void handleDeptHeadSign()}
                      className="ast-btn ast-btn-primary"
                    >
                      {submittingAction === 'dept-head' ? 'Signing...' : 'Sign & Forward to HR'}
                    </button>
                  </div>
                )}

                {canHrAct && (
                  <div className="ast-hr-grid">
                    <div className="ast-approval-card ast-approve-card">
                      <h5>Approve Assessment</h5>
                      <label className="ast-field">
                        <span>HR comment optional</span>
                        <textarea
                          value={hrComment}
                          onChange={(event) => setHrComment(event.target.value)}
                          rows={3}
                          placeholder="Add final HR comment..."
                        />
                      </label>

                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => void handleHrApprove()}
                        className="ast-btn ast-btn-success"
                      >
                        {submittingAction === 'approve' ? 'Approving...' : 'Approve'}
                      </button>
                    </div>

                    <div className="ast-approval-card ast-decline-card">
                      <h5>Decline Assessment</h5>
                      <label className="ast-field">
                        <span>Decline reason required</span>
                        <textarea
                          value={declineReason}
                          onChange={(event) => setDeclineReason(event.target.value)}
                          rows={3}
                          placeholder="Explain why this assessment is declined..."
                        />
                      </label>

                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => void handleHrDecline()}
                        className="ast-btn ast-btn-danger"
                      >
                        {submittingAction === 'decline' ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                )}

                {actionMessage && <p className="ast-action-message success">{actionMessage}</p>}
                {actionError && <p className="ast-action-message error">{actionError}</p>}
              </div>
            )}

            {!canDeptHeadSign && !canHrAct && (
              <div className="appraisal-review-block">
                <h4>Review by</h4>
                <p>HR Department</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssessmentScoreTablePage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<EmployeeAssessment | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssessmentStatus>('ALL');

  const roleFlags = useMemo(() => getCurrentRoleFlags(), []);

  const pageLabel = roleFlags.isDepartmentHead && !roleFlags.isHr ? 'Department Head view' : 'HR view';

  const loadScoreTable = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await employeeAssessmentService.scoreTable();
      setRows(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load employee assessment score table.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScoreTable();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        row.employeeName?.toLowerCase().includes(normalizedSearch) ||
        row.employeeCode?.toLowerCase().includes(normalizedSearch) ||
        row.departmentName?.toLowerCase().includes(normalizedSearch) ||
        row.period?.toLowerCase().includes(normalizedSearch) ||
        row.status?.toLowerCase().includes(normalizedSearch) ||
        row.performanceLabel?.toLowerCase().includes(normalizedSearch) ||
        row.formName?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const activeRows = useMemo(
    () => rows.filter((row) => row.status !== 'DRAFT'),
    [rows],
  );

  const averageScore = useMemo(() => {
    if (!activeRows.length) return 0;

    const total = activeRows.reduce(
      (sum, row) => sum + Number(row.scorePercent || 0),
      0,
    );

    return Number((total / activeRows.length).toFixed(2));
  }, [activeRows]);

  const pendingHrRows = useMemo(
    () => rows.filter((row) => row.status === 'PENDING_HR'),
    [rows],
  );

  const topScore = useMemo(() => {
    if (!rows.length) return 0;

    return Math.max(...rows.map((row) => Number(row.scorePercent || 0)));
  }, [rows]);

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

  const handleAssessmentChanged = async (updated: EmployeeAssessment) => {
    setSelectedAssessment(updated);
    await loadScoreTable();
  };

  return (
    <div className="ast-page">
      {selectedAssessment && (
        <AssessmentDetailModal
          assessment={selectedAssessment}
          roleFlags={roleFlags}
          onClose={() => setSelectedAssessment(null)}
          onChanged={(updated) => void handleAssessmentChanged(updated)}
        />
      )}

      <div className="ast-container">
        <div className="ast-hero">
          <div>
            <p className="ast-hero-pill">
              <i className="bi bi-clipboard-data" />
              Assessment Workflow
            </p>

            <h1>Employee Self-Assessment Scores</h1>

            <p>
              Review self-assessments, manager remarks, department head signature,
              and HR final actions.
            </p>
          </div>

          <button type="button" onClick={() => void loadScoreTable()} className="ast-refresh-btn">
            <i className={`bi bi-arrow-repeat ${loading ? 'ast-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="ast-stat-grid">
          <div className="ast-stat-card">
            <span>Total Records</span>
            <strong>{rows.length}</strong>
          </div>

          <div className="ast-stat-card">
            <span>In Workflow</span>
            <strong className="green">{activeRows.length}</strong>
          </div>

          <div className="ast-stat-card">
            <span>Pending HR</span>
            <strong className="blue">{pendingHrRows.length}</strong>
          </div>

          <div className="ast-stat-card">
            <span>Top Score</span>
            <strong className="purple">{topScore}%</strong>
          </div>
        </div>

        <div className="ast-toolbar">
          <div className="ast-search">
            <i className="bi bi-search" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee, code, department, form, period, status, label..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AssessmentStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <span className="ast-showing">
            Showing {filteredRows.length} of {rows.length}
          </span>
        </div>

        {error && (
          <div className="ast-alert-error">
            <i className="bi bi-exclamation-triangle" />
            {error}
          </div>
        )}

        <div className="ast-table-card">
          <div className="ast-table-header">
            <div>
              <h2>Assessment Score Records</h2>
              <p>Click View Details to review the employee's full self-assessment.</p>
            </div>

            <span className="ast-view-pill">
              <span />
              {pageLabel}
            </span>
          </div>

          {loading ? (
            <div className="ast-empty-state">
              <i className="bi bi-arrow-repeat ast-spin" />
              Loading assessment scores...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="ast-empty-state">
              <i className="bi bi-clipboard-x" />
              <strong>No assessment scores found</strong>
              <p>Once employees submit self-assessments, their scores will appear here.</p>
            </div>
          ) : (
            <div className="ast-table-scroll">
              <table className="ast-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Form</th>
                    <th>Department</th>
                    <th>Period</th>
                    <th>Score</th>
                    <th>Performance</th>
                    <th>Status</th>
                    <th>Signatures</th>
                    <th>Submitted</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.id}-${row.employeeId ?? row.employeeCode ?? row.employeeName}`}>
                      <td>
                        <strong>{row.employeeName || 'Unknown Employee'}</strong>
                        <small>{row.employeeCode || 'No employee code'}</small>
                      </td>

                      <td>{row.formName || '-'}</td>
                      <td>{row.departmentName || 'No department'}</td>
                      <td><strong>{row.period || '—'}</strong></td>

                      <td>
                        <div className="ast-score-cell">
                          <div>
                            <strong>{row.scorePercent ?? 0}%</strong>
                            <span>{row.totalScore ?? 0}/{row.maxScore ?? 0}</span>
                          </div>

                          <div className="ast-progress">
                            <span
                              style={{
                                width: `${Math.min(Number(row.scorePercent || 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`ast-badge ${scoreBadgeClass(row.performanceLabel)}`}>
                          {row.performanceLabel || 'Not scored'}
                        </span>
                      </td>

                      <td>
                        <span className={`ast-badge ${statusBadgeClass(row.status)}`}>
                          {row.status || '—'}
                        </span>
                      </td>

                      <td>
                        <SignatureBadges row={row} />
                      </td>

                      <td className="muted-small">{formatDateTime(row.submittedAt)}</td>

                      <td className="right">
                        <button
                          type="button"
                          disabled={detailLoadingId === row.id}
                          onClick={() => void openDetails(row)}
                          className="ast-btn ast-btn-primary ast-btn-small"
                        >
                          {detailLoadingId === row.id ? 'Opening...' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="ast-average-note">
          Average active workflow score: {averageScore}%
        </p>
      </div>
    </div>
  );
};

export default AssessmentScoreTablePage;
