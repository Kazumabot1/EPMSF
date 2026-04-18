import { useState, useEffect } from 'react';
import api from '../api';

interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
}

const RolePermissions = () => {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [form, setForm] = useState({ roleId: '', permissionId: '' });
  const [editing, setEditing] = useState<RolePermission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  const fetchRolePermissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/role-permissions');
      setRolePermissions(response.data);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/api/role-permissions/${editing.id}`, form);
      } else {
        await api.post('/api/role-permissions', form);
      }
      fetchRolePermissions();
      setForm({ roleId: '', permissionId: '' });
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving role permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rolePermission: RolePermission) => {
    setForm({ roleId: rolePermission.roleId.toString(), permissionId: rolePermission.permissionId.toString() });
    setEditing(rolePermission);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this role permission?')) {
      setLoading(true);
      try {
        await api.delete(`/api/role-permissions/${id}`);
        fetchRolePermissions();
      } catch (error) {
        console.error('Error deleting role permission:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Permissions Management</h1>
        <p className="text-gray-600">Link roles to permissions within the system</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ roleId: '', permissionId: '' }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Add New Role Permission
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editing ? 'Edit Role Permission' : 'Add New Role Permission'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role ID</label>
                  <input
                    type="number"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permission ID</label>
                  <input
                    type="number"
                    value={form.permissionId}
                    onChange={(e) => setForm({ ...form, permissionId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <h2 className="text-xl font-semibold text-gray-900">Role Permissions List</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rolePermissions.map((rolePermission) => (
                  <tr key={rolePermission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rolePermission.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rolePermission.roleId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rolePermission.permissionId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(rolePermission)}
                        className="text-indigo-600 hover:text-indigo-900 transition duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rolePermission.id)}
                        className="text-red-600 hover:text-red-900 transition duration-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rolePermissions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No role permissions found. Click "Add New Role Permission" to create one.
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

export default RolePermissions;
