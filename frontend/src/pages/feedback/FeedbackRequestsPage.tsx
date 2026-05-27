// import { useEffect, useState } from 'react';
// import { getAllEmployees, type Employee } from '../../services/employeeService';
// import { feedbackService } from '../../services/feedbackService';
// import type { FeedbackCampaign, FeedbackRequestListItem, EvaluatorType } from '../../types/feedback';
// import {
//   EmptyState,
//   RecentIdList,
//   SectionIntro,
//   StatusBadge,
//   evaluatorTypeLabels,
//   evaluatorTypeOptions,
//   formatDateTime,
//   formatEmployeeLabel,
//   loadRecentIds,
//   storeRecentId,
// } from './feedback-ui';
//
// const defaultDueAt = () => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
//
// const FeedbackRequestsPage = () => {
//   const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [requestHistory, setRequestHistory] = useState<FeedbackRequestListItem[]>([]);
//   const [campaignId, setCampaignId] = useState('');
//   const [targetEmployeeId, setTargetEmployeeId] = useState('');
//   const [formId, setFormId] = useState('');
//   const [dueAt, setDueAt] = useState(defaultDueAt());
//   const [anonymousEnabled, setAnonymousEnabled] = useState(true);
//   const [evaluatorTypes, setEvaluatorTypes] = useState<EvaluatorType[]>(['MANAGER', 'PEER', 'SUBORDINATE']);
//   const [requestId, setRequestId] = useState('');
//   const [recentFormIds, setRecentFormIds] = useState<number[]>(() => loadRecentIds('forms'));
//   const [recentRequestIds, setRecentRequestIds] = useState<number[]>(() => loadRecentIds('requests'));
//   const [busy, setBusy] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//
//   const loadReferences = async () => {
//     try {
//       setLoading(true);
//       setError('');
//       const [campaignData, employeeData] = await Promise.all([
//         feedbackService.getCampaigns(),
//         getAllEmployees(),
//       ]);
//       setCampaigns(campaignData);
//       setEmployees(employeeData);
//       if (!campaignId && campaignData[0]) {
//         setCampaignId(String(campaignData[0].id));
//       }
//       if (!targetEmployeeId && employeeData[0]) {
//         setTargetEmployeeId(String(employeeData[0].id));
//       }
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load request references.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   useEffect(() => {
//     void loadReferences();
//   }, []);
//
//   const loadEmployeeRequests = async (employeeId: number) => {
//     try {
//       setBusy(true);
//       setError('');
//       const page = await feedbackService.getRequestsForEmployee(employeeId);
//       setRequestHistory(page.content);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load employee request history.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const createRequest = async () => {
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//
//       const createdRequestId = await feedbackService.createRequest({
//         formId: Number(formId),
//         campaignId: Number(campaignId),
//         targetEmployeeId: Number(targetEmployeeId),
//         dueAt: new Date(dueAt).toISOString(),
//         anonymousEnabled,
//         evaluatorTypes,
//       });
//
//       setRequestId(String(createdRequestId));
//       setRecentRequestIds(storeRecentId('requests', createdRequestId));
//       setRecentFormIds(storeRecentId('forms', Number(formId)));
//       setSuccess(`Request created successfully. Request reference #${createdRequestId}.`);
//       await loadEmployeeRequests(Number(targetEmployeeId));
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to create feedback request.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const updateDeadline = async () => {
//     if (!requestId.trim()) {
//       setError('Choose a request reference before updating the deadline.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const updatedRequestId = await feedbackService.updateDeadline(Number(requestId), new Date(dueAt).toISOString());
//       setRecentRequestIds(storeRecentId('requests', updatedRequestId));
//       setSuccess(`Deadline updated for request #${updatedRequestId}.`);
//       if (targetEmployeeId) {
//         await loadEmployeeRequests(Number(targetEmployeeId));
//       }
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to update request deadline.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const sendReminders = async () => {
//     if (!requestId.trim()) {
//       setError('Choose a request reference before sending reminders.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const sentCount = await feedbackService.sendReminders(Number(requestId));
//       setSuccess(`Reminder notification flow completed. ${sentCount} reminder(s) sent for request #${requestId}.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to send reminders.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   return (
//     <div className="feedback-stack">
//       <div className="feedback-module-grid">
//         <section className="feedback-panel soft">
//           <SectionIntro
//             title="Create 360 request"
//             body="Choose the campaign and employee by name. Only the form reference still needs a numeric lookup because the backend has no form list endpoint yet."
//           />
//
//           {loading ? <div className="feedback-message info">Loading campaigns and employees...</div> : null}
//
//           <div className="feedback-form-grid">
//             <div className="feedback-field">
//               <label htmlFor="request-campaign">Campaign</label>
//               <select
//                 id="request-campaign"
//                 className="kpi-select"
//                 value={campaignId}
//                 onChange={(e) => setCampaignId(e.target.value)}
//               >
//                 <option value="">Select campaign</option>
//                 {campaigns.map((campaign) => (
//                   <option key={campaign.id} value={campaign.id}>
//                     {campaign.name} #{campaign.id}
//                   </option>
//                 ))}
//               </select>
//             </div>
//
//             <div className="feedback-field">
//               <label htmlFor="request-employee">Employee receiving feedback</label>
//               <select
//                 id="request-employee"
//                 className="kpi-select"
//                 value={targetEmployeeId}
//                 onChange={(e) => setTargetEmployeeId(e.target.value)}
//               >
//                 <option value="">Select employee</option>
//                 {employees.map((employee) => (
//                   <option key={employee.id} value={employee.id}>
//                     {formatEmployeeLabel(employee)} #{employee.id}
//                   </option>
//                 ))}
//               </select>
//             </div>
//
//             <div className="feedback-field">
//               <label htmlFor="request-form-reference">Form reference number</label>
//               <input
//                 id="request-form-reference"
//                 className="kpi-input"
//                 value={formId}
//                 onChange={(e) => setFormId(e.target.value)}
//                 placeholder="Example: 24"
//               />
//               <small>Use a recent form reference from the forms tab.</small>
//             </div>
//
//             <div className="feedback-field">
//               <label htmlFor="request-due-at">Deadline</label>
//               <input
//                 id="request-due-at"
//                 className="kpi-input"
//                 type="datetime-local"
//                 value={dueAt}
//                 onChange={(e) => setDueAt(e.target.value)}
//               />
//             </div>
//
//             <div className="feedback-field full">
//               <label className="feedback-checkbox">
//                 <input
//                   type="checkbox"
//                   checked={anonymousEnabled}
//                   onChange={(e) => setAnonymousEnabled(e.target.checked)}
//                 />
//                 Allow anonymous feedback submissions
//               </label>
//             </div>
//
//             <div className="feedback-field full">
//               <label>Evaluator groups</label>
//               <div className="feedback-choice-group">
//                 {evaluatorTypeOptions.map((type) => (
//                   <label key={type} className="feedback-choice-chip">
//                     <input
//                       type="checkbox"
//                       checked={evaluatorTypes.includes(type)}
//                       onChange={(e) =>
//                         setEvaluatorTypes((current) =>
//                           e.target.checked
//                             ? [...current, type]
//                             : current.filter((item) => item !== type),
//                         )
//                       }
//                     />
//                     {evaluatorTypeLabels[type]}
//                   </label>
//                 ))}
//               </div>
//             </div>
//           </div>
//
//           <RecentIdList
//             title="Recent form references"
//             ids={recentFormIds}
//             emptyLabel="Create or update a form first. Its reference will appear here."
//             onPick={(id) => setFormId(String(id))}
//           />
//
//           <div className="feedback-actions">
//             <button className="kpi-btn-primary" disabled={busy || loading} onClick={() => void createRequest()}>
//               Create request
//             </button>
//             <button
//               className="kpi-btn-ghost"
//               disabled={busy || !targetEmployeeId}
//               onClick={() => void loadEmployeeRequests(Number(targetEmployeeId))}
//             >
//               View this employee&apos;s requests
//             </button>
//           </div>
//
//           {success ? <div className="feedback-message info">{success}</div> : null}
//           {error ? <div className="feedback-message error">{error}</div> : null}
//         </section>
//
//         <aside className="feedback-panel">
//           <SectionIntro
//             title="Follow-up actions"
//             body="Use a named request from the history table or a saved request reference below."
//           />
//
//           <div className="feedback-field">
//             <label htmlFor="existing-request-reference">Request reference number</label>
//             <input
//               id="existing-request-reference"
//               className="kpi-input"
//               value={requestId}
//               onChange={(e) => setRequestId(e.target.value)}
//               placeholder="Example: 88"
//             />
//           </div>
//
//           <RecentIdList
//             title="Recent request references"
//             ids={recentRequestIds}
//             emptyLabel="Created requests will appear here."
//             onPick={(id) => setRequestId(String(id))}
//           />
//
//           <div className="feedback-actions">
//             <button className="kpi-btn-ghost" disabled={busy} onClick={() => void updateDeadline()}>
//               Update deadline
//             </button>
//             <button className="kpi-btn-ghost" disabled={busy} onClick={() => void sendReminders()}>
//               Send reminders
//             </button>
//           </div>
//
//           <div className="feedback-note" style={{ marginTop: 16 }}>
//             <strong>Current clarity improvement</strong>
//             Campaigns and employees are selected by name now. The only remaining raw reference is the form number, because the API still does not expose a readable form list.
//           </div>
//         </aside>
//       </div>
//
//       <section className="feedback-panel">
//         <SectionIntro
//           title="Request history"
//           body="This list makes it easier to pick the right request before changing deadlines or sending reminders."
//         />
//
//         {requestHistory.length === 0 ? (
//           <EmptyState
//             title="No requests loaded"
//             body="Choose an employee and load request history to manage existing 360 feedback requests."
//           />
//         ) : (
//           <div className="feedback-list-table-wrap">
//             <table className="feedback-list-table">
//               <thead>
//                 <tr>
//                   <th>Request</th>
//                   <th>Campaign</th>
//                   <th>Employee</th>
//                   <th>Due date</th>
//                   <th>Status</th>
//                   <th />
//                 </tr>
//               </thead>
//               <tbody>
//                 {requestHistory.map((request) => {
//                   const employee = employees.find((item) => item.id === request.targetEmployeeId);
//                   return (
//                     <tr key={request.id}>
//                       <td>
//                         <div className="feedback-table-title">
//                           <strong>Request #{request.id}</strong>
//                           <small>Form reference #{request.formId}</small>
//                         </div>
//                       </td>
//                       <td>{request.campaignName}</td>
//                       <td>{employee ? formatEmployeeLabel(employee) : `Employee #${request.targetEmployeeId}`}</td>
//                       <td>{formatDateTime(request.dueAt)}</td>
//                       <td><StatusBadge status={request.status} /></td>
//                       <td>
//                         <button
//                           className="kpi-btn-ghost"
//                           type="button"
//                           onClick={() => setRequestId(String(request.id))}
//                         >
//                           Use this request
//                         </button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </section>
//     </div>
//   );
// };
//
// export default FeedbackRequestsPage;
