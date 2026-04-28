import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createDepartmentHeadTeam,
  fetchDepartmentHeadCandidateMembers,
  fetchDepartmentHeadCandidateUsers,
  fetchDepartmentHeadDashboard,
  updateDepartmentHeadTeam,
  type CandidateUser,
  type EmployeeResponse,
  type TeamResponse,
} from '../../services/departmentHeadService';
import '../team/team-ui.css';
import '../employee/employee-ui.css';

const getEmployeeName = (employee: EmployeeResponse) =>
  employee.fullName ||
  `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
  '-';

const DepartmentHeadDashboard = () => {
  const [departmentName, setDepartmentName] = useState('');
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamResponse | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState<number | ''>('');
  const [teamGoal, setTeamGoal] = useState('');
  const [status, setStatus] = useState('Active');
  const [memberUserIds, setMemberUserIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active !== false).length,
    [employees]
  );

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');

      const [dashboard, leaderData, memberData] = await Promise.all([
        fetchDepartmentHeadDashboard(false),
        fetchDepartmentHeadCandidateUsers(),
        fetchDepartmentHeadCandidateMembers(),
      ]);

      console.log('DEPT HEAD DASHBOARD DATA:', dashboard);

      setDepartmentName(dashboard.departmentName ?? '');
      setEmployees(dashboard.employees ?? []);
      setTeams(dashboard.teams ?? []);
      setLeaders(leaderData ?? []);
      setMembers(memberData ?? []);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to load department dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const resetForm = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamLeaderId('');
    setTeamGoal('');
    setStatus('Active');
    setMemberUserIds([]);
    setFormMessage('');
  };

  const openCreate = () => {
    resetForm();
    setShowTeamForm(true);
  };

  const openEdit = (team: TeamResponse) => {
    setEditingTeam(team);
    setTeamName(team.teamName ?? '');
    setTeamLeaderId(team.teamLeaderId ?? '');
    setTeamGoal(team.teamGoal ?? '');
    setStatus(team.status ?? 'Active');
    setMemberUserIds(
      team.members
        ?.map((member) => member.userId ?? member.employeeId)
        .filter((id): id is number => id !== undefined && id !== null) ?? []
    );
    setFormMessage('');
    setShowTeamForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowTeamForm(false);
  };

  const toggleMember = (id: number) => {
    setMemberUserIds((prev) =>
      prev.includes(id)
        ? prev.filter((memberId) => memberId !== id)
        : [...prev, id]
    );
  };

  const handleSubmitTeam = async (event: FormEvent) => {
    event.preventDefault();

    if (!teamName.trim() || teamLeaderId === '') {
      setFormMessage('Team name and team leader are required.');
      return;
    }

    try {
      setSaving(true);
      setFormMessage('');

      const payload = {
        teamName: teamName.trim(),
        teamLeaderId: Number(teamLeaderId),
        teamGoal,
        status,
        memberUserIds,
        memberEmployeeIds: memberUserIds,
      };

      if (editingTeam) {
        await updateDepartmentHeadTeam(editingTeam.id, payload);
      } else {
        await createDepartmentHeadTeam(payload);
      }

      await loadPage();
      closeForm();
    } catch (err: any) {
      setFormMessage(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to save team.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="team-page">
        <div className="team-state">
          <i className="bi bi-hourglass-split" />
          Loading department dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="team-hero">
        <span className="team-hero-badge">
          <i className="bi bi-building-check" />
          Department Head
        </span>
        <h1>{departmentName || 'My Department'}</h1>
        <p>Manage teams and employees from your own department only.</p>
      </div>

      {error && (
        <div className="team-alert error">
          {error}
          <button className="team-btn secondary" onClick={loadPage} style={{ marginLeft: 12 }}>
            Retry
          </button>
        </div>
      )}

      <div className="team-surface">
        <div className="team-surface-inner">
          <div className="team-table-toolbar">
            <div>
              <h2>Overview</h2>
              <p className="text-muted">Your department summary</p>
            </div>

            <button className="team-btn primary" onClick={openCreate}>
              <i className="bi bi-plus-lg" />
              Create Team
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="team-card">
                <strong>{activeEmployees}</strong>
                <span>Active Employees</span>
              </div>
            </div>

            <div className="col-md-4">
              <div className="team-card">
                <strong>{teams.length}</strong>
                <span>Teams</span>
              </div>
            </div>

            <div className="col-md-4">
              <div className="team-card">
                <strong>{departmentName || '-'}</strong>
                <span>Department</span>
              </div>
            </div>
          </div>

          <h3>Teams</h3>

          {teams.length === 0 ? (
            <div className="team-state">
              <i className="bi bi-people" />
              <p>No teams found in your department.</p>
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Leader</th>
                    <th>Status</th>
                    <th>Members</th>
                    <th>Goal</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>
                        <strong>{team.teamName}</strong>
                      </td>
                      <td>{team.teamLeaderName || '-'}</td>
                      <td>
                        <span
                          className={`team-pill ${
                            team.status?.toLowerCase() === 'active'
                              ? 'active'
                              : 'inactive'
                          }`}
                        >
                          {team.status || '-'}
                        </span>
                      </td>
                      <td>{team.members?.length ?? 0}</td>
                      <td>{team.teamGoal || '-'}</td>
                      <td>
                        <button className="team-btn ghost" onClick={() => openEdit(team)}>
                          <i className="bi bi-pencil-square" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mt-5">Employees</h3>

          {employees.length === 0 ? (
            <div className="team-state">
              <i className="bi bi-person" />
              <p>No employees found in your department.</p>
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Position</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{getEmployeeName(employee)}</strong>
                      </td>
                      <td>{employee.email || '-'}</td>
                      <td>{employee.positionTitle || employee.positionName || '-'}</td>
                      <td>
                        <span
                          className={`team-pill ${
                            employee.active === false ? 'inactive' : 'active'
                          }`}
                        >
                          {employee.active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showTeamForm && (
        <div className="team-modal-overlay">
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>{editingTeam ? `Edit Team: ${editingTeam.teamName}` : 'Create Team'}</h2>

              <button className="team-btn ghost" onClick={closeForm}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="team-modal-body">
              {formMessage && <div className="team-alert error">{formMessage}</div>}

              <form id="department-head-team-form" className="team-form" onSubmit={handleSubmitTeam}>
                <div className="team-field">
                  <label>
                    Team Name <span className="team-required">*</span>
                  </label>
                  <input
                    className="team-input"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    required
                  />
                </div>

                <div className="team-field">
                  <label>Department</label>
                  <input className="team-input" value={departmentName} disabled />
                </div>

                <div className="team-field">
                  <label>
                    Team Leader <span className="team-required">*</span>
                  </label>
                  <select
                    className="team-select"
                    value={teamLeaderId}
                    onChange={(event) =>
                      setTeamLeaderId(event.target.value ? Number(event.target.value) : '')
                    }
                    required
                  >
                    <option value="">Select leader</option>
                    {leaders.map((leader) => {
                      const isCurrentLeader = editingTeam?.teamLeaderId === leader.id;
                      const disabled = leader.isAvailable === false && !isCurrentLeader;

                      return (
                        <option key={leader.id} value={leader.id} disabled={disabled}>
                          {leader.name}
                          {disabled
                            ? ` (Already in ${leader.currentTeamName})`
                            : isCurrentLeader
                              ? ' (Current)'
                              : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="team-field">
                  <label>Team Goal</label>
                  <textarea
                    className="team-textarea"
                    rows={3}
                    value={teamGoal}
                    onChange={(event) => setTeamGoal(event.target.value)}
                  />
                </div>

                <div className="team-field">
                  <label>Status</label>
                  <select
                    className="team-select"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="team-field">
                  <label>Members</label>
                  <div className="team-members-list">
                    {members.map((member) => {
                      const selected = memberUserIds.includes(member.id);
                      const isLeader = Number(teamLeaderId) === member.id;
                      const disabled = isLeader || (member.isAvailable === false && !selected);

                      return (
                        <label
                          key={member.id}
                          className={`team-member-item ${disabled ? 'disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleMember(member.id)}
                          />
                          <span>{member.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="team-modal-footer">
              <button className="team-btn secondary" onClick={closeForm} disabled={saving}>
                Cancel
              </button>

              <button
                className="team-btn primary"
                type="submit"
                form="department-head-team-form"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingTeam ? 'Save Changes' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentHeadDashboard;