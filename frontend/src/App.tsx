/* App.tsx */
/*
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
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import CeoDashboard from './pages/ceo/CeoDashboard';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiTemplateDetailPage from './pages/hr/kpi-template/KpiTemplateDetailPage';
import KpiTemplateEditorPage from './pages/hr/kpi-template/KpiTemplateEditorPage';
import KpiTemplateListPage from './pages/hr/kpi-template/KpiTemplateListPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import ProjectManagerDashboard from './pages/project-manager/ProjectManagerDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />
              <Route
                path="/employee/kpis"
                element={
                  <EmployeeRoutePlaceholder
                    title="My KPIs"
                    description="Track your KPI progress, scores, and weight distribution."
                  />
                }
              />
              <Route path="/employee/appraisals" element={<EmployeeAssessmentScoresPage />} />
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
              <Route
                path="/employee/pip"
                element={
                  <EmployeeRoutePlaceholder
                    title="My PIP"
                    description="Follow performance improvement plans and updates."
                  />
                }
              />
              <Route
                path="/employee/notifications"
                element={
                  <EmployeeRoutePlaceholder
                    title="Notifications"
                    description="Stay updated on appraisals, KPIs, and tasks."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route
                path="/manager/appraisals"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Appraisals"
                    description="Manager appraisal workflow placeholder."
                  />
                }
              />
              <Route
                path="/manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Reports"
                    description="Manager reporting workflow placeholder."
                  />
                }
              />
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
              <Route
                path="/department-head/dashboard"
                element={<DepartmentHeadDashboard />}
              />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ProjectManager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/project-manager/dashboard" element={<ProjectManagerDashboard />} />
              <Route
                path="/project-manager/performance"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Performance"
                    description="Track KPI metrics and performance data across your projects."
                  />
                }
              />
              <Route
                path="/project-manager/feedback"
                element={
                  <EmployeeRoutePlaceholder
                    title="Stakeholder Feedback"
                    description="Collect and review stakeholder feedback for your projects."
                  />
                }
              />
              <Route
                path="/project-manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Reports"
                    description="Generate and export project performance reports."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/hr/profile" element={<ProfilePage />} />

              <Route path="/hr/employee" element={<EmployeeManagement />} />
              <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
              <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
              <Route path="/hr/team" element={<TeamManagement />} />
              <Route path="/hr/team/create" element={<TeamCreate />} />
              <Route path="/hr/department" element={<DepartmentManagement />} />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />

              <Route path="/pip-updates" element={<PipUpdates />} />

              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notification-templates" element={<NotificationTemplates />} />

              <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
              <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

              <Route path="/hr/position/create" element={<PositionCreate />} />
              <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
              <Route path="/hr/position/table" element={<PositionTable />} />

              <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
              <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
              <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />

              <Route path="/hr/kpi-template/new" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id/edit" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id" element={<KpiTemplateDetailPage />} />
              <Route path="/hr/kpi-template" element={<KpiTemplateListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; */
