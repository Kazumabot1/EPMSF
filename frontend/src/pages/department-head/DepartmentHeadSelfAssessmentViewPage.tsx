import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentScoreRow,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import './department-head-self-assessment-view.css';

type FilterKey = 'ALL' | 'DRAFT' | 'PENDING' | 'COMPLETE' | 'REJECTED';

const FILTERS: Array<{ key: FilterKey; label: string; description: string }> = [
  {
    key: 'ALL',
    label: 'All',
    description: 'All submitted department self-assessment forms',
  },
  {
    key: 'DRAFT',
    label: 'Draft',
    description: 'Submitted by employee, waiting for manager signature',
  },
  {
    key: 'PENDING',
    label: 'Pending',
    description: 'Manager signed, waiting for HR confirmation',
  },
  {
    key: 'COMPLETE',
    label: 'Complete',
    description: 'Manager and HR confirmed',
  },
  {
    key: 'REJECTED',
    label: 'Rejected',
    description: 'Rejected by Manager or HR',
  },
];

const DRAFT_STATUSES: AssessmentStatus[] = ['SUBMITTED', 'PENDING_MANAGER'];
const PENDING_STATUSES: AssessmentStatus[] = ['PENDING_HR'];
const COMPLETE_STATUSES: AssessmentStatus[] = ['APPROVED'];
const REJECTED_STATUSES: AssessmentStatus[] = ['DECLINED', 'REJECTED', 'CLOSED_REJECTED'];

const statusLabel = (status?: string | null) => {
  if (!status) return 'Draft';

  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const statusClass = (status?: string | null) => {
  const normalized = String(status || 'DRAFT').toUpperCase();

  if (DRAFT_STATUSES.includes(normalized as AssessmentStatus)) return 'draft';
  if (PENDING_STATUSES.includes(normalized as AssessmentStatus)) return 'pending';
  if (COMPLETE_STATUSES.includes(normalized as AssessmentStatus)) return 'complete';
  if (REJECTED_STATUSES.includes(normalized as AssessmentStatus)) return 'rejected';

  return 'default';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replace('T', ' ');
  }

  return date.toLocaleString();
};

const getRowDate = (row: AssessmentScoreRow) => {
  return row.approvedAt ?? row.declinedAt ?? row.submittedAt ?? null;
};

