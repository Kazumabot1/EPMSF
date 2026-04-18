import { Link } from 'react-router-dom';

const Home = () => {
  const modules = [
    { path: '/user-roles', title: 'User Roles', description: 'Manage user role assignments', color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
    { path: '/permissions', title: 'Permissions', description: 'Define system permissions', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
    { path: '/role-permissions', title: 'Role Permissions', description: 'Link roles to permissions', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
    { path: '/notification-templates', title: 'Notification Templates', description: 'Create notification templates', color: 'bg-purple-100 hover:bg-purple-200 border-purple-300' },
    { path: '/one-on-one-action-items', title: 'One-on-One Action Items', description: 'Track meeting action items', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
    { path: '/one-on-one-meetings', title: 'One-on-One Meetings', description: 'Schedule and manage meetings', color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300' },
    { path: '/pip-updates', title: 'PIP Updates', description: 'Log performance improvement updates', color: 'bg-pink-100 hover:bg-pink-200 border-pink-300' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">EPMS Dashboard</h1>
          <p className="text-xl text-gray-600">Employee Performance Management System</p>
          <p className="text-lg text-gray-500 mt-2">Manage all aspects of employee performance and development</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className={`block p-6 bg-white rounded-lg shadow-md border-l-4 ${module.color} transition duration-300 hover:shadow-lg transform hover:-translate-y-1`}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{module.title}</h3>
              <p className="text-gray-600">{module.description}</p>
              <div className="mt-4 text-blue-600 font-medium">Manage →</div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">7</div>
                <div className="text-gray-600">Modules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">100%</div>
                <div className="text-gray-600">CRUD Operations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">REST</div>
                <div className="text-gray-600">API Integration</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
