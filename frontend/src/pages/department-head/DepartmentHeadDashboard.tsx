import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileNameCell from '../../components/ProfileNameCell';
import {
  createDepartmentHeadTeam,
  fetchDepartmentHeadCandidateMembers,
  fetchDepartmentHeadCandidateUsers,
  fetchDepartmentHeadDashboard,
  updateDepartmentHeadTeam,
  type CandidateUser,
  type DepartmentHeadDashboardData,
  type EmployeeResponse,
  type TeamResponse,
} from '../../services/departmentHeadService';
import '../team/team-ui.css';
import '../employee/employee-ui.css';
import './department-head-dashboard.css';

type TeamPerformance = {
  team: TeamResponse;
  score: number;
  memberCount: number;
  hasLeader: boolean;
  hasGoal: boolean;
  active: boolean;
};

const numberValue = (value?: number | null) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const formatNumber = (value?: number | null) => numberValue(value).toLocaleString();

const formatPercent = (value?: number | null) => `${numberValue(value).toFixed(0)}%`;

const getEmployeeName = (employee: EmployeeResponse) =>
  employee.fullName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || '-';

const getCandidateName = (candidate: CandidateUser) =>
  candidate.name || candidate.fullName || candidate.email || `User #${candidate.id}`;

const getCandidateAvailable = (candidate: CandidateUser) =>
  candidate.available ?? candidate.isAvailable ?? true;

const getExistingMemberIds = (team: TeamResponse | null): number[] => {
  return (
    team?.members
      ?.map((member) => member.userId ?? member.employeeId)
      .filter((id): id is number => id !== undefined && id !== null) ?? []
  );
};

const isActiveTeam = (team: TeamResponse) => String(team.status ?? '').toLowerCase() === 'active';

const getTeamMemberCount = (team: TeamResponse) => team.members?.length ?? 0;

const getTeamPerformance = (team: TeamResponse, teams: TeamResponse[]): TeamPerformance => {
  const memberCount = getTeamMemberCount(team);
  const maxMembers = Math.max(...teams.map(getTeamMemberCount), 1);
  const active = isActiveTeam(team);
  const hasLeader = Boolean(team.teamLeaderId || team.teamLeaderName);
  const hasGoal = Boolean(team.teamGoal?.trim());

  const activeWeight = active ? 28 : 0;
  const leaderWeight = hasLeader ? 22 : 0;
  const memberWeight = memberCount > 0 ? (memberCount / maxMembers) * 34 : 0;
  const goalWeight = hasGoal ? 16 : 0;

  return {
    team,
    score: Math.round(clamp(activeWeight + leaderWeight + memberWeight + goalWeight)),
    memberCount,
    hasLeader,
    hasGoal,
    active,
  };
};

const DepartmentHeadDashboard = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DepartmentHeadDashboardData | null>(null);
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
  const [reason, setReason] = useState('');
  const [memberUserIds, setMemberUserIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active !== false).length,
    [employees],
  );

  const activeTeams = useMemo(() => teams.filter(isActiveTeam).length, [teams]);

  const teamRows = useMemo(() => {
    return teams
      .map((team) => getTeamPerformance(team, teams))
      .sort((first, second) => second.score - first.score);
  }, [teams]);

  const departmentScore = useMemo(() => {
    const employeeBase = activeEmployees > 0 ? 30 : 0;
    const teamBase = teams.length > 0 ? 20 : 0;
    const activeTeamRate = teams.length > 0 ? (activeTeams / teams.length) * 25 : 0;
    const assignedMembers = teams.reduce((sum, team) => sum + getTeamMemberCount(team), 0);
    const coverageRate = activeEmployees > 0 ? Math.min(assignedMembers / activeEmployees, 1) * 25 : 0;

    return Math.round(clamp(employeeBase + teamBase + activeTeamRate + coverageRate));
  }, [activeEmployees, activeTeams, teams]);

  const teamCoverage = useMemo(() => {
    const assignedMembers = teams.reduce((sum, team) => sum + getTeamMemberCount(team), 0);
    return activeEmployees > 0 ? Math.round(clamp((assignedMembers / activeEmployees) * 100)) : 0;
  }, [activeEmployees, teams]);

  const averageTeamScore = useMemo(() => {
    if (!teamRows.length) return 0;

    return Math.round(teamRows.reduce((sum, row) => sum + row.score, 0) / teamRows.length);
  }, [teamRows]);

  const topTeam = teamRows[0];

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');

      const [dashboardData, leaderData, memberData] = await Promise.all([
        fetchDepartmentHeadDashboard(false),
        fetchDepartmentHeadCandidateUsers(),
        fetchDepartmentHeadCandidateMembers(),
      ]);

      setDashboard(dashboardData);
      setDepartmentName(dashboardData.departmentName ?? '');
      setEmployees(dashboardData.employees ?? []);
      setTeams(dashboardData.teams ?? []);
      setLeaders(leaderData ?? []);
      setMembers(memberData ?? []);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to load department dashboard.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, []);

  const resetForm = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamLeaderId('');
    setTeamGoal('');
    setStatus('Active');
    setReason('');
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
    setReason('');
    setMemberUserIds(getExistingMemberIds(team));
    setFormMessage('');
    setShowTeamForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowTeamForm(false);
  };

  const toggleMember = (id: number) => {
    const member = members.find((item) => item.id === id);

    if (!member) return;

    const existingIds = getExistingMemberIds(editingTeam);
    const isExisting = existingIds.includes(id);
    const available = getCandidateAvailable(member);

    if (!available && !isExisting) {
      setFormMessage(
        `${getCandidateName(member)} is already in a team: ${member.currentTeamName || 'Unknown Team'}`,
      );
      return;
    }

    if (Number(teamLeaderId) === id) {
      setFormMessage('Team leader cannot also be a member.');
      return;
    }

    setMemberUserIds((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id],
    );
  };

  const handleSubmitTeam = async (event: FormEvent) => {
    event.preventDefault();

    if (!teamName.trim() || teamLeaderId === '') {
      setFormMessage('Team name and team leader are required.');
      return;
    }

    if (memberUserIds.length === 0) {
      setFormMessage('At least one team member is required.');
      return;
    }

    if (editingTeam && !reason.trim()) {
      setFormMessage('Please write the reason for this team update.');
      return;
    }

    const selectedLeader = leaders.find((leader) => leader.id === Number(teamLeaderId));
    const isCurrentLeader = editingTeam && editingTeam.teamLeaderId === Number(teamLeaderId);

    if (selectedLeader && !getCandidateAvailable(selectedLeader) && !isCurrentLeader) {
      setFormMessage(
        `${getCandidateName(selectedLeader)} is already in a team: ${
          selectedLeader.currentTeamName || 'Unknown Team'
        }`,
      );
      return;
    }

    const existingIds = getExistingMemberIds(editingTeam);

    const unavailableMember = members.find((member) => {
      const selected = memberUserIds.includes(member.id);
      const alreadyInTeam = !getCandidateAvailable(member);
      const isExisting = existingIds.includes(member.id);

      return selected && alreadyInTeam && !isExisting;
    });

    if (unavailableMember) {
      setFormMessage(
        `${getCandidateName(unavailableMember)} is already in a team: ${
          unavailableMember.currentTeamName || 'Unknown Team'
        }`,
      );
      return;
    }

    if (memberUserIds.includes(Number(teamLeaderId))) {
      setFormMessage('Team leader cannot also be a member.');
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
        reason: editingTeam ? reason.trim() : undefined,
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
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save team.',
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
    <div className="team-page dh-dashboard-page">
      <section className="team-hero dh-hero">
        <div className="dh-hero-glow one" />
        <div className="dh-hero-glow two" />

        <div className="dh-hero-content">
          <span className="team-hero-badge dh-hero-badge">
            <i className="bi bi-building-check" />
            Department Head
          </span>

          <h1>{departmentName || 'My Department'}</h1>
          <p>Compare team strength, coverage, active status, and employee assignment health.</p>

          <div className="dh-hero-actions">
            <button
              className="team-btn primary"
              type="button"
              onClick={() => navigate('/department-head/assessment-scores')}
            >
              <i className="bi bi-clipboard-check" />
              Self-Assessment Review
            </button>

            <button className="team-btn secondary" type="button" onClick={loadPage}>
              <i className="bi bi-arrow-clockwise" />
              Refresh Dashboard
            </button>
          </div>
        </div>

        <div className="dh-hero-score">
          <span>Department Score</span>
          <strong>{formatPercent(departmentScore)}</strong>
          <small>{dashboard?.departmentCode || 'Current working department'}</small>
        </div>
      </section>

      {error && (
        <div className="team-alert error">
          {error}
          <button className="team-btn secondary" onClick={loadPage} style={{ marginLeft: 12 }}>
            Retry
          </button>
        </div>
      )}

      <section className="dh-performance-grid">
        <DashboardMetric
          icon="bi-people"
          label="Active Employees"
          value={formatNumber(activeEmployees)}
          detail={`${formatNumber(dashboard?.currentDepartmentEmployeeCount)} current assignment(s)`}
        />
        <DashboardMetric
          icon="bi-diagram-3"
          label="Team Coverage"
          value={formatPercent(teamCoverage)}
          detail={`${formatNumber(teams.length)} team(s), ${formatNumber(activeTeams)} active`}
        />
        <DashboardMetric
          icon="bi-bar-chart-line"
          label="Average Team Score"
          value={formatPercent(averageTeamScore)}
          detail={topTeam ? `Top team: ${topTeam.team.teamName}` : 'No team score yet'}
        />
        <DashboardMetric
          icon="bi-person-badge"
          label="Department Head"
          value={dashboard?.headEmployee || '—'}
          detail={dashboard?.status === false ? 'Inactive department' : 'Active department'}
        />
      </section>

      <section className="dh-comparison-grid">
        <div className="dh-comparison-card">
          <div className="dh-card-head">
            <div>
              <h2>Team Comparison</h2>
              <p>Ranking uses active status, assigned leader, member strength, and team goal.</p>
            </div>
            <span>{teamRows.length} team(s)</span>
          </div>

          {teamRows.length === 0 ? (
            <div className="team-state dh-compact-state">
              <i className="bi bi-diagram-3" />
              <p>No teams found in your department.</p>
            </div>
          ) : (
            <div className="dh-team-ranking-list">
              {teamRows.map((row, index) => (
                <TeamRankingRow key={row.team.id} row={row} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="dh-comparison-card dh-summary-card">
          <span className="dh-summary-icon">
            <i className="bi bi-stars" />
          </span>
          <h2>Coverage Summary</h2>
          <SummaryRow label="Best Team" value={topTeam?.team.teamName} meta={topTeam ? formatPercent(topTeam.score) : '—'} />
          <SummaryRow label="Active Teams" value={`${activeTeams} / ${teams.length}`} meta="status coverage" />
          <SummaryRow
            label="Assigned Members"
            value={String(teams.reduce((sum, team) => sum + getTeamMemberCount(team), 0))}
            meta={`${formatPercent(teamCoverage)} of active employees`}
          />
          <p className="dh-summary-note">
            Team comparison is built from your current Department Head dashboard API. It does not
            require new backend endpoints.
          </p>
        </div>
      </section>

      <div className="team-surface">
        <div className="team-surface-inner">
          <div className="team-table-toolbar dh-toolbar">
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
            <div className="col-md-3">
              <div className="team-card">
                <strong>{activeEmployees}</strong>
                <span>Active Employees</span>
              </div>
            </div>

            <div className="col-md-3">
              <div className="team-card">
                <strong>{teams.length}</strong>
                <span>Teams</span>
              </div>
            </div>
            <div className="col-md-3">
              <button
                type="button"
                className="team-card"
                onClick={() => navigate('/department-head/assessment-scores')}
                style={{ width: '100%', cursor: 'pointer', border: 'none', textAlign: 'left' }}
              >
                <strong>
                  <i className="bi bi-clipboard-check" /> Review
                </strong>
                <span>Self-Assessments</span>
              </button>
            </div>
          </div>
          <div className="team-alert" style={{ marginBottom: 24 }}>
            <strong>Self-assessment approval flow:</strong> Employee submits → Manager signs →
            Department Head signs → HR approves or declines. Department Head signing is available
            from{' '}
            <button
              type="button"
              className="team-btn ghost"
              onClick={() => navigate('/department-head/assessment-scores')}
              style={{ marginLeft: 8 }}
            >
              Assessment Review
            </button>
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
                    <th>Score</th>
                    <th>Goal</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {teams.map((team) => {
                    const teamPerformance = getTeamPerformance(team, teams);

                    return (
                      <tr key={team.id}>
                        <td>
                          <strong>{team.teamName}</strong>
                        </td>
                        <td>
                          {team.teamLeaderId ? (
                            <ProfileNameCell
                              person={{ userId: team.teamLeaderId, fullName: team.teamLeaderName }}
                              subtitle="Team Leader"
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className={`team-pill ${isActiveTeam(team) ? 'active' : 'inactive'}`}>
                            {team.status || '-'}
                          </span>
                        </td>
                        <td>{team.members?.length ?? 0}</td>
                        <td>
                          <strong className="dh-table-score">{formatPercent(teamPerformance.score)}</strong>
                        </td>
                        <td>{team.teamGoal || '-'}</td>
                        <td>
                          <button className="team-btn ghost" onClick={() => openEdit(team)}>
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mt-5">Employees</h3>

          {employees.length === 0 ? (
            <div className="team-state">
              <i className="bi bi-person" />
              <p>No employees found in your department.</p>
              <small className="text-muted">
                If the employee exists in Admin but does not appear here, check that the employee
                is assigned to this department and that the linked login user has the same
                department.
              </small>
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
                        <ProfileNameCell
                          person={{
                            ...employee,
                            userId: employee.userId ?? employee.id,
                            fullName: getEmployeeName(employee),
                          }}
                          subtitle={
                            employee.email || employee.positionTitle || employee.positionName || undefined
                          }
                        />
                      </td>
                      <td>{employee.email || '-'}</td>
                      <td>{employee.positionTitle || employee.positionName || '-'}</td>
                      <td>
                        <span className={`team-pill ${employee.active === false ? 'inactive' : 'active'}`}>
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
                      const available = getCandidateAvailable(leader);
                      const disabled = !available && !isCurrentLeader;

                      return (
                        <option key={leader.id} value={leader.id} disabled={disabled}>
                          {getCandidateName(leader)}
                          {disabled
                            ? ` ⚠️ (already in a team: ${leader.currentTeamName || 'Unknown Team'})`
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

                {editingTeam && (
                  <div className="team-field">
                    <label>
                      Update Reason <span className="team-required">*</span>
                    </label>
                    <textarea
                      className="team-textarea"
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Example: Team structure updated after member reassignment."
                      required
                    />
                  </div>
                )}

                <div className="team-field">
                  <label>
                    Members <span className="team-required">*</span>
                  </label>
                  <div className="team-members-list">
                    {members.map((member) => {
                      const existingIds = getExistingMemberIds(editingTeam);
                      const isExisting = existingIds.includes(member.id);
                      const selected = memberUserIds.includes(member.id);
                      const isLeader = Number(teamLeaderId) === member.id;
                      const available = getCandidateAvailable(member);
                      const alreadyInTeam = !available && !isExisting;
                      const disabled = isLeader || alreadyInTeam;

                      return (
                        <label
                          key={member.id}
                          className={`team-member-item ${disabled ? 'disabled' : ''}`}
                          title={
                            isLeader
                              ? 'Team leader cannot also be a member'
                              : alreadyInTeam
                                ? `Already in a team: ${member.currentTeamName || 'Unknown Team'}`
                                : ''
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleMember(member.id)}
                          />
                          <span>
                            {getCandidateName(member)}
                            {alreadyInTeam
                              ? ` ⚠️ (already in a team: ${member.currentTeamName || 'Unknown Team'})`
                              : isExisting
                                ? ' (Current member)'
                                : ''}
                            {isLeader ? ' (selected as team leader)' : ''}
                          </span>
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

const DashboardMetric = ({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="dh-metric-card">
    <span>
      <i className={`bi ${icon}`} />
    </span>
    <p>{label}</p>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
);

const TeamRankingRow = ({ row, rank }: { row: TeamPerformance; rank: number }) => (
  <div className="dh-team-rank-row">
    <div className="dh-team-rank-head">
      <span>#{rank}</span>
      <strong>{row.team.teamName || 'Unnamed Team'}</strong>
      <em>{formatPercent(row.score)}</em>
    </div>
    <div className="dh-team-rank-track">
      <div className="dh-team-rank-fill" style={{ width: `${clamp(row.score)}%` }} />
    </div>
    <div className="dh-team-rank-meta">
      <span>{row.memberCount} member(s)</span>
      <span>{row.hasLeader ? 'Leader assigned' : 'No leader'}</span>
      <span>{row.hasGoal ? 'Goal set' : 'No goal'}</span>
      <span>{row.active ? 'Active' : 'Inactive'}</span>
    </div>
  </div>
);

const SummaryRow = ({
  label,
  value,
  meta,
}: {
  label: string;
  value?: string | null;
  meta: string;
}) => (
  <div className="dh-summary-row">
    <span>{label}</span>
    <strong>{value || '—'}</strong>
    <em>{meta}</em>
  </div>
);

export default DepartmentHeadDashboard;