const getRejectSource = (assessment?: EmployeeAssessment | null) => {
  if (!assessment || !REJECTED_STATUSES.includes(assessment.status)) return null;

  if (assessment.hrComment || assessment.hrSignatureName || assessment.status === 'DECLINED') {
    return {
      label: 'HR',
      name: assessment.hrSignatureName || 'HR',
      reason: assessment.declineReason || assessment.hrComment || '-',
    };
  }

  return {
    label: 'Manager',
    name: assessment.managerSignatureName || assessment.managerName || 'Manager',
    reason: assessment.declineReason || assessment.managerComment || '-',
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const anyError = error as any;

  return (
    anyError?.response?.data?.message ||
    anyError?.response?.data?.error ||
    anyError?.response?.data?.data?.message ||
    anyError?.message ||
    fallback
  );
};

const DepartmentHeadSelfAssessmentViewPage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [selected, setSelected] = useState<EmployeeAssessment | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRows = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await employeeAssessmentService.getScoreTable();

      const sorted = [...data].sort((a, b) => {
        const left = getRowDate(a) ? new Date(getRowDate(a) as string).getTime() : 0;
        const right = getRowDate(b) ? new Date(getRowDate(b) as string).getTime() : 0;

        return right - left;
      });

      setRows(sorted);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load department self-assessment forms.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    if (activeFilter === 'ALL') return rows;

    return rows.filter((row) => {
      if (activeFilter === 'DRAFT') return DRAFT_STATUSES.includes(row.status);
      if (activeFilter === 'PENDING') return PENDING_STATUSES.includes(row.status);
      if (activeFilter === 'COMPLETE') return COMPLETE_STATUSES.includes(row.status);
      if (activeFilter === 'REJECTED') return REJECTED_STATUSES.includes(row.status);

      return true;
    });
  }, [rows, activeFilter]);

  const counts = useMemo(() => {
    return {
      ALL: rows.length,
      DRAFT: rows.filter((row) => DRAFT_STATUSES.includes(row.status)).length,
      PENDING: rows.filter((row) => PENDING_STATUSES.includes(row.status)).length,
      COMPLETE: rows.filter((row) => COMPLETE_STATUSES.includes(row.status)).length,
      REJECTED: rows.filter((row) => REJECTED_STATUSES.includes(row.status)).length,
    };
  }, [rows]);

  const openDetail = async (row: AssessmentScoreRow) => {
    if (!row.id) return;

    try {
      setDetailLoading(true);
      setError('');

      const data = await employeeAssessmentService.getById(row.id);

      setSelected(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to open self-assessment form.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const rejectSource = getRejectSource(selected);

  return (
    <div className="dhsa-page">
      <div className="dhsa-shell">
        <div className="dhsa-hero">
          <div>
            <p className="dhsa-kicker">
              <i className="bi bi-eye" />
              Department Head View
            </p>
            <h1>Assessment Review</h1>
            <p>
              Review submitted assessment records from employees in your department. This page is view-only and includes reviewer signature status.
            </p>
          </div>

          <button type="button" className="dhsa-refresh-btn" onClick={() => void loadRows()}>
            <i className="bi bi-arrow-repeat" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="dhsa-alert">
            <i className="bi bi-exclamation-triangle" />
            {error}
          </div>
        )}

        <div className="dhsa-filter-grid">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`dhsa-filter-card ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span className="dhsa-filter-count">{counts[filter.key]}</span>
              <strong>{filter.label}</strong>
              <small>{filter.description}</small>
            </button>
          ))}
        </div>

        <div className="dhsa-table-card">
          <div className="dhsa-table-head">
            <div>
              <h2>{FILTERS.find((item) => item.key === activeFilter)?.label} Forms</h2>
              <p>{filteredRows.length} record(s)</p>
            </div>
          </div>

          {loading ? (
            <div className="dhsa-empty">
              <i className="bi bi-arrow-repeat dhsa-spin" />
              Loading assessment records...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="dhsa-empty">
              <i className="bi bi-inbox" />
              No assessment records found for this filter.
            </div>
          ) : (
            <div className="dhsa-table-scroll">
              <table className="dhsa-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Manager</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.employeeName}</strong>
                        <small>{row.employeeCode || '-'}</small>
                      </td>
                      <td>{row.departmentName || '-'}</td>
                      <td>{row.managerName || '-'}</td>
                      <td>{row.period || '-'}</td>
                      <td>
                        <span className={`dhsa-status ${statusClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.submittedAt)}</td>
                      <td className="right">
                        <button
                          type="button"
                          className="dhsa-view-btn"
                          disabled={detailLoading}
                          onClick={() => void openDetail(row)}
                        >
                          {detailLoading ? 'Opening...' : 'View'}
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

      {selected && (
        <div className="dhsa-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="dhsa-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dhsa-modal-head">
              <div>
                <p className="dhsa-modal-kicker">Assessment Detail</p>
                <h3>{selected.formName || 'Employee Self-assessment Form'}</h3>
                <span className={`dhsa-status ${statusClass(selected.status)}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>

              <button type="button" className="dhsa-close-btn" onClick={() => setSelected(null)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="dhsa-modal-body">
              <div className="dhsa-detail-grid">
                <div>
                  <label>Employee</label>
                  <span>{selected.employeeName}</span>
                </div>
                <div>
                  <label>Employee ID</label>
                  <span>{selected.employeeCode || '-'}</span>
                </div>
                <div>
                  <label>Department</label>
                  <span>{selected.departmentName || '-'}</span>
                </div>
                <div>
                  <label>Position</label>
                  <span>{selected.currentPosition || '-'}</span>
                </div>
                <div>
                  <label>Manager</label>
                  <span>{selected.managerName || '-'}</span>
                </div>
                <div>
                  <label>Period</label>
                  <span>{selected.period || '-'}</span>
                </div>
              </div>

              {rejectSource && (
                <div className="dhsa-rejected-box">
                  <strong>Rejected by {rejectSource.label}</strong>
                  <p>
                    <b>Name:</b> {rejectSource.name}
                  </p>
                  <p>
                    <b>Reason:</b> {rejectSource.reason}
                  </p>
                </div>
              )}

              <div className="dhsa-section">
                <h4>Assessment Subjects</h4>

                {selected.sections.map((section, sectionIndex) => (
                  <div key={section.id ?? section.title ?? sectionIndex} className="dhsa-section-card">
                    <div className="dhsa-section-title">
                      <span>{sectionIndex + 1}</span>
                      <strong>{section.title}</strong>
                    </div>

                    {section.items.map((item) => (
                      <div key={`${item.sectionTitle}-${item.itemOrder}`} className="dhsa-question">
                        <p>{item.questionText}</p>

                        <div className="dhsa-answer-row">
                          <span>
                            Yes/No:{' '}
                            <b>
                              {item.yesNoAnswer == null
                                ? '-'
                                : item.yesNoAnswer
                                  ? 'Yes'
                                  : 'No'}
                            </b>
                          </span>
                          <span>
                            Rating: <b>{item.rating ?? '-'}</b>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="dhsa-section">
                <h4>Reviewer Status</h4>

                <div className="dhsa-review-grid">
                  <div>
                    <label>Manager Signature</label>
                    <span>{selected.managerSignedAt ? `Signed at ${formatDateTime(selected.managerSignedAt)}` : 'Pending'}</span>
                  </div>
                  <div>
                    <label>HR Signature</label>
                    <span>{selected.hrSignedAt ? `Signed at ${formatDateTime(selected.hrSignedAt)}` : 'Pending'}</span>
                  </div>
                  <div>
                    <label>Manager Remarks</label>
                    <span>{selected.managerComment || '-'}</span>
                  </div>
                  <div>
                    <label>HR Remarks</label>
                    <span>{selected.hrComment || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="dhsa-note">
                Department Head has view-only access. Manager and HR actions are handled in their own review pages.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentHeadSelfAssessmentViewPage;