/*Z*/import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../components/one-on-one.css';
import { extractErrorMessage } from '../../services/apiError';
import { profileService, type UserProfile } from '../../services/profileService';
import {
  createContinuousFeedback,
  getContinuousFeedbackEmployees,
  getContinuousFeedbackTeams,
  getGivenContinuousFeedback,
  getReceivedContinuousFeedback,
  type ContinuousFeedback,
} from '../../services/continuousFeedbackService';
import type { TeamEmployeeOption, TeamOption } from '../../services/oneOnOneService';

const categories = ['Positive', 'Improvement', 'General'];
type HistoryTab = 'received' | 'given';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ContinuousFeedbackPage = () => {
  const location = useLocation();
  const isEmployeeView = location.pathname.startsWith('/employee');
  const canGiveFeedback = !isEmployeeView;

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [employees, setEmployees] = useState<TeamEmployeeOption[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [receivedHistory, setReceivedHistory] = useState<ContinuousFeedback[]>([]);
  const [givenHistory, setGivenHistory] = useState<ContinuousFeedback[]>([]);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('received');

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('General');
  const [rating, setRating] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentEmployeeId = profile?.employeeId ?? null;

  const removeCurrentUser = useMemo(
    () => (items: TeamEmployeeOption[]) =>
      currentEmployeeId == null ? items : items.filter((employee) => employee.employeeId !== currentEmployeeId),
    [currentEmployeeId],
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const activeHistory = historyTab === 'given' ? givenHistory : receivedHistory;

  const loadHistories = async () => {
    const receivedData = await getReceivedContinuousFeedback();
    setReceivedHistory(Array.isArray(receivedData) ? receivedData : []);

    if (canGiveFeedback) {
      const givenData = await getGivenContinuousFeedback();
      setGivenHistory(Array.isArray(givenData) ? givenData : []);
    } else {
      setGivenHistory([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      setLoading(true);
      setProfileLoaded(false);
      setError('');
      setSuccess('');
      setHistoryTab('received');

      try {
        const profileData = await profileService.getMyProfile().catch(() => null);
        const receivedData = await getReceivedContinuousFeedback();

        if (!mounted) return;

        setProfile(profileData);
        setReceivedHistory(Array.isArray(receivedData) ? receivedData : []);

        if (canGiveFeedback) {
          const [teamData, givenData] = await Promise.all([
            getContinuousFeedbackTeams(),
            getGivenContinuousFeedback(),
          ]);

          if (!mounted) return;

          setTeams(Array.isArray(teamData) ? teamData : []);
          setGivenHistory(Array.isArray(givenData) ? givenData : []);
        } else {
          setTeams([]);
          setEmployees([]);
          setGivenHistory([]);
        }
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Failed to load continuous feedback.'));
      } finally {
        if (mounted) {
          setProfileLoaded(true);
          setLoading(false);
        }
      }
    };

    void loadInitial();

    return () => {
      mounted = false;
    };
  }, [canGiveFeedback]);

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      if (!canGiveFeedback || !profileLoaded) {
        return;
      }

      setLoadingEmployees(true);
      setError('');
      setSuccess('');
      setEmployees([]);
      setSelectedEmployeeId('');

      try {
        const teamId = selectedTeamId ? Number(selectedTeamId) : null;
        const data = await getContinuousFeedbackEmployees(teamId);
        if (mounted) setEmployees(Array.isArray(data) ? removeCurrentUser(data) : []);
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Failed to load eligible employees.'));
      } finally {
        if (mounted) setLoadingEmployees(false);
      }
    };

    void loadEmployees();

    return () => {
      mounted = false;
    };
  }, [canGiveFeedback, profileLoaded, selectedTeamId, removeCurrentUser]);

  const resetForm = () => {
    setSelectedEmployeeId('');
    setFeedbackText('');
    setCategory('General');
    setRating('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    if (!feedbackText.trim()) {
      setError('Feedback message is required.');
      return;
    }

    const ratingNumber = rating ? Number(rating) : null;

    if (ratingNumber !== null && (ratingNumber < 1 || ratingNumber > 5)) {
      setError('Rating must be between 1 and 5.');
      return;
    }

    setSubmitting(true);

    try {
      await createContinuousFeedback({
        teamId: selectedTeamId ? Number(selectedTeamId) : null,
        employeeId: Number(selectedEmployeeId),
        feedbackText: feedbackText.trim(),
        category,
        rating: ratingNumber,
      });

      setSuccess('Continuous feedback submitted successfully.');
      setHistoryTab('given');
      resetForm();
      await loadHistories();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit continuous feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFeedbackList = (items: ContinuousFeedback[], mode: HistoryTab) => {
    if (loading) {
      return <p>Loading feedback...</p>;
    }

    if (items.length === 0) {
      return <p>No continuous feedback found.</p>;
    }

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 14,
              background: '#fff',
            }}
          >
            <strong>{item.category}</strong>
            {item.rating ? <span> • Rating: {item.rating}/5</span> : null}
            <p style={{ margin: '8px 0' }}>{item.feedbackText}</p>
            <small>
              {mode === 'received'
                ? `From: ${item.giverName || '-'}${item.giverEmail ? ` (${item.giverEmail})` : ''}`
                : `To: ${item.employeeName || '-'}${item.employeeEmail ? ` (${item.employeeEmail})` : ''}`}
              {' • '}Team: {item.teamName || '-'} • {formatDate(item.createdAt)}
            </small>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="oom-page continuous-feedback-page">
      <div className="oom-header continuous-feedback-hero">
        <h1>Continuous Feedback</h1>
        <p>
          {canGiveFeedback
            ? 'Give continuous feedback and review feedback that was shared with you.'
            : 'View continuous feedback that was shared with you.'}
        </p>
      </div>

      {error && <div className="oom-alert oom-alert--error">{error}</div>}
      {success && <div className="oom-alert oom-alert--success">{success}</div>}

      {canGiveFeedback && (
        <div className="oom-card">
          <form className="oom-form" onSubmit={handleSubmit}>
            <div className="oom-field">
              <label className="oom-label">Team Optional</label>
              <select
                className="oom-select"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={loading || submitting}
              >
                <option value="">
                  {loading ? 'Loading teams...' : teams.length === 0 ? 'No teams found' : 'All department employees'}
                </option>

                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Department</label>
              <input
                className="oom-input"
                value={selectedTeam?.departmentName ?? ''}
                disabled
                placeholder="Uses your own department when no team is selected"
              />
            </div>

            <div className="oom-field">
              <label className="oom-label">Employee</label>
              <select
                className="oom-select"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                disabled={loadingEmployees || submitting}
                required
              >
                <option value="">
                  {loadingEmployees
                    ? 'Loading employees...'
                    : employees.length === 0
                      ? 'No eligible employees found'
                      : '— Select Employee —'}
                </option>

                {employees.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Category</label>
              <select
                className="oom-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={submitting}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Rating Optional</label>
              <select
                className="oom-select"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                disabled={submitting}
              >
                <option value="">No rating</option>
                <option value="1">1 - Needs improvement</option>
                <option value="2">2</option>
                <option value="3">3 - Good</option>
                <option value="4">4</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Feedback Message</label>
              <textarea
                className="oom-textarea"
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Write feedback for this employee..."
                rows={5}
                maxLength={3000}
                disabled={submitting}
                required
              />
            </div>

            <button type="submit" className="oom-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      <div className="oom-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{historyTab === 'received' ? 'Feedback Received by Me' : 'Feedback I Gave'}</h2>

          {canGiveFeedback && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setHistoryTab('received')}
                style={{
                  border: historyTab === 'received' ? '1px solid #2563eb' : '1px solid #dbe3ef',
                  background: historyTab === 'received' ? '#eff6ff' : '#fff',
                  color: historyTab === 'received' ? '#1d4ed8' : '#475569',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 700,
                }}
              >
                Received by Me ({receivedHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('given')}
                style={{
                  border: historyTab === 'given' ? '1px solid #2563eb' : '1px solid #dbe3ef',
                  background: historyTab === 'given' ? '#eff6ff' : '#fff',
                  color: historyTab === 'given' ? '#1d4ed8' : '#475569',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 700,
                }}
              >
                Given by Me ({givenHistory.length})
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>{renderFeedbackList(activeHistory, historyTab)}</div>
      </div>
    </div>
  );
};

export default ContinuousFeedbackPage;
