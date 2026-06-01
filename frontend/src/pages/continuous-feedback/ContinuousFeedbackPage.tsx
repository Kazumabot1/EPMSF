/*Z*/import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../components/one-on-one.css';
import { extractErrorMessage } from '../../services/apiError';
import { profileService, type UserProfile } from '../../services/profileService';
import { emptyPositionPermission, positionPermissionService } from '../../services/positionPermissionService';
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

const filterCurrentEmployee = (items: TeamEmployeeOption[], currentEmployeeId?: number | null) =>
  currentEmployeeId == null ? items : items.filter((employee) => employee.employeeId !== currentEmployeeId);

const ContinuousFeedbackPage = () => {
  const location = useLocation();
  const isEmployeeView = location.pathname.startsWith('/employee');

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [employees, setEmployees] = useState<TeamEmployeeOption[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [givenHistory, setGivenHistory] = useState<ContinuousFeedback[]>([]);
  const [receivedHistory, setReceivedHistory] = useState<ContinuousFeedback[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<HistoryTab>(isEmployeeView ? 'received' : 'given');
  const [canGiveFeedback, setCanGiveFeedback] = useState(false);

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


  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const activeHistory = activeHistoryTab === 'received' ? receivedHistory : givenHistory;

  const loadHistories = async () => {
    const [receivedData, givenData] = await Promise.all([
      getReceivedContinuousFeedback().catch(() => [] as ContinuousFeedback[]),
      getGivenContinuousFeedback().catch(() => [] as ContinuousFeedback[]),
    ]);

    setReceivedHistory(Array.isArray(receivedData) ? receivedData : []);
    setGivenHistory(Array.isArray(givenData) ? givenData : []);
  };

  const loadEligibleEmployees = async (teamId: string, profileData = profile) => {
    setLoadingEmployees(true);
    setEmployees([]);
    setSelectedEmployeeId('');

    try {
      const numericTeamId = teamId ? Number(teamId) : null;
      const data = await getContinuousFeedbackEmployees(numericTeamId);
      setEmployees(Array.isArray(data) ? filterCurrentEmployee(data, profileData?.employeeId ?? null) : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load eligible employees.'));
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const [profileData, permissionData, receivedData, givenData] = await Promise.all([
          profileService.getMyProfile().catch(() => null),
          positionPermissionService.getMyPermissions().catch(() => emptyPositionPermission()),
          getReceivedContinuousFeedback().catch(() => [] as ContinuousFeedback[]),
          getGivenContinuousFeedback().catch(() => [] as ContinuousFeedback[]),
        ]);

        if (!mounted) return;

        const giveAllowed = Boolean(permissionData.continuousFeedbackGive || permissionData.feedbackSend);
        setProfile(profileData);
        setCanGiveFeedback(giveAllowed);
        setReceivedHistory(Array.isArray(receivedData) ? receivedData : []);
        setGivenHistory(Array.isArray(givenData) ? givenData : []);
        setActiveHistoryTab(isEmployeeView ? 'received' : giveAllowed ? 'given' : 'received');

        if (giveAllowed) {
          try {
            const [teamData, employeeData] = await Promise.all([
              getContinuousFeedbackTeams(),
              getContinuousFeedbackEmployees(null),
            ]);

            if (!mounted) return;

            setTeams(Array.isArray(teamData) ? teamData : []);
            setEmployees(Array.isArray(employeeData) ? filterCurrentEmployee(employeeData, profileData?.employeeId ?? null) : []);
          } catch (err) {
            if (mounted) setError(extractErrorMessage(err, 'Failed to load continuous feedback recipients.'));
          }
        } else {
          setTeams([]);
          setEmployees([]);
        }
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Failed to load continuous feedback.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadInitial();

    return () => {
      mounted = false;
    };
  }, [isEmployeeView]);

  useEffect(() => {
    if (!canGiveFeedback) return;
    setError('');
    setSuccess('');
    void loadEligibleEmployees(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, canGiveFeedback]);

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

    if (!canGiveFeedback) {
      setError('Your position does not have permission to give continuous feedback.');
      return;
    }

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
      setActiveHistoryTab('given');
      resetForm();
      await Promise.all([loadHistories(), loadEligibleEmployees(selectedTeamId)]);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit continuous feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryMeta = (item: ContinuousFeedback) => {
    const peopleText = activeHistoryTab === 'received'
      ? `From: ${item.giverName || '-'} • For: ${item.employeeName || '-'}`
      : `To: ${item.employeeName || '-'} • From: ${item.giverName || '-'}`;

    return `${peopleText} • Team: ${item.teamName || '-'} • ${formatDate(item.createdAt)}`;
  };

  return (
    <div className="oom-page continuous-feedback-page">
      <div className="oom-header continuous-feedback-hero">
        <h1>Continuous Feedback</h1>
        <p>
          {canGiveFeedback
            ? 'Give continuous feedback and track feedback you have given or received.'
            : 'View continuous feedback you received.'}
        </p>
      </div>

      {error && <div className="oom-alert oom-alert--error">{error}</div>}
      {success && <div className="oom-alert oom-alert--success">{success}</div>}

      {canGiveFeedback ? (
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
      ) : (
        <div className="oom-card">
          <h2>Received Feedback</h2>
          <p>Your current position can view received continuous feedback only.</p>
        </div>
      )}

      <div className="oom-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Continuous Feedback History</h2>
          <div style={{ display: 'inline-flex', gap: 8, padding: 4, border: '1px solid #dbeafe', borderRadius: 999, background: '#eff6ff' }}>
            <button
              type="button"
              onClick={() => setActiveHistoryTab('received')}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
                color: activeHistoryTab === 'received' ? '#ffffff' : '#1d4ed8',
                background: activeHistoryTab === 'received' ? '#2563eb' : 'transparent',
              }}
            >
              Received by me ({receivedHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryTab('given')}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
                color: activeHistoryTab === 'given' ? '#ffffff' : '#1d4ed8',
                background: activeHistoryTab === 'given' ? '#2563eb' : 'transparent',
              }}
            >
              Given by me ({givenHistory.length})
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading feedback...</p>
        ) : activeHistory.length === 0 ? (
          <p>No {activeHistoryTab === 'received' ? 'received' : 'given'} continuous feedback found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {activeHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #dbeafe',
                  borderRadius: 14,
                  padding: 14,
                  background: '#fff',
                  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.08)',
                }}
              >
                <strong>{item.category}</strong>
                {item.rating ? <span> • Rating: {item.rating}/5</span> : null}
                <p style={{ margin: '8px 0' }}>{item.feedbackText}</p>
                <small>{renderHistoryMeta(item)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinuousFeedbackPage;
