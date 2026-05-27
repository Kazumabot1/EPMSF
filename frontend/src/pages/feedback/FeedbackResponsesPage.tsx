// import { useEffect, useState } from 'react';
// import { getAllEmployees, type Employee } from '../../services/employeeService';
// import { feedbackService } from '../../services/feedbackService';
// import type { FeedbackReceivedItem, FeedbackSubmissionStatus } from '../../types/feedback';
// import {
//   EmptyState,
//   RecentIdList,
//   SectionIntro,
//   StatusBadge,
//   formatDateTime,
//   formatEmployeeLabel,
//   formatScore,
//   loadRecentIds,
//   storeRecentId,
// } from './feedback-ui';
//
// type ResponseQuestionRow = {
//   localId: number;
//   questionId: string;
//   ratingValue: string;
//   comment: string;
// };
//
// const createQuestionRow = (): ResponseQuestionRow => ({
//   localId: Date.now() + Math.floor(Math.random() * 1000),
//   questionId: '',
//   ratingValue: '5',
//   comment: '',
// });
//
// const FeedbackResponsesPage = () => {
//   const [statuses, setStatuses] = useState<FeedbackSubmissionStatus[]>([]);
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [receivedFeedback, setReceivedFeedback] = useState<FeedbackReceivedItem[]>([]);
//   const [assignmentId, setAssignmentId] = useState('');
//   const [questions, setQuestions] = useState<ResponseQuestionRow[]>([createQuestionRow()]);
//   const [comments, setComments] = useState('');
//   const [targetEmployeeId, setTargetEmployeeId] = useState('');
//   const [recentAssignmentIds, setRecentAssignmentIds] = useState<number[]>(() => loadRecentIds('assignments'));
//   const [busy, setBusy] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//
//   const loadStatusAndEmployees = async () => {
//     try {
//       setLoading(true);
//       setError('');
//       const [statusData, employeeData] = await Promise.all([
//         feedbackService.getMyStatuses(),
//         getAllEmployees(),
//       ]);
//       setStatuses(statusData);
//       setEmployees(employeeData);
//       if (!targetEmployeeId && employeeData[0]) {
//         setTargetEmployeeId(String(employeeData[0].id));
//       }
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load response data.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   useEffect(() => {
//     void loadStatusAndEmployees();
//   }, []);
//
//   const submit = async (mode: 'draft' | 'submit') => {
//     if (!assignmentId.trim()) {
//       setError('Choose an evaluator assignment before saving or submitting.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//
//       const payload = {
//         evaluatorAssignmentId: Number(assignmentId),
//         comments,
//         responses: questions.map((question) => ({
//           questionId: Number(question.questionId),
//           ratingValue: Number(question.ratingValue),
//           comment: question.comment,
//         })),
//       };
//
//       const responseId = mode === 'draft'
//           ? await feedbackService.saveDraft(payload)
//           : await feedbackService.submitResponse(payload);
//
//       setRecentAssignmentIds(storeRecentId('assignments', Number(assignmentId)));
//       setSuccess(
//           mode === 'draft'
//               ? `Draft saved successfully. Response reference #${responseId}.`
//               : `Feedback submitted successfully. Response reference #${responseId}.`,
//       );
//       await loadStatusAndEmployees();
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to save feedback response.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const loadReceivedFeedback = async () => {
//     if (!targetEmployeeId.trim()) {
//       setError('Choose an employee to view received feedback.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       const data = await feedbackService.getReceivedFeedback(Number(targetEmployeeId));
//       setReceivedFeedback(data);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load received feedback.');
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
//                 title="Save or submit feedback"
//                 body="Assignment references come from your submission queue below, so you do not have to guess which assignment number belongs to which campaign."
//             />
//
//             {loading ? <div className="feedback-message info">Loading submission queue...</div> : null}
//
//             <div className="feedback-form-grid">
//               <div className="feedback-field full">
//                 <label htmlFor="assignment-reference">Evaluator assignment reference</label>
//                 <input
//                     id="assignment-reference"
//                     className="kpi-input"
//                     value={assignmentId}
//                     onChange={(e) => setAssignmentId(e.target.value)}
//                     placeholder="Pick an assignment from the queue or enter a known reference"
//                 />
//               </div>
//             </div>
//
//             <RecentIdList
//                 title="Recent assignment references"
//                 ids={recentAssignmentIds}
//                 emptyLabel="Assignments you save or submit will be kept here."
//                 onPick={(id) => setAssignmentId(String(id))}
//             />
//
//             <div className="feedback-builder" style={{ marginTop: 16 }}>
//               {questions.map((question) => (
//                   <div key={question.localId} className="feedback-builder-row">
//                     <header>
//                       <div>
//                         <h3>Rated question</h3>
//                         <small>Use one row per question you want to answer.</small>
//                       </div>
//                       <button
//                           className="kpi-btn-ghost"
//                           type="button"
//                           onClick={() =>
//                               setQuestions((current) =>
//                                   current.length === 1 ? current : current.filter((item) => item.localId !== question.localId),
//                               )
//                           }
//                       >
//                         Remove row
//                       </button>
//                     </header>
//
//                     <div className="feedback-form-grid">
//                       <div className="feedback-field">
//                         <label>Question reference</label>
//                         <input
//                             className="kpi-input"
//                             value={question.questionId}
//                             onChange={(e) =>
//                                 setQuestions((current) =>
//                                     current.map((item) =>
//                                         item.localId === question.localId ? { ...item, questionId: e.target.value } : item,
//                                     ),
//                                 )
//                             }
//                             placeholder="Example: 12"
//                         />
//                         <small>This still comes from the form definition used by the assignment.</small>
//                       </div>
//
//                       <div className="feedback-field">
//                         <label>Rating value</label>
//                         <input
//                             className="kpi-input"
//                             type="number"
//                             min="1"
//                             max="5"
//                             value={question.ratingValue}
//                             onChange={(e) =>
//                                 setQuestions((current) =>
//                                     current.map((item) =>
//                                         item.localId === question.localId ? { ...item, ratingValue: e.target.value } : item,
//                                     ),
//                                 )
//                             }
//                         />
//                       </div>
//
//                       <div className="feedback-field full">
//                         <label>Question comment</label>
//                         <textarea
//                             className="kpi-input"
//                             value={question.comment}
//                             onChange={(e) =>
//                                 setQuestions((current) =>
//                                     current.map((item) =>
//                                         item.localId === question.localId ? { ...item, comment: e.target.value } : item,
//                                     ),
//                                 )
//                             }
//                             placeholder="Add context for this rating"
//                         />
//                       </div>
//                     </div>
//                   </div>
//               ))}
//
//               <button className="kpi-btn-ghost" type="button" onClick={() => setQuestions((current) => [...current, createQuestionRow()])}>
//                 Add another question
//               </button>
//             </div>
//
//             <div className="feedback-field full" style={{ marginTop: 16 }}>
//               <label htmlFor="overall-comments">Overall feedback comments</label>
//               <textarea
//                   id="overall-comments"
//                   className="kpi-input"
//                   value={comments}
//                   onChange={(e) => setComments(e.target.value)}
//                   placeholder="Summarize the person&apos;s strengths and growth areas"
//               />
//             </div>
//
//             <div className="feedback-actions">
//               <button className="kpi-btn-primary" disabled={busy} onClick={() => void submit('draft')}>
//                 Save draft
//               </button>
//               <button className="kpi-btn-primary" disabled={busy} onClick={() => void submit('submit')}>
//                 Submit feedback
//               </button>
//             </div>
//
//             {success ? <div className="feedback-message info">{success}</div> : null}
//             {error ? <div className="feedback-message error">{error}</div> : null}
//           </section>
//
//           <aside className="feedback-panel">
//             <SectionIntro
//                 title="View received feedback"
//                 body="Pick an employee and load the visible feedback they have received."
//             />
//
//             <div className="feedback-field">
//               <label htmlFor="received-employee">Employee</label>
//               <select
//                   id="received-employee"
//                   className="kpi-select"
//                   value={targetEmployeeId}
//                   onChange={(e) => setTargetEmployeeId(e.target.value)}
//               >
//                 <option value="">Select employee</option>
//                 {employees.map((employee) => (
//                     <option key={employee.id} value={employee.id}>
//                       {formatEmployeeLabel(employee)} #{employee.id}
//                     </option>
//                 ))}
//               </select>
//             </div>
//
//             <div className="feedback-actions">
//               <button className="kpi-btn-ghost" disabled={busy || loading} onClick={() => void loadReceivedFeedback()}>
//                 Load received feedback
//               </button>
//               <button className="kpi-btn-ghost" disabled={busy || loading} onClick={() => void loadStatusAndEmployees()}>
//                 Refresh queue
//               </button>
//             </div>
//           </aside>
//         </div>
//
//         <section className="feedback-panel">
//           <SectionIntro
//               title="My submission queue"
//               body="Use this table to pick the correct assignment instead of typing unknown IDs."
//           />
//
//           {statuses.length === 0 ? (
//               <EmptyState
//                   title="No pending or recorded assignments"
//                   body="When assignments exist, they will appear here with campaign and employee details."
//               />
//           ) : (
//               <div className="feedback-list-table-wrap">
//                 <table className="feedback-list-table">
//                   <thead>
//                   <tr>
//                     <th>Assignment</th>
//                     <th>Campaign</th>
//                     <th>Employee</th>
//                     <th>Type</th>
//                     <th>Due</th>
//                     <th>Status</th>
//                     <th />
//                   </tr>
//                   </thead>
//                   <tbody>
//                   {statuses.map((status) => {
//                     const employee = employees.find((item) => item.id === status.targetEmployeeId);
//                     return (
//                         <tr key={status.evaluatorAssignmentId}>
//                           <td>
//                             <div className="feedback-table-title">
//                               <strong>Assignment #{status.evaluatorAssignmentId}</strong>
//                               <small>Request #{status.requestId}</small>
//                             </div>
//                           </td>
//                           <td>{status.campaignName}</td>
//                           <td>{employee ? formatEmployeeLabel(employee) : `Employee #${status.targetEmployeeId}`}</td>
//                           <td>{status.evaluatorType}</td>
//                           <td>{formatDateTime(status.dueAt)}</td>
//                           <td><StatusBadge status={status.status} /></td>
//                           <td>
//                             <button
//                                 className="kpi-btn-ghost"
//                                 type="button"
//                                 onClick={() => setAssignmentId(String(status.evaluatorAssignmentId))}
//                             >
//                               Use assignment
//                             </button>
//                           </td>
//                         </tr>
//                     );
//                   })}
//                   </tbody>
//                 </table>
//               </div>
//           )}
//         </section>
//
//         <section className="feedback-panel">
//           <SectionIntro
//               title="Received feedback results"
//               body="Results are presented as readable cards instead of a raw API array."
//           />
//
//           {receivedFeedback.length === 0 ? (
//               <EmptyState
//                   title="No received feedback loaded"
//                   body="Choose an employee and load received feedback to review scores and comments."
//               />
//           ) : (
//               <div className="feedback-entity-card-grid">
//                 {receivedFeedback.map((item) => (
//                     <article key={item.responseId} className="feedback-entity-card">
//                       <header>
//                         <div>
//                           <h3>{item.campaignName}</h3>
//                           <p>
//                             Response #{item.responseId} • Request #{item.requestId}
//                           </p>
//                         </div>
//                         <StatusBadge status={item.sourceType ?? item.relationshipType ?? 'Feedback'} />
//                       </header>
//
//                       <div className="feedback-key-value-grid">
//                         <div className="feedback-key-value">
//                           <span>Overall score</span>
//                           <strong>{formatScore(item.overallScore)}</strong>
//                         </div>
//                         <div className="feedback-key-value">
//                           <span>Submitted at</span>
//                           <strong>{formatDateTime(item.submittedAt)}</strong>
//                         </div>
//                         <div className="feedback-key-value">
//                           <span>Anonymous</span>
//                           <strong>{item.anonymous ? 'Yes' : 'No'}</strong>
//                         </div>
//                         <div className="feedback-key-value">
//                           <span>Evaluator reference</span>
//                           <strong>{item.evaluatorEmployeeId ? `#${item.evaluatorEmployeeId}` : '-'}</strong>
//                         </div>
//                       </div>
//
//                       <div className="feedback-note">
//                         <strong>Comment</strong>
//                         {item.comments || 'No written comment.'}
//                       </div>
//                     </article>
//                 ))}
//               </div>
//           )}
//         </section>
//       </div>
//   );
// };
//
// export default FeedbackResponsesPage;
