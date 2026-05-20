import { Navigate, Route } from 'react-router-dom';

import AppraisalCycleDashboardPage from '../pages/appraisal/AppraisalCycleDashboardPage';
import AppraisalCyclesPage from '../pages/appraisal/AppraisalCyclesPage';
import AppraisalReviewQueuePage from '../pages/appraisal/AppraisalReviewQueuePage';
import AppraisalEmployeeReviewsPage from '../pages/appraisal/AppraisalEmployeeReviewsPage';
import AppraisalTemplateRecordsPage from '../pages/appraisal/AppraisalTemplateRecordsPage';

export const appraisalRoutes = (
  <>
    <Route path="/hr/appraisal" element={<AppraisalCycleDashboardPage />} />
    <Route path="/hr/appraisal/template-forms" element={<AppraisalTemplateRecordsPage />} />
    <Route path="/hr/appraisal/template-records" element={<Navigate to="/hr/appraisal/template-forms" replace />} />
    <Route path="/hr/appraisal/template-create" element={<Navigate to="/hr/appraisal/template-forms?openCreate=1" replace />} />
    <Route path="/hr/appraisal/cycles" element={<AppraisalCyclesPage />} />
    <Route path="/hr/appraisal/create" element={<Navigate to="/hr/appraisal/cycles?openCreate=1" replace />} />
    <Route path="/hr/appraisal/create-records" element={<Navigate to="/hr/appraisal/cycles" replace />} />
    <Route path="/hr/appraisal/review-check" element={<AppraisalReviewQueuePage mode="hr" />} />
    <Route path="/hr/appraisal/employee-reviews" element={<AppraisalEmployeeReviewsPage />} />
  </>
);
