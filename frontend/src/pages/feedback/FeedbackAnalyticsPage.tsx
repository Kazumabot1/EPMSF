// import { useEffect, useState } from 'react';
// import { feedbackService } from '../../services/feedbackService';
// import type {
//   ConsolidatedFeedbackReport,
//   FeedbackCampaign,
//   FeedbackCompletionDashboard,
//   FeedbackDashboard,
//   FeedbackSummary,
//   PendingEvaluator,
// } from '../../types/feedback';
// import {
//   EmptyState,
//   MetricCard,
//   RecentIdList,
//   SectionIntro,
//   StatusBadge,
//   formatDate,
//   formatDateTime,
//   formatPercent,
//   formatScore,
//   loadRecentIds,
// } from './feedback-ui';
//
// type DashboardKind = 'employee' | 'manager' | 'hr';
//
// const FeedbackAnalyticsPage = () => {
//   const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
//   const [requestId, setRequestId] = useState('');
//   const [campaignId, setCampaignId] = useState('');
//   const [recentRequestIds] = useState<number[]>(() => loadRecentIds('requests'));
//   const [summary, setSummary] = useState<FeedbackSummary | null>(null);
//   const [pendingEvaluators, setPendingEvaluators] = useState<PendingEvaluator[]>([]);
//   const [completion, setCompletion] = useState<FeedbackCompletionDashboard | null>(null);
//   const [consolidated, setConsolidated] = useState<ConsolidatedFeedbackReport | null>(null);
//   const [dashboard, setDashboard] = useState<FeedbackDashboard | null>(null);
//   const [dashboardKind, setDashboardKind] = useState<DashboardKind>('hr');
//   const [busy, setBusy] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//
//   const loadCampaigns = async () => {
//     try {
//       setLoading(true);
//       const data = await feedbackService.getCampaigns();
//       setCampaigns(data);
//       if (!campaignId && data[0]) {
//         setCampaignId(String(data[0].id));
//       }
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load campaign references.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   useEffect(() => {
//     void loadCampaigns();
//   }, []);
//
//   const loadSummary = async () => {
//     if (!requestId.trim()) {
//       setError('Choose a request reference before loading request analytics.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const [summaryData, pendingData] = await Promise.all([
//         feedbackService.getSummary(Number(requestId)),
//         feedbackService.getPendingEvaluators(Number(requestId)),
//       ]);
//       setSummary(summaryData);
//       setPendingEvaluators(pendingData);
//       setSuccess(`Request analytics loaded for request #${requestId}.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load request analytics.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const loadCampaignAnalytics = async () => {
//     if (!campaignId.trim()) {
//       setError('Choose a campaign before loading campaign analytics.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const [completionData, consolidatedData] = await Promise.all([
//         feedbackService.getCompletionDashboard(Number(campaignId)),
//         feedbackService.getConsolidatedReport(Number(campaignId)),
//       ]);
//       setCompletion(completionData);
//       setConsolidated(consolidatedData);
//       setSuccess(`Campaign analytics loaded for campaign #${campaignId}.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load campaign analytics.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const loadDashboard = async (kind: DashboardKind) => {
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       setDashboardKind(kind);
//
//       const data = kind === 'employee'
//           ? await feedbackService.getEmployeeDashboard()
//           : kind === 'manager'
//               ? await feedbackService.getManagerDashboard()
//               : await feedbackService.getHrDashboard();
//
//       setDashboard(data);
//       setSuccess(`${kind.toUpperCase()} dashboard loaded successfully.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : `Failed to load ${kind} dashboard.`);
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   return (
//       <div className="feedback-stack">
//         <div className="feedback-module-grid">
//           <section className="feedback-panel soft">
//             <SectionIntro
//                 title="Request and campaign analytics"
//                 body="Choose request and campaign records from readable pickers, then load exactly the insight you need."
//             />
//
//             {loading ? <div className="feedback-message info">Loading campaign references...</div> : null}
//
//             <div className="feedback-form-grid">
//               <div className="feedback-field">
//                 <label htmlFor="analytics-request-reference">Request reference</label>
//                 <input
//                     id="analytics-request-reference"
//                     className="kpi-input"
//                     value={requestId}
//                     onChange={(e) => setRequestId(e.target.value)}
//                     placeholder="Example: 88"
//                 />
//               </div>
//
//               <div className="feedback-field">
//                 <label htmlFor="analytics-campaign-reference">Campaign</label>
//                 <select
//                     id="analytics-campaign-reference"
//                     className="kpi-select"
//                     value={campaignId}
//                     onChange={(e) => setCampaignId(e.target.value)}
//                 >
//                   <option value="">Select campaign</option>
//                   {campaigns.map((campaign) => (
//                       <option key={campaign.id} value={campaign.id}>
//                         {campaign.name} #{campaign.id}
//                       </option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//
//             <RecentIdList
//                 title="Recent request references"
//                 ids={recentRequestIds}
//                 emptyLabel="Request references from the requests tab will appear here."
//                 onPick={(id) => setRequestId(String(id))}
//             />
//
//             <div className="feedback-actions">
//               <button className="kpi-btn-ghost" disabled={busy} onClick={() => void loadSummary()}>
//                 Load request insight
//               </button>
//               <button className="kpi-btn-ghost" disabled={busy || loading} onClick={() => void loadCampaignAnalytics()}>
//                 Load campaign insight
//               </button>
//             </div>
//
//             <div className="feedback-note" style={{ marginTop: 16 }}>
//               <strong>Why this is better</strong>
//               Metrics are split into summary cards and tables. There is no raw JSON block to interpret manually.
//             </div>
//           </section>
//
//           <aside className="feedback-panel">
//             <SectionIntro
//                 title="Role dashboards"
//                 body="Load a dashboard tailored to the perspective you want to inspect."
//             />
//
//             <div className="feedback-subtabs">
//               <button
//                   type="button"
//                   className={`feedback-subtab ${dashboardKind === 'employee' ? 'active' : ''}`}
//                   onClick={() => void loadDashboard('employee')}
//               >
//                 Employee
//               </button>
//               <button
//                   type="button"
//                   className={`feedback-subtab ${dashboardKind === 'manager' ? 'active' : ''}`}
//                   onClick={() => void loadDashboard('manager')}
//               >
//                 Manager
//               </button>
//               <button
//                   type="button"
//                   className={`feedback-subtab ${dashboardKind === 'hr' ? 'active' : ''}`}
//                   onClick={() => void loadDashboard('hr')}
//               >
//                 HR
//               </button>
//             </div>
//
//             {success ? <div className="feedback-message info">{success}</div> : null}
//             {error ? <div className="feedback-message error">{error}</div> : null}
//           </aside>
//         </div>
//
//         <section className="feedback-panel">
//           <SectionIntro
//               title="Request insight"
//               body="Average score and pending reviewers for the selected request."
//           />
//
//           {summary ? (
//               <div className="feedback-stack">
//                 <div className="feedback-inline-metrics">
//                   <MetricCard label="Request reference" value={`#${summary.requestId}`} />
//                   <MetricCard label="Average score" value={formatScore(summary.averageScore)} />
//                   <MetricCard label="Responses submitted" value={summary.totalResponses} />
//                 </div>
//
//                 {pendingEvaluators.length === 0 ? (
//                     <EmptyState
//                         title="No pending evaluators"
//                         body="Everyone assigned to this request has already responded."
//                     />
//                 ) : (
//                     <div className="feedback-list-table-wrap">
//                       <table className="feedback-list-table">
//                         <thead>
//                         <tr>
//                           <th>Pending evaluator</th>
//                           <th>Request</th>
//                         </tr>
//                         </thead>
//                         <tbody>
//                         {pendingEvaluators.map((item, index) => (
//                             <tr key={`${item.requestId}-${item.evaluatorEmployeeId}-${index}`}>
//                               <td>Employee #{item.evaluatorEmployeeId}</td>
//                               <td>Request #{item.requestId}</td>
//                             </tr>
//                         ))}
//                         </tbody>
//                       </table>
//                     </div>
//                 )}
//               </div>
//           ) : (
//               <EmptyState
//                   title="No request analytics loaded"
//                   body="Pick a request reference and load request insight."
//               />
//           )}
//         </section>
//
//         <section className="feedback-panel">
//           <SectionIntro
//               title="Campaign insight"
//               body="Completion and consolidated score views for the selected campaign."
//           />
//
//           {completion ? (
//               <div className="feedback-stack">
//                 <div className="feedback-inline-metrics">
//                   <MetricCard label="Campaign" value={completion.campaignName} hint={`#${completion.campaignId}`} />
//                   <MetricCard label="Completion" value={formatPercent(completion.completionPercent)} />
//                   <MetricCard label="Pending users" value={completion.pendingUsers} />
//                 </div>
//
//                 <div className="feedback-list-table-wrap">
//                   <table className="feedback-list-table">
//                     <thead>
//                     <tr>
//                       <th>Request</th>
//                       <th>Employee</th>
//                       <th>Submitted</th>
//                       <th>Pending</th>
//                       <th>Completion</th>
//                     </tr>
//                     </thead>
//                     <tbody>
//                     {completion.requests.map((item) => (
//                         <tr key={item.requestId}>
//                           <td>Request #{item.requestId}</td>
//                           <td>Employee #{item.targetEmployeeId}</td>
//                           <td>{item.submittedEvaluators} / {item.totalEvaluators}</td>
//                           <td>{item.pendingEvaluators}</td>
//                           <td>{formatPercent(item.completionPercent)}</td>
//                         </tr>
//                     ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//           ) : (
//               <EmptyState
//                   title="No campaign completion data loaded"
//                   body="Choose a campaign and load campaign insight."
//               />
//           )}
//
//           {consolidated ? (
//               <div className="feedback-stack" style={{ marginTop: 18 }}>
//                 <div className="feedback-inline-metrics">
//                   <MetricCard label="Campaign average" value={formatScore(consolidated.campaignAverageScore)} />
//                   <MetricCard label="Category" value={consolidated.campaignScoreCategory ?? '—'} />
//                   <MetricCard label="Responses" value={consolidated.totalResponses} />
//                   <MetricCard label="Consolidated rows" value={consolidated.items.length} />
//                 </div>
//
//                 <div className="feedback-list-table-wrap">
//                   <table className="feedback-list-table">
//                     <thead>
//                     <tr>
//                       <th>Employee</th>
//                       <th>Average score</th>
//                       <th>Category</th>
//                       <th>Total responses</th>
//                       <th>Manager</th>
//                       <th>Peer</th>
//                       <th>Subordinate</th>
//                       <th>Self</th>
//                     </tr>
//                     </thead>
//                     <tbody>
//                     {consolidated.items.map((item) => (
//                         <tr key={item.targetEmployeeId}>
//                           <td>{item.targetEmployeeName ?? `Employee #${item.targetEmployeeId}`}</td>
//                           <td>{formatScore(item.averageScore)}</td>
//                           <td>{item.scoreCategory ?? '—'}</td>
//                           <td>{item.totalResponses}</td>
//                           <td>{item.managerResponses}</td>
//                           <td>{item.peerResponses}</td>
//                           <td>{item.subordinateResponses}</td>
//                           <td>{item.selfResponses ?? 0}</td>
//                         </tr>
//                     ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//           ) : null}
//         </section>
//
//         <section className="feedback-panel">
//           <SectionIntro
//               title="Role dashboard result"
//               body="High-level workload and outcome metrics for the selected role dashboard."
//           />
//
//           {dashboard ? (
//               <div className="feedback-stack">
//                 <div className="feedback-inline-metrics">
//                   <MetricCard label="Dashboard type" value={dashboard.dashboardType} />
//                   <MetricCard label="Total requests" value={dashboard.totalRequests} />
//                   <MetricCard label="Average score" value={formatScore(dashboard.averageScore)} />
//                 </div>
//
//                 {dashboard.campaigns.length > 0 ? (
//                     <div className="feedback-list-table-wrap">
//                       <table className="feedback-list-table">
//                         <thead>
//                         <tr>
//                           <th>Campaign</th>
//                           <th>Status</th>
//                           <th>Window</th>
//                           <th>Requests</th>
//                           <th>Completion</th>
//                         </tr>
//                         </thead>
//                         <tbody>
//                         {dashboard.campaigns.map((campaign) => (
//                             <tr key={campaign.campaignId}>
//                               <td>{campaign.campaignName}</td>
//                               <td><StatusBadge status={campaign.status} /></td>
//                               <td>{formatDate(campaign.startDate)} to {formatDate(campaign.endDate)}</td>
//                               <td>{campaign.totalRequests}</td>
//                               <td>{formatPercent(campaign.completionPercent)}</td>
//                             </tr>
//                         ))}
//                         </tbody>
//                       </table>
//                     </div>
//                 ) : null}
//
//                 {dashboard.pendingFeedbackToSubmit.length > 0 ? (
//                     <div className="feedback-list-table-wrap">
//                       <table className="feedback-list-table">
//                         <thead>
//                         <tr>
//                           <th>Assignment</th>
//                           <th>Campaign</th>
//                           <th>Employee</th>
//                           <th>Due</th>
//                           <th>Status</th>
//                         </tr>
//                         </thead>
//                         <tbody>
//                         {dashboard.pendingFeedbackToSubmit.map((item) => (
//                             <tr key={item.evaluatorAssignmentId}>
//                               <td>#{item.evaluatorAssignmentId}</td>
//                               <td>{item.campaignName}</td>
//                               <td>Employee #{item.targetEmployeeId}</td>
//                               <td>{formatDateTime(item.dueAt)}</td>
//                               <td><StatusBadge status={item.status} /></td>
//                             </tr>
//                         ))}
//                         </tbody>
//                       </table>
//                     </div>
//                 ) : null}
//               </div>
//           ) : (
//               <EmptyState
//                   title="No dashboard loaded"
//                   body="Choose Employee, Manager, or HR to load a dashboard view."
//               />
//           )}
//         </section>
//       </div>
//   );
// };
//
// export default FeedbackAnalyticsPage;
