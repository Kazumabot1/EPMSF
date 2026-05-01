/* App.tsx */
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

export default App;
