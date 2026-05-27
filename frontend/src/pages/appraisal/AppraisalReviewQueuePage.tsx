import { useEffect, useMemo, useState } from "react";
import { appraisalWorkflowService } from "../../services/appraisalService";
import type {
  AppraisalReviewSubmitRequest,
  EmployeeAppraisalFormResponse,
} from "../../types/appraisal";
import AppraisalFormView from "../../components/appraisal/AppraisalFormView";
import AppraisalPopup, {
  type AppraisalPopupType,
} from "../../components/appraisal/AppraisalPopup";
import { formatDisplayDate } from "../../utils/appraisalDateFormat";
import "./appraisal.css";

type PopupState = {
  type: AppraisalPopupType;
  title: string;
  message: string;
};

interface AppraisalReviewQueuePageProps {
  mode: "dept-head" | "hr";
}

const AppraisalReviewQueuePage = ({ mode }: AppraisalReviewQueuePageProps) => {
  const [forms, setForms] = useState<EmployeeAppraisalFormResponse[]>([]);
  const [selected, setSelected] =
    useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);

  const closeFormModal = () => setSelected(null);

  const load = async () => {
    setLoading(true);
    try {
      const data =
        mode === "dept-head"
          ? await appraisalWorkflowService.getDeptHeadQueue()
          : await appraisalWorkflowService.getHrQueue();
      setForms(data);
      setSelected(
        (current) => data.find((item) => item.id === current?.id) ?? null,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mode]);

  const sortedForms = useMemo(
    () =>
      [...forms].sort(
        (left, right) =>
          formReceivedTime(mode, right) - formReceivedTime(mode, left),
      ),
    [forms, mode],
  );

  const stats = useMemo(
    () => ({
      pending: sortedForms.length,
    }),
    [sortedForms],
  );

  const showManagerDeadline = false;
  const showDeptHeadDeadline = mode === "dept-head";
  const tableColSpan =
    7 + Number(showManagerDeadline) + Number(showDeptHeadDeadline);

  const submitReview = async (payload: AppraisalReviewSubmitRequest) => {
    if (!selected) return;
    setLoading(true);
    setMessage("");
    try {
      if (mode === "dept-head") {
        await appraisalWorkflowService.submitDeptHeadReview(
          selected.id,
          payload,
        );
      } else {
        await appraisalWorkflowService.approveByHr(selected.id, payload);
      }
      setSelected(null);
      setMessage("");
      setPopup(
        mode === "dept-head"
          ? {
              type: "success",
              title: "Submitted Successfully",
              message: "Dept Head review submitted to HR.",
            }
          : {
              type: "success",
              title: "Submitted Successfully",
              message:
                "HR completed the appraisal and sent it to the employee.",
            },
      );
      await load();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Submit failed.";
      setMessage(errorMessage);
      setPopup({
        type: "error",
        title: "Submit Failed",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-review-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">
              {mode === "dept-head" ? "Dept Head Check" : "HR Final Review"}
            </p>
            <h1>
              {mode === "dept-head"
                ? "Manager Review Check"
                : "Manager + Dept Head Review"}
            </h1>
            <p>
              {mode === "dept-head"
                ? "Open Manager submitted forms, check ratings and remarks, then submit to HR."
                : "Open forms checked by Dept Head, review both stages, sign, then submit to employee."}
            </p>
          </div>
          <div className="appraisal-hero-stat-stack">
            <div className="appraisal-hero-stat-card">
              <strong>{stats.pending}</strong>
              <span>Pending Forms</span>
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
            <h2>
              {mode === "dept-head"
                ? "Manager Submitted Appraisal Forms"
                : "Dept Head Checked Appraisal Forms"}
            </h2>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Employee</th>
                <th>Cycle Type</th>
                <th>Cycle Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                {showManagerDeadline && <th>Manager Deadline</th>}
                {showDeptHeadDeadline && <th>Dept Head Deadline</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedForms.length === 0 && !loading ? (
                <tr>
                  <td colSpan={tableColSpan}>
                    <div className="appraisal-empty">No pending forms.</div>
                  </td>
                </tr>
              ) : (
                sortedForms.map((form) => (
                  <tr
                    key={form.id}
                    className={`appraisal-clickable-row ${selected?.id === form.id ? "appraisal-selected-row" : ""}`}
                    onClick={() => setSelected(form)}
                    title="Open appraisal form"
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
                    <td>{form.cycleType || "-"}</td>
                    <td>{form.cycleYear || "-"}</td>
                    <td>
                      {formatDate(form.cycleStartDate || form.assessmentDate)}
                    </td>
                    <td>{formatDate(form.cycleEndDate)}</td>
                    {showManagerDeadline && (
                      <td>
                        {formatDate(
                          form.cycleManagerSubmissionDeadline ||
                            form.cycleSubmissionDeadline,
                        )}
                      </td>
                    )}
                    {showDeptHeadDeadline && (
                      <td>
                        {formatDate(
                          form.cycleDeptHeadSubmissionDeadline ||
                            form.cycleSubmissionDeadline,
                        )}
                      </td>
                    )}
                    <td>
                      <span className={statusClass(form.status)}>
                        {form.status}
                      </span>
                    </td>
                  </tr>
                ))
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
            aria-labelledby="appraisal-review-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appraisal-modal-header">
              <div>
                <h2 id="appraisal-review-modal-title">{selected.cycleName}</h2>
              </div>
              <button
                className="appraisal-modal-close"
                type="button"
                onClick={closeFormModal}
                aria-label="Close appraisal form"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              <AppraisalFormView
                form={selected}
                mode={mode}
                busy={loading}
                onReviewSubmit={submitReview}
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

const formReceivedTime = (
  mode: AppraisalReviewQueuePageProps["mode"],
  form: EmployeeAppraisalFormResponse,
) => {
  const primaryDate =
    mode === "dept-head" ? form.pmSubmittedAt : form.deptHeadSubmittedAt;
  return toDateTime(
    primaryDate ||
      form.hrApprovedAt ||
      form.assessmentDate ||
      form.cycleStartDate,
  );
};

const toDateTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatDate = formatDisplayDate;

const statusClass = (status?: string | null) => {
  const normalized = status ?? "";
  if (normalized === "COMPLETED") return "appraisal-status green";
  if (normalized === "RETURNED") return "appraisal-status red";
  if (normalized === "HR_PENDING" || normalized === "DEPT_HEAD_PENDING")
    return "appraisal-status amber";
  return "appraisal-status gray";
};

export default AppraisalReviewQueuePage;
