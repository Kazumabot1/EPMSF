/*Z*/import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import FormSignaturePicker, { type FormSignatureValue } from '../../components/signature/FormSignaturePicker';
import type { AssessmentScoreBand, AssessmentScoreRow, EmployeeAssessment } from '../../types/employeeAssessment';
import '../../components/signature/form-signature-picker.css';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/appraisalDateFormat';
import './assessment-score-table.css';

type LoadingState = 'idle' | 'loading' | 'error';
type RecordMode = 'view' | 'approve';
type PageMode = 'review' | 'records';

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'employee';

const formatScore = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return `${value.toFixed(2)}%`;
};

const defaultScoreBands = (): AssessmentScoreBand[] => [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1 },
  { minScore: 71, maxScore: 85, label: 'Good', description: 'Performance is consistent. Clearly meets essential requirements of job.', sortOrder: 2 },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory. Meets requirements of the job.', sortOrder: 3 },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Supervision and training are required for most problem areas.', sortOrder: 4 },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5 },
];

const statusLabel = (status?: string | null) => {
  switch (status) {
    case 'PENDING_HR': return 'Pending HR Approval';
    case 'PENDING_MANAGER': return 'Pending Manager Review';
    case 'PENDING_DEPARTMENT_HEAD': return 'Pending Dept Head Review';
    case 'APPROVED': return 'Approved';
    case 'DECLINED':
    case 'REJECTED':
    case 'CLOSED_REJECTED': return 'Rejected';
    default: return status?.replaceAll('_', ' ') || '-';
  }
};

const assessmentSignatureSrc = (imageData?: string | null, imageType?: string | null) => {
  if (!imageData || !imageType) return null;
  return imageData.startsWith('data:') ? imageData : `data:${imageType};base64,${imageData}`;
};

interface SelfAssessmentFormRecordsPageProps {
  pageMode?: PageMode;
}

const SelfAssessmentFormRecordsPage = ({ pageMode = 'records' }: SelfAssessmentFormRecordsPageProps) => {
  const [records, setRecords] = useState<AssessmentScoreRow[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [message, setMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<EmployeeAssessment | null>(null);
  const [recordMode, setRecordMode] = useState<RecordMode>('view');
  const [viewLoading, setViewLoading] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [hrComment, setHrComment] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [hrSignature, setHrSignature] = useState<FormSignatureValue>({
    signatureId: 0,
    imageData: null,
    imageType: null,
  });

  const loadRecords = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const rows = await employeeAssessmentService.getScoreTable();
      setRecords(
        [...rows].sort(
          (left, right) =>
            new Date(right.submittedAt || right.approvedAt || 0).getTime() -
            new Date(left.submittedAt || left.approvedAt || 0).getTime(),
        ),
      );
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Self-assessment records could not be loaded.');
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      [
        record.employeeName,
        record.employeeCode,
        record.departmentName,
        record.formName,
        record.period,
        statusLabel(record.status),
        record.performanceLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [records, searchText]);

  const pendingHrRecords = useMemo(
    () => filteredRecords.filter((record) => record.status === 'PENDING_HR'),
    [filteredRecords],
  );

  const approvedRecords = useMemo(
    () => filteredRecords.filter((record) => ['APPROVED', 'REJECTED', 'DECLINED', 'CLOSED_REJECTED'].includes(record.status)),
    [filteredRecords],
  );

  const summary = useMemo(() => {
    const approved = records.filter((record) => record.status === 'APPROVED').length;
    const rejected = records.filter((record) => ['REJECTED', 'DECLINED', 'CLOSED_REJECTED'].includes(record.status)).length;
    const pendingHr = records.filter((record) => record.status === 'PENDING_HR').length;
    const scored = records.filter((record) => record.status === 'APPROVED' && Number.isFinite(record.scorePercent));
    const average = scored.length
      ? scored.reduce((sum, record) => sum + Number(record.scorePercent || 0), 0) / scored.length
      : 0;
    return { approved, rejected, pendingHr, average };
  }, [records]);

  const heroCopy = pageMode === 'review'
    ? {
        title: 'Self-Assessment Review Forms',
        description: 'Manager-approved self-assessment forms arrive here for HR final review, comment, signature, and approval.',
        metricLabel: 'Waiting for HR',
        metricValue: summary.pendingHr,
      }
    : {
        title: 'Self-Assessment Form Records',
        description: 'Approved and rejected self-assessment forms are kept here as final review records.',
        metricLabel: 'Approved / Rejected Records',
        metricValue: summary.approved + summary.rejected,
      };


  const openRecord = async (id: number, mode: RecordMode) => {
    setViewLoading(true);
    setMessage('');
    setRecordMode(mode);
    try {
      const assessment = await employeeAssessmentService.getById(id);
      setSelectedAssessment(assessment);
      setHrComment(assessment.hrComment ?? '');
      setDeclineReason(assessment.declineReason ?? '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Self-assessment form could not be opened.');
    } finally {
      setViewLoading(false);
    }
  };

  const closeRecord = () => {
    setSelectedAssessment(null);
    setHrComment('');
    setDeclineReason('');
    setRecordMode('view');
  };

  const buildPdfFilename = (record: AssessmentScoreRow) =>
    `employee-self-assessment-${sanitizeFilename(record.employeeName || 'employee')}-${record.id}.pdf`;

  const exportPdf = async (record: AssessmentScoreRow) => {
    if (record.status !== 'APPROVED') {
      setMessage('HR must approve this self-assessment before exporting the PDF.');
      return;
    }

    setExportingId(record.id);
    setMessage('');
    try {
      const blob = await employeeAssessmentService.exportSelfAssessmentPdf(record.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildPdfFilename(record);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Self-assessment PDF could not be exported.');
    } finally {
      setExportingId(null);
    }
  };

  const approveSelectedAssessment = async () => {
    if (!selectedAssessment?.id) return;
    if (!hrSignature.signatureId || !hrSignature.imageData || !hrSignature.imageType) {
      setMessage('Please create or select your HR signature before approving.');
      return;
    }

    setApproving(true);
    setMessage('');
    try {
      const approved = await employeeAssessmentService.hrApprove(selectedAssessment.id, {
        comment: hrComment.trim(),
        signatureId: hrSignature.signatureId,
        signatureImageData: hrSignature.imageData,
        signatureImageType: hrSignature.imageType,
      });
      setSelectedAssessment(approved);
      setRecordMode('view');
      setHrComment(approved.hrComment ?? '');
      setMessage('Self-assessment form approved successfully.');
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'HR approval could not be completed.');
    } finally {
      setApproving(false);
    }
  };

  const declineSelectedAssessment = async () => {
    if (!selectedAssessment?.id) return;

    const reason = declineReason.trim();
    if (!reason) {
      setMessage('Please enter a rejection reason.');
      return;
    }

    setDeclining(true);
    setMessage('');
    try {
      const rejected = await employeeAssessmentService.hrDecline(
        selectedAssessment.id,
        reason,
        hrComment.trim() || undefined,
      );
      setSelectedAssessment(rejected);
      setRecordMode('view');
      setHrComment(rejected.hrComment ?? '');
      setDeclineReason(rejected.declineReason ?? '');
      setMessage('Self-assessment form rejected. The employee can correct it and resubmit directly to HR while the form period is open.');
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'HR rejection could not be completed.');
    } finally {
      setDeclining(false);
    }
  };

  const scoreBands = selectedAssessment?.scoreBands?.length
    ? [...selectedAssessment.scoreBands].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    : defaultScoreBands();

  const hrSignaturePreviewSrc = assessmentSignatureSrc(hrSignature.imageData, hrSignature.imageType);

  return (
    <div className="assessment-score-page">
      <section className="assessment-score-hero">
        <div>
          <p className="eyebrow">Assessment</p>
          <h1>{heroCopy.title}</h1>
          <p>{heroCopy.description}</p>
        </div>
        <div className="assessment-score-hero-card">
          <strong>{heroCopy.metricValue}</strong>
          <span>{heroCopy.metricLabel}</span>
        </div>
      </section>

      <section className="assessment-score-summary-grid">
        <div><span>Total Records</span><strong>{records.length}</strong></div>
        <div><span>Pending HR Approval</span><strong>{summary.pendingHr}</strong></div>
        <div><span>Approved</span><strong>{summary.approved}</strong></div>
        <div><span>Rejected</span><strong>{summary.rejected}</strong></div>
        <div><span>Average Score</span><strong>{formatPercent(summary.average)}</strong></div>
      </section>

      {message && <div className="assessment-score-message">{message}</div>}

      {pageMode === 'review' && (
        <section className="assessment-score-card">
          <div className="assessment-score-toolbar">
            <div>
              <h2>Review Forms</h2>
              <p>These forms were approved by managers and are waiting for HR comment, signature, and final approval.</p>
            </div>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search employee, department, status..."
            />
          </div>

          <SelfAssessmentRecordTable
            records={pendingHrRecords}
            emptyText={status === 'loading' ? 'Loading records...' : 'No self-assessment forms waiting for HR approval.'}
            viewLoading={viewLoading}
            exportingId={exportingId}
            showExport={false}
            onView={(record) => openRecord(record.id, 'approve')}
            onExport={exportPdf}
            viewLabel="Review Form"
          />
        </section>
      )}

      {pageMode === 'records' && (
        <section className="assessment-score-card">
          <div className="assessment-score-toolbar">
            <div>
              <h2>Form Records</h2>
              <p>Approved and rejected self-assessment forms are shown here. Only approved records can be exported as PDF.</p>
            </div>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search employee, department, status..."
            />
          </div>

          <SelfAssessmentRecordTable
            records={approvedRecords}
            emptyText={status === 'loading' ? 'Loading records...' : 'No approved or rejected self-assessment form records found.'}
            viewLoading={viewLoading}
            exportingId={exportingId}
            showExport
            onView={(record) => openRecord(record.id, 'view')}
            onExport={exportPdf}
            viewLabel="View Form"
          />
        </section>
      )}

      {selectedAssessment && (
        <div className="assessment-record-modal-backdrop">
          <div className="assessment-record-modal">
            <div className="assessment-record-modal-header">
              <div>
                <h2>{recordMode === 'approve' ? 'HR Review & Approval' : 'Employee Self-assessment Form'}</h2>
                <p>{selectedAssessment.employeeName} • {selectedAssessment.period} • {statusLabel(selectedAssessment.status)}</p>
              </div>
              <button type="button" onClick={closeRecord}>×</button>
            </div>
            <div className="assessment-record-modal-body">
              <div className="assessment-record-info-grid">
                <Info label="Employee Name" value={selectedAssessment.employeeName} />
                <Info label="Employee ID" value={selectedAssessment.employeeCode || '-'} />
                <Info label="Current Position" value={selectedAssessment.currentPosition || '-'} />
                <Info label="Department" value={selectedAssessment.departmentName || '-'} />
                <Info label="Assessment Date" value={formatDisplayDate(selectedAssessment.assessmentDate || selectedAssessment.submittedAt)} />
                <Info label="Status" value={statusLabel(selectedAssessment.status)} />
              </div>

              <h3>Employee Self-assessment Form</h3>
              <table className="assessment-record-preview-table">
                <thead>
                  <tr><th>Section</th><th>No.</th><th>Assessment Subject</th><th>Yes</th><th>No</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
                </thead>
                <tbody>
                  {selectedAssessment.sections.flatMap((section) =>
                    section.items.map((item, itemIndex) => (
                      <tr key={`${section.id}-${item.id}-${itemIndex}`}>
                        {itemIndex === 0 && <td rowSpan={section.items.length}>{section.title}</td>}
                        <td>{item.itemOrder}</td>
                        <td>{item.questionText}</td>
                        <td>{item.yesNoAnswer === true ? '✓' : ''}</td>
                        <td>{item.yesNoAnswer === false ? '✓' : ''}</td>
                        {[1, 2, 3, 4, 5].map((rating) => <td key={rating}>{item.rating === rating ? '✓' : ''}</td>)}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>

              <h3>Score Summary</h3>
              <div className="assessment-record-score-grid">
                <div><span>Total Points</span><strong>{formatScore(selectedAssessment.totalScore)}</strong></div>
                <div><span>Score</span><strong>{formatPercent(selectedAssessment.scorePercent)}</strong></div>
                <div><span>Current Result</span><strong>{selectedAssessment.performanceLabel}</strong></div>
              </div>

              <h3>Score Guide</h3>
              <table className="assessment-record-preview-table compact">
                <thead><tr><th>Score</th><th>Rating</th><th>Description</th></tr></thead>
                <tbody>
                  {scoreBands.map((band) => (
                    <tr key={`${band.minScore}-${band.maxScore}-${band.label}`}>
                      <td>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</td>
                      <td><strong>{band.label}</strong></td>
                      <td>{band.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Other Remarks</h3>
              <div className="assessment-record-remarks">
                <p><strong>Employee:</strong> {selectedAssessment.remarks || '-'}</p>
                <p><strong>Manager:</strong> {selectedAssessment.managerComment || '-'}</p>
                <p><strong>HR:</strong> {recordMode === 'approve' ? 'Add HR final comment below.' : selectedAssessment.hrComment || '-'}</p>
                <p><strong>Rejection:</strong> {selectedAssessment.declineReason ? `${selectedAssessment.rejectedByRole || 'Reviewer'} - ${selectedAssessment.declineReason}` : '-'}</p>
              </div>

              <h3>Signatures</h3>
              <div className="assessment-record-signature-grid">
                <SignatureBlock
                  label="Employee Signature / Date"
                  imageSrc={assessmentSignatureSrc(selectedAssessment.employeeSignatureImageData, selectedAssessment.employeeSignatureImageType)}
                  date={selectedAssessment.employeeSignedAt}
                />
                <SignatureBlock
                  label="Manager Signature / Date"
                  imageSrc={assessmentSignatureSrc(selectedAssessment.managerSignatureImageData, selectedAssessment.managerSignatureImageType)}
                  date={selectedAssessment.managerSignedAt}
                />
                <SignatureBlock
                  label="HR Signature / Date"
                  imageSrc={
                    recordMode === 'approve'
                      ? hrSignaturePreviewSrc
                      : assessmentSignatureSrc(selectedAssessment.hrSignatureImageData, selectedAssessment.hrSignatureImageType)
                  }
                  date={selectedAssessment.hrSignedAt}
                />
              </div>

              {recordMode === 'approve' && selectedAssessment.status === 'PENDING_HR' && (
                <div className="assessment-hr-approval-panel">
                  <h3>HR Final Approval</h3>
                  <label className="assessment-hr-field">
                    <span>HR Comment</span>
                    <textarea
                      rows={4}
                      value={hrComment}
                      onChange={(event) => setHrComment(event.target.value)}
                      placeholder="Enter HR final comment before approval or rejection."
                    />
                  </label>
                  <div className="assessment-hr-field">
                    <FormSignaturePicker
                      label="HR Signature"
                      value={hrSignature}
                      onChange={setHrSignature}
                      disabled={approving || declining}
                    />
                  </div>
                  <label className="assessment-hr-field">
                    <span>Rejection Reason</span>
                    <textarea
                      rows={3}
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                      placeholder="Required only when rejecting this form."
                    />
                  </label>
                  <div className="assessment-score-actions assessment-hr-actions">
                    <button
                      type="button"
                      onClick={approveSelectedAssessment}
                      disabled={approving || declining || !hrSignature.signatureId}
                    >
                      {approving ? 'Approving...' : 'Approve Form'}
                    </button>
                    <button
                      type="button"
                      onClick={declineSelectedAssessment}
                      disabled={approving || declining || !declineReason.trim()}
                    >
                      {declining ? 'Rejecting...' : 'Reject Form'}
                    </button>
                    <button type="button" onClick={closeRecord}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SelfAssessmentRecordTable = ({
  records,
  emptyText,
  viewLoading,
  exportingId,
  showExport,
  viewLabel,
  onView,
  onExport,
}: {
  records: AssessmentScoreRow[];
  emptyText: string;
  viewLoading: boolean;
  exportingId: number | null;
  showExport: boolean;
  viewLabel: string;
  onView: (record: AssessmentScoreRow) => void;
  onExport: (record: AssessmentScoreRow) => void;
}) => (
  <div className="assessment-score-table-wrap">
    <table className="assessment-score-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Department</th>
          <th>Period</th>
          <th>Status</th>
          <th>Score</th>
          <th>Result</th>
          <th>Submitted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id}>
            <td><strong>{record.employeeName}</strong><small>{record.employeeCode || '-'}</small></td>
            <td>{record.departmentName || '-'}</td>
            <td>{record.period || '-'}</td>
            <td><span className="assessment-status-pill">{statusLabel(record.status)}</span></td>
            <td>{formatPercent(record.scorePercent)}</td>
            <td><strong>{record.performanceLabel || '-'}</strong></td>
            <td>{formatDisplayDateTime(record.submittedAt || record.approvedAt)}</td>
            <td>
              <div className="assessment-score-actions">
                <button
                  className="assessment-score-action-btn assessment-score-action-btn--view"
                  type="button"
                  onClick={() => onView(record)}
                  disabled={viewLoading}
                >
                  {viewLabel}
                </button>
                {showExport && record.status === 'APPROVED' && (
                  <button
                    className="assessment-score-action-btn assessment-score-action-btn--export"
                    type="button"
                    onClick={() => onExport(record)}
                    disabled={exportingId === record.id}
                  >
                    {exportingId === record.id ? 'Exporting...' : 'Export PDF'}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {!records.length && (
          <tr><td colSpan={8}>{emptyText}</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const SignatureBlock = ({ label, imageSrc, date }: { label: string; imageSrc: string | null; date?: string | null }) => (
  <div className="assessment-record-signature-box">
    <div className="assessment-record-signature-line">
      {imageSrc ? <img src={imageSrc} alt={label} /> : <span>No signature yet</span>}
    </div>
    <strong>{label}</strong>
    <small>{date ? formatDisplayDateTime(date) : '-'}</small>
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="assessment-record-info-item">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default SelfAssessmentFormRecordsPage;
