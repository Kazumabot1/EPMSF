
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { positionPermissionService } from '../../services/positionPermissionService';
import { useNavigate } from 'react-router-dom';
import {
  deleteTeam,
  fetchDepartments,
  fetchMyDepartmentTeams,
  fetchMyTeams,
  fetchTeams,
  type Department,
  type TeamResponse,
} from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import TeamEditModal from './TeamEditModal';
import ProfileNameCell from '../../components/ProfileNameCell';
import './team-ui.css';

const normalizeRole = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

const isEmployeeUser = (user: any) => {
  const dashboard = String(user?.dashboard ?? '').toUpperCase();
  if (dashboard === 'EMPLOYEE_DASHBOARD') {
    return true;
  }

  return (user?.roles ?? []).some((role: string) => normalizeRole(role) === 'EMPLOYEE');
};

const isDepartmentHeadUser = (user: any) => {
  const dashboard = String(user?.dashboard ?? '').toUpperCase();

  if (dashboard === 'DEPARTMENT_HEAD_DASHBOARD') {
    return true;
  }

  return (user?.roles ?? []).some((role: string) => {
    const normalized = normalizeRole(role);
    return normalized === 'DEPARTMENTHEAD';
  });
};

const getApiErrorMessage = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed.'
  );
};

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

const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDepartmentHead = isDepartmentHeadUser(user);
  const isEmployee = isEmployeeUser(user);

  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingTeam, setEditingTeam] = useState<TeamResponse | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TeamResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = isEmployee ? await fetchMyTeams() : isDepartmentHead ? await fetchMyDepartmentTeams() : await fetchTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setTeams([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isDepartmentHead, isEmployee]);

  const loadDepartments = useCallback(async () => {
    if (isDepartmentHead || isEmployee) {
      setDepartments([]);
      return;
    }

    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      setDepartments([]);
    }
  }, [isDepartmentHead, isEmployee]);

  useEffect(() => {
    loadTeams();
    loadDepartments();
  }, [loadTeams, loadDepartments]);


