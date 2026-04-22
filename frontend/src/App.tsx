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
import './components/layout/hr-layout.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<HRLayout />}>
          <Route path="/" element={<Home />} />
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;