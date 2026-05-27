import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
import { positionPermissionService } from '../../services/positionPermissionService';


type IconName =
    | 'activity'
    | 'arrowRight'
    | 'barChart'
    | 'building'
    | 'calendar'
    | 'chart'
    | 'check'
    | 'chevronRight'
    | 'clipboard'
    | 'close'
    | 'document'
    | 'edit'
    | 'feedback'
    | 'info'
    | 'people'
    | 'plus'
    | 'refresh'
    | 'shield'
    | 'sparkles'
    | 'target'
    | 'user';

type TeamPerformance = {
  team: TeamResponse;
  score: number;
  memberCount: number;
  hasLeader: boolean;
  hasGoal: boolean;
  active: boolean;
};

type ActivityItem = {
  title: string;
  detail: string;
  time: string;
};

const numberValue = (value?: number | null) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const formatNumber = (value?: number | null) => numberValue(value).toLocaleString();

const formatPercent = (value?: number | null) => `${numberValue(value).toFixed(0)}%`;

const formControlClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';


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

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (typeof data === 'string' && data.trim()) return data;

    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown; error?: unknown }).message;
      const errorText = (data as { message?: unknown; error?: unknown }).error;

      if (typeof message === 'string' && message.trim()) return message;
      if (typeof errorText === 'string' && errorText.trim()) return errorText;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};

const readDashboardNumber = (dashboard: DepartmentHeadDashboardData | null, keys: string[]) => {
  if (!dashboard) return 0;

  for (const key of keys) {
    const value = dashboard[key];
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
};

const normalizeActivity = (item: unknown, index: number): ActivityItem => {
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const title = record.title ?? record.action ?? record.type ?? record.name;
    const detail = record.detail ?? record.description ?? record.message ?? record.summary;
    const time = record.time ?? record.createdAt ?? record.timestamp ?? record.date;

    return {
      title: typeof title === 'string' && title.trim() ? title : `Department activity ${index + 1}`,
      detail: typeof detail === 'string' && detail.trim() ? detail : 'A department workflow update was recorded.',
      time: typeof time === 'string' && time.trim() ? time : 'Recent',
    };
  }

  return {
    title: `Department activity ${index + 1}`,
    detail: typeof item === 'string' && item.trim() ? item : 'A department workflow update was recorded.',
    time: 'Recent',
  };
};

