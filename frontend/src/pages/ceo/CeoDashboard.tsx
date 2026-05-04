// CEO Dashboard — Report Reviewing Mode Only
import { useEffect, useState } from 'react';
import api from '../../services/api';

interface AppraisalReview {
  id: number;
  appraisalId: number;
  reviewerEmployeeId?: number;
  reviewType?: string;
  reviewStatus?: string;
  totalScore?: number;
  comments?: string;
}

const statusColor: Record<string, { bg: string; color: string }> = {
  SUBMITTED:   { bg: '#dcfce7', color: '#16a34a' },
  PENDING:     { bg: '#fef9c3', color: '#ca8a04' },
  IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb' },
  APPROVED:    { bg: '#f0fdf4', color: '#15803d' },
  REJECTED:    { bg: '#fee2e2', color: '#dc2626' },
};

const CeoDashboard = () => {
  const [reviews, setReviews] = useState<AppraisalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/appraisal-reviews');
        const data = res.data?.data ?? res.data ?? [];
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        setError('Unable to load appraisal reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = reviews.filter(r => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.id).includes(q) ||
      (r.reviewType ?? '').toLowerCase().includes(q) ||
      (r.reviewStatus ?? '').toLowerCase().includes(q) ||
      (r.comments ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff',
          fontSize: '.75rem', fontWeight: 600, padding: '.3rem .8rem',
          borderRadius: '999px', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em'
        }}>
          <i className="bi bi-eye" /> CEO · Read-Only
        </span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .25rem' }}>
          Report Review Centre
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Executive view of appraisal reports. All records are <strong>read-only</strong>.
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.75rem',
        background: '#ede9fe', border: '1px solid #c4b5fd',
        borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        fontSize: '.88rem', color: '#5b21b6'
      }}>
        <i className="bi bi-info-circle-fill" style={{ fontSize: '1.1rem', flexShrink: 0 }} />
        <span>
          As CEO, you can <strong>review and read</strong> all appraisal reports.
          Creating, editing, or deleting records is restricted to HR and Admin.
        </span>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Reports',  value: reviews.length,                                               color: '#6366f1' },
          { label: 'Submitted',      value: reviews.filter(r => r.reviewStatus === 'SUBMITTED').length,   color: '#16a34a' },
          { label: 'Pending',        value: reviews.filter(r => r.reviewStatus === 'PENDING').length,     color: '#ca8a04' },
          { label: 'In Progress',    value: reviews.filter(r => r.reviewStatus === 'IN_PROGRESS').length, color: '#2563eb' },
        ].map(chip => (
          <div key={chip.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.6rem',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)', minWidth: '130px'
          }}>
            <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: chip.color }}>{chip.value}</strong>
            <span style={{ fontSize: '.78rem', color: '#64748b', lineHeight: 1.2 }}>{chip.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '380px' }}>
        <i className="bi bi-search" style={{
          position: 'absolute', left: '.85rem', top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', fontSize: '.9rem', pointerEvents: 'none'
        }} />
        <input
          type="search"
          placeholder="Search by type, status, comment…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '.6rem .85rem .6rem 2.2rem',
            border: '1.5px solid #e2e8f0', borderRadius: '8px',
            fontSize: '.88rem', outline: 'none', background: '#fff',
            fontFamily: 'inherit', color: '#1e293b'
          }}
        />
      </div>

      {/* Table */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7c3aed' }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '.5rem' }} />
          Loading reports…
        </div>
      )}

      {error && !loading && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px',
          padding: '1rem 1.25rem', color: '#dc2626', fontSize: '.9rem'
        }}>
          <i className="bi bi-exclamation-circle" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <i className="bi bi-file-earmark-text" style={{ color: '#7c3aed' }} />
            <strong style={{ fontSize: '.95rem', color: '#1e293b' }}>
              Appraisal Reports
            </strong>
            <span style={{
              marginLeft: 'auto', background: '#ede9fe', color: '#7c3aed',
              fontSize: '.72rem', fontWeight: 600, padding: '.2rem .6rem', borderRadius: '999px'
            }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }} />
              {reviews.length === 0 ? 'No appraisal reports found.' : 'No records match your search.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['#', 'Report ID', 'Appraisal ID', 'Review Type', 'Status', 'Score', 'Comments'].map(h => (
                      <th key={h} style={{
                        padding: '.75rem 1rem', textAlign: 'left',
                        fontWeight: 600, fontSize: '.78rem', color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const sc = statusColor[r.reviewStatus ?? ''] ?? { bg: '#f1f5f9', color: '#475569' };
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '.75rem 1rem', color: '#94a3b8', fontSize: '.8rem' }}>{i + 1}</td>
                        <td style={{ padding: '.75rem 1rem', fontWeight: 600, color: '#7c3aed' }}>#{r.id}</td>
                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>{r.appraisalId ?? '—'}</td>
                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {r.reviewType ? r.reviewType.replace(/_/g, ' ') : '—'}
                        </td>
                        <td style={{ padding: '.75rem 1rem' }}>
                          <span style={{
                            background: sc.bg, color: sc.color,
                            fontSize: '.72rem', fontWeight: 700, padding: '.2rem .65rem',
                            borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '.04em'
                          }}>
                            {r.reviewStatus ?? 'Unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                          {r.totalScore != null ? r.totalScore : '—'}
                        </td>
                        <td style={{ padding: '.75rem 1rem', color: '#64748b', maxWidth: '240px' }}>
                          <span style={{
                            display: 'block', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }} title={r.comments ?? ''}>
                            {r.comments || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CeoDashboard;