useEffect(() => {
  let cancelled = false;

  positionPermissionService
    .getMyPermissions()
    .then((permissions) => {
      if (!cancelled) {
        setCanCreateTeam(Boolean(permissions.teamCreate));
        setCanEditTeam(Boolean(permissions.teamEdit));
        setCanHistoryTeam(Boolean(permissions.teamHistory));
      }
    })
    .catch(() => {
      if (!cancelled) {
        setCanCreateTeam(false);
        setCanEditTeam(false);
        setCanHistoryTeam(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);

  const filteredTeams = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return teams.filter((team) => {
      const matchesSearch =
        !cleanSearch ||
        team.teamName?.toLowerCase().includes(cleanSearch) ||
        team.departmentName?.toLowerCase().includes(cleanSearch) ||
        team.teamLeaderName?.toLowerCase().includes(cleanSearch) ||
        team.projectManagerName?.toLowerCase().includes(cleanSearch);

      const matchesDepartment =
        isDepartmentHead ||
        isEmployee ||
        !selectedDepartmentId ||
        Number(team.departmentId) === Number(selectedDepartmentId);

      return matchesSearch && matchesDepartment;
    });
  }, [teams, search, selectedDepartmentId, isDepartmentHead, isEmployee]);

  const activeCount = useMemo(
    () => teams.filter((team) => team.status?.toLowerCase() === 'active').length,
    [teams]
  );

  const inactiveCount = useMemo(
    () => teams.filter((team) => team.status?.toLowerCase() === 'inactive').length,
    [teams]
  );

  const createPath = isDepartmentHead ? '/department-head/teams/create' : '/hr/team/create';
  const historyPath = isDepartmentHead ? '/department-head/team-history' : '/hr/team/history';

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      return;
    }

    setDeleting(true);

    try {
      await deleteTeam(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      await loadTeams();
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

const [canCreateTeam, setCanCreateTeam] = useState(false);
const [canEditTeam, setCanEditTeam] = useState(false);
const [canHistoryTeam, setCanHistoryTeam] = useState(false);
const disabledMessage = `Your position (${user?.position || 'your position'}) has this feature disabled!`;









  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <p className="team-eyebrow">Team Organization</p>
          <h1>Team Management</h1>
          <p>
            Manage teams, leaders, project managers, members, and team status.
          </p>
        </div>

        {!isEmployee && (
        <div className="team-header-actions">
  <button
    type="button"
    className="team-btn team-btn-secondary"
    disabled={!canHistoryTeam}
    title={canHistoryTeam ? undefined : disabledMessage}
    onClick={() => {
      if (!canHistoryTeam) {
        setError(disabledMessage);
        return;
      }

      navigate(historyPath);
    }}
  >
    Team History
  </button>

  <button
    type="button"
    className="team-btn team-btn-primary"
    disabled={!canCreateTeam}
    title={canCreateTeam ? undefined : disabledMessage}
    onClick={() => {
      if (!canCreateTeam) {
        setError(disabledMessage);
        return;
      }

      navigate(createPath);
    }}
  >
    Create Team
  </button>


        </div>
        )}
      </div>

      <div className="team-stat-grid">
        <div className="team-stat-card">
          <span>Total Teams</span>
          <strong>{teams.length}</strong>
        </div>

        <div className="team-stat-card">
          <span>Active Teams</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="team-stat-card">
          <span>Inactive Teams</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>

      <div className="team-toolbar">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team, department, leader, or project manager..."
        />

        {!isDepartmentHead && !isEmployee && (
          <select
            value={selectedDepartmentId}
            onChange={(event) => setSelectedDepartmentId(event.target.value)}
          >
            <option value="">All Departments</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.departmentName || department.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="team-error">{error}</div>}

      <div className="team-card">
        {loading ? (
          <div className="team-empty">Loading teams...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="team-empty">No teams found.</div>
        ) : (
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Team</th>
                  <th>Department</th>
                  <th>Team Leader</th>
                  <th>Project Manager</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTeams.map((team, index) => (
                  <tr key={team.id}>
                    <td>{index + 1}</td>

                    <td>
                      <div className="team-name-cell">
                        <strong>{team.teamName}</strong>
                        {team.teamGoal && <small>{team.teamGoal}</small>}
                      </div>
                    </td>

                    <td>{team.departmentName || '—'}</td>

                    <td>
                      {team.teamLeaderName ? (
                        <ProfileNameCell
                          person={{
                            userId: team.teamLeaderId,
                            fullName: team.teamLeaderName,
                            departmentName: team.departmentName,
                          }}
                          subtitle={team.departmentName || 'Team Leader'}
                        />
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      {team.projectManagerName ? (
                        <ProfileNameCell
                          person={{
                            userId: team.projectManagerId,
                            fullName: team.projectManagerName,
                            departmentName: team.departmentName,
                          }}
                          subtitle={team.projectManagerTeams ? `Also PM in ${team.projectManagerTeams}` : 'Project Manager'}
                        />
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>{team.members?.length ?? 0}</td>

                    <td>
                      <span
                        className={`team-status ${
                          team.status?.toLowerCase() === 'active'
                            ? 'is-active'
                            : 'is-inactive'
                        }`}
                      >
                        {team.status || '—'}
                      </span>
                    </td>

                    <td>{formatDate(team.createdDate)}</td>

                    <td>
                      {isEmployee ? (
                        <span className="team-muted">View only</span>
                      ) : (
                      <div className="team-row-actions">
                        <button
                          type="button"
                          className="team-action-btn"
                          disabled={!canEditTeam}
                          title={canEditTeam ? undefined : disabledMessage}
                          onClick={() => {
                            if (!canEditTeam) {
                              setError(disabledMessage);
                              return;
                            }
                            setEditingTeam(team);
                          }}
                        >
                          Edit
                        </button>

                        {!isDepartmentHead && !isEmployee && (
                          <button
                            type="button"
                            className="team-action-btn danger"
                            disabled={!canEditTeam}
                            title={canEditTeam ? undefined : disabledMessage}
                            onClick={() => {
                              if (!canEditTeam) {
                                setError(disabledMessage);
                                return;
                              }
                              setShowDeleteConfirm(team);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TeamEditModal
        open={Boolean(editingTeam)}
        team={editingTeam}
        departments={departments}
        isDepartmentHead={isDepartmentHead}
        onClose={() => setEditingTeam(null)}
        onSaved={loadTeams}
      />

      {showDeleteConfirm && (
        <div className="team-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="team-modal team-modal-small" onClick={(event) => event.stopPropagation()}>
            <div className="team-modal-header">
              <div>
                <p className="team-eyebrow">Confirm Delete</p>
                <h2>Delete Team</h2>
              </div>

              <button
                type="button"
                className="team-modal-close"
                onClick={() => setShowDeleteConfirm(null)}
              >
                ×
              </button>
            </div>

            <div className="team-modal-body">
              <p>
                Are you sure you want to delete{' '}
                <strong>{showDeleteConfirm.teamName}</strong>?
              </p>

              <div className="team-modal-footer">
                <button
                  type="button"
                  className="team-btn team-btn-secondary"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="team-btn team-btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