/*
  Why this file is updated:
  - Adds PIP routes:
    /pip/create
    /pip/past-plans
  - Keeps old routes working.
*/
/*

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import DepartmentListPage from "./pages/departments/DepartmentListPage";
import DepartmentCreatePage from "./pages/departments/DepartmentCreatePage";
import DepartmentEditPage from "./pages/departments/DepartmentEditPage";
import EmployeeListPage from "./pages/employees/EmployeeListPage";
import EmployeeCreatePage from "./pages/employees/EmployeeCreatePage";
import EmployeeEditPage from "./pages/employees/EmployeeEditPage";
import PositionLevelListPage from "./pages/position-levels/PositionLevelListPage";
import PositionLevelCreatePage from "./pages/position-levels/PositionLevelCreatePage";
import PositionLevelEditPage from "./pages/position-levels/PositionLevelEditPage";
import PositionListPage from "./pages/positions/PositionListPage";
import PositionCreatePage from "./pages/positions/PositionCreatePage";
import PositionEditPage from "./pages/positions/PositionEditPage";
import RoleListPage from "./pages/roles/RoleListPage";
import RoleCreatePage from "./pages/roles/RoleCreatePage";
import RoleEditPage from "./pages/roles/RoleEditPage";
import UserListPage from "./pages/users/UserListPage";
import UserCreatePage from "./pages/users/UserCreatePage";
import UserEditPage from "./pages/users/UserEditPage";
import TeamListPage from "./pages/team/TeamListPage";
import TeamCreatePage from "./pages/team/TeamCreatePage";
import TeamEditPage from "./pages/team/TeamEditPage";
import OneOnOnePage from "./pages/one-on-one/OneOnOnePage";
import OneOnOneActionItemsPage from "./pages/one-on-one/OneOnOneActionItemsPage";
import PipCreatePage from "./pages/pip/PipCreatePage";
import PipPastPlansPage from "./pages/pip/PipPastPlansPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import MyProfilePage from "./pages/profile/MyProfilePage";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import DepartmentHeadDashboard from "./pages/department-head/DepartmentHeadDashboard";
import HRDashboard from "./pages/hr/HRDashboard";
import RoleBasedSidebar from "./layouts/RoleBasedSidebar";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedSidebar />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRouter />} />

          <Route path="employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="department-head-dashboard" element={<DepartmentHeadDashboard />} />
          <Route path="hr-dashboard" element={<HRDashboard />} />

          <Route path="departments" element={<DepartmentListPage />} />
          <Route path="departments/create" element={<DepartmentCreatePage />} />
          <Route path="departments/:id/edit" element={<DepartmentEditPage />} />

          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="employees/create" element={<EmployeeCreatePage />} />
          <Route path="employees/:id/edit" element={<EmployeeEditPage />} />

          <Route path="position-levels" element={<PositionLevelListPage />} />
          <Route path="position-levels/create" element={<PositionLevelCreatePage />} />
          <Route path="position-levels/:id/edit" element={<PositionLevelEditPage />} />

          <Route path="positions" element={<PositionListPage />} />
          <Route path="positions/create" element={<PositionCreatePage />} />
          <Route path="positions/:id/edit" element={<PositionEditPage />} />

          <Route path="roles" element={<RoleListPage />} />
          <Route path="roles/create" element={<RoleCreatePage />} />
          <Route path="roles/:id/edit" element={<RoleEditPage />} />

          <Route path="users" element={<UserListPage />} />
          <Route path="users/create" element={<UserCreatePage />} />
          <Route path="users/:id/edit" element={<UserEditPage />} />

          <Route path="teams" element={<TeamListPage />} />
          <Route path="teams/create" element={<TeamCreatePage />} />
          <Route path="teams/:id/edit" element={<TeamEditPage />} />

          <Route path="one-on-one/meetings" element={<OneOnOnePage />} />
          <Route path="one-on-one/action-items" element={<OneOnOneActionItemsPage />} />

          <Route path="pip/create" element={<PipCreatePage />} />
          <Route path="pip/past-plans" element={<PipPastPlansPage />} />

          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<MyProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; */





/* App.tsx
   Why this file is fixed:
   - Uses your real existing frontend files.
   - Removes wrong imports like ForgotPasswordPage and ResetPasswordPage.
   - Adds PIP routes without breaking your existing routes.
*/
/*
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HrEmployeeAccountImport from './pages/employee/HrEmployeeAccountImport';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Permissions from './components/Permissions';
import UserRoles from './components/UserRoles';
import RolePermissions from './components/RolePermissions';
import NotificationTemplates from './components/NotificationTemplates';
import OneOnOneMeetings from './components/OneOnOneMeetings';
import OneOnOneActionItems from './components/OneOnOneActionItems';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeMyDashboard from './pages/employee/EmployeeMyDashboard';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import EmployeeRoutePlaceholder from './pages/employee/EmployeeRoutePlaceholder';
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import CeoDashboard from './pages/ceo/CeoDashboard';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiTemplateDetailPage from './pages/hr/kpi-template/KpiTemplateDetailPage';
import KpiTemplateEditorPage from './pages/hr/kpi-template/KpiTemplateEditorPage';
import KpiTemplateListPage from './pages/hr/kpi-template/KpiTemplateListPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import ProjectManagerDashboard from './pages/project-manager/ProjectManagerDashboard';

import PipCreatePage from './pages/pip/PipCreatePage';
import PipPastPlansPage from './pages/pip/PipPastPlansPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />
              <Route
                path="/employee/kpis"
                element={
                  <EmployeeRoutePlaceholder
                    title="My KPIs"
                    description="Track your KPI progress, scores, and weight distribution."
                  />
                }
              />
              <Route path="/employee/appraisals" element={<EmployeeAssessmentScoresPage />} />
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
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
              <Route
                path="/employee/notifications"
                element={
                  <EmployeeRoutePlaceholder
                    title="Notifications"
                    description="Stay updated on appraisals, KPIs, and tasks."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route
                path="/manager/appraisals"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Appraisals"
                    description="Manager appraisal workflow placeholder."
                  />
                }
              />
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
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
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
              <Route
                path="/department-head/dashboard"
                element={<DepartmentHeadDashboard />}
              />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />
              <Route path="/pip/create" element={<PipCreatePage />} />
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ProjectManager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/project-manager/dashboard" element={<ProjectManagerDashboard />} />
              <Route
                path="/project-manager/performance"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Performance"
                    description="Track KPI metrics and performance data across your projects."
                  />
                }
              />
              <Route
                path="/project-manager/feedback"
                element={
                  <EmployeeRoutePlaceholder
                    title="Stakeholder Feedback"
                    description="Collect and review stakeholder feedback for your projects."
                  />
                }
              />
              <Route
                path="/project-manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Reports"
                    description="Generate and export project performance reports."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/hr/profile" element={<ProfilePage />} />

              <Route path="/hr/employee" element={<EmployeeManagement />} />
              <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
              <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
              <Route path="/hr/team" element={<TeamManagement />} />
              <Route path="/hr/team/create" element={<TeamCreate />} />
              <Route path="/hr/department" element={<DepartmentManagement />} />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />

              <Route path="/pip/create" element={<PipCreatePage />} />
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />

              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notification-templates" element={<NotificationTemplates />} />

              <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
              <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

              <Route path="/hr/position/create" element={<PositionCreate />} />
              <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
              <Route path="/hr/position/table" element={<PositionTable />} />

              <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
              <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
              <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />

              <Route path="/hr/kpi-template/new" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id/edit" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id" element={<KpiTemplateDetailPage />} />
              <Route path="/hr/kpi-template" element={<KpiTemplateListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; */






