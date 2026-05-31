import { useEffect, useMemo, useState } from 'react';
import ProfileAvatar from '../../components/ProfileAvatar';
import {
  fetchDepartmentHeadEmployees,
  fetchDepartmentHeadTeams,
  type DepartmentHeadEmployee,
  type DepartmentHeadTeam,
} from '../../services/departmentHeadService';
import './department-employee-lists.css';

type DepartmentPersonRole = 'EMPLOYEE' | 'TEAM_LEADER' | 'MANAGER';
type RoleFilter = 'ALL' | DepartmentPersonRole;

type DepartmentPersonRow = DepartmentHeadEmployee & {
  displayName: string;
  displayRole: DepartmentPersonRole;
  teamNames: string[];
};

const roleLabels: Record<DepartmentPersonRole, string> = {
  EMPLOYEE: 'Employee',
  TEAM_LEADER: 'Team Leader',
  MANAGER: 'Manager',
};

const normalize = (...values: Array<unknown>) =>
  values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value))
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const displayNameOf = (employee: DepartmentHeadEmployee) => {
  const fullName = String(employee.fullName ?? '').trim();
  if (fullName) return fullName;

  const firstName = String(employee.firstName ?? '').trim();
  const lastName = String(employee.lastName ?? '').trim();
  const name = `${firstName} ${lastName}`.trim();
  if (name) return name;

  return String(employee.email ?? employee.employeeCode ?? `Employee #${employee.id ?? '-'}`).trim();
};

const classifyRole = (
  employee: DepartmentHeadEmployee,
  teamLeaderUserIds: Set<number>,
  projectManagerUserIds: Set<number>,
): DepartmentPersonRole | null => {
  const userId = Number(employee.userId ?? 0);
  const positionText = normalize(
    employee.positionRoleName,
    employee.positionTitle,
    employee.positionName,
    employee.dashboard,
  );

  if (
    positionText.includes('DEPARTMENT HEAD') ||
    positionText.includes('DEPARTMENTHEAD') ||
    positionText.includes('HEAD OF DEPARTMENT') ||
    positionText.includes('CEO') ||
    positionText.includes('EXECUTIVE') ||
    positionText.includes('HRADMIN') ||
    positionText.includes('HR ADMIN') ||
    positionText === 'HR' ||
    positionText.includes(' HR ')
  ) {
    return null;
  }

  if (userId > 0 && teamLeaderUserIds.has(userId)) {
    return 'TEAM_LEADER';
  }

  if (positionText.includes('TEAM LEADER') || positionText.includes('TEAM LEAD')) {
    return 'TEAM_LEADER';
  }

  if (userId > 0 && projectManagerUserIds.has(userId)) {
    return 'MANAGER';
  }

  if (
    positionText.includes('PROJECT MANAGER') ||
    positionText.includes('TEAM MANAGER') ||
    positionText.includes('MANAGER') ||
    positionText.includes('PM DASHBOARD')
  ) {
    return 'MANAGER';
  }

  return 'EMPLOYEE';
};

const buildTeamNameMap = (teams: DepartmentHeadTeam[]) => {
  const map = new Map<number, Set<string>>();

  const add = (userId: number | undefined | null, teamName: string | undefined) => {
    if (!userId || !teamName) return;

    const current = map.get(userId) ?? new Set<string>();
    current.add(teamName);
    map.set(userId, current);
  };

  teams.forEach((team) => {
    if (!team || team.status?.toLowerCase() === 'inactive') return;

    add(team.teamLeaderId, team.teamName);
    add(team.projectManagerId, team.teamName);
    team.members?.forEach((member) => add(member.userId ?? member.employeeId, team.teamName));
  });

  return map;
};

const formatDepartment = (employee: DepartmentHeadEmployee) =>
  String(employee.workingDepartment ?? employee.currentDepartment ?? employee.parentDepartment ?? '-');

const firstText = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
};

const profileImageDataOf = (employee: DepartmentHeadEmployee) =>
  firstText(
    employee.profileImageData,
    employee.profile_image_data,
    employee.avatarData,
    employee.profilePictureData,
    employee.profilePicture,
  );

const profileImageTypeOf = (employee: DepartmentHeadEmployee) =>
  firstText(
    employee.profileImageType,
    employee.profile_image_type,
    employee.avatarType,
    employee.profilePictureType,
  );

