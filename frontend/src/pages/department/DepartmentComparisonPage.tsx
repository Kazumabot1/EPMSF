import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatPersonWithPosition,
  getDepartmentComparisonDetail,
  isDepartmentActive,
  isTeamActive,
  searchDepartmentComparison,
  type DepartmentComparisonDetail,
  type DepartmentComparisonEmployee,
  type DepartmentComparisonSummary,
  type DepartmentComparisonTeam,
} from '../../services/departmentComparisonService';
import { exportToExcel, todayStr } from '../../utils/exportExcel';
import './department-comparison.css';

type Side = 'left' | 'right';

type DepartmentPerformance = {
  department: DepartmentComparisonDetail;
  score: number;
  teamCoverage: number;
  activeTeamRate: number;
  totalEmployees: number;
  currentEmployees: number;
  parentEmployees: number;
  teamCount: number;
  activeTeams: number;
  teamMembers: number;
};

const display = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
};

const numberValue = (value?: number | null) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const formatNumber = (value?: number | null) => numberValue(value).toLocaleString();

const formatPercent = (value?: number | null) => `${numberValue(value).toFixed(0)}%`;

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const getTeamMemberCount = (department: DepartmentComparisonDetail) =>
  (department.teams ?? []).reduce((sum, team) => sum + numberValue(team.employeeCount), 0);

const getActiveTeamCount = (department: DepartmentComparisonDetail) =>
  (department.teams ?? []).filter((team) => isTeamActive(team.status)).length;

const getDepartmentPerformance = (
  department: DepartmentComparisonDetail,
  allDepartments: DepartmentComparisonDetail[],
): DepartmentPerformance => {
  const totalEmployees = numberValue(department.totalEmployeeCount);
  const currentEmployees = numberValue(department.currentDepartmentEmployeeCount);
  const parentEmployees = numberValue(department.parentDepartmentEmployeeCount);
  const teamCount = numberValue(department.teamCount ?? department.teams?.length ?? 0);
  const activeTeams = getActiveTeamCount(department);
  const teamMembers = getTeamMemberCount(department);
  const maxEmployees = Math.max(
    ...allDepartments.map((item) => numberValue(item.totalEmployeeCount)),
    1,
  );
  const maxTeams = Math.max(
    ...allDepartments.map((item) => numberValue(item.teamCount ?? item.teams?.length)),
    1,
  );

  const employeeWeight = totalEmployees > 0 ? (totalEmployees / maxEmployees) * 32 : 0;
  const teamWeight = teamCount > 0 ? (teamCount / maxTeams) * 24 : 0;
  const activeTeamWeight = teamCount > 0 ? (activeTeams / teamCount) * 22 : 0;
  const coverageWeight = totalEmployees > 0 ? Math.min(teamMembers / totalEmployees, 1) * 22 : 0;
  const rawScore = employeeWeight + teamWeight + activeTeamWeight + coverageWeight;
  const score = isDepartmentActive(department.status) ? rawScore : Math.min(rawScore, 42);
  const teamCoverage = totalEmployees > 0 ? clamp((teamMembers / totalEmployees) * 100) : 0;
  const activeTeamRate = teamCount > 0 ? clamp((activeTeams / teamCount) * 100) : 0;

  return {
    department,
    score: Math.round(clamp(score)),
    teamCoverage: Math.round(teamCoverage),
    activeTeamRate: Math.round(activeTeamRate),
    totalEmployees,
    currentEmployees,
    parentEmployees,
    teamCount,
    activeTeams,
    teamMembers,
  };
};

