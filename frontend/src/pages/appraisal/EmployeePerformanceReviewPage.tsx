import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { appraisalCycleService, appraisalWorkflowService } from '../../services/appraisalService';
import type {
  AppraisalCycleResponse,
  AppraisalEmployeeOptionResponse,
  AppraisalScoreBandResponse,
  AppraisalTemplateResponse,
  EmployeeAppraisalFormResponse,
  PmAppraisalSubmitRequest,
} from '../../types/appraisal';
import AppraisalFormView from '../../components/appraisal/AppraisalFormView';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import AppraisalPopup, { type AppraisalPopupType } from '../../components/appraisal/AppraisalPopup';
import { formatDisplayDate } from '../../utils/appraisalDateFormat';
import './appraisal.css';

type PopupState = {
  type: AppraisalPopupType;
  title: string;
  message: string;
};

const DEFAULT_SCORE_BANDS: AppraisalScoreBandResponse[] = [
  { id: 0, minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1, active: true },
  { id: 0, minScore: 71, maxScore: 85, label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.', sortOrder: 2, active: true },
  { id: 0, minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.', sortOrder: 3, active: true },
  { id: 0, minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.', sortOrder: 4, active: true },
  { id: 0, minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5, active: true },
];

const EmployeePerformanceReviewPage = () => {
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [employees, setEmployees] = useState<AppraisalEmployeeOptionResponse[]>([]);
  const [reviewedEmployeeIds, setReviewedEmployeeIds] = useState<Set<number>>(() => new Set());
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [selectedCycleTemplate, setSelectedCycleTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [form, setForm] = useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [message, setMessage] = useState('');
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const selectedCycle = useMemo(() => cycles.find((cycle) => cycle.id === selectedCycleId) ?? null, [cycles, selectedCycleId]);
  const selectedCycleLocked = Boolean(selectedCycle?.locked || selectedCycle?.status === 'LOCKED' || isCycleEndDateToday(selectedCycle?.endDate));
  const availableEmployees = useMemo(
    () => employees.filter((employee) => !reviewedEmployeeIds.has(employee.employeeId)),
    [employees, reviewedEmployeeIds],
  );
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employeeId === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const departmentOptions = useMemo(() => {
    const options = new Map<number, string>();
    cycles.forEach((cycle) => {
      cycle.departmentIds?.forEach((departmentId, index) => {
        options.set(departmentId, cycle.departmentNames?.[index] || `Department #${departmentId}`);
      });
    });
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [cycles]);

  const filteredCycles = useMemo(() => {
    const selectedDepartmentId = departmentFilter ? Number(departmentFilter) : null;
    return cycles.filter((cycle) => selectedDepartmentId === null || cycle.departmentIds?.includes(selectedDepartmentId));
  }, [cycles, departmentFilter]);

  const clearCycleFilters = () => {
    setDepartmentFilter('');
  };

  const closeReviewModal = () => {
    setSelectedCycleId(0);
    setReviewedEmployeeIds(new Set());
    setSelectedEmployeeId(0);
    setSelectedCycleTemplate(null);
    setEmployees([]);
    setForm(null);
  };

  useEffect(() => {
    const loadCycles = async () => {
      setLoading(true);
      try {
        const reviewCycles = await appraisalCycleService.getActiveForPm();
        setCycles(reviewCycles.filter(shouldShowCycleToManager));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Appraisal cycles could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    void loadCycles();
  }, []);

  const loadEmployeesForCycle = async (cycleId: number) => {
    setLoadingEmployees(true);
    setEmployees([]);
    setSelectedEmployeeId(0);
    setForm(null);
    try {
      const employeeList = await appraisalWorkflowService.getPmEligibleEmployees(cycleId);
      setEmployees(employeeList);
      if (employeeList.length === 0) {
        setMessage('No eligible employee-level team members remain for this cycle. Submitted employees are removed from the review list.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Eligible employee list could not be loaded.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadTemplateForCycle = async (cycleId: number) => {
    setLoadingTemplate(true);
    setSelectedCycleTemplate(null);
    try {
      const template = await appraisalWorkflowService.getPmCycleTemplate(cycleId);
      setSelectedCycleTemplate(template);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Appraisal cycle form template could not be loaded.');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const openCycle = (cycle: AppraisalCycleResponse) => {
    setSelectedCycleId(cycle.id);
    setReviewedEmployeeIds(new Set());
    setSelectedEmployeeId(0);
    setSelectedCycleTemplate(null);
    setForm(null);
    setMessage('');
    if (cycle.locked || cycle.status === 'LOCKED' || isCycleEndDateToday(cycle.endDate)) {
      setEmployees([]);
      setMessage('This appraisal cycle is locked by HR. You can see the record but cannot open or submit the form.');
      return;
    }
    void loadEmployeesForCycle(cycle.id);
    void loadTemplateForCycle(cycle.id);
  };

  const refreshEligibleEmployees = async () => {
    if (!selectedCycleId || selectedCycleLocked) return;
    const employeeList = await appraisalWorkflowService.getPmEligibleEmployees(selectedCycleId);
    setEmployees(employeeList);
  };

  const openEmployeeForm = async (employeeId: number) => {
    if (!selectedCycleId || !employeeId || selectedCycleLocked) return;
    setSelectedEmployeeId(employeeId);
    setForm(null);
    setLoading(true);
    setMessage('');
    try {
      const draft = await appraisalWorkflowService.createPmDraft(selectedCycleId, employeeId);
      setForm(draft);
      setSelectedEmployeeId(draft.employeeId);
    } catch (error) {
      setForm(null);
      setMessage(error instanceof Error ? error.message : 'Unable to open appraisal cycle form.');
    } finally {
      setLoading(false);
    }
  };

  const submitPm = async (payload: PmAppraisalSubmitRequest) => {
    if (!form) return;
    setLoading(true);
    try {
      await appraisalWorkflowService.submitPmReview(form.id, payload);
      setReviewedEmployeeIds((previous) => new Set(previous).add(form.employeeId));
      setForm(null);
      setSelectedEmployeeId(0);
      await refreshEligibleEmployees();
      setMessage('');
      setPopup({
        type: 'success',
        title: 'Submitted Successfully',
        message: 'Manager review submitted to Dept Head. Choose the next employee name in the same appraisal form box.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submit failed.';
      setMessage(errorMessage);
      setPopup({ type: 'error', title: 'Submit Failed', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };


  const savePmDraft = async (payload: PmAppraisalSubmitRequest) => {
    if (!form) return;
    const formId = form.id;
    try {
      const updated = await appraisalWorkflowService.savePmDraft(formId, payload);
      setForm((current) => (current?.id === formId ? updated : current));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Auto-save failed.');
      throw error;
    }
  };

  const employeeNameField = (
    <label className="appraisal-field appraisal-employee-picker-field">
      <span>Employee Name</span>
      <select
        value={selectedEmployeeId}
        onChange={(event) => void openEmployeeForm(Number(event.target.value))}
        disabled={loading || loadingEmployees || selectedCycleLocked}
      >
        <option value={0}>{loadingEmployees ? 'Loading employee-level team members...' : 'Select employee name'}</option>
        {availableEmployees.map((employee) => (
          <option key={employee.employeeId} value={employee.employeeId}>
            {formatEmployeeNameOption(employee)}
          </option>
        ))}
      </select>
      <small>Only employee-level members from your assigned team can be selected.</small>
    </label>
  );

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-manager-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">Team Appraisals</p>
            <h1>Employee Performance Review</h1>
            <p>Click an HR appraisal cycle to open the same appraisal cycle form style, then select the employee name inside the form.</p>
          </div>
          <div className="appraisal-hero-stat-card">
            <strong>{filteredCycles.length}</strong>
            <span>Cycle Records</span>
          </div>
        </div>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Appraisal Cycle Records From HR</h2>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        <div className="appraisal-filter-bar">
          <label className="appraisal-filter-field">
            <span>Department</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">All Departments</option>
              {departmentOptions.map(([departmentId, departmentName]) => (
                <option key={departmentId} value={departmentId}>{departmentName}</option>
              ))}
            </select>
          </label>
          <div className="appraisal-filter-actions">
            <button className="appraisal-button ghost" type="button" onClick={clearCycleFilters}>Clear Filters</button>
            <span className="appraisal-filter-result">Showing {filteredCycles.length} of {cycles.length}</span>
          </div>
        </div>

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Department</th>
                <th>Manager Deadline</th>
                <th>Cycle Type</th>
                <th>Cycle Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8}><div className="appraisal-empty">{cycles.length === 0 ? 'No appraisal cycle records found.' : 'No appraisal cycles match the selected department.'}</div></td>
                </tr>
              ) : filteredCycles.map((cycle) => (
                <tr
                  key={cycle.id}
                  className={`appraisal-clickable-row ${selectedCycleId === cycle.id ? 'appraisal-selected-row' : ''}`}
                  onClick={() => openCycle(cycle)}
                  title="Open appraisal form"
                >
                  <td><strong>{cycle.cycleName}</strong></td>
                  <td>{cycle.departmentNames?.join(', ') || '-'}</td>
                  <td>{formatDate(cycle.managerSubmissionDeadline || cycle.submissionDeadline)}</td>
                  <td>{cycle.cycleType}</td>
                  <td>{cycle.cycleYear}</td>
                  <td>{formatDate(cycle.startDate)}</td>
                  <td>{formatDate(cycle.endDate)}</td>
                  <td><span className={statusClass(displayCycleStatus(cycle))}>{displayCycleStatus(cycle)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCycle && !selectedCycleLocked && (
        <div className="appraisal-modal-backdrop" onClick={closeReviewModal}>
          <div
            className="appraisal-modal-box appraisal-modal-box-xl appraisal-full-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-review-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appraisal-modal-header">
              <div>
                <h2 id="manager-review-modal-title">{form ? `${form.cycleName} - ${form.employeeName}` : selectedCycle.cycleName}</h2>
              </div>
              <button className="appraisal-modal-close" type="button" onClick={closeReviewModal} aria-label="Close manager review form">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              {form ? (
                <AppraisalFormView
                  form={form}
                  mode="pm"
                  busy={loading}
                  onPmSubmit={submitPm}
                  onPmDraftSave={savePmDraft}
                  employeeNameField={employeeNameField}
                />
              ) : (
                <CycleEmployeeFormShell
                  cycle={selectedCycle}
                  template={selectedCycleTemplate}
                  employeeNameField={employeeNameField}
                  selectedEmployee={selectedEmployee}
                  loading={loading || loadingEmployees || loadingTemplate}
                />
              )}
            </div>
            <div className="appraisal-modal-footer">
              <button className="appraisal-button secondary" type="button" onClick={closeReviewModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {popup && (
        <AppraisalPopup
          open={Boolean(popup)}
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
};

interface CycleEmployeeFormShellProps {
  cycle: AppraisalCycleResponse;
  template: AppraisalTemplateResponse | null;
  employeeNameField: ReactNode;
  selectedEmployee: AppraisalEmployeeOptionResponse | null;
  loading: boolean;
}

const CycleEmployeeFormShell = ({ cycle, template, employeeNameField, selectedEmployee, loading }: CycleEmployeeFormShellProps) => {
  let globalNo = 0;
  const scoreBands = activeScoreBands(template?.scoreBands);

  return (
    <div className="appraisal-card appraisal-form-sheet appraisal-modern-form-card appraisal-cycle-form-shell appraisal-cycle-view-modal">
      <div className="appraisal-template-banner center">
        <span className="appraisal-form-kicker">Appraisal Cycle Form</span>
        <h2>{cycle.cycleName}</h2>
      </div>

      <div className="appraisal-template-summary-card appraisal-cycle-summary-card compact-summary">
        <div><strong>Appraisal Name</strong><span>{cycle.cycleName}</span></div>
        <div><strong>Cycle Type</strong><span>{cycle.cycleType || '-'}</span></div>
        <div><strong>Cycle Year</strong><span>{cycle.cycleYear}</span></div>
        <div><strong>Status</strong><span>{cycle.status}</span></div>
      </div>

      <div className="appraisal-form-block">
        <h3>Employee Information</h3>
        <div className="appraisal-inline-grid three appraisal-cycle-employee-grid">
          {employeeNameField}
          <ShellInfoField label="Employee ID" value={selectedEmployee?.employeeCode || '-'} />
          <ShellInfoField label="Current Position" value={selectedEmployee?.positionName || '-'} />
          <ShellInfoField label="Department" value={selectedEmployee?.departmentName || cycle.departmentNames?.join(', ') || '-'} />
          <ShellInfoField label="Assessment Date" value={formatDate(cycle.startDate)} />
          <ShellInfoField label="Effective Date" value="-" />
          <ShellInfoField label="Manager Deadline" value={formatDate(cycle.managerSubmissionDeadline || cycle.submissionDeadline)} />
        </div>
      </div>

      <div className="appraisal-form-block">
        <h3>Evaluations</h3>
        {loading && !template ? <div className="appraisal-empty">Loading appraisal cycle form...</div> : null}
        {!loading && !template ? <div className="appraisal-empty">Selected appraisal cycle form template could not be loaded.</div> : null}
        {template?.sections.map((section) => (
          <div className="appraisal-section-card" key={section.id}>
            <div className="appraisal-section-header">
              <div className="appraisal-section-title-wrap">
                <strong>{section.sectionName}</strong>
                <small>{section.criteria.length} criteria</small>
              </div>
            </div>
            <div className="appraisal-template-table-wrap">
              <table className="appraisal-template-table">
                <thead><tr><th>#</th><th>Criteria</th><th>Rating 1-5</th></tr></thead>
                <tbody>
                  {section.criteria.map((criteria) => {
                    globalNo += 1;
                    return (
                      <tr key={criteria.id}>
                        <td className="appraisal-center-cell">{globalNo}</td>
                        <td>{criteria.criteriaText}</td>
                        <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="appraisal-form-block">
        <h3>Score Calculation</h3>
        <div className="appraisal-score-formula-card in-block">
          <div className="appraisal-total-points-strip">
            <strong>Total Points</strong>
            <span>Actual total points are shown and calculated after Manager gives ratings.</span>
          </div>
          <table className="appraisal-score-formula-table">
            <thead><tr><th>Analysis</th><th>Formula</th><th>Score</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Total Points</strong></td>
                <td><div className="formula-main">Total Point</div><div className="formula-divider" /><div>Number of Questions Answered × 5</div><div className="formula-multiply">× 100</div></td>
                <td>Auto calculated from Manager ratings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="appraisal-form-block">
        <h3>Score Guide</h3>
        <ScoreGuide bands={scoreBands} />
      </div>

      <div className="appraisal-form-block">
        <h3>Other Remarks</h3>
        <div className="appraisal-other-remarks-preview"><span>Appraiser's Comment for Discussion</span></div>
      </div>

      <ShellSignatureSection />
    </div>
  );
};

const ShellSignatureSection = () => (
  <div className="appraisal-form-block appraisal-workflow-signature-section">
    <h3>Signature Section</h3>
    <div className="appraisal-signature-grid appraisal-template-signature-grid appraisal-workflow-signature-grid">
      <ShellSignatureSlot label="Manager Signature & Date" />
      <ShellSignatureSlot label="Dept Head Signature & Date" />
      <ShellSignatureSlot label="HR Signature / Date / Designation" />
    </div>
  </div>
);

const ShellSignatureSlot = ({ label }: { label: string }) => (
  <div className="appraisal-signature-slot appraisal-readonly-signature-slot">
    <span className="appraisal-signature-placeholder">{label}</span>
    <p className="appraisal-signature-date">Date: -</p>
  </div>
);

const ShellInfoField = ({ label, value }: { label: string; value: string | number }) => (
  <label className="appraisal-field">
    <span>{label}</span>
    <input value={String(value)} readOnly disabled />
  </label>
);

const ScoreGuide = ({ bands }: { bands: AppraisalScoreBandResponse[] }) => (
  <div className="appraisal-score-band-editor read-only">
    <div className="appraisal-score-band-head">
      <span>Score</span>
      <span>Rating</span>
      <span>Description</span>
    </div>
    {bands.map((band, index) => (
      <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
        <div className="appraisal-score-range-inputs"><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></div>
        <strong>{band.label}</strong>
        <span className="appraisal-muted">{band.description || '-'}</span>
      </div>
    ))}
  </div>
);

const activeScoreBands = (bands?: AppraisalScoreBandResponse[] | null) => {
  const source = bands && bands.length ? bands : DEFAULT_SCORE_BANDS;
  return [...source]
    .filter((band) => band.active !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
};


const startOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const toLocalDateOnly = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return startOfLocalDay(new Date(value));
  return new Date(year, month - 1, day);
};

const isCycleEndDateToday = (value?: string | null) => {
  const endDate = toLocalDateOnly(value);
  if (!endDate) return false;
  return endDate.getTime() === startOfLocalDay(new Date()).getTime();
};

const shouldShowCycleToManager = (cycle: AppraisalCycleResponse) => {
  const endDate = toLocalDateOnly(cycle.endDate);
  if (!endDate) return true;
  return endDate.getTime() >= startOfLocalDay(new Date()).getTime();
};

const displayCycleStatus = (cycle: AppraisalCycleResponse) => (
  cycle.locked || cycle.status === 'LOCKED' || isCycleEndDateToday(cycle.endDate) ? 'LOCKED' : cycle.status
);

const formatEmployeeNameOption = (employee: AppraisalEmployeeOptionResponse) => {
  const code = employee.employeeCode ? ` (${employee.employeeCode})` : '';
  const position = employee.positionName ? ` - ${employee.positionName}` : '';
  return `${employee.employeeName}${code}${position}`;
};

const formatDate = formatDisplayDate;

const statusClass = (status?: string | null) => {
  const normalized = status ?? '';
  if (normalized === 'ACTIVE') return 'appraisal-status green';
  if (normalized === 'LOCKED') return 'appraisal-status gray';
  if (normalized === 'COMPLETED') return 'appraisal-status green';
  return 'appraisal-status amber';
};

export default EmployeePerformanceReviewPage;