/* App.tsx
   Why this file is fixed:
   - Adds working PIP routes for Manager, Department Head, HR, and Employee.
   - Makes Employee notification route use the real Notifications page.
   - Keeps your existing project routes and imports.
*/
/*
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
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import CeoDashboard from './pages/ceo/CeoDashboard';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiTemplateDetailPage from './pages/hr/kpi-template/KpiTemplateDetailPage';
import KpiTemplateEditorPage from './pages/hr/kpi-template/KpiTemplateEditorPage';
import KpiTemplateListPage from './pages/hr/kpi-template/KpiTemplateListPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import ProjectManagerDashboard from './pages/project-manager/ProjectManagerDashboard';

import PipCreatePage from './pages/pip/PipCreatePage';
import PipPastPlansPage from './pages/pip/PipPastPlansPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />
              <Route
                path="/employee/kpis"
                element={
                  <EmployeeRoutePlaceholder
                    title="My KPIs"
                    description="Track your KPI progress, scores, and weight distribution."
                  />
                }
              />
              <Route path="/employee/appraisals" element={<EmployeeAssessmentScoresPage />} />
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
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />

              <Route path="/employee/notifications" element={<Notifications />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route
                path="/manager/appraisals"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Appraisals"
                    description="Manager appraisal workflow placeholder."
                  />
                }
              />
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
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
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
              <Route
                path="/department-head/dashboard"
                element={<DepartmentHeadDashboard />}
              />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/pip/create" element={<PipCreatePage />} />
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ProjectManager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/project-manager/dashboard" element={<ProjectManagerDashboard />} />
              <Route
                path="/project-manager/performance"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Performance"
                    description="Track KPI metrics and performance data across your projects."
                  />
                }
              />
              <Route
                path="/project-manager/feedback"
                element={
                  <EmployeeRoutePlaceholder
                    title="Stakeholder Feedback"
                    description="Collect and review stakeholder feedback for your projects."
                  />
                }
              />
              <Route
                path="/project-manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Reports"
                    description="Generate and export project performance reports."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/hr/profile" element={<ProfilePage />} />

              <Route path="/hr/employee" element={<EmployeeManagement />} />
              <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
              <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
              <Route path="/hr/team" element={<TeamManagement />} />
              <Route path="/hr/team/create" element={<TeamCreate />} />
              <Route path="/hr/department" element={<DepartmentManagement />} />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />

              <Route path="/pip-updates" element={<PipUpdates />} />
              <Route path="/pip/past-plans" element={<PipPastPlansPage />} />

              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notification-templates" element={<NotificationTemplates />} />

              <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
              <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

              <Route path="/hr/position/create" element={<PositionCreate />} />
              <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
              <Route path="/hr/position/table" element={<PositionTable />} />

              <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
              <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
              <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />

              <Route path="/hr/kpi-template/new" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id/edit" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id" element={<KpiTemplateDetailPage />} />
              <Route path="/hr/kpi-template" element={<KpiTemplateListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; */









