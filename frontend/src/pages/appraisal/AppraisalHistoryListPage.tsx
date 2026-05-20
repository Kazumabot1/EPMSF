import { useEffect, useMemo, useState } from 'react';
import { appraisalWorkflowService } from '../../services/appraisalService';
import type { EmployeeAppraisalFormResponse } from '../../types/appraisal';
import AppraisalFormView from '../../components/appraisal/AppraisalFormView';
import { formatDisplayDateTime } from '../../utils/appraisalDateFormat';
import './appraisal.css';

interface AppraisalHistoryListPageProps {
  role: 'pm' | 'dept-head' | 'employee';
}

const titleByRole = {
  pm: 'Review History List',
  'dept-head': 'Review Check Record',
  employee: 'Performance Appraisal Cycle',
};

const descriptionByRole = {
  pm: 'Employee appraisal records submitted by Manager. Records are view-only.',
  'dept-head': 'Employee appraisal records checked by Dept Head and sent to HR.',
  employee: 'Completed appraisal forms approved by HR and sent to you.',
};

const AppraisalHistoryListPage = ({ role }: AppraisalHistoryListPageProps) => {
  const [forms, setForms] = useState<EmployeeAppraisalFormResponse[]>([]);
  const [selected, setSelected] = useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const closeFormModal = () => setSelected(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = role === 'pm'
          ? await appraisalWorkflowService.getPmHistory()
          : role === 'dept-head'
            ? await appraisalWorkflowService.getDeptHeadHistory()
            : await appraisalWorkflowService.getEmployeeForms();
        setForms(data);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const showDepartmentFilter = role === 'pm' || role === 'dept-head';

  const departmentOptions = useMemo(() => {
    const options = new Map<number, string>();
    forms.forEach((form) => {
      if (form.departmentId) {
        options.set(form.departmentId, form.departmentName || `Department #${form.departmentId}`);
      }
    });
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [forms]);

  const filteredForms = useMemo(() => {
    const selectedDepartmentId = departmentFilter ? Number(departmentFilter) : null;
    return forms.filter((form) => selectedDepartmentId === null || form.departmentId === selectedDepartmentId);
  }, [departmentFilter, forms]);

  const stats = useMemo(() => ({
    total: filteredForms.length,
  }), [filteredForms]);

  const clearHistoryFilters = () => {
    setDepartmentFilter('');
  };

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-history-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">Appraisal Records</p>
            <h1>{titleByRole[role]}</h1>
            <p>{descriptionByRole[role]}</p>
          </div>
          <div className="appraisal-hero-stat-stack">
            <div className="appraisal-hero-stat-card"><strong>{stats.total}</strong><span>Total Records</span></div>
          </div>
        </div>
      </div>

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>{role === 'pm' ? 'Manager Reviewed Employee Records' : role === 'dept-head' ? 'Dept Head Checked Records' : 'Completed Appraisal Records'}</h2>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        {showDepartmentFilter && (
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
              <button className="appraisal-button ghost" type="button" onClick={clearHistoryFilters}>Clear Filters</button>
              <span className="appraisal-filter-result">Showing {filteredForms.length} of {forms.length}</span>
            </div>
          </div>
        )}

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Employee</th>
                <th>Position</th>
                <th>Department</th>
                <th>Review Date Time</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6}><div className="appraisal-empty">{forms.length === 0 ? 'No records found.' : 'No records match the selected department.'}</div></td>
                </tr>
              ) : filteredForms.map((form) => (
                <tr
                  key={form.id}
                  className={`appraisal-clickable-row ${selected?.id === form.id ? 'appraisal-selected-row' : ''}`}
                  onClick={() => setSelected(form)}
                  title="Open appraisal form"
                >
                  <td><strong>{form.cycleName}</strong></td>
                  <td><strong>{form.employeeName}</strong></td>
                  <td>{form.positionName || '-'}</td>
                  <td>{form.departmentName}</td>
                  <td>{formatDateTime(reviewDateTime(role, form))}</td>
                  <td>{formatPercent(form.scorePercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {selected && (
        <div className="appraisal-modal-backdrop" onClick={closeFormModal}>
          <div
            className="appraisal-modal-box appraisal-modal-box-xl appraisal-full-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appraisal-history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appraisal-modal-header">
              <div>
                <h2 id="appraisal-history-modal-title">{selected.cycleName}</h2>
              </div>
              <button className="appraisal-modal-close" type="button" onClick={closeFormModal} aria-label="Close appraisal record">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              <AppraisalFormView form={selected} mode={role === 'employee' ? 'employee' : 'readonly'} />
            </div>
            <div className="appraisal-modal-footer">
              <button className="appraisal-button secondary" type="button" onClick={closeFormModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const reviewDateTime = (role: AppraisalHistoryListPageProps['role'], form: EmployeeAppraisalFormResponse) => {
  if (role === 'pm') return form.pmSubmittedAt;
  if (role === 'dept-head') return form.deptHeadSubmittedAt;
  return form.hrApprovedAt;
};

const formatDateTime = formatDisplayDateTime;

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
};

export default AppraisalHistoryListPage;
