// import { useState } from 'react';
// import './hr-feedback-dashboard.css';
// import DynamicQuestionBankTab from './tabs/DynamicQuestionBankTab';
// import CampaignSetupTab from './tabs/CampaignSetupTab';
// import AnalyticsTab from './tabs/AnalyticsTab';
// import type { FeedbackCampaign } from '../../types/feedbackCampaign';
//
// type TabId = 'questions' | 'campaigns' | 'analytics';
//
// interface TabDef {
//   id: TabId;
//   label: string;
//   icon: string;
//   shortLabel: string;
// }
//
// const TABS: TabDef[] = [
//   { id: 'questions', label: 'Question Bank & Rules', shortLabel: 'Questions', icon: 'bi bi-diagram-3' },
//   { id: 'campaigns', label: 'Campaign Foundation', shortLabel: 'Campaigns', icon: 'bi bi-megaphone' },
//   { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: 'bi bi-bar-chart-line' },
// ];
//
// export default function HrFeedbackDashboard() {
//   const [activeTab, setActiveTab] = useState<TabId>('campaigns');
//   const [selectedCampaign, setSelectedCampaign] = useState<FeedbackCampaign | null>(null);
//
//   const tabClass = (id: TabId) => {
//     if (activeTab === id) return 'hfd-step active';
//     if (id === 'campaigns' && selectedCampaign) return 'hfd-step done';
//     return 'hfd-step';
//   };
//
//   const activeIndex = TABS.findIndex(tab => tab.id === activeTab);
//   const moveTab = (delta: -1 | 1) => {
//     const nextIndex = Math.min(TABS.length - 1, Math.max(0, activeIndex + delta));
//     setActiveTab(TABS[nextIndex].id);
//   };
//
//   return (
//       <div className="hfd-shell">
//         <div className="hfd-header">
//           <h1>
//             <i className="bi bi-arrow-repeat" />
//             360-Degree Feedback
//           </h1>
//           <p>HR Management Console — manage question bank/rules, campaign setup, and analytics from the redesigned 360 flow.</p>
//         </div>
//
//         <div className="hfd-steps hfd-tabs-nav" role="tablist" aria-label="360 feedback modules">
//           {TABS.map(tab => (
//               <button
//                   key={tab.id}
//                   type="button"
//                   className={tabClass(tab.id)}
//                   onClick={() => setActiveTab(tab.id)}
//                   title={tab.label}
//                   role="tab"
//                   aria-selected={activeTab === tab.id}
//               >
//                 <div className="hfd-step-bubble">
//                   {tab.id === 'campaigns' && selectedCampaign && activeTab !== tab.id
//                       ? <i className="bi bi-check-lg" />
//                       : <i className={tab.icon} />}
//                 </div>
//                 <span className="hfd-step-label">{tab.shortLabel}</span>
//               </button>
//           ))}
//         </div>
//
//         <div className="hfd-card">
//           {activeTab === 'questions' && <DynamicQuestionBankTab />}
//
//           {activeTab === 'campaigns' && (
//               <CampaignSetupTab onCampaignCreated={(campaign) => setSelectedCampaign(campaign)} />
//           )}
//
//           {activeTab === 'analytics' && <AnalyticsTab />}
//
//           <div className="hfd-nav-footer">
//             <button
//                 className="hfd-btn hfd-btn-secondary"
//                 onClick={() => moveTab(-1)}
//                 disabled={activeIndex === 0}
//             >
//               <i className="bi bi-arrow-left" /> Previous Tab
//             </button>
//
//             <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#9ca3af' }}>
//               <i className={TABS[activeIndex].icon} />
//               {TABS[activeIndex].label}
//             </div>
//
//             <button
//                 className="hfd-btn hfd-btn-primary"
//                 onClick={() => moveTab(1)}
//                 disabled={activeIndex === TABS.length - 1}
//             >
//               Next Tab <i className="bi bi-arrow-right" />
//             </button>
//           </div>
//         </div>
//       </div>
//   );
// }
