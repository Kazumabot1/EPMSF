import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import HrEmployeeAccountImport from './pages/employee/HrEmployeeAccountImport';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import PositionPermissions from './pages/admin/PositionPermissions';
import PipUpdates from './components/PipUpdates';
import NotificationTemplates from './components/NotificationTemplates';
import OneOnOneMeetings from './components/OneOnOneMeetings';
import OneOnOneActionItems from './components/OneOnOneActionItems';

import ProtectedRoute from './routes/ProtectedRoute';
import PositionPermissionRoute from './routes/PositionPermissionRoute';
import AppLayout from './layouts/AppLayout';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeMyDashboard from './pages/employee/EmployeeMyDashboard';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import EmployeeRoutePlaceholder from './pages/employee/EmployeeRoutePlaceholder';
import EmployeeKpiResultsPage from './pages/employee/EmployeeKpiResultsPage';
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';

import TeamManagement from './pages/team/TeamManagement';
import MyTeamPage from './pages/team/MyTeamPage';
import TeamCreate from './pages/team/TeamCreate';
import TeamHistoryPage from './pages/team/TeamHistoryPage';
import DepartmentManagement from './pages/department/DepartmentManagement';
import DepartmentComparisonPage from './pages/department/DepartmentComparisonPage';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerAssessmentReviewPage from './pages/manager/ManagerAssessmentReviewPage';
import ManagerKpiScoringPage from './pages/manager/ManagerKpiScoringPage';
import ManagerKpiHistoryPage from './pages/manager/ManagerKpiHistoryPage';

import CeoDashboard from './pages/ceo/CeoDashboard';
import KpiApprovalPage from './pages/ceo/KpiApprovalPage';
import DepartmentKpiApprovalPage from './pages/ceo/DepartmentKpiApprovalPage';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import DepartmentHeadSelfAssessmentViewPage from './pages/department-head/DepartmentHeadSelfAssessmentViewPage';
import AdminDashboard from './pages/admin/AdminDashboard';

import AssessmentFormBuilderPage from './pages/hr/assessment-form/AssessmentFormBuilderPage';
import SelfAssessmentFormRecordsPage from './pages/hr/SelfAssessmentFormRecordsPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';
import ReportingDashboardPage from './pages/reports/ReportingDashboardPage';

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
import DepartmentKpiTemplateListPage from './pages/hr/department-kpi/DepartmentKpiTemplateListPage';
import DepartmentKpiTemplateEditorPage from './pages/hr/department-kpi/DepartmentKpiTemplateEditorPage';
import DepartmentKpiCycleListPage from './pages/hr/department-kpi/DepartmentKpiCycleListPage';
import DepartmentKpiCycleEditorPage from './pages/hr/department-kpi/DepartmentKpiCycleEditorPage';
import DepartmentKpiScoringPage from './pages/hr/department-kpi/DepartmentKpiScoringPage';
import DepartmentKpiResultsPage from './pages/hr/department-kpi/DepartmentKpiResultsPage';

import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';

import PipCreatePage from './pages/pip/PipCreatePage';
import PipPastPlansPage from './pages/pip/PipPastPlansPage';

import FeedbackLayoutPage from './pages/feedback/FeedbackLayoutPage';
import EmployeeFeedbackDashboardPage from './pages/feedback-evaluator/EmployeeFeedbackDashboardPage';
import FeedbackFormPage from './pages/feedback-evaluator/FeedbackFormPage';
import ContinuousFeedbackPage from './pages/continuous-feedback/ContinuousFeedbackPage';
import AdminAuditLogsPage from './pages/audit/AdminAuditLogsPage';
import ManagerSummaryPage from './pages/feedback-analytics/ManagerSummaryPage';

import EmployeePerformanceReviewPage from './pages/appraisal/EmployeePerformanceReviewPage';
import AppraisalHistoryListPage from './pages/appraisal/AppraisalHistoryListPage';
import AppraisalReviewQueuePage from './pages/appraisal/AppraisalReviewQueuePage';
import { appraisalRoutes } from './routes/appraisalRoutes';
import { useAuth } from './contexts/AuthContext';
import { dashboardPathByRole, resolveUserRole } from './config/roleNavigation';

type RedirectWithMessageProps = {
  message: string;
  to?: string;
};

const RedirectWithMessage = ({ message, to }: RedirectWithMessageProps) => {
  const { user } = useAuth();
  const destination = to ?? dashboardPathByRole[resolveUserRole(user)];

  useEffect(() => {
    toast.error(message);
  }, [message]);

  return <Navigate to={destination} replace />;
};

