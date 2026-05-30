import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessage } from '../../services/apiError';
import {
  getVisibleContinuousFeedback,
  type ContinuousFeedback,
} from '../../services/continuousFeedbackService';
import '../../components/one-on-one.css';
import '../pip/pip.css';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeRole = (value?: string | null) =>
  String(value ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

const isDepartmentHead = (user: any) =>
  normalizeRole(user?.dashboard) === 'DEPARTMENTHEADDASHBOARD' ||
  (user?.roles ?? []).some((role: string) =>
    ['DEPARTMENTHEAD', 'DEPTHEAD', 'HEADOFDEPARTMENT'].includes(normalizeRole(role)),
  );

const ContinuousFeedbackViewPage = () => {
  const { user } = useAuth();
  const departmentHead = isDepartmentHead(user);
  const [records, setRecords] = useState<ContinuousFeedback[]>([]);
  const [selected, setSelected] = useState<ContinuousFeedback | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((record) => {
      const searchable = departmentHead
        ? [record.employeeName, record.giverName]
        : [
            record.employeeName,
            record.giverName,
            record.employeeDepartmentName,
            record.giverDepartmentName,
            record.teamName,
          ];

      return searchable
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [records, search, departmentHead]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getVisibleContinuousFeedback();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load continuous feedback records.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  return (
    <div className="oom-page">
      <div className="oom-header">
        <h1>View Continuous Feedback</h1>
        <p>Review submitted continuous feedback records.</p>
      </div>

      <div className="oom-card">
        <div className="oom-form">
          <div className="oom-field">
            <label className="oom-label">Search</label>
            <input
              className="oom-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                departmentHead
                  ? 'Search receiver or giver name...'
                  : 'Search department, receiver, giver, or team...'
              }
            />
          </div>

          <button className="oom-submit" type="button" onClick={loadRecords} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="oom-alert oom-alert--error">{error}</div>}

      <div className="oom-card" style={{ marginTop: 20 }}>
        {loading ? (
          <p>Loading feedback...</p>
        ) : filtered.length === 0 ? (
          <p>No continuous feedback records found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelected(record)}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong>{record.category}</strong>
                {record.rating ? <span> - Rating: {record.rating}/5</span> : null}
                <p style={{ margin: '8px 0' }}>{record.feedbackText}</p>
                <small>
                  Receiver: {record.employeeName || '-'} - Giver: {record.giverName || '-'} - Department:{' '}
                  {record.employeeDepartmentName || record.giverDepartmentName || '-'} - {formatDate(record.createdAt)}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="pip-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="pip-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pip-modal-header">
              <div>
                <p className="pip-eyebrow">Continuous Feedback Details</p>
                <h2>{selected.category}</h2>
              </div>
              <button className="pip-icon-button" type="button" onClick={() => setSelected(null)}>
                x
              </button>
            </div>

            <div className="pip-detail-grid">
              <div><span>Receiver</span><strong>{selected.employeeName || '-'}</strong></div>
              <div><span>Receiver Department</span><strong>{selected.employeeDepartmentName || '-'}</strong></div>
              <div><span>Giver</span><strong>{selected.giverName || '-'}</strong></div>
              <div><span>Giver Department</span><strong>{selected.giverDepartmentName || '-'}</strong></div>
              <div><span>Team</span><strong>{selected.teamName || '-'}</strong></div>
              <div><span>Rating</span><strong>{selected.rating ? `${selected.rating}/5` : '-'}</strong></div>
              <div><span>Created</span><strong>{formatDate(selected.createdAt)}</strong></div>
            </div>

            <div className="pip-detail-section">
              <h3>Feedback</h3>
              <p>{selected.feedbackText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinuousFeedbackViewPage;
