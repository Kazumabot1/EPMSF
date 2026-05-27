import { useEffect, useMemo, useState } from "react";
import { appraisalWorkflowService } from "../../services/appraisalService";
import type {
  AppraisalReviewResponse,
  EmployeeAppraisalFormResponse,
} from "../../types/appraisal";
import AppraisalFormView from "../../components/appraisal/AppraisalFormView";
import {
  formatDisplayDate,
  formatDisplayDateTime,
} from "../../utils/appraisalDateFormat";
import "./appraisal.css";

const AppraisalEmployeeReviewsPage = () => {
  const [forms, setForms] = useState<EmployeeAppraisalFormResponse[]>([]);
  const [selected, setSelected] =
    useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [exportingFormId, setExportingFormId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");

  const closeFormModal = () => setSelected(null);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await appraisalWorkflowService.getHrReviewedRecords();
      setForms(data);
      setSelected(
        (current) => data.find((item) => item.id === current?.id) ?? null,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "HR reviewed appraisal records could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const departmentOptions = useMemo(() => {
    const options = new Map<number, string>();
    forms.forEach((form) => {
      if (form.departmentId) {
        options.set(
          form.departmentId,
          form.departmentName || `Department #${form.departmentId}`,
        );
      }
    });
    return Array.from(options.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [forms]);

  const employeeIdOptions = useMemo(() => {
    const selectedDepartmentId = departmentFilter
      ? Number(departmentFilter)
      : null;
    const options = new Map<number, string>();
    forms.forEach((form) => {
      if (
        selectedDepartmentId !== null &&
        form.departmentId !== selectedDepartmentId
      )
        return;
      const employeeCode = form.employeeCode || String(form.employeeId);
      options.set(form.employeeId, `${employeeCode} - ${form.employeeName}`);
    });
    return Array.from(options.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [departmentFilter, forms]);

  useEffect(() => {
    if (!employeeIdFilter) return;
    const stillAvailable = employeeIdOptions.some(
      ([employeeId]) => String(employeeId) === employeeIdFilter,
    );
    if (!stillAvailable) setEmployeeIdFilter("");
  }, [employeeIdFilter, employeeIdOptions]);

  const filteredForms = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchText);
    const selectedDepartmentId = departmentFilter
      ? Number(departmentFilter)
      : null;
    const selectedEmployeeId = employeeIdFilter
      ? Number(employeeIdFilter)
      : null;

    return forms.filter((form) => {
      const departmentMatches =
        selectedDepartmentId === null ||
        form.departmentId === selectedDepartmentId;
      const employeeMatches =
        selectedEmployeeId === null || form.employeeId === selectedEmployeeId;
      const searchMatches =
        !normalizedSearch ||
        [
          form.cycleName,
          form.employeeName,
          form.employeeCode,
          form.departmentName,
          form.positionName,
          form.status,
        ].some((value) => normalizeSearch(value).includes(normalizedSearch));

      return departmentMatches && employeeMatches && searchMatches;
    });
  }, [departmentFilter, employeeIdFilter, forms, searchText]);

  const stats = useMemo(
    () => ({
      reviewed: filteredForms.length,
    }),
    [filteredForms],
  );

  const clearEmployeeReviewFilters = () => {
    setSearchText("");
    setDepartmentFilter("");
    setEmployeeIdFilter("");
  };

  const buildPdfFilename = (form: EmployeeAppraisalFormResponse) => {
    const employeeName = (form.employeeName || "employee")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `performance-appraisal-${employeeName || "employee"}-${form.id}.pdf`;
  };

  const exportPdf = async (form: EmployeeAppraisalFormResponse) => {
    if (!form.id) return;
    setExportingFormId(form.id);
    setMessage("");
    try {
      const blob = await appraisalWorkflowService.exportHrEmployeeReviewPdf(form.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildPdfFilename(form);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Performance appraisal PDF could not be exported.",
      );
    } finally {
      setExportingFormId(null);
    }
  };

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-review-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">Employee Reviews</p>
            <h1>HR Reviewed Appraisal Records</h1>
            <p>
              View employee appraisal forms that HR has reviewed and submitted
              to employees.
            </p>
          </div>
          <div className="appraisal-hero-stat-stack">
            <div className="appraisal-hero-stat-card">
              <strong>{stats.reviewed}</strong>
              <span>Reviewed Forms</span>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="appraisal-card appraisal-message-card">{message}</div>
      )}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Employee Review Records</h2>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        <div className="appraisal-filter-bar">
          <label className="appraisal-filter-field">
            <span>Search</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search appraisal, employee, ID, department"
            />
          </label>
          <label className="appraisal-filter-field">
            <span>Department</span>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">All Departments</option>
              {departmentOptions.map(([departmentId, departmentName]) => (
                <option key={departmentId} value={departmentId}>
                  {departmentName}
                </option>
              ))}
            </select>
          </label>
          <label className="appraisal-filter-field">
            <span>Employee ID</span>
            <select
              value={employeeIdFilter}
              onChange={(event) => setEmployeeIdFilter(event.target.value)}
            >
              <option value="">All Employee IDs</option>
              {employeeIdOptions.map(([employeeId, label]) => (
                <option key={employeeId} value={employeeId}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="appraisal-filter-actions">
            <button
              className="appraisal-button ghost"
              type="button"
              onClick={clearEmployeeReviewFilters}
            >
              Clear Filters
            </button>
            <span className="appraisal-filter-result">
              Showing {filteredForms.length} of {forms.length}
            </span>
          </div>
        </div>

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Cycle Type</th>
                <th>Cycle Year</th>
                <th>End Date</th>
                <th>HR Submitted At</th>
                <th>Status</th>
                <th>Export PDF</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="appraisal-empty">
                      {forms.length === 0
                        ? "No HR reviewed appraisal records found."
                        : "No employee review records match the selected filters."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredForms.map((form) => {
                  const hrReview = findReview(form.reviews ?? [], "HR");
                  return (
                    <tr
                      key={form.id}
                      className={`appraisal-clickable-row ${selected?.id === form.id ? "appraisal-selected-row" : ""}`}
                      onClick={() => setSelected(form)}
                      title="Open HR reviewed appraisal record"
                    >
                      <td>
                        <strong>{form.cycleName}</strong>
                      </td>
                      <td>
                        <strong>{form.employeeName}</strong>
                        <p className="appraisal-muted">
                          {form.employeeCode || "-"}
                        </p>
                      </td>
                      <td>{form.departmentName}</td>
                      <td>{form.cycleType || "-"}</td>
                      <td>{form.cycleYear || "-"}</td>
                      <td>{formatDate(form.cycleEndDate)}</td>
                      <td>
                        {formatDateTime(
                          hrReview?.submittedAt || form.hrApprovedAt,
                        )}
                      </td>
                      <td>
                        <span className={statusClass(form.status)}>
                          {form.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="appraisal-button secondary tiny"
                          type="button"
                          disabled={exportingFormId === form.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void exportPdf(form);
                          }}
                        >
                          {exportingFormId === form.id ? "Exporting..." : "Export PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
            aria-labelledby="appraisal-record-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appraisal-modal-header">
              <div>
                <h2 id="appraisal-record-modal-title">{selected.cycleName}</h2>
              </div>
              <button
                className="appraisal-modal-close"
                type="button"
                onClick={closeFormModal}
                aria-label="Close appraisal record"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              <AppraisalFormView
                form={selected}
                mode="readonly"
                busy={loading}
              />
            </div>
            <div className="appraisal-modal-footer">
              <button
                className="appraisal-button secondary"
                type="button"
                onClick={closeFormModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const findReview = (
  reviews: AppraisalReviewResponse[],
  stage: AppraisalReviewResponse["reviewStage"],
) => reviews.find((review) => review.reviewStage === stage);

const normalizeSearch = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();


const formatDate = formatDisplayDate;

const formatDateTime = formatDisplayDateTime;

const statusClass = (status?: string | null) => {
  const normalized = status ?? "";
  if (normalized === "COMPLETED") return "appraisal-status green";
  if (normalized === "RETURNED" || normalized === "REJECTED")
    return "appraisal-status red";
  if (normalized === "HR_PENDING" || normalized === "DEPT_HEAD_PENDING")
    return "appraisal-status amber";
  return "appraisal-status gray";
};

export default AppraisalEmployeeReviewsPage;
