// import { useState } from 'react';
// import { feedbackService } from '../../services/feedbackService';
// import type { FeedbackFormPayload } from '../../types/feedback';
// import {
//   EmptyState,
//   RecentIdList,
//   SectionIntro,
//   storeRecentId,
//   loadRecentIds,
// } from './feedback-ui';
//
// type QuestionBuilder = {
//   localId: number;
//   questionText: string;
//   questionOrder: number;
//   ratingScaleId: number;
//   weight: number;
//   isRequired: boolean;
// };
//
// type SectionBuilder = {
//   localId: number;
//   title: string;
//   orderNo: number;
//   questions: QuestionBuilder[];
// };
//
// const createLocalId = () => Date.now() + Math.floor(Math.random() * 1000);
//
// const createQuestion = (): QuestionBuilder => ({
//   localId: createLocalId(),
//   questionText: '',
//   questionOrder: 1,
//   ratingScaleId: 1,
//   weight: 1,
//   isRequired: true,
// });
//
// const createSection = (): SectionBuilder => ({
//   localId: createLocalId(),
//   title: '',
//   orderNo: 1,
//   questions: [createQuestion()],
// });
//
// const buildPayload = (formName: string, anonymousAllowed: boolean, sections: SectionBuilder[]): FeedbackFormPayload => ({
//   formName,
//   anonymousAllowed,
//   sections: sections.map((section) => ({
//     title: section.title,
//     orderNo: section.orderNo,
//     questions: section.questions.map((question) => ({
//       questionText: question.questionText,
//       questionOrder: question.questionOrder,
//       ratingScaleId: question.ratingScaleId,
//       weight: question.weight,
//       isRequired: question.isRequired,
//     })),
//   })),
// });
//
// const FeedbackFormsPage = () => {
//   const [formName, setFormName] = useState('360 Feedback Form');
//   const [anonymousAllowed, setAnonymousAllowed] = useState(true);
//   const [sections, setSections] = useState<SectionBuilder[]>([
//     {
//       ...createSection(),
//       title: 'Performance',
//       questions: [
//         {
//           ...createQuestion(),
//           questionText: 'Delivers quality work consistently',
//         },
//       ],
//     },
//   ]);
//   const [formReference, setFormReference] = useState('');
//   const [recentFormIds, setRecentFormIds] = useState<number[]>(() => loadRecentIds('forms'));
//   const [versionIds, setVersionIds] = useState<number[]>([]);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//
//   const updateSection = (sectionLocalId: number, updater: (section: SectionBuilder) => SectionBuilder) => {
//     setSections((current) =>
//       current.map((section) => (section.localId === sectionLocalId ? updater(section) : section)),
//     );
//   };
//
//   const updateQuestion = (
//     sectionLocalId: number,
//     questionLocalId: number,
//     updater: (question: QuestionBuilder) => QuestionBuilder,
//   ) => {
//     updateSection(sectionLocalId, (section) => ({
//       ...section,
//       questions: section.questions.map((question) =>
//         question.localId === questionLocalId ? updater(question) : question,
//       ),
//     }));
//   };
//
//   const rememberFormId = (id: number) => {
//     setRecentFormIds(storeRecentId('forms', id));
//     setFormReference(String(id));
//   };
//
//   const handleCreate = async () => {
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const createdId = await feedbackService.createForm(buildPayload(formName, anonymousAllowed, sections));
//       rememberFormId(createdId);
//       setSuccess(`Draft form created successfully. Form reference #${createdId}.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to create feedback form.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const handleUpdate = async () => {
//     if (!formReference.trim()) {
//       setError('Choose or enter a form reference before updating.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const updatedId = await feedbackService.updateForm(
//         Number(formReference),
//         buildPayload(formName, anonymousAllowed, sections),
//       );
//       rememberFormId(updatedId);
//       setSuccess(`Form #${updatedId} updated successfully.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to update feedback form.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const handleCreateVersion = async () => {
//     if (!formReference.trim()) {
//       setError('Choose or enter a form reference before creating a new version.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       setSuccess('');
//       const versionId = await feedbackService.createFormVersion(
//         Number(formReference),
//         buildPayload(formName, anonymousAllowed, sections),
//       );
//       rememberFormId(versionId);
//       setSuccess(`A new version was created. Version reference #${versionId}.`);
//       setVersionIds((current) => [versionId, ...current.filter((id) => id !== versionId)]);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to create form version.');
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const loadVersions = async () => {
//     if (!formReference.trim()) {
//       setError('Choose or enter a form reference to view versions.');
//       return;
//     }
//
//     try {
//       setBusy(true);
//       setError('');
//       const versions = await feedbackService.getFormVersions(Number(formReference));
//       setVersionIds(versions);
//       setSuccess(`Loaded ${versions.length} version record(s) for form #${formReference}.`);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Failed to load form versions.');
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
//             title="Form builder"
//             body="Create your 360 form in regular fields instead of a JSON textarea. Sections and questions are editable directly."
//             aside="The builder supports multiple sections and multiple questions per section."
//           />
//
//           <div className="feedback-form-grid">
//             <div className="feedback-field full">
//               <label htmlFor="feedback-form-name">Form name</label>
//               <input
//                 id="feedback-form-name"
//                 className="kpi-input"
//                 value={formName}
//                 onChange={(e) => setFormName(e.target.value)}
//                 placeholder="Example: Leadership 360 Template"
//               />
//             </div>
//
//             <div className="feedback-field full">
//               <label className="feedback-checkbox" htmlFor="anonymous-allowed">
//                 <input
//                   id="anonymous-allowed"
//                   type="checkbox"
//                   checked={anonymousAllowed}
//                   onChange={(e) => setAnonymousAllowed(e.target.checked)}
//                 />
//                 Allow anonymous feedback
//               </label>
//             </div>
//           </div>
//
//           <div className="feedback-builder" style={{ marginTop: 16 }}>
//             {sections.map((section, sectionIndex) => (
//               <div key={section.localId} className="feedback-builder-row">
//                 <header>
//                   <div>
//                     <h3>Section {sectionIndex + 1}</h3>
//                     <small>Group related feedback questions together.</small>
//                   </div>
//                   <button
//                     className="kpi-btn-ghost"
//                     type="button"
//                     onClick={() =>
//                       setSections((current) =>
//                         current.length === 1 ? current : current.filter((item) => item.localId !== section.localId),
//                       )
//                     }
//                   >
//                     Remove section
//                   </button>
//                 </header>
//
//                 <div className="feedback-form-grid">
//                   <div className="feedback-field">
//                     <label>Section title</label>
//                     <input
//                       className="kpi-input"
//                       value={section.title}
//                       onChange={(e) =>
//                         updateSection(section.localId, (current) => ({ ...current, title: e.target.value }))
//                       }
//                       placeholder="Example: Collaboration"
//                     />
//                   </div>
//
//                   <div className="feedback-field">
//                     <label>Section order</label>
//                     <input
//                       className="kpi-input"
//                       type="number"
//                       min="1"
//                       value={section.orderNo}
//                       onChange={(e) =>
//                         updateSection(section.localId, (current) => ({
//                           ...current,
//                           orderNo: Number(e.target.value),
//                         }))
//                       }
//                     />
//                   </div>
//                 </div>
//
//                 <div className="feedback-builder-question-list">
//                   {section.questions.map((question, questionIndex) => (
//                     <div key={question.localId} className="feedback-builder-row">
//                       <header>
//                         <div>
//                           <h4>Question {questionIndex + 1}</h4>
//                           <small>Use one question per behavior or outcome.</small>
//                         </div>
//                         <button
//                           className="kpi-btn-ghost"
//                           type="button"
//                           onClick={() =>
//                             updateSection(section.localId, (current) => ({
//                               ...current,
//                               questions:
//                                 current.questions.length === 1
//                                   ? current.questions
//                                   : current.questions.filter((item) => item.localId !== question.localId),
//                             }))
//                           }
//                         >
//                           Remove question
//                         </button>
//                       </header>
//
//                       <div className="feedback-form-grid">
//                         <div className="feedback-field full">
//                           <label>Question text</label>
//                           <input
//                             className="kpi-input"
//                             value={question.questionText}
//                             onChange={(e) =>
//                               updateQuestion(section.localId, question.localId, (current) => ({
//                                 ...current,
//                                 questionText: e.target.value,
//                               }))
//                             }
//                             placeholder="Example: Communicates priorities clearly"
//                           />
//                         </div>
//
//                         <div className="feedback-field">
//                           <label>Display order</label>
//                           <input
//                             className="kpi-input"
//                             type="number"
//                             min="1"
//                             value={question.questionOrder}
//                             onChange={(e) =>
//                               updateQuestion(section.localId, question.localId, (current) => ({
//                                 ...current,
//                                 questionOrder: Number(e.target.value),
//                               }))
//                             }
//                           />
//                         </div>
//
//                         <div className="feedback-field">
//                           <label>Rating scale reference</label>
//                           <input
//                             className="kpi-input"
//                             type="number"
//                             min="1"
//                             value={question.ratingScaleId}
//                             onChange={(e) =>
//                               updateQuestion(section.localId, question.localId, (current) => ({
//                                 ...current,
//                                 ratingScaleId: Number(e.target.value),
//                               }))
//                             }
//                           />
//                           <small>Keep this until a named rating-scale picker exists.</small>
//                         </div>
//
//                         <div className="feedback-field">
//                           <label>Weight</label>
//                           <input
//                             className="kpi-input"
//                             type="number"
//                             min="0"
//                             step="0.1"
//                             value={question.weight}
//                             onChange={(e) =>
//                               updateQuestion(section.localId, question.localId, (current) => ({
//                                 ...current,
//                                 weight: Number(e.target.value),
//                               }))
//                             }
//                           />
//                         </div>
//
//                         <div className="feedback-field full">
//                           <label className="feedback-checkbox">
//                             <input
//                               type="checkbox"
//                               checked={question.isRequired}
//                               onChange={(e) =>
//                                 updateQuestion(section.localId, question.localId, (current) => ({
//                                   ...current,
//                                   isRequired: e.target.checked,
//                                 }))
//                               }
//                             />
//                             Make this question required
//                           </label>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//
//                   <button
//                     className="kpi-btn-ghost"
//                     type="button"
//                     onClick={() =>
//                       updateSection(section.localId, (current) => ({
//                         ...current,
//                         questions: [...current.questions, createQuestion()],
//                       }))
//                     }
//                   >
//                     Add question
//                   </button>
//                 </div>
//               </div>
//             ))}
//
//             <button className="kpi-btn-ghost" type="button" onClick={() => setSections((current) => [...current, createSection()])}>
//               Add section
//             </button>
//           </div>
//         </section>
//
//         <aside className="feedback-panel">
//           <SectionIntro
//             title="Form operations"
//             body="Use saved references instead of trying to remember which numeric ID was returned last time."
//           />
//
//           <div className="feedback-field">
//             <label htmlFor="form-reference">Form reference number</label>
//             <input
//               id="form-reference"
//               className="kpi-input"
//               value={formReference}
//               onChange={(e) => setFormReference(e.target.value)}
//               placeholder="Example: 24"
//             />
//             <small>This is needed for update, version creation, and version history.</small>
//           </div>
//
//           <RecentIdList
//             title="Recent form references"
//             ids={recentFormIds}
//             emptyLabel="Saved form references will appear here after you create or update a form."
//             onPick={(id) => setFormReference(String(id))}
//           />
//
//           <div className="feedback-actions">
//             <button className="kpi-btn-primary" disabled={busy} onClick={() => void handleCreate()}>
//               Create draft
//             </button>
//             <button className="kpi-btn-ghost" disabled={busy} onClick={() => void handleUpdate()}>
//               Update existing form
//             </button>
//             <button className="kpi-btn-ghost" disabled={busy} onClick={() => void handleCreateVersion()}>
//               Create new version
//             </button>
//             <button className="kpi-btn-ghost" disabled={busy} onClick={() => void loadVersions()}>
//               View version history
//             </button>
//           </div>
//
//           {success ? <div className="feedback-message info">{success}</div> : null}
//           {error ? <div className="feedback-message error">{error}</div> : null}
//
//           <div className="feedback-note" style={{ marginTop: 16 }}>
//             <strong>Reference guidance</strong>
//             New forms return a reference number. That number is kept in the recent references list so the next step does not depend on memory.
//           </div>
//         </aside>
//       </div>
//
//       <section className="feedback-panel">
//         <SectionIntro
//           title="Version history"
//           body="Version references are shown as a readable list instead of a raw array dump."
//         />
//
//         {versionIds.length === 0 ? (
//           <EmptyState
//             title="No versions loaded"
//             body="Pick a form reference and load version history when you need to review published copies."
//           />
//         ) : (
//           <div className="feedback-reference-list">
//             {versionIds.map((versionId) => (
//               <span key={versionId} className="feedback-reference-chip">
//                 Version #{versionId}
//               </span>
//             ))}
//           </div>
//         )}
//       </section>
//     </div>
//   );
// };
//
// export default FeedbackFormsPage;
