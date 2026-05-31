import { useEffect, useState, type FormEvent } from 'react';
import api from '../api';

interface PipUpdate {
  id: number;
  pipId: number;
  comments: string;
  status: string;
  updatedBy: number;
  updatedAt: string;
}

const emptyForm = {
  pipId: '',
  comments: '',
  status: '',
  updatedBy: '',
};

const PipUpdates = () => {
  const [pipUpdates, setPipUpdates] = useState<PipUpdate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<PipUpdate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchPipUpdates();
  }, []);

  const fetchPipUpdates = async () => {
    setLoading(true);
    try {
      const response = await api.get<PipUpdate[]>('/api/pip-updates');
      setPipUpdates(response.data);
    } catch (error) {
      console.error('Error fetching PIP updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      pipId: Number(form.pipId),
      comments: form.comments,
      status: form.status,
      updatedBy: Number(form.updatedBy),
    };

    try {
      if (editing) {
        await api.put(`/api/pip-updates/${editing.id}`, payload);
      } else {
        await api.post('/api/pip-updates', payload);
      }

      await fetchPipUpdates();
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving PIP update:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pipUpdate: PipUpdate) => {
    setForm({
      pipId: pipUpdate.pipId.toString(),
      comments: pipUpdate.comments ?? '',
      status: pipUpdate.status ?? '',
      updatedBy: pipUpdate.updatedBy?.toString() ?? '',
    });
    setEditing(pipUpdate);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this PIP update?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/pip-updates/${id}`);
      await fetchPipUpdates();
    } catch (error) {
      console.error('Error deleting PIP update:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setShowForm(true);
    setEditing(null);
    setForm(emptyForm);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PIP Updates Management</h1>
        <p className="text-gray-600">Track performance improvement plan updates and status changes</p>
      </div>

      <div className="mb-6">
        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Add New PIP Update
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editing ? 'Edit PIP Update' : 'Add New PIP Update'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIP ID</label>
                  <input
                    type="number"
                    value={form.pipId}
                    onChange={(event) => setForm({ ...form, pipId: event.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <textarea
                    value={form.comments}
                    onChange={(event) => setForm({ ...form, comments: event.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <input
                    type="text"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ACTIVE, COMPLETED, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Updated By</label>
                  <input
                    type="number"
                    value={form.updatedBy}
                    onChange={(event) => setForm({ ...form, updatedBy: event.target.value })}
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
                    {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">PIP Updates List</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIP ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pipUpdates.map((pipUpdate) => (
                  <tr key={pipUpdate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pipUpdate.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pipUpdate.pipId}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{pipUpdate.comments}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pipUpdate.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pipUpdate.updatedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pipUpdate.updatedAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(pipUpdate)}
                        className="text-blue-600 hover:text-blue-900 transition duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pipUpdate.id)}
                        className="text-red-600 hover:text-red-900 transition duration-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {pipUpdates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No PIP updates found. Click "Add New PIP Update" to create one.
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

export default PipUpdates;
