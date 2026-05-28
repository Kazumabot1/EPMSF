
import React, { useEffect, useMemo, useState } from 'react';
import {
  countReasonWords,
  fetchCandidateMembers,
  fetchCandidateProjectManagers,
  fetchCandidateUsers,
  fetchMyDepartmentCandidateMembers,
  fetchMyDepartmentCandidateProjectManagers,
  fetchMyDepartmentCandidateUsers,
  formatCandidateLabel,
  isReasonOverLimit,
  updateMyDepartmentTeam,
  updateTeam,
  type CandidateUser,
  type Department,
  type TeamRequest,
  type TeamResponse,
} from '../../services/teamService';

type Props = {
  open: boolean;
  team: TeamResponse | null;
  departments?: Department[];
  isDepartmentHead?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const getApiErrorMessage = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed.'
  );
};

const TeamEditModal: React.FC<Props> = ({
  open,
  team,
  departments = [],
  isDepartmentHead = false,
  onClose,
  onSaved,
}) => {
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [projectManagers, setProjectManagers] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamGoal, setTeamGoal] = useState('');
const currentStatus = team?.status || 'Active';
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');

  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const selectedLeaderIdNumber = teamLeaderId ? Number(teamLeaderId) : null;
  const selectedProjectManagerIdNumber = projectManagerId ? Number(projectManagerId) : null;

  useEffect(() => {
    if (!open || !team) {
      return;
    }

    setDepartmentId(team.departmentId ? String(team.departmentId) : '');
    setTeamName(team.teamName ?? '');
    setTeamGoal(team.teamGoal ?? '');

    setTeamLeaderId(team.teamLeaderId ? String(team.teamLeaderId) : '');
    setProjectManagerId(team.projectManagerId ? String(team.projectManagerId) : '');
    setSelectedMemberIds(
      Array.isArray(team.members)
        ? team.members
            .map((member) => member.userId ?? member.employeeId)
            .filter((id): id is number => typeof id === 'number')
        : []
    );
    setReason('');
    setError('');
  }, [open, team]);

  useEffect(() => {
    if (!open || !team) {
      return;
    }

    let cancelled = false;

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      setError('');

      try {
        if (isDepartmentHead) {
          const [leaderData, memberData, pmData] = await Promise.all([
            fetchMyDepartmentCandidateUsers(),
            fetchMyDepartmentCandidateMembers(),
            fetchMyDepartmentCandidateProjectManagers(),
          ]);

          if (!cancelled) {
            setLeaders(Array.isArray(leaderData) ? leaderData : []);
            setMembers(Array.isArray(memberData) ? memberData : []);
            setProjectManagers(Array.isArray(pmData) ? pmData : []);
          }

          return;
        }

        const deptId = Number(departmentId || team.departmentId);

        if (!deptId) {
          if (!cancelled) {
            setLeaders([]);
            setMembers([]);
            setProjectManagers([]);
          }

          return;
        }

        const [leaderData, memberData, pmData] = await Promise.all([
          fetchCandidateUsers(deptId),
          fetchCandidateMembers(deptId),
          fetchCandidateProjectManagers(deptId),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load team candidates.');
          setLeaders([]);
          setMembers([]);
          setProjectManagers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [open, team, departmentId, isDepartmentHead]);

  useEffect(() => {
    if (!teamLeaderId) {
      return;
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      setProjectManagerId('');
    }

    setSelectedMemberIds((prev) => prev.filter((id) => id !== Number(teamLeaderId)));
  }, [teamLeaderId, projectManagerId]);

  useEffect(() => {
    if (!projectManagerId) {
      return;
    }

    setSelectedMemberIds((prev) => prev.filter((id) => id !== Number(projectManagerId)));
  }, [projectManagerId]);

  const availableProjectManagers = useMemo(() => {
    return projectManagers.filter((pm) => pm.id !== selectedLeaderIdNumber);
  }, [projectManagers, selectedLeaderIdNumber]);




const originalMembers = useMemo(() => {
  if (!Array.isArray(team?.members)) {
    return [];
  }

  return team.members
    .map((member) => {
      const id = member.userId ?? member.employeeId;
      const name = member.userName ?? member.employeeName ?? (id ? `User #${id}` : 'Unknown member');

      if (typeof id !== 'number') {
        return null;
      }

      return { id, name };
    })
    .filter((member): member is { id: number; name: string } => Boolean(member));
}, [team]);

const originalMemberIds = useMemo(() => {
  return new Set(originalMembers.map((member) => member.id));
}, [originalMembers]);

const mergedMembers = useMemo(() => {
  const merged = new Map<number, CandidateUser>();

  members.forEach((member) => {
    merged.set(member.id, member);
  });

  originalMembers.forEach((member) => {
    if (!merged.has(member.id)) {
      merged.set(member.id, {
        id: member.id,
        name: member.name,
        type: 'Member',
        sourceType: 'Current Team Member',
        available: true,
        isAvailable: true,
        currentTeamId: team?.id ?? null,
        currentTeamName: team?.teamName ?? null,
        currentTeamNames: team?.teamName ?? null,
      });
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }),
  );
}, [members, originalMembers, team?.id, team?.teamName]);

const memberRows = useMemo(() => {
  return mergedMembers.map((member) => {
    const isLeader = selectedLeaderIdNumber === member.id;
    const isProjectManager = selectedProjectManagerIdNumber === member.id;
    const belongsToThisTeam =
      Number(member.currentTeamId) === Number(team?.id) || originalMemberIds.has(member.id);

    const alreadyInOtherTeam =
      (member.available === false || member.isAvailable === false) && !belongsToThisTeam;

    return {
      ...member,
      disabled: isLeader || isProjectManager || alreadyInOtherTeam,
      disabledReason: isLeader
        ? 'Selected as Team Leader'
        : isProjectManager
          ? 'Selected as Project Manager'
          : alreadyInOtherTeam
            ? member.currentTeamName
              ? `Already in ${member.currentTeamName}`
              : 'Already in another team'
            : '',
    };
  });
}, [
  mergedMembers,
  selectedLeaderIdNumber,
  selectedProjectManagerIdNumber,
  team?.id,
  originalMemberIds,
]);

  const reasonWordCount = countReasonWords(reason);

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const validateForm = () => {
    if (!team) {
      return 'Team is required.';
    }

    if (!isDepartmentHead && !departmentId) {
      return 'Please select a department.';
    }

    if (!teamName.trim()) {
      return 'Please enter a team name.';
    }

    if (!teamLeaderId) {
      return 'Please select a Team Leader.';
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

    if (!reason.trim()) {
      return 'Please enter the reason for this team change.';
    }

    if (isReasonOverLimit(reason)) {
      return 'Cannot exceed more than 250 words.';
    }

    return '';
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!team) {
      return;
    }

    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

if (selectedMemberIds.length === 0) {
  const confirmed = window.confirm(
    'Removing all members will close this team and mark it Inactive. This team will become a read-only history record and cannot be reactivated. Do you want to continue?',
  );

  if (!confirmed) {
    return;
  }
}

    setSaving(true);

    try {
const request: TeamRequest = {
  teamName: teamName.trim(),
  departmentId: isDepartmentHead ? 0 : Number(departmentId),
  teamLeaderId: Number(teamLeaderId),
  projectManagerId: projectManagerId ? Number(projectManagerId) : null,
  teamGoal: teamGoal.trim(),
  status: selectedMemberIds.length === 0 ? 'Inactive' : 'Active',
  reason: reason.trim(),
  memberUserIds: selectedMemberIds,
  memberEmployeeIds: selectedMemberIds,
};

      if (isDepartmentHead) {
        await updateMyDepartmentTeam(team.id, request);
      } else {
        await updateTeam(team.id, request);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !team) {
    return null;
  }








  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <div className="team-modal-header">
          <div>
            <p className="team-eyebrow">Team Organization</p>
            <h2>Edit Team</h2>
          </div>

          <button type="button" className="team-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="team-modal-body">
          {!isDepartmentHead && (
            <div className="team-field">
              <label>Department</label>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Select Department</option>

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
              You can only edit teams inside your assigned department.
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
        <div className={`team-pill ${String(currentStatus).toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
          {currentStatus}
        </div>
        <small className="team-muted">
          Team status is automatic. Removing all members will close this team and mark it Inactive.
        </small>
      </div>

          <div className="team-field">
            <label>Team Leader</label>
            <select
              value={teamLeaderId}
              onChange={(event) => setTeamLeaderId(event.target.value)}
              disabled={loadingCandidates}
            >
              <option value="">
                {loadingCandidates ? 'Loading leaders...' : 'Select Team Leader'}
              </option>

              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </div>

          <div className="team-field">
            <label>Project Manager</label>
            <select
              value={projectManagerId}
              onChange={(event) => setProjectManagerId(event.target.value)}
              disabled={loadingCandidates}
            >
              <option value="">Optional - Select Project Manager</option>

              {availableProjectManagers.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {formatCandidateLabel(pm)}
                </option>
              ))}
            </select>

            <small>
              Optional. Project Manager can manage many teams, but cannot be Team Leader or a
              normal member in this team.
            </small>
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

          <div className="team-field">
            <label>
              Reason for change <span className="team-required">*</span>
            </label>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this team change is being made..."
              rows={4}
            />

            <small className={reasonWordCount > 250 ? 'team-limit-error' : ''}>
              {reasonWordCount}/250 words
              {reasonWordCount > 250 ? ' — Cannot exceed more than 250 words.' : ''}
            </small>
          </div>

          {error && <div className="team-error">{error}</div>}

          <div className="team-modal-footer">
            <button
              type="button"
              className="team-btn team-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="team-btn team-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamEditModal;