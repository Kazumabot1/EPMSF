import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import HrEmployeeAccountImport from './pages/employee/HrEmployeeAccountImport';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Permissions from './components/Permissions';
import UserRoles from './components/UserRoles';
import RolePermissions from './components/RolePermissions';
import PipUpdates from './components/PipUpdates';
import NotificationTemplates from './components/NotificationTemplates';
import OneOnOneMeetings from './components/OneOnOneMeetings';
import OneOnOneActionItems from './components/OneOnOneActionItems';

import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeMyDashboard from './pages/employee/EmployeeMyDashboard';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import EmployeeRoutePlaceholder from './pages/employee/EmployeeRoutePlaceholder';
import EmployeeKpiResultsPage from './pages/employee/EmployeeKpiResultsPage';
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';

import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import TeamHistoryPage from './pages/team/TeamHistoryPage';
import DepartmentManagement from './pages/department/DepartmentManagement';
import DepartmentComparisonPage from './pages/department/DepartmentComparisonPage';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerAssessmentReviewPage from './pages/manager/ManagerAssessmentReviewPage';
import ManagerKpiScoringPage from './pages/manager/ManagerKpiScoringPage';
import ManagerKpiHistoryPage from './pages/manager/ManagerKpiHistoryPage';

import CeoDashboard from './pages/ceo/CeoDashboard';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

import AssessmentFormBuilderPage from './pages/hr/assessment-form/AssessmentFormBuilderPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiTemplateDetailPage from './pages/hr/kpi-template/KpiTemplateDetailPage';
import KpiTemplateEditorPage from './pages/hr/kpi-template/KpiTemplateEditorPage';
import KpiTemplateListPage from './pages/hr/kpi-template/KpiTemplateListPage';
import KpiTemplateCycleListPage from './pages/hr/kpi-template/KpiTemplateCycleListPage';
import KpiTemplateCycleEditorPage from './pages/hr/kpi-template/KpiTemplateCycleEditorPage';
import KpiVersionHistoryPage from './pages/hr/kpi-template/KpiVersionHistoryPage';
import HrEmployeeKpiListPage from './pages/hr/kpi-template/HrEmployeeKpiListPage';

import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';

import PipCreatePage from './pages/pip/PipCreatePage';
import PipPastPlansPage from './pages/pip/PipPastPlansPage';

import FeedbackLayoutPage from './pages/feedback/FeedbackLayoutPage';
import HrFeedbackDashboard from './pages/hr-feedback/HrFeedbackDashboard';
import ContinuousFeedbackPage from './pages/continuous-feedback/ContinuousFeedbackPage';

