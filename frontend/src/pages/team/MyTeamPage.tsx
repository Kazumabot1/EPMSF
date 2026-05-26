import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMyTeams, type TeamResponse } from '../../services/teamService';
import ProfileNameCell from '../../components/ProfileNameCell';
import './team-ui.css';

const getApiErrorMessage = (err: any) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  'Unable to load your team information.';

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const MyTeamPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchMyTeams();
      const safeTeams = Array.isArray(data) ? data : [];

      setTeams(safeTeams);
      setSelectedTeamId((previous) => {
        if (previous && safeTeams.some((team) => team.id === previous)) {
          return previous;
        }

        return safeTeams[0]?.id ?? null;
      });
    } catch (err: any) {
      setTeams([]);
      setSelectedTeamId(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  }, [teams, selectedTeamId]);

  const totalMembers = selectedTeam?.members?.length ?? 0;

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <p className="team-eyebrow">My Team</p>
          <h1>Team Composition</h1>
          <p>
            View the team you belong to, including your Team Leader, Project Manager,
            members, department, goal, and status.
          </p>
        </div>

        <div className="team-header-actions">
          <button type="button" className="team-btn team-btn-secondary" onClick={loadTeams}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="team-error">{error}</div>}

      {loading ? (
        <div className="team-card">
          <div className="team-empty">Loading your team...</div>
        </div>
      ) : !selectedTeam ? (
        <div className="team-card">
          <div className="team-empty">
            You are not currently assigned to an active team.
          </div>
        </div>
      ) : (
        <>
          {teams.length > 1 && (
            <div className="team-toolbar">
              <select
                value={selectedTeam.id}
                onChange={(event) => setSelectedTeamId(Number(event.target.value))}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="team-stat-grid">
            <div className="team-stat-card">
              <span>Team</span>
              <strong>{selectedTeam.teamName}</strong>
            </div>
            <div className="team-stat-card">
              <span>Department</span>
              <strong>{selectedTeam.departmentName || '—'}</strong>
            </div>
            <div className="team-stat-card">
              <span>Members</span>
              <strong>{totalMembers}</strong>
            </div>
          </div>

          <div className="team-card">
            <div className="team-details-grid">
              <div className="team-details-card">
                <span>Team Leader</span>
                <strong>{selectedTeam.teamLeaderName || '—'}</strong>
              </div>
              <div className="team-details-card">
                <span>Project Manager</span>
                <strong>{selectedTeam.projectManagerName || '—'}</strong>
              </div>
              <div className="team-details-card">
                <span>Status</span>
                <strong>{selectedTeam.status || '—'}</strong>
              </div>
              <div className="team-details-card">
                <span>Created</span>
                <strong>{formatDate(selectedTeam.createdDate)}</strong>
              </div>
            </div>

            {selectedTeam.teamGoal && (
              <div className="team-details-section">
                <h3>Team Goal</h3>
                <p>{selectedTeam.teamGoal}</p>
              </div>
            )}

            <div className="team-details-section">
              <h3>Team Members</h3>

              {selectedTeam.members?.length ? (
                <div className="team-table-wrap">
                  <table className="team-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Member</th>
                        <th>Role in Team</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeam.members.map((member, index) => {
                        const memberName = member.userName || member.employeeName || 'Unnamed member';
                        const isLeader = member.userId === selectedTeam.teamLeaderId;
                        const isProjectManager = member.userId === selectedTeam.projectManagerId;

                        return (
                          <tr key={`${member.userId ?? member.employeeId ?? index}-${memberName}`}>
                            <td>{index + 1}</td>
                            <td>
                              <ProfileNameCell
                                person={{
                                  userId: member.userId,
                                  fullName: memberName,
                                  departmentName: selectedTeam.departmentName,
                                }}
                                subtitle={selectedTeam.departmentName || 'Team member'}
                              />
                            </td>
                            <td>
                              {isLeader
                                ? 'Team Leader'
                                : isProjectManager
                                  ? 'Project Manager'
                                  : 'Member'}
                            </td>
                            <td>{formatDate(member.startedDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="team-muted">No active members are recorded for this team.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyTeamPage;
