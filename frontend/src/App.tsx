import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import UserRoles from './components/UserRoles';
import Permissions from './components/Permissions';
import RolePermissions from './components/RolePermissions';
import NotificationTemplates from './components/NotificationTemplates';
import OneOnOneActionItems from './components/OneOnOneActionItems';
import OneOnOneMeetings from './components/OneOnOneMeetings';
import PipUpdates from './components/PipUpdates';
import './App.css'

function App() {

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition duration-300">
                EPMS
              </Link>
              <div className="text-sm text-gray-600">
                Employee Performance Management System
              </div>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user-roles" element={<UserRoles />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/role-permissions" element={<RolePermissions />} />
          <Route path="/notification-templates" element={<NotificationTemplates />} />
          <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />
          <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
          <Route path="/pip-updates" element={<PipUpdates />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