const DepartmentEmployeeListsPage = () => {
  const [employees, setEmployees] = useState<DepartmentHeadEmployee[]>([]);
  const [teams, setTeams] = useState<DepartmentHeadTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [employeeList, teamList] = await Promise.all([
          fetchDepartmentHeadEmployees(includeInactive),
          fetchDepartmentHeadTeams(),
        ]);

        if (!cancelled) {
          setEmployees(employeeList);
          setTeams(teamList);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load department employee list.',
          );
          setEmployees([]);
          setTeams([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [includeInactive]);

  const rows = useMemo<DepartmentPersonRow[]>(() => {
    const teamLeaderUserIds = new Set<number>();
    const projectManagerUserIds = new Set<number>();

    teams.forEach((team) => {
      if (!team || team.status?.toLowerCase() === 'inactive') return;
      if (team.teamLeaderId) teamLeaderUserIds.add(team.teamLeaderId);
      if (team.projectManagerId) projectManagerUserIds.add(team.projectManagerId);
    });

    const teamNameMap = buildTeamNameMap(teams);

    return employees
      .map((employee) => {
        const displayRole = classifyRole(employee, teamLeaderUserIds, projectManagerUserIds);

        if (!displayRole) {
          return null;
        }

        const userId = Number(employee.userId ?? 0);

        return {
          ...employee,
          displayName: displayNameOf(employee),
          displayRole,
          teamNames: userId > 0 ? Array.from(teamNameMap.get(userId) ?? []) : [],
        };
      })
      .filter((employee): employee is DepartmentPersonRow => Boolean(employee))
      .sort((left, right) => {
        const roleOrder = { MANAGER: 1, TEAM_LEADER: 2, EMPLOYEE: 3 } as const;
        const roleCompare = roleOrder[left.displayRole] - roleOrder[right.displayRole];
        if (roleCompare !== 0) return roleCompare;
        return left.displayName.localeCompare(right.displayName);
      });
  }, [employees, teams]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((employee) => {
      if (roleFilter !== 'ALL' && employee.displayRole !== roleFilter) {
        return false;
      }

      if (!keyword) return true;

      const haystack = [
        employee.displayName,
        employee.employeeCode,
        employee.email,
        employee.phoneNumber,
        employee.positionTitle,
        employee.positionName,
        employee.positionRoleName,
        employee.positionLevelCode,
        employee.workingDepartment,
        employee.currentDepartment,
        employee.managerName,
        employee.teamNames.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [rows, roleFilter, search]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      managers: rows.filter((employee) => employee.displayRole === 'MANAGER').length,
      teamLeaders: rows.filter((employee) => employee.displayRole === 'TEAM_LEADER').length,
      employees: rows.filter((employee) => employee.displayRole === 'EMPLOYEE').length,
    }),
    [rows],
  );

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setIncludeInactive(false);
  };

  return (
    <section className="dept-employee-list-page">
      <div className="dept-employee-list-hero">
        <div>
          <p className="dept-employee-list-eyebrow">Department Head</p>
          <h1>Department Employee Lists</h1>
          <p>
            View employees, team leaders, and managers assigned to your department.
          </p>
        </div>
        <div className="dept-employee-list-hero-icon" aria-hidden="true">
          <i className="bi bi-people" />
        </div>
      </div>

      <div className="dept-employee-list-summary-grid">
        <article className="dept-employee-list-summary-card">
          <span>Total People</span>
          <strong>{counts.total}</strong>
        </article>
        <article className="dept-employee-list-summary-card">
          <span>Managers</span>
          <strong>{counts.managers}</strong>
        </article>
        <article className="dept-employee-list-summary-card">
          <span>Team Leaders</span>
          <strong>{counts.teamLeaders}</strong>
        </article>
        <article className="dept-employee-list-summary-card">
          <span>Employees</span>
          <strong>{counts.employees}</strong>
        </article>
      </div>

      <div className="dept-employee-list-panel">
        <div className="dept-employee-list-toolbar">
          <label className="dept-employee-list-search">
            <span>Search</span>
            <div>
              <i className="bi bi-search" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, position, employee code..."
              />
            </div>
          </label>

          <label className="dept-employee-list-filter">
            <span>Role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            >
              <option value="ALL">All roles</option>
              <option value="MANAGER">Managers</option>
              <option value="TEAM_LEADER">Team Leaders</option>
              <option value="EMPLOYEE">Employees</option>
            </select>
          </label>

          <label className="dept-employee-list-filter">
            <span>Status</span>
            <select
              value={includeInactive ? 'ALL' : 'ACTIVE'}
              onChange={(event) => setIncludeInactive(event.target.value === 'ALL')}
            >
              <option value="ACTIVE">Active only</option>
              <option value="ALL">All status</option>
            </select>
          </label>

          <button type="button" className="dept-employee-list-clear" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {error && (
          <div className="dept-employee-list-alert" role="alert">
            <i className="bi bi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        )}

        <div className="dept-employee-list-table-wrap">
          <table className="dept-employee-list-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Position</th>
                <th>Department</th>
                <th>Team</th>
                <th>Manager</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dept-employee-list-empty">Loading department employees...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dept-employee-list-empty">
                      No employee, team leader, or manager matched this filter.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((employee) => (
                  <tr key={`${employee.id ?? 'employee'}-${employee.userId ?? employee.email}`}>
                    <td>
                      <div className="dept-employee-list-person">
                        <ProfileAvatar
                          userId={employee.userId ?? employee.id}
                          fullName={employee.displayName}
                          firstName={employee.firstName}
                          lastName={employee.lastName}
                          email={employee.email}
                          profileImageData={profileImageDataOf(employee)}
                          profileImageType={profileImageTypeOf(employee)}
                          size="md"
                          className="dept-employee-list-profile-avatar"
                        />
                        <div>
                          <strong>{employee.displayName}</strong>
                          <span>{employee.employeeCode || employee.email || '-'}</span>
                          {employee.employeeCode && employee.email && <small>{employee.email}</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`dept-employee-list-role ${employee.displayRole.toLowerCase()}`}>
                        {roleLabels[employee.displayRole]}
                      </span>
                    </td>
                    <td>
                      <strong>{employee.positionTitle ?? employee.positionName ?? '-'}</strong>
                      {employee.positionLevelCode && <span>{employee.positionLevelCode}</span>}
                    </td>
                    <td>{formatDepartment(employee)}</td>
                    <td>
                      {employee.teamNames.length > 0 ? (
                        <div className="dept-employee-list-team-stack">
                          {employee.teamNames.map((teamName) => (
                            <span key={teamName}>{teamName}</span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{employee.managerName ?? '-'}</td>
                    <td>
                      <span className={`dept-employee-list-status ${employee.active === false ? 'inactive' : 'active'}`}>
                        {employee.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default DepartmentEmployeeListsPage;