/* App.tsx
   Why this file is fixed:
   - /pip/past-plans is shared by Employee, Manager, Department Head, and HR.
   - Before, /pip/past-plans existed inside multiple role-specific ProtectedRoute groups.
   - React Router could match the Employee group first and reject Manager/HR, then redirect to dashboard.
   - Now /pip/past-plans exists once under normal ProtectedRoute + AppLayout.
   - /pip/create still stays only inside Manager and DepartmentHead groups because HR/Employee should not create PIP.
*/

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
import EmployeeSelfAssessmentPage from './pages/employee/EmployeeSelfAssessmentPage';
import EmployeeAssessmentScoresPage from './pages/employee/EmployeeAssessmentScoresPage';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import CeoDashboard from './pages/ceo/CeoDashboard';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiTemplateDetailPage from './pages/hr/kpi-template/KpiTemplateDetailPage';
import KpiTemplateEditorPage from './pages/hr/kpi-template/KpiTemplateEditorPage';
import KpiTemplateListPage from './pages/hr/kpi-template/KpiTemplateListPage';
import ProfilePage from './pages/hr/ProfilePage';
import AssessmentScoreTablePage from './pages/hr/AssessmentScoreTablePage';
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import Notifications from './pages/Notifications';
import DepartmentHeadDashboard from './pages/department-head/DepartmentHeadDashboard';
import ProjectManagerDashboard from './pages/project-manager/ProjectManagerDashboard';

import PipCreatePage from './pages/pip/PipCreatePage';
import PipPastPlansPage from './pages/pip/PipPastPlansPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />

          {/* Shared logged-in routes.
              These routes are available to multiple roles, so they must not be duplicated
              inside Employee/Manager/HR groups. */}
          <Route element={<AppLayout />}>
            <Route path="/pip/past-plans" element={<PipPastPlansPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/employee/notifications" element={<Notifications />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeMyDashboard />} />
              <Route
                path="/employee/kpis"
                element={
                  <EmployeeRoutePlaceholder
                    title="My KPIs"
                    description="Track your KPI progress, scores, and weight distribution."
                  />
                }
              />
              <Route path="/employee/appraisals" element={<EmployeeAssessmentScoresPage />} />
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
              <Route
                path="/manager/appraisals"
                element={
                  <EmployeeRoutePlaceholder
                    title="Team Appraisals"
                    description="Manager appraisal workflow placeholder."
                  />
                }
              />
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
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/pip/create" element={<PipCreatePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ProjectManager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/project-manager/dashboard" element={<ProjectManagerDashboard />} />
              <Route
                path="/project-manager/performance"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Performance"
                    description="Track KPI metrics and performance data across your projects."
                  />
                }
              />
              <Route
                path="/project-manager/feedback"
                element={
                  <EmployeeRoutePlaceholder
                    title="Stakeholder Feedback"
                    description="Collect and review stakeholder feedback for your projects."
                  />
                }
              />
              <Route
                path="/project-manager/reports"
                element={
                  <EmployeeRoutePlaceholder
                    title="Project Reports"
                    description="Generate and export project performance reports."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Home />} />
              <Route path="/hr/profile" element={<ProfilePage />} />

              <Route path="/hr/employee" element={<EmployeeManagement />} />
              <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
              <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
              <Route path="/hr/team" element={<TeamManagement />} />
              <Route path="/hr/team/create" element={<TeamCreate />} />
              <Route path="/hr/department" element={<DepartmentManagement />} />
              <Route path="/hr/assessment-scores" element={<AssessmentScoreTablePage />} />

              <Route path="/permissions" element={<Permissions />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/role-permissions" element={<RolePermissions />} />

              {/* Kept only for old direct URL compatibility. Removed from sidebar. */}
              <Route path="/pip-updates" element={<PipUpdates />} />

              <Route path="/notification-templates" element={<NotificationTemplates />} />

              <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
              <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

              <Route path="/hr/position/create" element={<PositionCreate />} />
              <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
              <Route path="/hr/position/table" element={<PositionTable />} />

              <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
              <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
              <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />

              <Route path="/hr/kpi-template/new" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id/edit" element={<KpiTemplateEditorPage />} />
              <Route path="/hr/kpi-template/:id" element={<KpiTemplateDetailPage />} />
              <Route path="/hr/kpi-template" element={<KpiTemplateListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;