const Icon = ({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  const paths: Record<IconName, ReactNode> = {
    activity: <path d="M22 12h-4l-3 8-6-16-3 8H2" />,
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
    barChart: <path d="M4 19V5m6 14v-8m6 8V9m4 10H2" />,
    building: <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M8 7h4M8 11h4M8 15h4m8 6v-8a2 2 0 0 0-2-2h-2" />,
    calendar: <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
    chart: <path d="M4 19V5m0 14h16M8 16l3-4 3 2 5-7" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    clipboard: <path d="M9 5h6m-7 4h8m-8 4h5m-6 8h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1.5a2 2 0 0 0-2-2h-3A2 2 0 0 0 8.5 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    document: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8M8 17h5" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    feedback: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    info: <path d="M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    people: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    plus: <path d="M12 5v14m-7-7h14" />,
    refresh: <path d="M21 12a9 9 0 0 1-15 6.7L4 17m-1-5a9 9 0 0 1 15-6.7L20 7m1-5v5h-5M3 22v-5h5" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    sparkles: <path d="M12 3 9.8 8.2 5 10l4.8 1.8L12 17l2.2-5.2L19 10l-4.8-1.8ZM5 15l-1 2.5L2 19l2 1.5L5 23l1-2.5L8 19l-2-1.5ZM19 15l-1 2.5L16 19l2 1.5 1 2.5 1-2.5 2-1.5-2-1.5Z" />,
    target: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
    user: <path d="M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
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
  const [dashboardError, setDashboardError] = useState('');
  const [teamPermissionMessage, setTeamPermissionMessage] = useState('');
  const [candidateLoading, setCandidateLoading] = useState(false);

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
  const [canCreateTeam, setCanCreateTeam] = useState(false);
  const [teamPermissionLoaded, setTeamPermissionLoaded] = useState(false);


  useEffect(() => {
    let cancelled = false;

    positionPermissionService
      .getMyPermissions()
      .then((permissions) => {
        if (!cancelled) {
          setCanCreateTeam(Boolean(permissions.teamPermission && permissions.teamCreate));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanCreateTeam(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTeamPermissionLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const coverageHealth = useMemo(() => {
    const assignedMembers = teams.reduce((sum, team) => sum + getTeamMemberCount(team), 0);
    return activeEmployees > 0 ? Math.round(clamp((assignedMembers / activeEmployees) * 100)) : 0;
  }, [activeEmployees, teams]);

  const teamReadiness = useMemo(() => {
    if (!teamRows.length) return 0;
    return Math.round(teamRows.reduce((sum, row) => sum + row.score, 0) / teamRows.length);
  }, [teamRows]);

  const reviewQueueCount = useMemo(
      () =>
          readDashboardNumber(dashboard, [
            'pendingReviews',
            'pendingReviewCount',
            'pendingAssessmentReviews',
            'pendingDepartmentHeadReviews',
            'reviewQueueCount',
          ]),
      [dashboard],
  );

  const dashboardWarnings = useMemo(() => dashboard?.warnings?.filter(Boolean) ?? [], [dashboard]);

  const recentActivities = useMemo(
      () => (dashboard?.recentActivities ?? []).slice(0, 5).map(normalizeActivity),
      [dashboard],
  );

  const topTeam = teamRows[0];
const teamManagementAvailable = teamPermissionLoaded && canCreateTeam;  const totalAssignedMembers = teams.reduce((sum, team) => sum + getTeamMemberCount(team), 0);
  const departmentDisplay = departmentName || dashboard?.departmentName || 'Your Department';

const loadTeamCandidates = async () => {
  if (!teamPermissionLoaded || !canCreateTeam) {
    setLeaders([]);
    setMembers([]);
    return;
  }

  try {
    setCandidateLoading(true);
    setTeamPermissionMessage('');

    const [leaderData, memberData] = await Promise.all([
      fetchDepartmentHeadCandidateUsers(),
      fetchDepartmentHeadCandidateMembers(),
    ]);

    setLeaders(leaderData ?? []);
    setMembers(memberData ?? []);
  } catch (error) {
    console.error(error);
    setLeaders([]);
    setMembers([]);
    setTeamPermissionMessage(
      getApiErrorMessage(
        error,
        'Team management is not available for your position. You can still view department summary, review workflows, and reports.',
      ),
    );
  } finally {
    setCandidateLoading(false);
  }
};

useEffect(() => {
  if (teamPermissionLoaded && canCreateTeam) {
    void loadTeamCandidates();
  }

  if (teamPermissionLoaded && !canCreateTeam) {
    setLeaders([]);
    setMembers([]);
    setTeamPermissionMessage('');
  }
}, [teamPermissionLoaded, canCreateTeam]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setDashboardError('');

      const dashboardData = await fetchDepartmentHeadDashboard(false);
      setDashboard(dashboardData);
      setDepartmentName(dashboardData.departmentName ?? '');
      setEmployees(dashboardData.employees ?? []);
      setTeams(dashboardData.teams ?? []);
    } catch (error) {
      console.error(error);
      setDashboardError(getApiErrorMessage(error, 'Failed to load department dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
    if (!teamManagementAvailable) {
      setFormMessage(teamPermissionMessage);
      return;
    }

    resetForm();
    setShowTeamForm(true);
  };

  const openEdit = (team: TeamResponse) => {
    if (!teamManagementAvailable) return;

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

    if (!teamManagementAvailable) {
      setFormMessage(teamPermissionMessage || 'Team management is not available for your position.');
      return;
    }

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
    } catch (error) {
      setFormMessage(getApiErrorMessage(error, 'Failed to save team.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-[calc(100vh-86px)] bg-slate-50 px-3 py-6 sm:px-5 lg:px-7">
          <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            <Icon name="refresh" className="h-5 w-5 animate-spin text-blue-600" />
            Loading department dashboard...
          </div>
        </div>
    );
  }

  return (
      <div className="min-w-0 bg-slate-50 px-3 py-5 text-slate-950 sm:px-5 lg:px-6 xl:px-7">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
          <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">
                <Icon name="building" className="h-4 w-4" />
                Department Head Dashboard
              </span>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {departmentDisplay}
                </h1>
                <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-600">
                  Monitor department review work, employees, teams, and performance reporting from one workspace.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[560px]">
                <ContextPill icon="building" label="Department Code" value={dashboard?.departmentCode || 'Not set'} />
                <ContextPill icon="user" label="Department Head" value={dashboard?.headEmployee || 'Not assigned'} />
                <ContextPill icon="people" label="Employees" value={`${formatNumber(activeEmployees)} active`} />
                <ContextPill icon="clipboard" label="Review Queue" value={`${formatNumber(reviewQueueCount)} pending`} />
              </div>
            </div>
          </section>

          {dashboardError && (
              <NoticeCard tone="danger" title="Dashboard could not be refreshed" actionLabel="Retry" onAction={loadPage}>
                {dashboardError}
              </NoticeCard>
          )}

          {dashboardWarnings.map((warning) => (
              <NoticeCard key={warning} tone="info" title="Department setup notice">
                {warning}
              </NoticeCard>
          ))}

          {teamPermissionMessage && (
              <NoticeCard tone="info" title="Team management is limited">
                {teamPermissionMessage ||
                    'Team management is not available for your position. You can still view department summary, review workflows, and reports.'}
              </NoticeCard>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
                icon="people"
                title="Active Employees"
                value={formatNumber(activeEmployees)}
                description={`${formatNumber(dashboard?.currentDepartmentEmployeeCount)} current assignment(s)`}
                action="View employees"
                onClick={() => document.getElementById('department-employees')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <MetricCard
                icon="building"
                title="Teams"
                value={formatNumber(teams.length)}
                description={`${formatNumber(activeTeams)} active team(s)`}
                action="View teams"
                onClick={() => document.getElementById('department-teams')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <MetricCard
                icon="clipboard"
                title="Reviews Pending"
                value={formatNumber(reviewQueueCount)}
                description={reviewQueueCount > 0 ? 'Need Department Head review' : 'No reviews waiting'}
                action="Open review work"
                onClick={() => navigate('/department-head/assessment-scores')}
            />
            <MetricCard
                icon="target"
                title="Coverage Health"
                value={formatPercent(coverageHealth)}
                description={`${formatNumber(totalAssignedMembers)} assigned team member(s)`}
                action="Check coverage"
                onClick={() => document.getElementById('department-teams')?.scrollIntoView({ behavior: 'smooth' })}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Panel
                title="Review Work"
                description="Department Head approval and review workflows that may need attention."
                action={
                  <button
                      type="button"
                      onClick={() => navigate('/department-head/assessment-scores')}
                      className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100"
                  >
                    Open Review
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </button>
                }
            >
              <div className="grid gap-3">
                <FocusRow
                    icon="clipboard"
                    title="Self-Assessment Review"
                    value={reviewQueueCount > 0 ? `${reviewQueueCount} waiting` : 'All caught up'}
                    detail="Manager-signed self-assessments and employee review records."
                    status={reviewQueueCount > 0 ? 'Action needed' : 'Clear'}
                    onClick={() => navigate('/department-head/assessment-scores')}
                />
                <FocusRow
                    icon="document"
                    title="Team Appraisals"
                    value="No open cycle"
                    detail="Department appraisal forms and manager submission status."
                    status="Idle"
                    onClick={() => navigate('/department-head/appraisals')}
                />
                <FocusRow
                    icon="barChart"
                    title="Reports"
                    value="Ready to view"
                    detail="Department performance, KPI, feedback, and assessment reports."
                    status="Available"
                    onClick={() => navigate('/department-head/reports')}
                />
              </div>
            </Panel>

            <Panel title="Department Focus" description="Operational status at a glance.">
              <div className="flex flex-col gap-3">
                <StatusRow
                    icon="building"
                    title="Team management"
                    value={teamManagementAvailable ? 'Available' : 'Limited'}
                    detail={
                      teamManagementAvailable
                          ? 'You can create and update department teams.'
                          : 'Dashboard view remains available without team-management actions.'
                    }
                />
                <StatusRow
                    icon="target"
                    title="Team readiness"
                    value={teamRows.length ? formatPercent(teamReadiness) : 'No team data'}
                    detail={topTeam ? `Top team: ${topTeam.team.teamName}` : 'Teams will appear after setup.'}
                />
                <StatusRow
                    icon="feedback"
                    title="Recent activity"
                    value={recentActivities.length ? `${recentActivities.length} update(s)` : 'No recent updates'}
                    detail="Department updates and review activity from the dashboard feed."
                />
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Panel
                id="department-teams"
                title="Team Overview"
                description="Department team coverage, leaders, members, and readiness."
                action={
                  teamManagementAvailable ? (
                      <button
                          type="button"
                          onClick={openCreate}
                          disabled={candidateLoading}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                        {candidateLoading ? 'Checking access...' : 'Create Team'}
                      </button>
                  ) : null
                }
            >
              {teams.length === 0 ? (
                  <EmptyState
                      icon="building"
                      title="No teams found"
                      description="Team records will appear here when they are created by an authorized role."
                  />
              ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3">Team</th>
                        <th className="whitespace-nowrap px-4 py-3">Leader</th>
                        <th className="whitespace-nowrap px-4 py-3">Members</th>
                        <th className="whitespace-nowrap px-4 py-3">Readiness</th>
                        <th className="whitespace-nowrap px-4 py-3">Status</th>
                        {teamManagementAvailable && <th className="whitespace-nowrap px-4 py-3">Action</th>}
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                      {teamRows.map((row) => (
                          <TeamOverviewRow
                              key={row.team.id}
                              row={row}
                              canEdit={teamManagementAvailable}
                              onEdit={() => openEdit(row.team)}
                          />
                      ))}
                      </tbody>
                    </table>
                  </div>
              )}
            </Panel>

            <Panel title="Recent Department Activity" description="Latest visible department updates.">
              {recentActivities.length === 0 ? (
                  <EmptyState
                      icon="activity"
                      title="No recent activity"
                      description="Self-assessment, appraisal, team, and report updates will appear here."
                  />
              ) : (
                  <div className="flex flex-col divide-y divide-slate-100">
                    {recentActivities.map((activity, index) => (
                        <ActivityRow key={`${activity.title}-${activity.time}-${index}`} activity={activity} />
                    ))}
                  </div>
              )}
            </Panel>
          </section>

          <Panel
              id="department-employees"
              title="Employee Overview"
              description="Employees currently visible under this department."
          >
            {employees.length === 0 ? (
                <EmptyState
                    icon="user"
                    title="No employees found"
                    description="If an employee exists in Admin but does not appear here, check the department assignment and linked login user."
                />
            ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Name</th>
                      <th className="whitespace-nowrap px-4 py-3">Email</th>
                      <th className="whitespace-nowrap px-4 py-3">Position</th>
                      <th className="whitespace-nowrap px-4 py-3">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                    {employees.slice(0, 8).map((employee) => (
                        <tr key={employee.id} className="align-top">
                          <td className="min-w-[220px] px-4 py-4">
                            <ProfileNameCell
                                person={{
                                  ...employee,
                                  userId: employee.userId ?? employee.id,
                                  fullName: getEmployeeName(employee),
                                }}
                                subtitle={employee.email || employee.positionTitle || employee.positionName || undefined}
                            />
                          </td>
                          <td className="min-w-[220px] px-4 py-4 font-semibold text-slate-600">
                            {employee.email || '-'}
                          </td>
                          <td className="min-w-[180px] px-4 py-4 font-semibold text-slate-700">
                            {employee.positionTitle || employee.positionName || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill tone={employee.active === false ? 'muted' : 'success'}>
                              {employee.active === false ? 'Inactive' : 'Active'}
                            </StatusPill>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                  {employees.length > 8 && (
                      <p className="px-4 py-3 text-sm font-semibold text-slate-500">
                        Showing 8 of {employees.length} employees.
                      </p>
                  )}
                </div>
            )}
          </Panel>
        </div>

        {showTeamForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
              <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {editingTeam ? `Edit Team: ${editingTeam.teamName}` : 'Create Team'}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Manage team leader, status, goal, and member assignments.
                    </p>
                  </div>
                  <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close team form"
                  >
                    <Icon name="close" className="h-5 w-5" />
                  </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                  {formMessage && (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                        {formMessage}
                      </div>
                  )}

                  <form id="department-head-team-form" className="grid gap-4" onSubmit={handleSubmitTeam}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Team Name" required>
                        <input
                            className={formControlClass}
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            required
                        />
                      </FormField>

                      <FormField label="Department">
                        <input className={`${formControlClass} bg-slate-50`} value={departmentName} disabled />
                      </FormField>
                    </div>

                    <FormField label="Team Leader" required>
                      <select
                          className={formControlClass}
                          value={teamLeaderId}
                          onChange={(event) => setTeamLeaderId(event.target.value ? Number(event.target.value) : '')}
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
                                    ? ` — already in ${leader.currentTeamName || 'another team'}`
                                    : isCurrentLeader
                                        ? ' — current leader'
                                        : ''}
                              </option>
                          );
                        })}
                      </select>
                    </FormField>

                    <FormField label="Team Goal">
                  <textarea
                      className={`${formControlClass} min-h-24 resize-y`}
                      value={teamGoal}
                      onChange={(event) => setTeamGoal(event.target.value)}
                  />
                    </FormField>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Status">
                        <select
                            className={formControlClass}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </FormField>

                      {editingTeam && (
                          <FormField label="Update Reason" required>
                      <textarea
                          className={`${formControlClass} min-h-24 resize-y`}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Example: Team structure updated after member reassignment."
                          required
                      />
                          </FormField>
                      )}
                    </div>

                    <FormField label="Members" required>
                      <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        {members.length === 0 ? (
                            <p className="px-3 py-4 text-sm font-semibold text-slate-500">
                              No available member candidates were returned.
                            </p>
                        ) : (
                            members.map((member) => {
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
                                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                          disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-white'
                                      }`}
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
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                        checked={selected}
                                        disabled={disabled}
                                        onChange={() => toggleMember(member.id)}
                                    />
                                    <span className="min-w-0">
                              {getCandidateName(member)}
                                      {alreadyInTeam ? ` — already in ${member.currentTeamName || 'another team'}` : ''}
                                      {isExisting ? ' — current member' : ''}
                                      {isLeader ? ' — selected as team leader' : ''}
                            </span>
                                  </label>
                              );
                            })
                        )}
                      </div>
                    </FormField>
                  </form>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                  <button
                      type="button"
                      onClick={closeForm}
                      disabled={saving}
                      className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                      className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

const ContextPill = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <Icon name={icon} className="h-5 w-5" />
      </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="truncate text-sm font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
);

const MetricCard = ({
                      icon,
                      title,
                      value,
                      description,
                      action,
                      onClick,
                    }: {
  icon: IconName;
  title: string;
  value: string;
  description: string;
  action: string;
  onClick: () => void;
}) => (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      </div>
      <button
          type="button"
          onClick={onClick}
          className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
      >
        {action}
        <Icon name="arrowRight" className="h-4 w-4" />
      </button>
    </article>
);

const Panel = ({
                 id,
                 title,
                 description,
                 action,
                 children,
               }: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
    <section id={id} className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
);

const FocusRow = ({
                    icon,
                    title,
                    value,
                    detail,
                    status,
                    onClick,
                  }: {
  icon: IconName;
  title: string;
  value: string;
  detail: string;
  status: string;
  onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
    >
      <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200">
        <Icon name={icon} className="h-5 w-5" />
      </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <h3 className="min-w-0 truncate text-sm font-black text-slate-950">{title}</h3>
            <StatusPill tone={status === 'Idle' ? 'muted' : 'info'}>{status}</StatusPill>
          </div>
          <p className="mt-1 truncate text-base font-black text-slate-950">{value}</p>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">{detail}</p>
        </div>
        <Icon name="chevronRight" className="h-5 w-5 shrink-0 text-blue-600" />
      </div>
    </button>
);

const StatusRow = ({
                     icon,
                     title,
                     value,
                     detail,
                   }: {
  icon: IconName;
  title: string;
  value: string;
  detail: string;
}) => (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
      <Icon name={icon} className="h-5 w-5" />
    </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="truncate text-sm font-black text-slate-950">{title}</p>
          <p className="shrink-0 text-sm font-black text-slate-950">{value}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
      </div>
    </div>
);

const TeamOverviewRow = ({
                           row,
                           canEdit,
                           onEdit,
                         }: {
  row: TeamPerformance;
  canEdit: boolean;
  onEdit: () => void;
}) => (
    <tr className="align-top transition hover:bg-slate-50">
      <td className="min-w-[220px] px-4 py-4">
        <p className="font-black text-slate-950">{row.team.teamName || 'Unnamed Team'}</p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
          {row.team.teamGoal || 'No team goal set'}
        </p>
      </td>
      <td className="min-w-[220px] px-4 py-4">
        {row.team.teamLeaderId ? (
            <ProfileNameCell
                person={{ userId: row.team.teamLeaderId, fullName: row.team.teamLeaderName }}
                subtitle="Team Leader"
            />
        ) : (
            <span className="text-sm font-semibold text-slate-400">No leader assigned</span>
        )}
      </td>
      <td className="px-4 py-4 font-black text-slate-700">{row.memberCount}</td>
      <td className="min-w-[180px] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${clamp(row.score)}%` }} />
          </div>
          <span className="text-sm font-black text-slate-700">{formatPercent(row.score)}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusPill tone={row.active ? 'success' : 'muted'}>{row.team.status || '-'}</StatusPill>
      </td>
      {canEdit && (
          <td className="px-4 py-4">
            <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Icon name="edit" className="h-4 w-4" />
              Edit
            </button>
          </td>
      )}
    </tr>
);

const ActivityRow = ({ activity }: { activity: ActivityItem }) => (
    <div className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
      <Icon name="activity" className="h-5 w-5" />
    </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-black text-slate-950">{activity.title}</p>
          <span className="shrink-0 text-xs font-bold text-slate-400">{activity.time}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{activity.detail}</p>
      </div>
    </div>
);

const EmptyState = ({ icon, title, description }: { icon: IconName; title: string; description: string }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <Icon name={icon} className="h-5 w-5" />
      </span>
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
);

const NoticeCard = ({
                      tone,
                      title,
                      actionLabel,
                      onAction,
                      children,
                    }: {
  tone: 'info' | 'danger';
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) => {
  const toneClass =
      tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
      <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${toneClass}`}>
        <div className="flex min-w-0 items-start gap-3">
          <Icon name={tone === 'danger' ? 'info' : 'shield'} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-sm font-semibold leading-6 opacity-90">{children}</p>
          </div>
        </div>
        {actionLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                className="shrink-0 rounded-xl bg-white/80 px-4 py-2 text-sm font-black shadow-sm ring-1 ring-inset ring-current/10 transition hover:bg-white"
            >
              {actionLabel}
            </button>
        )}
      </div>
  );
};

const StatusPill = ({ tone, children }: { tone: 'success' | 'info' | 'muted'; children: ReactNode }) => {
  const toneClass = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    info: 'bg-blue-50 text-blue-700 ring-blue-100',
    muted: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[tone];

  return (
      <span className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-black leading-none ring-1 ${toneClass}`}>
      {children}
    </span>
  );
};

const FormField = ({
                     label,
                     required,
                     children,
                   }: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) => (
    <label className="grid gap-2 text-sm font-black text-slate-700">
    <span>
      {label} {required && <span className="text-red-500">*</span>}
    </span>
      {children}
    </label>
);

export default DepartmentHeadDashboard;
