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
import CreateEmployeeAccount from './pages/employee/CreateEmployeeAccount';
import EmployeeLayout from './components/layout/EmployeeLayout';
import HRLayout from './components/layout/HRLayout';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiFormPage from './pages/hr/performance-kpi/form/KpiFormPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          </Route>


          <Route element={<HRLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Home />} />

            <Route path="/hr/employee" element={<EmployeeDashboard />} />
            <Route path="/hr/employee/create" element={<CreateEmployeeAccount />} />
            <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
            <Route path="/hr/team" element={<TeamManagement />} />
            <Route path="/hr/team/create" element={<TeamCreate />} />
            <Route path="/hr/department" element={<DepartmentManagement />} />

            <Route path="/permissions" element={<Permissions />} />
            <Route path="/user-roles" element={<UserRoles />} />
            <Route path="/role-permissions" element={<RolePermissions />} />

            <Route path="/pip-updates" element={<PipUpdates />} />
            <Route path="/notifications" element={<NotificationTemplates />} />
            <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
            <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

            <Route path="/hr/position/create" element={<PositionCreate />} />
            <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
            <Route path="/hr/position/table" element={<PositionTable />} />

            <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
            <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
            <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />
            <Route path="/hr/performance-kpi/form" element={<KpiFormPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;