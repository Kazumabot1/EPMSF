import { useState, useEffect } from 'react';
import api from '../api';

interface OneOnOneMeeting {
  id: number;
  managerId: number;
  employeeId: number;
  scheduledDate: string;
  notes: string;
  status: string;
  followUpDate: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

const OneOnOneMeetings = () => {
  const [meetings, setMeetings] = useState<OneOnOneMeeting[]>([]);
  const [form, setForm] = useState({ managerId: '', employeeId: '', scheduledDate: '', notes: '', status: '', followUpDate: '', isFinalized: false });
  const [editing, setEditing] = useState<OneOnOneMeeting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/one-on-one-meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/api/one-on-one-meetings/${editing.id}`, form);
      } else {
        await api.post('/api/one-on-one-meetings', form);
      }
      fetchMeetings();
      setForm({ managerId: '', employeeId: '', scheduledDate: '', notes: '', status: '', followUpDate: '', isFinalized: false });
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (meeting: OneOnOneMeeting) => {
    setForm({ managerId: meeting.managerId.toString(), employeeId: meeting.employeeId.toString(), scheduledDate: meeting.scheduledDate, notes: meeting.notes, status: meeting.status, followUpDate: meeting.followUpDate, isFinalized: meeting.isFinalized });
    setEditing(meeting);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      setLoading(true);
      try {
        await api.delete(`/api/one-on-one-meetings/${id}`);
        fetchMeetings();
      } catch (error) {
        console.error('Error deleting meeting:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">One-on-One Meetings Management</h1>
        <p className="text-gray-600">Schedule and manage one-on-one meetings</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ managerId: '', employeeId: '', scheduledDate: '', notes: '', status: '', followUpDate: '', isFinalized: false }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Add New Meeting
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editing ? 'Edit Meeting' : 'Add New Meeting'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager ID</label>
                  <input
                    type="number"
                    value={form.managerId}
                    onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="number"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <input
                    type="text"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Is Finalized</label>
                  <input
                    type="checkbox"
                    checked={form.isFinalized}
                    onChange={(e) => setForm({ ...form, isFinalized: e.target.checked })}
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
          <h2 className="text-xl font-semibold text-gray-900">Meetings List</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finalized</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.managerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.scheduledDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{meeting.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.followUpDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.isFinalized ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(meeting)}
                        className="text-indigo-600 hover:text-indigo-900 transition duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(meeting.id)}
                        className="text-red-600 hover:text-red-900 transition duration-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {meetings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No meetings found. Click "Add New Meeting" to create one.
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

export default OneOnOneMeetings;
