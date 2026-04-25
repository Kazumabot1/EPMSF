import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
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
import HRLayout from './components/layout/HRLayout';
import PositionLevelCreate from './pages/position-level/Create';
import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiFormPage from './pages/hr/performance-kpi/form/KpiFormPage';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';
import FeedbackLayoutPage from './pages/feedback/FeedbackLayoutPage';
import './components/layout/hr-layout.css';
import EmployeeManagement from "./pages/employee/EmployeeManagement";
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
<Route path="/employees" element={<EmployeeManagement />} />
        <Route element={<HRLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/hr/employee" element={<EmployeeDashboard />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/hr/team" element={<TeamManagement />} />
          <Route path="/hr/team/create" element={<TeamCreate />} />
          <Route path="/hr/department" element={<DepartmentManagement />} />
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
          <Route path="/hr/feedback/*" element={<FeedbackLayoutPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
