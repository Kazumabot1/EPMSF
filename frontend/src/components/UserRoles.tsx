import { useState, useEffect } from 'react';
import api from '../api';

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
}

const UserRoles = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [form, setForm] = useState({ userId: '', roleId: '' });
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/user-roles');
      setUserRoles(response.data);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/api/user-roles/${editing.id}`, form);
      } else {
        await api.post('/api/user-roles', form);
      }
      fetchUserRoles();
      setForm({ userId: '', roleId: '' });
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userRole: UserRole) => {
    setForm({ userId: userRole.userId.toString(), roleId: userRole.roleId.toString() });
    setEditing(userRole);
    setShowForm(true);
  };



  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Roles Management</h1>
        <p className="text-gray-600">Assign and manage user roles within the system</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ userId: '', roleId: '' }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Add New User Role
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editing ? 'Edit User Role' : 'Add New User Role'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    type="number"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role ID</label>
                  <input
                    type="number"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter role ID"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-300"
                  >
                    {loading ? 'Saving...' : (editing ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Roles List</h2>
        </div>
        {loading && !showForm ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userRoles.map((userRole) => (
                  <tr key={userRole.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{userRole.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userRole.userId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userRole.roleId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(userRole)}
                        className="text-indigo-600 hover:text-indigo-900 transition duration-300"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {userRoles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No user roles found. Click "Add New User Role" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRoles;