const DepartmentComparisonPage = () => {
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<DepartmentComparisonSummary[]>([]);
  const [departmentDetails, setDepartmentDetails] = useState<DepartmentComparisonDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [leftDepartment, setLeftDepartment] = useState<DepartmentComparisonDetail | null>(null);
  const [rightDepartment, setRightDepartment] = useState<DepartmentComparisonDetail | null>(null);

  const [modalDepartment, setModalDepartment] = useState<DepartmentComparisonDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const departmentDetailMap = useMemo(() => {
    return new Map(departmentDetails.map((department) => [department.id, department]));
  }, [departmentDetails]);

  const performanceRows = useMemo(() => {
    return departmentDetails
      .map((department) => getDepartmentPerformance(department, departmentDetails))
      .sort((first, second) => second.score - first.score);
  }, [departmentDetails]);

  const overview = useMemo(() => {
    const activeDepartments = departmentDetails.filter((department) =>
      isDepartmentActive(department.status),
    ).length;
    const totalEmployees = departmentDetails.reduce(
      (sum, department) => sum + numberValue(department.totalEmployeeCount),
      0,
    );
    const currentEmployees = departmentDetails.reduce(
      (sum, department) => sum + numberValue(department.currentDepartmentEmployeeCount),
      0,
    );
    const totalTeams = departmentDetails.reduce(
      (sum, department) => sum + numberValue(department.teamCount ?? department.teams?.length),
      0,
    );
    const activeTeams = departmentDetails.reduce(
      (sum, department) => sum + getActiveTeamCount(department),
      0,
    );
    const totalTeamMembers = departmentDetails.reduce(
      (sum, department) => sum + getTeamMemberCount(department),
      0,
    );
    const averageScore = performanceRows.length
      ? performanceRows.reduce((sum, row) => sum + row.score, 0) / performanceRows.length
      : 0;
    const teamCoverage = totalEmployees > 0 ? clamp((totalTeamMembers / totalEmployees) * 100) : 0;
    const bestDepartment = performanceRows[0];
    const largestDepartment = [...performanceRows].sort(
      (first, second) => second.totalEmployees - first.totalEmployees,
    )[0];
    const strongestCoverage = [...performanceRows].sort(
      (first, second) => second.teamCoverage - first.teamCoverage,
    )[0];

    return {
      activeDepartments,
      totalDepartments: departmentDetails.length,
      totalEmployees,
      currentEmployees,
      totalTeams,
      activeTeams,
      averageScore,
      teamCoverage,
      bestDepartment,
      largestDepartment,
      strongestCoverage,
    };
  }, [departmentDetails, performanceRows]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setDetailLoading(true);

    try {
      const data = await searchDepartmentComparison(search.trim());
      setDepartments(data);

      const detailResults = await Promise.allSettled(
        data.map((department) => getDepartmentComparisonDetail(department.id)),
      );

      const details = detailResults
        .filter(
          (result): result is PromiseFulfilledResult<DepartmentComparisonDetail> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value);

      setDepartmentDetails(details);
    } catch {
      setDepartments([]);
      setDepartmentDetails([]);
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const remainingDepartments = useMemo(() => {
    const selectedIds = new Set<number>();

    if (leftDepartment) {
      selectedIds.add(leftDepartment.id);
    }

    if (rightDepartment) {
      selectedIds.add(rightDepartment.id);
    }

    return departments.filter((department) => !selectedIds.has(department.id));
  }, [departments, leftDepartment, rightDepartment]);

  const resolveDepartmentDetail = async (
    department: DepartmentComparisonSummary | DepartmentComparisonDetail,
  ) => {
    if ('teams' in department) {
      return department;
    }

    const existing = departmentDetailMap.get(department.id);
    if (existing) {
      return existing;
    }

    return getDepartmentComparisonDetail(department.id);
  };

  const openDepartmentModal = async (departmentId: number) => {
    const existing = departmentDetailMap.get(departmentId);

    if (existing) {
      setModalDepartment(existing);
      return;
    }

    setModalLoading(true);

    try {
      const detail = await getDepartmentComparisonDetail(departmentId);
      setModalDepartment(detail);
    } catch {
      alert('Failed to load department detail.');
    } finally {
      setModalLoading(false);
    }
  };

  const addDepartmentToSide = async (
    department: DepartmentComparisonSummary | DepartmentComparisonDetail,
    side: Side,
  ) => {
    const otherSide = side === 'left' ? rightDepartment : leftDepartment;

    if (otherSide?.id === department.id) {
      alert('Please select a different department for comparison.');
      return;
    }

    try {
      const detail = await resolveDepartmentDetail(department);

      if (side === 'left') {
        setLeftDepartment(detail);
      } else {
        setRightDepartment(detail);
      }

      setModalDepartment(null);
    } catch {
      alert('Failed to add department.');
    }
  };

  const clearSide = (side: Side) => {
    if (side === 'left') {
      setLeftDepartment(null);
    } else {
      setRightDepartment(null);
    }
  };

  const exportDepartmentComparison = () => {
    const rows = performanceRows.map((row, index) => ({
      no: index + 1,
      departmentName: row.department.departmentName,
      departmentCode: row.department.departmentCode ?? '',
      status: isDepartmentActive(row.department.status) ? 'Active' : 'Inactive',
      performanceScore: `${row.score}%`,
      totalEmployees: row.totalEmployees,
      currentDepartmentEmployees: row.currentEmployees,
      parentDepartmentEmployees: row.parentEmployees,
      teams: row.teamCount,
      activeTeams: row.activeTeams,
      teamMembers: row.teamMembers,
      teamCoverage: `${row.teamCoverage}%`,
      activeTeamRate: `${row.activeTeamRate}%`,
      createdAt: formatDate(row.department.createdAt),
      createdBy: row.department.createdBy ?? '',
    }));

    exportToExcel(
      rows,
      [
        { header: 'No.', key: 'no' },
        { header: 'Department Name', key: 'departmentName' },
        { header: 'Department Code', key: 'departmentCode' },
        { header: 'Status', key: 'status' },
        { header: 'Performance Score', key: 'performanceScore' },
        { header: 'Total Employees', key: 'totalEmployees' },
        { header: 'Current Department Employees', key: 'currentDepartmentEmployees' },
        { header: 'Parent Department Employees', key: 'parentDepartmentEmployees' },
        { header: 'Teams', key: 'teams' },
        { header: 'Active Teams', key: 'activeTeams' },
        { header: 'Team Members', key: 'teamMembers' },
        { header: 'Team Coverage', key: 'teamCoverage' },
        { header: 'Active Team Rate', key: 'activeTeamRate' },
        { header: 'Created At', key: 'createdAt' },
        { header: 'Created By', key: 'createdBy' },
      ],
      `department-comparison-${todayStr()}`,
    );
  };

  const exportSelectedDepartmentComparison = () => {
    if (!leftDepartment || !rightDepartment) {
      return;
    }

    const selectedRows = [
      { side: 'Left', row: getDepartmentPerformance(leftDepartment, departmentDetails) },
      { side: 'Right', row: getDepartmentPerformance(rightDepartment, departmentDetails) },
    ].map(({ side, row }, index) => ({
      no: index + 1,
      compareSide: side,
      departmentName: row.department.departmentName,
      departmentCode: row.department.departmentCode ?? '',
      status: isDepartmentActive(row.department.status) ? 'Active' : 'Inactive',
      performanceScore: `${row.score}%`,
      totalEmployees: row.totalEmployees,
      currentDepartmentEmployees: row.currentEmployees,
      parentDepartmentEmployees: row.parentEmployees,
      teams: row.teamCount,
      activeTeams: row.activeTeams,
      teamMembers: row.teamMembers,
      teamCoverage: `${row.teamCoverage}%`,
      activeTeamRate: `${row.activeTeamRate}%`,
      createdAt: formatDate(row.department.createdAt),
      createdBy: row.department.createdBy ?? '',
    }));

    exportToExcel(
      selectedRows,
      [
        { header: 'No.', key: 'no' },
        { header: 'Compare Side', key: 'compareSide' },
        { header: 'Department Name', key: 'departmentName' },
        { header: 'Department Code', key: 'departmentCode' },
        { header: 'Status', key: 'status' },
        { header: 'Performance Score', key: 'performanceScore' },
        { header: 'Total Employees', key: 'totalEmployees' },
        { header: 'Current Department Employees', key: 'currentDepartmentEmployees' },
        { header: 'Parent Department Employees', key: 'parentDepartmentEmployees' },
        { header: 'Teams', key: 'teams' },
        { header: 'Active Teams', key: 'activeTeams' },
        { header: 'Team Members', key: 'teamMembers' },
        { header: 'Team Coverage', key: 'teamCoverage' },
        { header: 'Active Team Rate', key: 'activeTeamRate' },
        { header: 'Created At', key: 'createdAt' },
        { header: 'Created By', key: 'createdBy' },
      ],
      `selected-department-comparison-${leftDepartment.departmentName}-${rightDepartment.departmentName}-${todayStr()}`
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  return (
    <div className="dept-compare-page">
      <section className="dept-compare-hero">
        <div className="dept-compare-hero-glow one" />
        <div className="dept-compare-hero-glow two" />

        <div className="dept-compare-hero-copy">
          <p className="dept-compare-eyebrow">HR Performance Intelligence</p>
          <h1>Department Overall Performance</h1>
          <p>
            Monitor department strength, workforce coverage, team structure, and side-by-side
            department comparison from your existing department comparison API data.
          </p>
        </div>

        <div className="dept-compare-hero-score">
          <span>Organization Score</span>
          <strong>{formatPercent(overview.averageScore)}</strong>
          <small>{formatNumber(overview.totalDepartments)} department(s) tracked</small>
          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-primary"
            onClick={exportDepartmentComparison}
            disabled={performanceRows.length === 0 || detailLoading}
          >
            Export Excel
          </button>
        </div>
      </section>

      <section className="dept-compare-overview-grid">
        <PerformanceCard
          icon="bi-speedometer2"
          label="Department Performance Score"
          value={detailLoading ? 'Loading...' : formatPercent(overview.averageScore)}
          detail={
            overview.bestDepartment
              ? `Top: ${overview.bestDepartment.department.departmentName}`
              : 'Calculated from department structure'
          }
        />

        <PerformanceCard
          icon="bi-building-check"
          label="Active Departments"
          value={`${formatNumber(overview.activeDepartments)} / ${formatNumber(
            overview.totalDepartments,
          )}`}
          detail={`${formatNumber(overview.currentEmployees)} current employee assignment(s)`}
        />

        <PerformanceCard
          icon="bi-people"
          label="Employee Coverage"
          value={formatNumber(overview.totalEmployees)}
          detail={`${formatPercent(overview.teamCoverage)} mapped into teams`}
        />

        <PerformanceCard
          icon="bi-diagram-3"
          label="Team Network"
          value={formatNumber(overview.totalTeams)}
          detail={`${formatNumber(overview.activeTeams)} active team(s)`}
        />
      </section>

      <section className="dept-compare-insight-grid">
        <div className="dept-compare-ranking-card">
          <div className="dept-compare-section-head">
            <div>
              <h2>Department Ranking</h2>
              <p>Performance score uses employee scale, active teams, and team coverage.</p>
            </div>
            <span>{detailLoading ? 'Refreshing...' : `${performanceRows.length} ranked`}</span>
          </div>

          {performanceRows.length === 0 ? (
            <div className="dept-compare-empty">No department performance data found.</div>
          ) : (
            <div className="dept-compare-ranking-list">
              {performanceRows.slice(0, 8).map((row, index) => (
                <RankingBar key={row.department.id} row={row} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="dept-compare-focus-card">
          <span className="dept-compare-focus-icon">
            <i className="bi bi-stars" />
          </span>
          <h2>Performance Highlights</h2>
          <InsightRow
            label="Best Overall"
            value={overview.bestDepartment?.department.departmentName}
            meta={overview.bestDepartment ? formatPercent(overview.bestDepartment.score) : '—'}
          />
          <InsightRow
            label="Largest Workforce"
            value={overview.largestDepartment?.department.departmentName}
            meta={
              overview.largestDepartment
                ? `${formatNumber(overview.largestDepartment.totalEmployees)} employee(s)`
                : '—'
            }
          />
          <InsightRow
            label="Strongest Team Coverage"
            value={overview.strongestCoverage?.department.departmentName}
            meta={
              overview.strongestCoverage
                ? formatPercent(overview.strongestCoverage.teamCoverage)
                : '—'
            }
          />
          <p className="dept-compare-note">
            Score is calculated from data returned by /api/departments/comparison and
            /api/departments/id/comparison. Add backend KPI averages later if you want real KPI
            score weighting.
          </p>
        </div>
      </section>

      <section className="dept-compare-search-card">
        <label className="dept-compare-search-label" htmlFor="department-search">
          Search departments
        </label>

        <div className="dept-compare-search-row">
          <input
            id="department-search"
            className="dept-compare-search-input"
            type="text"
            placeholder="Search by department name or code..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-primary"
            onClick={loadDepartments}
          >
            Search
          </button>
        </div>
      </section>

      <section className="dept-compare-selected-grid">
        <ComparisonSlot
          title="Left Side"
          department={leftDepartment}
          allDepartments={departmentDetails}
          onClear={() => clearSide('left')}
        />

        <ComparisonSlot
          title="Right Side"
          department={rightDepartment}
          allDepartments={departmentDetails}
          onClear={() => clearSide('right')}
        />
      </section>

      {leftDepartment && rightDepartment ? (
        <section className="dept-compare-vs-grid">
          <DepartmentComparePanel
            department={leftDepartment}
            sideLabel="Left"
            allDepartments={departmentDetails}
          />
          <DepartmentComparePanel
            department={rightDepartment}
            sideLabel="Right"
            allDepartments={departmentDetails}
          />
        </section>
      ) : (
        <section className="dept-compare-help-card">
          {leftDepartment && !rightDepartment
            ? 'Left side is selected. Search or choose another department and add it to the right side.'
            : rightDepartment && !leftDepartment
              ? 'Right side is selected. Search or choose another department and add it to the left side.'
              : 'Select a department for the left side and another department for the right side to compare.'}
        </section>
      )}

      {leftDepartment && rightDepartment && (
        <section className="dept-compare-help-card">
          <div>
            <strong>Compared departments are ready.</strong>
            <p>Export only the selected left and right departments, not the full department list.</p>
          </div>

          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-primary"
            onClick={exportSelectedDepartmentComparison}
          >
            Export Excel for two compare department
          </button>
        </section>
      )}

      <section className="dept-compare-results-card">
        <div className="dept-compare-section-head">
          <div>
            <h2>Departments</h2>
            <p>Click a department row to view full details, or add it directly to a side.</p>
          </div>

          <span>{remainingDepartments.length} result(s)</span>
        </div>

        {loading ? (
          <div className="dept-compare-empty">Loading departments...</div>
        ) : remainingDepartments.length === 0 ? (
          <div className="dept-compare-empty">No departments found.</div>
        ) : (
          <div className="dept-compare-table-wrap">
            <table className="dept-compare-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Department Name</th>
                  <th>Department Code</th>
                  <th>Score</th>
                  <th>Employees</th>
                  <th>Teams</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {remainingDepartments.map((department, index) => {
                  const detail = departmentDetailMap.get(department.id);
                  const performance = detail
                    ? getDepartmentPerformance(detail, departmentDetails)
                    : null;

                  return (
                    <tr
                      key={department.id}
                      onClick={() => openDepartmentModal(department.id)}
                      className="dept-compare-row"
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="dept-compare-name-cell">
                          <span>{department.departmentName}</span>
                          <StatusPill
                            active={isDepartmentActive(department.status)}
                            activeText="Active"
                            inactiveText="Inactive"
                          />
                        </div>
                      </td>

                      <td>{display(department.departmentCode)}</td>
                      <td>{performance ? formatPercent(performance.score) : '—'}</td>
                      <td>{performance ? formatNumber(performance.totalEmployees) : '—'}</td>
                      <td>{performance ? formatNumber(performance.teamCount) : '—'}</td>

                      <td>
                        <div
                          className="dept-compare-actions"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="dept-compare-btn dept-compare-btn-soft"
                            onClick={() => addDepartmentToSide(department, 'left')}
                            disabled={rightDepartment?.id === department.id}
                          >
                            Add Left
                          </button>

                          <button
                            type="button"
                            className="dept-compare-btn dept-compare-btn-soft"
                            onClick={() => addDepartmentToSide(department, 'right')}
                            disabled={leftDepartment?.id === department.id}
                          >
                            Add Right
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalLoading && (
        <div className="dept-compare-modal-overlay">
          <div className="dept-compare-modal">
            <p className="dept-compare-empty">Loading department detail...</p>
          </div>
        </div>
      )}

      {modalDepartment && (
        <DepartmentDetailModal
          department={modalDepartment}
          allDepartments={departmentDetails}
          onClose={() => setModalDepartment(null)}
          onAddLeft={() => addDepartmentToSide(modalDepartment, 'left')}
          onAddRight={() => addDepartmentToSide(modalDepartment, 'right')}
          leftDisabled={rightDepartment?.id === modalDepartment.id}
          rightDisabled={leftDepartment?.id === modalDepartment.id}
        />
      )}
    </div>
  );
};

type PerformanceCardProps = {
  icon: string;
  label: string;
  value: string;
  detail: string;
};

const PerformanceCard = ({ icon, label, value, detail }: PerformanceCardProps) => (
  <div className="dept-compare-performance-card">
    <span className="dept-compare-performance-icon">
      <i className={`bi ${icon}`} />
    </span>
    <p>{label}</p>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
);

const RankingBar = ({ row, rank }: { row: DepartmentPerformance; rank: number }) => (
  <div className="dept-compare-rank-row">
    <div className="dept-compare-rank-head">
      <span>#{rank}</span>
      <strong>{row.department.departmentName}</strong>
      <em>{formatPercent(row.score)}</em>
    </div>

    <div className="dept-compare-rank-track">
      <div className="dept-compare-rank-fill" style={{ width: `${clamp(row.score)}%` }} />
    </div>

    <div className="dept-compare-rank-meta">
      <span>{formatNumber(row.totalEmployees)} employee(s)</span>
      <span>{formatNumber(row.activeTeams)} active team(s)</span>
      <span>{formatPercent(row.teamCoverage)} coverage</span>
    </div>
  </div>
);

const InsightRow = ({
  label,
  value,
  meta,
}: {
  label: string;
  value?: string | null;
  meta: string;
}) => (
  <div className="dept-compare-insight-row">
    <span>{label}</span>
    <strong>{display(value)}</strong>
    <em>{meta}</em>
  </div>
);

type ComparisonSlotProps = {
  title: string;
  department: DepartmentComparisonDetail | null;
  allDepartments: DepartmentComparisonDetail[];
  onClear: () => void;
};

const ComparisonSlot = ({ title, department, allDepartments, onClear }: ComparisonSlotProps) => {
  const performance = department ? getDepartmentPerformance(department, allDepartments) : null;

  return (
    <div className="dept-compare-slot">
      <div className="dept-compare-slot-head">
        <span>{title}</span>

        {department && (
          <button type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {department ? (
        <>
          <h3>{department.departmentName}</h3>
          <p>{display(department.departmentCode)}</p>
          <div className="dept-compare-slot-foot">
            <StatusPill
              active={isDepartmentActive(department.status)}
              activeText="Active"
              inactiveText="Inactive"
            />
            {performance && <strong>{formatPercent(performance.score)} score</strong>}
          </div>
        </>
      ) : (
        <p className="dept-compare-muted">No department selected.</p>
      )}
    </div>
  );
};

type DepartmentComparePanelProps = {
  department: DepartmentComparisonDetail;
  sideLabel: string;
  allDepartments: DepartmentComparisonDetail[];
};

const DepartmentComparePanel = ({
  department,
  sideLabel,
  allDepartments,
}: DepartmentComparePanelProps) => {
  const performance = getDepartmentPerformance(department, allDepartments);

  return (
    <div className="dept-compare-panel">
      <div className="dept-compare-panel-head">
        <span>{sideLabel}</span>
        <h2>{department.departmentName}</h2>
        <StatusPill
          active={isDepartmentActive(department.status)}
          activeText="Active"
          inactiveText="Inactive"
        />
      </div>

      <div className="dept-compare-score-strip">
        <div>
          <span>Performance Score</span>
          <strong>{formatPercent(performance.score)}</strong>
        </div>
        <div>
          <span>Team Coverage</span>
          <strong>{formatPercent(performance.teamCoverage)}</strong>
        </div>
        <div>
          <span>Active Team Rate</span>
          <strong>{formatPercent(performance.activeTeamRate)}</strong>
        </div>
      </div>

      <div className="dept-compare-metric-grid">
        <Metric label="Total Employees" value={performance.totalEmployees} />
        <Metric label="As Current Department" value={performance.currentEmployees} />
        <Metric label="As Parent Department" value={performance.parentEmployees} />
        <Metric label="Teams" value={performance.teamCount} />
      </div>

      <div className="dept-compare-info-list">
        <InfoRow label="Department Code" value={department.departmentCode} />
        <InfoRow label="Created At" value={formatDate(department.createdAt)} />
        <InfoRow label="Created By" value={department.createdBy} />
        <InfoRow label="ID" value={department.id} />
      </div>

      <div className="dept-compare-mini-section">
        <h3>Teams</h3>

        {department.teams && department.teams.length > 0 ? (
          department.teams.map((team) => <TeamCard key={team.id} team={team} compact />)
        ) : (
          <p className="dept-compare-muted">No teams found.</p>
        )}
      </div>

      <div className="dept-compare-mini-section">
        <h3>Employees</h3>

        {department.employees && department.employees.length > 0 ? (
          <EmployeeList employees={department.employees} />
        ) : (
          <p className="dept-compare-muted">No active employees found.</p>
        )}
      </div>
    </div>
  );
};

type DepartmentDetailModalProps = {
  department: DepartmentComparisonDetail;
  allDepartments: DepartmentComparisonDetail[];
  onClose: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  leftDisabled: boolean;
  rightDisabled: boolean;
};

const DepartmentDetailModal = ({
  department,
  allDepartments,
  onClose,
  onAddLeft,
  onAddRight,
  leftDisabled,
  rightDisabled,
}: DepartmentDetailModalProps) => {
  const performance = getDepartmentPerformance(department, allDepartments);

  return (
    <div className="dept-compare-modal-overlay" onClick={onClose}>
      <div className="dept-compare-modal" onClick={(event) => event.stopPropagation()}>
        <div className="dept-compare-modal-head">
          <div>
            <p>Department Details</p>
            <h2>{department.departmentName}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dept-compare-modal-body">
          <div className="dept-compare-score-strip modal-score">
            <div>
              <span>Performance Score</span>
              <strong>{formatPercent(performance.score)}</strong>
            </div>
            <div>
              <span>Team Coverage</span>
              <strong>{formatPercent(performance.teamCoverage)}</strong>
            </div>
            <div>
              <span>Active Team Rate</span>
              <strong>{formatPercent(performance.activeTeamRate)}</strong>
            </div>
          </div>

          <div className="dept-compare-info-list">
            <InfoRow label="Department Name" value={department.departmentName} />
            <InfoRow label="Department Code" value={department.departmentCode} />
            <InfoRow label="Status" value={isDepartmentActive(department.status) ? 'Active' : 'Inactive'} />
            <InfoRow label="Created At" value={formatDate(department.createdAt)} />
            <InfoRow label="Created By" value={department.createdBy} />
            <InfoRow label="ID" value={department.id} />
          </div>

          <div className="dept-compare-metric-grid">
            <Metric label="Total Number of Employee" value={performance.totalEmployees} />
            <Metric label="Number of Employee as Parent" value={performance.parentEmployees} />
            <Metric
              label="Number of Employee as Current Department"
              value={performance.currentEmployees}
            />
            <Metric label="Number of Team" value={performance.teamCount} />
          </div>

          <div className="dept-compare-mini-section">
            <h3>Teams in this department</h3>

            {department.teams && department.teams.length > 0 ? (
              department.teams.map((team) => <TeamCard key={team.id} team={team} />)
            ) : (
              <p className="dept-compare-muted">No teams found.</p>
            )}
          </div>

          <div className="dept-compare-mini-section">
            <h3>Employees in this department</h3>

            {department.employees && department.employees.length > 0 ? (
              <EmployeeList employees={department.employees} />
            ) : (
              <p className="dept-compare-muted">No active employees found.</p>
            )}
          </div>
        </div>

        <div className="dept-compare-modal-footer">
          <button type="button" className="dept-compare-btn dept-compare-btn-ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-soft"
            onClick={onAddLeft}
            disabled={leftDisabled}
          >
            Add in left side
          </button>

          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-primary"
            onClick={onAddRight}
            disabled={rightDisabled}
          >
            Add in right side
          </button>
        </div>
      </div>
    </div>
  );
};

type TeamCardProps = {
  team: DepartmentComparisonTeam;
  compact?: boolean;
};

const TeamCard = ({ team, compact = false }: TeamCardProps) => (
  <details className="dept-compare-team-card" open={!compact}>
    <summary>
      <span className="dept-compare-team-title">
        {team.teamName}
        <StatusPill active={isTeamActive(team.status)} activeText="Active" inactiveText="Inactive" />
      </span>

      <span>{team.employeeCount ?? 0} employee(s)</span>
    </summary>

    <div className="dept-compare-team-body">
      <InfoRow label="Team Name" value={team.teamName} />
      <InfoRow label="Team Goal" value={team.teamGoal} />
      <InfoRow
        label="Team Leader"
        value={formatPersonWithPosition(team.teamLeaderName, team.teamLeaderPositionTitle)}
      />
      <InfoRow label="Created Date" value={formatDate(team.createdDate)} />
      <InfoRow label="Created By" value={team.createdByName} />

      <div className="dept-compare-member-block">
        <h4>Members</h4>

        {team.members && team.members.length > 0 ? (
          <EmployeeList employees={team.members} />
        ) : (
          <p className="dept-compare-muted">No members found.</p>
        )}
      </div>
    </div>
  </details>
);

const EmployeeList = ({ employees }: { employees: DepartmentComparisonEmployee[] }) => (
  <ul className="dept-compare-employee-list">
    {employees.map((employee, index) => (
      <li key={`${employee.userId ?? employee.employeeId ?? index}-${index}`}>
        <span>{formatPersonWithPosition(employee.employeeName, employee.positionTitle)}</span>
        {employee.email && <small>{employee.email}</small>}
      </li>
    ))}
  </ul>
);

const Metric = ({ label, value }: { label: string; value?: number | null }) => (
  <div className="dept-compare-metric">
    <span>{label}</span>
    <strong>{value ?? 0}</strong>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="dept-compare-info-row">
    <span>{label}</span>
    <strong>{display(value)}</strong>
  </div>
);

const StatusPill = ({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) => (
  <span className={`dept-compare-status ${active ? 'is-active' : 'is-inactive'}`}>
    {active ? activeText : inactiveText}
  </span>
);

export default DepartmentComparisonPage;