function App() {
  return (
      <BrowserRouter>
        <Toaster toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ForceChangePasswordPage />} />

            <Route element={<AppLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notification-settings" element={<NotificationSettings />} />
              <Route path="/my-team" element={<MyTeamPage />} />
              <Route path="/employee/notifications" element={<Notifications />} />
              <Route path="/employee/notification-settings" element={<NotificationSettings />} />
              <Route path="/my-kpis" element={<EmployeeKpiResultsPage />} />
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
              <Route
                  path="/permissions"
                  element={<RedirectWithMessage message="Permission management has been moved to Position Permissions." />}
              />
              <Route
                  path="/user-roles"
                  element={
                    <RedirectWithMessage message="User Roles is no longer available. Position roles now control dashboard access." />
                  }
              />
              <Route
                  path="/role-permissions"
                  element={<RedirectWithMessage message="Role Permissions is no longer available. Use Position Permissions instead." />}
              />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['HR', 'DepartmentHead', 'Manager']} />}>
              <Route element={<AppLayout />}>
                <Route element={<PositionPermissionRoute permission="oneOnOnePermission" />}>
                  <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
                  <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Manager', 'DepartmentHead']} />}>
              <Route element={<AppLayout />}>
                <Route element={<PositionPermissionRoute permission="continuousFeedbackView" />}>
                  <Route path="/continuous-feedback" element={<ContinuousFeedbackPage />} />
                </Route>
                <Route element={<PositionPermissionRoute permission="pipViewAll" />}>
                  <Route path="/pip/create" element={<PipCreatePage />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Manager', 'DepartmentHead', 'Executive']} />}>
              <Route element={<AppLayout />}>
                <Route path="/kpi" element={<Navigate to="/kpi-scoring" replace />} />
                <Route path="/kpi/history" element={<ManagerKpiHistoryPage />} />
                <Route path="/kpi-scoring" element={<ManagerKpiScoringPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminDashboard />} />
                <Route path="/admin/employee/import" element={<HrEmployeeAccountImport />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="/position-permissions" element={<PositionPermissions />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
              <Route element={<AppLayout />}>
                <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />
                <Route path="/employee/my-team" element={<Navigate to="/my-team" replace />} />
                <Route element={<PositionPermissionRoute permission="teamView" fallbackPath="/employee/dashboard" />}>
                  <Route path="/employee/team-management" element={<TeamManagement />} />
                </Route>
                <Route path="/employee/continuous-feedback" element={<ContinuousFeedbackPage />} />
                <Route path="/employee/kpis" element={<EmployeeKpiResultsPage />} />
                <Route path="/employee/appraisals" element={<AppraisalHistoryListPage role="employee" />} />
                <Route path="/employee/assessment-scores" element={<EmployeeAssessmentScoresPage />} />
                <Route path="/employee/self-assessment" element={<EmployeeSelfAssessmentPage />} />
                <Route path="/employee/feedback" element={<EmployeeFeedbackDashboardPage />} />
                <Route path="/employee/feedback/assignments/:assignmentId" element={<FeedbackFormPage />} />
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
                <Route path="/manager/my-team" element={<Navigate to="/my-team" replace />} />
                <Route path="/manager/kpis" element={<EmployeeKpiResultsPage />} />
                <Route path="/manager/self-assessment" element={<Navigate to="/manager/assessment-review" replace />} />
                <Route path="/manager/assessment-review" element={<ManagerAssessmentReviewPage />} />
                <Route path="/manager/self-assessment-review" element={<ManagerAssessmentReviewPage />} />
                <Route path="/manager/kpi" element={<Navigate to="/manager/kpi-scoring" replace />} />
                <Route path="/manager/kpi/history" element={<ManagerKpiHistoryPage />} />
                <Route path="/manager/kpi-scoring" element={<ManagerKpiScoringPage />} />

                <Route element={<PositionPermissionRoute permission="appraisalPermission" fallbackPath="/manager/dashboard" />}>
                  <Route path="/manager/appraisals" element={<EmployeePerformanceReviewPage />} />
                  <Route path="/manager/appraisals/history" element={<AppraisalHistoryListPage role="pm" />} />
                </Route>

                <Route path="/manager/feedback" element={<EmployeeFeedbackDashboardPage />} />
                <Route path="/manager/feedback/summary" element={<ManagerSummaryPage expectedScope="MANAGER_DIRECT_REPORTS" />} />
                <Route path="/manager/feedback/assignments/:assignmentId" element={<FeedbackFormPage />} />

                <Route path="/manager/reports" element={<Navigate to="/manager/reports/performance" replace />} />
                <Route path="/manager/reports/performance" element={<ReportingDashboardPage reportType="employees" />} />
                <Route path="/manager/reports/pip-status" element={<ReportingDashboardPage reportType="pip" />} />
                <Route path="/manager/reports/feedback-completion" element={<ReportingDashboardPage reportType="feedback" />} />
                <Route path="/manager/reports/recommendations" element={<ReportingDashboardPage reportType="recommendations" />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Executive']} />}>
              <Route element={<AppLayout />}>
                <Route path="/executive/dashboard" element={<CeoDashboard />} />
                <Route path="/ceo/dashboard" element={<Navigate to="/executive/dashboard" replace />} />
                <Route path="/executive/approval/kpi" element={<KpiApprovalPage />} />
                <Route path="/ceo/approval/kpi" element={<Navigate to="/executive/approval/kpi" replace />} />
                <Route path="/executive/approval/department-kpi" element={<DepartmentKpiApprovalPage />} />
                <Route path="/ceo/approval/department-kpi" element={<Navigate to="/executive/approval/department-kpi" replace />} />
                <Route path="/executive/kpis" element={<EmployeeKpiResultsPage />} />
                <Route path="/ceo/kpis" element={<Navigate to="/executive/kpis" replace />} />
                <Route path="/executive/kpi" element={<Navigate to="/executive/kpi-scoring" replace />} />
                <Route path="/executive/kpi/history" element={<ManagerKpiHistoryPage />} />
                <Route path="/executive/kpi-scoring" element={<ManagerKpiScoringPage />} />
                <Route path="/ceo/kpi" element={<Navigate to="/executive/kpi-scoring" replace />} />
                <Route path="/ceo/kpi/history" element={<Navigate to="/executive/kpi/history" replace />} />
                <Route path="/ceo/kpi-scoring" element={<Navigate to="/executive/kpi-scoring" replace />} />
                <Route path="/executive/reports" element={<Navigate to="/executive/reports/performance" replace />} />
                <Route path="/executive/reports/performance" element={<ReportingDashboardPage reportType="employees" />} />
                <Route path="/executive/reports/department-performance" element={<ReportingDashboardPage reportType="departments" />} />
                <Route path="/executive/reports/pip-status" element={<ReportingDashboardPage reportType="pip" />} />
                <Route path="/executive/reports/feedback-completion" element={<ReportingDashboardPage reportType="feedback" />} />
                <Route path="/executive/reports/recommendations" element={<ReportingDashboardPage reportType="recommendations" />} />
                <Route path="/ceo/reports" element={<Navigate to="/executive/reports/performance" replace />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['DepartmentHead']} />}>
              <Route element={<AppLayout />}>
                <Route path="/department-head/dashboard" element={<DepartmentHeadDashboard />} />
                <Route path="/department-head/my-team" element={<Navigate to="/my-team" replace />} />
                <Route path="/department-head/kpis" element={<EmployeeKpiResultsPage />} />
                <Route path="/department-head/self-assessment" element={<Navigate to="/department-head/self-assessment-forms" replace />} />
                <Route path="/department-head/self-assessment-forms" element={<DepartmentHeadSelfAssessmentViewPage />} />
                <Route path="/department-head/assessment-scores" element={<AssessmentScoreTablePage />} />
                <Route path="/department-head/assessment-review" element={<AssessmentScoreTablePage />} />
                <Route path="/department-head/reports" element={<Navigate to="/department-head/reports/performance" replace />} />
                <Route path="/department-head/reports/performance" element={<ReportingDashboardPage reportType="employees" />} />
                <Route path="/department-head/reports/department-performance" element={<DepartmentKpiResultsPage departmentHead />} />
                <Route path="/department-head/reports/assessment-scores" element={<AssessmentScoreTablePage />} />
                <Route path="/department-head/reports/pip-status" element={<ReportingDashboardPage reportType="pip" />} />
                <Route path="/department-head/reports/feedback-completion" element={<ReportingDashboardPage reportType="feedback" />} />
                <Route path="/department-head/reports/recommendations" element={<ReportingDashboardPage reportType="recommendations" />} />

                <Route element={<PositionPermissionRoute permission="appraisalPermission" fallbackPath="/department-head/dashboard" />}>
                  <Route path="/department-head/appraisals/review" element={<AppraisalReviewQueuePage mode="dept-head" />} />
                  <Route path="/department-head/appraisals/history" element={<AppraisalHistoryListPage role="dept-head" />} />
                </Route>

                <Route path="/department-head/feedback" element={<EmployeeFeedbackDashboardPage />} />
                <Route path="/department-head/feedback/summary" element={<ManagerSummaryPage expectedScope="DEPARTMENT" />} />
                <Route path="/department-head/feedback/assignments/:assignmentId" element={<FeedbackFormPage />} />

                <Route path="/department-head/kpi" element={<Navigate to="/department-head/kpi-scoring" replace />} />
                <Route path="/department-head/kpi/history" element={<ManagerKpiHistoryPage />} />
                <Route path="/department-head/kpi-scoring" element={<ManagerKpiScoringPage />} />

                <Route element={<PositionPermissionRoute permission="departmentKpiPermission" fallbackPath="/department-head/dashboard" />}>
                  <Route path="/department-head/department-kpis" element={<DepartmentKpiResultsPage departmentHead />} />
                </Route>

                <Route path="/department-head/teams" element={<TeamManagement />} />

                <Route element={<PositionPermissionRoute permission="teamCreate" fallbackPath="/department-head/teams" />}>
                  <Route path="/department-head/teams/create" element={<TeamCreate />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="teamHistory" fallbackPath="/department-head/teams" />}>
                  <Route path="/department-head/team-history" element={<TeamHistoryPage />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Home />} />
                <Route path="/hr/profile" element={<ProfilePage />} />
                <Route path="/hr/kpis" element={<EmployeeKpiResultsPage />} />

                <Route element={<PositionPermissionRoute permission="employeeCrud" fallbackPath="/dashboard" />}>
                  <Route path="/hr/employee" element={<EmployeeManagement />} />
                  <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
                  <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
                </Route>

                <Route path="/hr/team" element={<TeamManagement />} />
                <Route path="/hr/team/history" element={<TeamHistoryPage />} />

                <Route
                    path="/hr/team/create"
                    element={
                      <RedirectWithMessage
                          to="/dashboard"
                          message="HR users can view teams and team history only. Team creation is handled by Department Heads for their own departments."
                      />
                    }
                />

                <Route element={<PositionPermissionRoute permission="departmentCrud" fallbackPath="/dashboard" />}>
                  <Route path="/hr/department" element={<DepartmentManagement />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="departmentComparisonView" fallbackPath="/dashboard" />}>
                  <Route path="/hr/department-comparison" element={<DepartmentComparisonPage />} />
                </Route>

                <Route path="/hr/reports" element={<Navigate to="/hr/reports/performance" replace />} />
                <Route path="/hr/reports/performance" element={<ReportingDashboardPage reportType="employees" />} />
                <Route path="/hr/reports/department-performance" element={<DepartmentComparisonPage />} />
                <Route path="/hr/reports/assessment-scores" element={<AssessmentScoreTablePage />} />
                <Route path="/hr/reports/pip-status" element={<ReportingDashboardPage reportType="pip" />} />
                <Route path="/hr/reports/feedback-completion" element={<ReportingDashboardPage reportType="feedback" />} />
                <Route path="/hr/reports/recommendations" element={<ReportingDashboardPage reportType="recommendations" />} />

                <Route element={<PositionPermissionRoute permission="assessmentScoresView" fallbackPath="/dashboard" />}>
                  <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="assessmentFormCreate" fallbackPath="/dashboard" />}>
                  <Route path="/hr/assessment-forms" element={<AssessmentFormBuilderPage />} />
                  <Route path="/hr/assessment-form-records" element={<SelfAssessmentFormRecordsPage />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="feedback360Permission" fallbackPath="/dashboard" />}>
                  <Route path="/hr/feedback/dashboard" element={<Navigate to="/hr/feedback/questions" replace />} />
                  <Route path="/hr/feedback/*" element={<FeedbackLayoutPage />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="appraisalPermission" fallbackPath="/dashboard" />}>
                  {appraisalRoutes}
                </Route>

                <Route element={<PositionPermissionRoute permission="pipViewAll" fallbackPath="/dashboard" />}>
                  <Route path="/pip-updates" element={<PipUpdates />} />
                </Route>

                <Route path="/notification-templates" element={<NotificationTemplates />} />

                <Route element={<PositionPermissionRoute permission="positionPermission" fallbackPath="/dashboard" />}>
                  <Route path="/hr/position/create" element={<PositionCreate />} />
                  <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
                  <Route path="/hr/position/table" element={<PositionTable />} />
                </Route>

                <Route element={<PositionPermissionRoute permission="kpiPermission" fallbackPath="/dashboard" />}>
                  <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
                  <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
                  <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />
                  <Route path="/hr/performance-kpi/form" element={<Navigate to="/hr/kpi-template" replace />} />
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

                <Route element={<PositionPermissionRoute permission="departmentKpiPermission" fallbackPath="/dashboard" />}>
                  <Route path="/hr/department-kpi-template/new" element={<DepartmentKpiTemplateEditorPage />} />
                  <Route path="/hr/department-kpi-template/:id/edit" element={<DepartmentKpiTemplateEditorPage />} />
                  <Route path="/hr/department-kpi-template" element={<DepartmentKpiTemplateListPage />} />
                  <Route path="/hr/department-kpi-cycle/new" element={<DepartmentKpiCycleEditorPage />} />
                  <Route path="/hr/department-kpi-cycle/:id/edit" element={<DepartmentKpiCycleEditorPage />} />
                  <Route path="/hr/department-kpi-cycle" element={<DepartmentKpiCycleListPage />} />
                  <Route path="/hr/department-kpi-scoring" element={<DepartmentKpiScoringPage />} />
                  <Route path="/hr/department-kpi-results" element={<DepartmentKpiResultsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