import EmployeePerformanceReviewPage from './pages/appraisal/EmployeePerformanceReviewPage';
import AppraisalHistoryListPage from './pages/appraisal/AppraisalHistoryListPage';
import AppraisalReviewQueuePage from './pages/appraisal/AppraisalReviewQueuePage';
import { appraisalRoutes } from './routes/appraisalRoutes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />

          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/employee/notifications" element={<Notifications />} />
            <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR', 'DepartmentHead', 'Manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
              <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager', 'DepartmentHead']} />}>
            <Route element={<AppLayout />}>
              <Route path="/continuous-feedback" element={<ContinuousFeedbackPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminDashboard />} />
              <Route path="/admin/employee/import" element={<HrEmployeeAccountImport />} />

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />

              <Route path="/employee/continuous-feedback" element={<ContinuousFeedbackPage />} />
              <Route path="/employee/kpis" element={<EmployeeKpiResultsPage />} />

              <Route path="/employee/appraisals" element={<AppraisalHistoryListPage role="employee" />} />
              <Route path="/employee/assessment-scores" element={<EmployeeAssessmentScoresPage />} />
              <Route path="/employee/self-assessment" element={<EmployeeSelfAssessmentPage />} />

              <Route
                path="/employee/feedback"
                element={
                  <EmployeeRoutePlaceholder
                    title="My Feedback"
                    description="View pending and completed feedback requests."
                  />
                }
              />

              <Route
                path="/employee/one-on-ones"
                element={
                  <EmployeeRoutePlaceholder
                    title="One-on-Ones"
                    description="Manage your one-on-one meetings and related notes."
                  />
                }
              />

              <Route path="/employee/pip" element={<PipPastPlansPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/self-assessment" element={<EmployeeSelfAssessmentPage />} />

              <Route path="/manager/assessment-review" element={<ManagerAssessmentReviewPage />} />
              <Route path="/manager/self-assessment-review" element={<ManagerAssessmentReviewPage />} />

              <Route path="/manager/kpi" element={<Navigate to="/manager/kpi-scoring" replace />} />
              <Route path="/manager/kpi/history" element={<ManagerKpiHistoryPage />} />
              <Route path="/manager/kpi-scoring" element={<ManagerKpiScoringPage />} />

              <Route path="/manager/appraisals" element={<EmployeePerformanceReviewPage />} />
              <Route path="/manager/appraisals/history" element={<AppraisalHistoryListPage role="pm" />} />

              <Route
                path="/manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Reports"
                    description="Manager reporting workflow placeholder."
                  />
                }
              />

              <Route path="/pip/create" element={<PipCreatePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Executive']} />}>
            <Route element={<AppLayout />}>
              <Route path="/executive/dashboard" element={<CeoDashboard />} />

              <Route
                path="/executive/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Executive Reports"
                    description="Executive performance reports placeholder."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['DepartmentHead']} />}>
            <Route element={<AppLayout />}>
              <Route path="/department-head/dashboard" element={<DepartmentHeadDashboard />} />
              <Route path="/department-head/self-assessment" element={<EmployeeSelfAssessmentPage />} />

              <Route path="/department-head/assessment-scores" element={<AssessmentScoreTablePage />} />
              <Route path="/department-head/assessment-review" element={<AssessmentScoreTablePage />} />

              <Route path="/department-head/appraisals/review" element={<AppraisalReviewQueuePage mode="dept-head" />} />
              <Route path="/department-head/appraisals/history" element={<AppraisalHistoryListPage role="dept-head" />} />

              <Route path="/pip/create" element={<PipCreatePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR', 'Admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/hr/profile" element={<ProfilePage />} />

              <Route path="/hr/employee" element={<EmployeeManagement />} />
              <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
              <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />

              <Route path="/hr/team" element={<TeamManagement />} />
              <Route path="/hr/team/create" element={<TeamCreate />} />
              <Route path="/hr/team/history" element={<TeamHistoryPage />} />

              <Route path="/hr/department" element={<DepartmentManagement />} />
              <Route path="/hr/department-comparison" element={<DepartmentComparisonPage />} />

              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />
              <Route path="/hr/assessment-forms" element={<AssessmentFormBuilderPage />} />

              <Route path="/hr/feedback/dashboard" element={<HrFeedbackDashboard />} />
              <Route path="/hr/feedback/*" element={<FeedbackLayoutPage />} />

              {appraisalRoutes}

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />

              <Route path="/pip-updates" element={<PipUpdates />} />
              <Route path="/notification-templates" element={<NotificationTemplates />} />

              <Route path="/hr/position/create" element={<PositionCreate />} />
              <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
              <Route path="/hr/position/table" element={<PositionTable />} />

              <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
              <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
              <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />
              <Route
                path="/hr/performance-kpi/form"
                element={<Navigate to="/hr/kpi-template" replace />}
              />

              <Route path="/hr/kpi-template/new" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id/edit" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id" element={<KpiTemplateDetailPage />} />
              <Route path="/hr/kpi-template" element={<KpiTemplateListPage />} />
              <Route path="/hr/kpi-version-history" element={<KpiVersionHistoryPage />} />
              <Route path="/hr/kpi-template-cycle/new" element={<KpiTemplateCycleEditorPage />} />
              <Route path="/hr/kpi-template-cycle/:id/edit" element={<KpiTemplateCycleEditorPage />} />
              <Route path="/hr/kpi-template-cycle" element={<KpiTemplateCycleListPage />} />
              <Route path="/hr/employee-kpis" element={<HrEmployeeKpiListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
