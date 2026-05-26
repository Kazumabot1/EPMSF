
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createMyDepartmentTeam,
  createTeam,
  fetchCandidateMembers,
  fetchCandidateProjectManagers,
  fetchCandidateUsers,
  fetchDepartments,
  fetchMyDepartmentCandidateMembers,
  fetchMyDepartmentCandidateProjectManagers,
  fetchMyDepartmentCandidateUsers,
  formatCandidateLabel,
  type CandidateUser,
  type Department,
  type TeamRequest,
} from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import './team-ui.css';

const normalizeRole = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

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
  const data = err?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return (
    data?.message ||
    data?.error ||
    err?.message ||
    'Request failed.'
  );
};

const TeamCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDepartmentHead = isDepartmentHeadUser(user);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [projectManagers, setProjectManagers] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamGoal, setTeamGoal] = useState('');
  const [status, setStatus] = useState('Active');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedLeaderIdNumber = teamLeaderId ? Number(teamLeaderId) : null;
  const selectedProjectManagerIdNumber = projectManagerId ? Number(projectManagerId) : null;

  const canLoadHrCandidates = !isDepartmentHead && Boolean(departmentId);

  useEffect(() => {
    let cancelled = false;

    if (isDepartmentHead) {
      return;
    }

    setLoadingDepartments(true);

    fetchDepartments()
      .then((data) => {
        if (!cancelled) {
          setDepartments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load departments.');
          setDepartments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDepartments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDepartmentHead]);

  useEffect(() => {
    let cancelled = false;

    const resetCandidates = () => {
      setLeaders([]);
      setProjectManagers([]);
      setMembers([]);
      setTeamLeaderId('');
      setProjectManagerId('');
      setSelectedMemberIds([]);
    };

    const loadForHr = async () => {
      if (!canLoadHrCandidates) {
        resetCandidates();
        return;
      }

      setLoadingCandidates(true);
      setError('');

      try {
        const deptId = Number(departmentId);

        const [leaderData, memberData, pmData] = await Promise.all([
          fetchCandidateUsers(deptId),
          fetchCandidateMembers(deptId),
          fetchCandidateProjectManagers(deptId),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
          setTeamLeaderId('');
          setProjectManagerId('');
          setSelectedMemberIds([]);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load team candidates.');
          resetCandidates();
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    const loadForDepartmentHead = async () => {
      if (!isDepartmentHead) {
        return;
      }

      setLoadingCandidates(true);
      setError('');

      try {
        const [leaderData, memberData, pmData] = await Promise.all([
          fetchMyDepartmentCandidateUsers(),
          fetchMyDepartmentCandidateMembers(),
          fetchMyDepartmentCandidateProjectManagers(),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
          setTeamLeaderId('');
          setProjectManagerId('');
          setSelectedMemberIds([]);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load department team candidates.');
          resetCandidates();
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    if (isDepartmentHead) {
      loadForDepartmentHead();
    } else {
      loadForHr();
    }

    return () => {
      cancelled = true;
    };
  }, [departmentId, canLoadHrCandidates, isDepartmentHead]);

  useEffect(() => {
    if (!teamLeaderId) {
      return;
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      setProjectManagerId('');
    }

    setSelectedMemberIds((prev) =>
      prev.filter((id) => id !== Number(teamLeaderId))
    );
  }, [teamLeaderId, projectManagerId]);

  useEffect(() => {
    if (!projectManagerId) {
      return;
    }

    setSelectedMemberIds((prev) =>
      prev.filter((id) => id !== Number(projectManagerId))
    );
  }, [projectManagerId]);

  const availableProjectManagers = useMemo(() => {
    return projectManagers.filter((pm) => pm.id !== selectedLeaderIdNumber);
  }, [projectManagers, selectedLeaderIdNumber]);

  const selectedProjectManager = useMemo(() => {
    return projectManagers.find((pm) => pm.id === selectedProjectManagerIdNumber) ?? null;
  }, [projectManagers, selectedProjectManagerIdNumber]);

  const memberRows = useMemo(() => {
    return members.map((member) => {
      const isLeader = selectedLeaderIdNumber === member.id;
      const isProjectManager = selectedProjectManagerIdNumber === member.id;
      const alreadyInTeam = member.available === false || member.isAvailable === false;

      return {
        ...member,
        disabled: isLeader || isProjectManager || alreadyInTeam,
        disabledReason: isLeader
          ? 'Selected as Team Leader'
          : isProjectManager
            ? 'Selected as Project Manager'
            : alreadyInTeam
              ? member.currentTeamName
                ? `Already in ${member.currentTeamName}`
                : 'Already in another team'
              : '',
      };
    });
  }, [members, selectedLeaderIdNumber, selectedProjectManagerIdNumber]);

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };




  const validateForm = () => {
    if (!isDepartmentHead && !departmentId) {
      return 'Please select a department.';
    }

    if (!teamName.trim()) {
      return 'Please enter a team name.';
    }

    if (!teamLeaderId) {
      return 'Please select a Team Leader.';
    }

    if (selectedMemberIds.length === 0) {
      return 'Please select at least one Team Member.';
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      return 'Project Manager cannot be the same as Team Leader.';
    }

    if (projectManagerId && selectedMemberIds.includes(Number(projectManagerId))) {
      return 'Project Manager cannot be selected as a normal member.';
    }

    if (selectedMemberIds.includes(Number(teamLeaderId))) {
      return 'Team Leader cannot be selected as a normal member.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);

    try {
      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: isDepartmentHead ? 0 : Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        projectManagerId: projectManagerId ? Number(projectManagerId) : null,
        teamGoal: teamGoal.trim(),
        status,
        memberUserIds: selectedMemberIds,
        memberEmployeeIds: selectedMemberIds,
      };

      if (isDepartmentHead) {
        await createMyDepartmentTeam(request);
      } else {
        await createTeam(request);
      }

      setSuccess('Team created successfully.');

      setTimeout(() => {
        navigate(isDepartmentHead ? '/department-head/teams' : '/hr/team');
      }, 600);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const backPath = isDepartmentHead ? '/department-head/teams' : '/hr/team';

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <p className="team-eyebrow">Team Organization</p>
          <h1>Create Team</h1>
          <p>
            Create a team, assign a Team Leader, optionally assign a Project Manager, and choose
            members.
          </p>
        </div>

        <button
          type="button"
          className="team-btn team-btn-secondary"
          onClick={() => navigate(backPath)}
        >
          Back
        </button>
      </div>

      <form className="team-form-card" onSubmit={handleSubmit}>
        {!isDepartmentHead && (
          <div className="team-field">
            <label>Department</label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              disabled={loadingDepartments}
            >
              <option value="">
                {loadingDepartments ? 'Loading departments...' : 'Select Department'}
              </option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.departmentName || department.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isDepartmentHead && (
          <div className="team-info-banner">
            This team will be created inside your assigned department.
          </div>
        )}

        <div className="team-field">
          <label>Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Enter team name"
            maxLength={100}
          />
        </div>

        <div className="team-field">
          <label>Team Goal</label>
          <textarea
            value={teamGoal}
            onChange={(event) => setTeamGoal(event.target.value)}
            placeholder="Enter team goal"
            maxLength={500}
          />
        </div>

        <div className="team-field">
          <label>Status</label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="team-field">
          <label>Team Leader</label>
          <select
            value={teamLeaderId}
            onChange={(event) => setTeamLeaderId(event.target.value)}
            disabled={loadingCandidates || (!isDepartmentHead && !departmentId)}
          >
            <option value="">
              {loadingCandidates ? 'Loading leaders...' : 'Select Team Leader'}
            </option>

            {leaders.map((leader) => {
              const unavailable = leader.available === false || leader.isAvailable === false;
              const suffix = unavailable
                ? ` (Already Team Leader in ${leader.currentTeamName || leader.currentTeamNames || 'another active team'})`
                : '';

              return (
                <option key={leader.id} value={leader.id} disabled={unavailable}>
                  {leader.name}{suffix}
                </option>
              );
            })}
          </select>
        </div>

        <div className="team-field">
          <label>Project Manager</label>
          <select
            value={projectManagerId}
            onChange={(event) => setProjectManagerId(event.target.value)}
            disabled={loadingCandidates || (!isDepartmentHead && !departmentId)}
          >
            <option value="">Optional - Select Project Manager</option>

            {availableProjectManagers.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {formatCandidateLabel(pm)}
              </option>
            ))}
          </select>

          <small>
            Optional. Project Manager can manage many teams, but cannot be the Team Leader or a
            normal member in this team.
          </small>

          {selectedProjectManager?.currentTeamNames && (
            <div className="team-info-banner" style={{ marginTop: 10 }}>
              {selectedProjectManager.name} also participates as Project Manager in:{' '}
              {selectedProjectManager.currentTeamNames}
            </div>
          )}
        </div>

        <div className="team-members-box">
          <div className="team-members-head">
            <div>
              <h3>Members</h3>
              <p>Select available members for this team.</p>
            </div>

            <span>{selectedMemberIds.length} selected</span>
          </div>

          {loadingCandidates ? (
            <div className="team-empty">Loading members...</div>
          ) : memberRows.length === 0 ? (
            <div className="team-empty">No members found.</div>
          ) : (
            <div className="team-member-grid">
              {memberRows.map((member) => (
                <label
                  key={member.id}
                  className={`team-member-card ${member.disabled ? 'is-disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    disabled={member.disabled}
                    onChange={() => toggleMember(member.id)}
                  />

                  <span>
                    <strong>{member.name}</strong>
                    {member.disabledReason && <small>{member.disabledReason}</small>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <div className="team-error">{error}</div>}
        {success && <div className="team-success">{success}</div>}

        <div className="team-form-actions">
          <button
            type="button"
            className="team-btn team-btn-secondary"
            onClick={() => navigate(backPath)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="team-btn team-btn-primary"
            disabled={submitting || selectedMemberIds.length === 0}
            title={selectedMemberIds.length === 0 ? 'Please select at least one Team Member.' : undefined}
          >
            {submitting ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamCreate;