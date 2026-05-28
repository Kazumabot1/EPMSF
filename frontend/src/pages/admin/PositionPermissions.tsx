import React, { useEffect, useMemo, useState } from 'react';
import { positionService } from '../../services/positionService';
import {
  POSITION_PERMISSION_FIELDS,
  emptyPositionPermission,
  positionPermissionService,
} from '../../services/positionPermissionService';
import type { PositionResponse } from '../../types/position';
import type {
  PositionPermission,
  PositionPermissionAudit,
} from '../../types/positionPermission';
import '../position/position-ui.css';

type PermissionField = keyof PositionPermission;
type TeamAssignmentMode = 'none' | 'teamAssignAsLeader' | 'teamAssignAsPm' | 'teamAssignAsMember';

type PermissionItem = {
  key: PermissionField;
  label: string;
  helper: string;
};

type PermissionSection = {
  title: string;
  description: string;
  parent?: PermissionItem;
  children?: PermissionItem[];
  items?: PermissionItem[];
};

const hrPermissionSections: PermissionSection[] = [
  {
    title: 'Teams Permission',
    description: 'Controls the Teams menu for HR users.',
    parent: {
      key: 'teamPermission',
      label: 'Teams',
      helper: 'Show or hide Teams, View Teams, and Team History.',
    },
  },
  {
    title: 'Organization Permission',
    description: 'Controls organization-related HR menus.',
    parent: {
      key: 'organizationPermission',
      label: 'Organization',
      helper: 'Show or hide the Organization group.',
    },
    children: [
      {
        key: 'departmentCrud',
        label: 'Departments',
        helper: 'Show or hide the Departments button.',
      },
      {
        key: 'departmentComparisonView',
        label: 'Departments Comparison',
        helper: 'Show or hide Departments Comparison.',
      },
      {
        key: 'employeeCrud',
        label: 'Employee',
        helper: 'Show or hide Employee management.',
      },
    ],
  },
  {
    title: 'Assessment Permission',
    description: 'Controls self-assessment HR menus.',
    parent: {
      key: 'assessmentPermission',
      label: 'Assessment',
      helper: 'Show or hide the Assessment group.',
    },
    children: [
      {
        key: 'assessmentScoresView',
        label: 'Scores',
        helper: 'Show or hide Assessment Scores.',
      },
      {
        key: 'assessmentFormCreate',
        label: 'Form Create',
        helper: 'Show or hide Assessment Form Create.',
      },
    ],
  },
  {
    title: 'Appraisals Permission',
    description: 'Controls the full Appraisals menu group.',
    parent: {
      key: 'appraisalPermission',
      label: 'Appraisals',
      helper: 'Show or hide Appraisals and all appraisal menu buttons.',
    },
  },
  {
    title: '360 Feedback Permission',
    description: 'Controls the full 360 Feedback menu group.',
    parent: {
      key: 'feedback360Permission',
      label: '360 Feedback',
      helper: 'Show or hide 360 Feedback and all related menu buttons.',
    },
  },
  {
    title: 'One-on-One Permission',
    description: 'Controls one-on-one meetings and action items.',
    parent: {
      key: 'oneOnOnePermission',
      label: 'One-on-One',
      helper: 'Show or hide 1:1 Meetings and Action Items.',
    },
  },
  {
    title: 'PIP Permission',
    description: 'Controls PIP menu visibility.',
    items: [
      {
        key: 'pipViewAll',
        label: 'PIP View',
        helper: 'Show or hide the PIP menu box.',
      },
    ],
  },
  {
    title: 'Positions Permission',
    description: 'Controls position management menus.',
    parent: {
      key: 'positionPermission',
      label: 'Positions',
      helper: 'Show or hide Positions and all position-related buttons.',
    },
  },
  {
    title: 'KPI Management Permission',
    description: 'Controls HR KPI management menus. My KPIs stays visible by default.',
    parent: {
      key: 'kpiPermission',
      label: 'KPI Management',
      helper: 'Show or hide KPI Management and all related buttons.',
    },
  },
  {
    title: 'Department KPI Management Permission',
    description: 'Controls HR Department KPI management menus.',
    parent: {
      key: 'departmentKpiPermission',
      label: 'Department KPI Management',
      helper: 'Show or hide Department KPI Management and all related buttons.',
    },
  },
];

const legacyPermissionSections: PermissionSection[] = [
  {
    title: 'Team Access',
    description: 'Controls Department Head team access only. Team assignment eligibility is managed separately for Manager and Employee positions.',
    parent: {
      key: 'teamPermission',
      label: 'Teams',
      helper: 'Show or hide team access for this position.',
    },
    children: [
      {
        key: 'teamCreate',
        label: 'Create / Edit Team',
        helper: 'Allow Department Head to create and edit teams in own department.',
      },
      {
        key: 'teamHistory',
        label: 'Team History',
        helper: 'Allow viewing team audit/history records.',
      },
    ],
  },
  {
    title: '1:1 Meetings',
    description: 'Controls one-on-one meetings.',
    parent: {
      key: 'oneOnOnePermission',
      label: 'One-on-One',
      helper: 'Allow one-on-one meeting access for this position.',
    },
  },


{
  title: 'PIP Permission',
  description: 'Controls the PIP menu and all PIP actions.',
  items: [
    {
      key: 'pipViewAll',
      label: 'PIP',
      helper: 'Show or hide PIP and allow related PIP actions.',
    },
  ],
},

  {
    title: 'Appraisals',
    description: 'Controls appraisal workflow access.',
    parent: {
      key: 'appraisalPermission',
      label: 'Appraisals',
      helper: 'Allow appraisal workflow access for this position.',
    },
  },
  {
    title: 'KPI',
    description: 'Controls KPI management access.',
    parent: {
      key: 'kpiPermission',
      label: 'KPI Management',
      helper: 'Allow KPI management access for this position.',
    },
  },
  {
    title: 'Self Assessment',
    description: 'Controls self-assessment workflow actions for non-HR roles.',
    items: [
      {
        key: 'selfAssessmentView',
        label: 'View Self Assessment',
        helper: 'Allow viewing self-assessment forms.',
      },
      {
        key: 'selfAssessmentInput',
        label: 'Input Self Assessment',
        helper: 'Allow self-assessment input.',
      },
      {
        key: 'selfAssessmentSign',
        label: 'Sign Self Assessment',
        helper: 'Allow self-assessment signing.',
      },
    ],
  },
  {
    title: 'Continuous Feedback Permission',
    description: 'Controls the Continuous Feedback menu for Department Head and Manager roles.',
    items: [
      {
        key: 'continuousFeedbackView',
        label: 'Continuous Feedback',
        helper: 'Show or hide Continuous Feedback in the sidebar.',
      },
    ],
  },
  {
    title: '360 Feedback Permission',
    description: 'Controls the 360 Feedback menu group.',
    parent: {
      key: 'feedback360Permission',
      label: '360 Feedback',
      helper: 'Show or hide 360 Feedback for this position.',
    },
  },
  {
    title: 'Department KPI Management Permission',
    description: 'Controls Department KPI menu visibility for Department Head.',
    parent: {
      key: 'departmentKpiPermission',
      label: 'Department KPIs',
      helper: 'Show or hide Department KPIs for this position.',
    },
  },
];

const allowedByRole: Record<string, PermissionField[]> = {
  HR: [
    'teamPermission',

    'organizationPermission',
    'departmentCrud',
    'departmentComparisonView',
    'employeeCrud',

    'assessmentPermission',
    'assessmentScoresView',
    'assessmentFormCreate',

    'appraisalPermission',
    'feedback360Permission',
    'oneOnOnePermission',
    'pipViewAll',

    'positionPermission',
    'kpiPermission',
    'departmentKpiPermission',
  ],

  DEPARTMENTHEAD: [
    /*
     * Department Head controls teams inside own department.
     * Department Head is NOT assignable as Team Leader / PM / Member.
     */
    'teamPermission',
    'teamCreate',
    'teamHistory',

    'continuousFeedbackView',
    'continuousFeedbackGive',

    'departmentKpiPermission',
    'appraisalPermission',
    'oneOnOnePermission',
    'pipViewAll',
  ],

  MANAGER: [
    /*
     * Manager does not need Teams sidebar permission here.
     * These are only assignment eligibility controls.
     */
    'teamAssignAsLeader',
    'teamAssignAsPm',
    'teamAssignAsMember',

    'appraisalPermission',
    'continuousFeedbackView',
    'continuousFeedbackGive',
    'oneOnOnePermission',
    'pipViewAll',
  ],

  EMPLOYEE: [
    /*
     * Employee does not need Teams sidebar permission.
     * These are only assignment eligibility controls.
     */
    'teamAssignAsLeader',
    'teamAssignAsMember',

    'selfAssessmentView',
    'selfAssessmentInput',
    'selfAssessmentSign',

    'feedback360Permission',
    'continuousFeedbackView',
    'continuousFeedbackGive',
    'feedbackSend',
  ],

  ADMIN: [...POSITION_PERMISSION_FIELDS],

  CEO: [
    'appraisalPermission',
    'departmentComparisonView',
    'kpiPermission',
  ],
};

const teamAssignmentOptions: Array<{
  value: TeamAssignmentMode;
  label: string;
  helper: string;
}> = [
  {
    value: 'none',
    label: 'No team assignment eligibility',
    helper: 'This position will not appear in team assignment selectors.',
  },
  {
    value: 'teamAssignAsLeader',
    label: 'Can be Team Leader',
    helper: 'This position can be selected as Team Leader.',
  },
  {
    value: 'teamAssignAsPm',
    label: 'Can be Project Manager',
    helper: 'This position can be selected as Project Manager.',
  },
  {
    value: 'teamAssignAsMember',
    label: 'Can be Team Member',
    helper: 'This position can be selected as a normal team member.',
  },
];

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .replace('DEPARTMENT_HEAD', 'DEPARTMENTHEAD')
    .replace('DEPT_HEAD', 'DEPARTMENTHEAD')
    .replace('HEAD_OF_DEPARTMENT', 'DEPARTMENTHEAD');

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const normalizeColumnName = (value?: string | null) =>
  String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const valueBadge = (value?: string | null) => {
  if (value === '1' || value === 'true' || value === 'TRUE') return 'Enabled';
  if (value === '0' || value === 'false' || value === 'FALSE') return 'Disabled';
  return '-';
};

const getTeamAssignmentMode = (permission: PositionPermission): TeamAssignmentMode => {
  if (permission.teamAssignAsLeader) return 'teamAssignAsLeader';
  if (permission.teamAssignAsPm) return 'teamAssignAsPm';
  if (permission.teamAssignAsMember) return 'teamAssignAsMember';

  return 'none';
};

const buildTeamAssignmentPermission = (
  previous: PositionPermission,
  mode: TeamAssignmentMode,
): PositionPermission => ({
  ...previous,
  teamAssignAsLeader: mode === 'teamAssignAsLeader',
  teamAssignAsPm: mode === 'teamAssignAsPm',
  teamAssignAsMember: mode === 'teamAssignAsMember',
});

const applyParentChildRules = (permission: PositionPermission): PositionPermission => {
  const next = { ...permission };

  next.teamView = Boolean(next.teamPermission);
  next.teamHistory = Boolean(next.teamPermission);

  if (!next.teamPermission) {
    next.teamView = false;
    next.teamHistory = false;
    next.teamCreate = false;
    next.teamEdit = false;
  }

  if (!next.organizationPermission) {
    next.departmentCrud = false;
    next.departmentComparisonView = false;
    next.employeeCrud = false;
    next.employeeExcelImport = false;
  }

  if (!next.assessmentPermission) {
    next.assessmentScoresView = false;
    next.assessmentFormCreate = false;
  }

  next.appraisalView = Boolean(next.appraisalPermission);
  next.appraisalReview = Boolean(next.appraisalPermission);
  next.appraisalApprove = Boolean(next.appraisalPermission);
  next.appraisalScoreInput = Boolean(next.appraisalPermission);
  next.appraisalSign = Boolean(next.appraisalPermission);
  next.feedbackFormCreate = Boolean(next.feedback360Permission);
  next.feedbackSend = Boolean(next.feedback360Permission);

  /*
   * Continuous Feedback is one permission.
   */
  next.continuousFeedbackGive = Boolean(next.continuousFeedbackView);


  const oneOnOne = Boolean(next.oneOnOnePermission);
  next.oneOnOneCreate = oneOnOne;
  next.oneOnOneDeptSelection = oneOnOne;
  next.oneOnOneTeamSelection = oneOnOne;

  /*
   * PIP is one permission.
   */
  next.pipCreate = Boolean(next.pipViewAll);
  next.pipEdit = Boolean(next.pipViewAll);
  next.positionCrud = Boolean(next.positionPermission);

  next.kpiView = Boolean(next.kpiPermission);
  next.kpiCreate = Boolean(next.kpiPermission);
  next.kpiEdit = Boolean(next.kpiPermission);

  return next;
};

const resetUnavailableFields = (
  permission: PositionPermission,
  allowedFields: Set<PermissionField>,
) => {
  const next = { ...permission };

  POSITION_PERMISSION_FIELDS.forEach((key) => {
    if (!allowedFields.has(key)) {
      next[key] = false;
    }
  });

  return applyParentChildRules(next);
};

const isParentChildLocked = (
  itemKey: PermissionField,
  permission: PositionPermission,
) => {
  if (
    itemKey === 'departmentCrud' ||
    itemKey === 'departmentComparisonView' ||
    itemKey === 'employeeCrud' ||
    itemKey === 'employeeExcelImport'
  ) {
    return !permission.organizationPermission;
  }

  if (itemKey === 'assessmentScoresView' || itemKey === 'assessmentFormCreate') {
    return !permission.assessmentPermission;
  }

  if (itemKey === 'teamCreate' || itemKey === 'teamEdit' || itemKey === 'teamHistory') {
    return !permission.teamPermission;
  }

  return false;
};

const PositionPermissions: React.FC = () => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [permissions, setPermissions] = useState<PositionPermission>(
    emptyPositionPermission(),
  );
  const [originalPermissions, setOriginalPermissions] = useState<PositionPermission>(
    emptyPositionPermission(),
  );
  const [auditRows, setAuditRows] = useState<PositionPermissionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const selectedPosition = useMemo(
    () => positions.find((position) => position.id === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  );

  const roleKey = normalizeRoleName(selectedPosition?.roleName);

  const allowedFields = useMemo(
    () => new Set<PermissionField>(allowedByRole[roleKey] ?? []),
    [roleKey],
  );

  const visibleSections = useMemo(() => {
    const baseSections = roleKey === 'HR' ? hrPermissionSections : legacyPermissionSections;

    return baseSections
      .map((section) => {
        const parent =
          section.parent && allowedFields.has(section.parent.key)
            ? section.parent
            : undefined;

        const children = (section.children ?? []).filter((item) =>
          allowedFields.has(item.key),
        );

        const items = (section.items ?? []).filter((item) =>
          allowedFields.has(item.key),
        );

        return {
          ...section,
          parent,
          children,
          items,
        };
      })
      .filter(
        (section) =>
          Boolean(section.parent) ||
          (section.children?.length ?? 0) > 0 ||
          (section.items?.length ?? 0) > 0,
      );
  }, [roleKey, allowedFields]);

  const filteredPositions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return positions;

    return positions.filter((position) =>
      [
        position.positionTitle,
        position.levelCode,
        position.roleName,
        position.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [positions, query]);

  const teamAssignmentMode = useMemo(
    () => getTeamAssignmentMode(permissions),
    [permissions],
  );

  const hasTeamAssignmentOptions = useMemo(
    () =>
      allowedFields.has('teamAssignAsLeader') ||
      allowedFields.has('teamAssignAsPm') ||
      allowedFields.has('teamAssignAsMember'),
    [allowedFields],
  );

  const hasChanges = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(originalPermissions),
    [permissions, originalPermissions],
  );

  const loadPositions = async () => {
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const data = await positionService.getPositions();

      setPositions(data);
      setSelectedPositionId((previous) =>
        previous && data.some((item) => item.id === previous)
          ? previous
          : data[0]?.id ?? null,
      );
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Failed to load positions.');
    } finally {
      setLoading(false);
    }
  };

  const loadPositionAccess = async (positionId: number) => {
    setMessage('');
    setIsError(false);

    try {
      const [permissionData, auditData] = await Promise.all([
        positionPermissionService.getByPositionId(positionId),
        positionPermissionService.getAudit(positionId),
      ]);

      const normalized = applyParentChildRules(
        buildTeamAssignmentPermission(
          permissionData,
          getTeamAssignmentMode(permissionData),
        ),
      );

      setPermissions(normalized);
      setOriginalPermissions(normalized);
      setAuditRows(auditData);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : 'Failed to load position permissions.',
      );
      setPermissions(emptyPositionPermission());
      setOriginalPermissions(emptyPositionPermission());
      setAuditRows([]);
    }
  };

  useEffect(() => {
    void loadPositions();
  }, []);

  useEffect(() => {
    if (selectedPositionId) {
      void loadPositionAccess(selectedPositionId);
    }
  }, [selectedPositionId]);

  useEffect(() => {
    if (selectedPosition) {
      setPermissions((previous) => resetUnavailableFields(previous, allowedFields));
    }
  }, [selectedPosition?.id, roleKey, allowedFields]);

  const togglePermission = (key: PermissionField) => {
    if (!allowedFields.has(key)) return;

    if (isParentChildLocked(key, permissions)) {
      return;
    }

    setPermissions((previous) =>
      applyParentChildRules({
        ...previous,
        [key]: !previous[key],
      }),
    );
    setMessage('');
    setIsError(false);
  };

  const changeTeamAssignment = (mode: TeamAssignmentMode) => {
    if (mode !== 'none' && !allowedFields.has(mode)) return;

    setPermissions((previous) =>
      applyParentChildRules(buildTeamAssignmentPermission(previous, mode)),
    );
    setMessage('');
    setIsError(false);
  };

  const handleSave = async () => {
    if (!selectedPositionId) return;

    setSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const safePayload = resetUnavailableFields(
        applyParentChildRules(
          buildTeamAssignmentPermission(
            permissions,
            getTeamAssignmentMode(permissions),
          ),
        ),
        allowedFields,
      );

      const saved = await positionPermissionService.save(selectedPositionId, safePayload);
      const normalizedSaved = applyParentChildRules(
        buildTeamAssignmentPermission(saved, getTeamAssignmentMode(saved)),
      );

      setPermissions(normalizedSaved);
      setOriginalPermissions(normalizedSaved);
      setMessage('Position permissions saved successfully.');

      const auditData = await positionPermissionService.getAudit(selectedPositionId);
      setAuditRows(auditData);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : 'Failed to save position permissions.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderPermissionButton = (item: PermissionItem, locked = false) => {
    const enabled = Boolean(permissions[item.key]);

    return (
      <button
        key={item.key}
        type="button"
        disabled={locked}
        onClick={() => togglePermission(item.key)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 14,
          padding: '15px 18px',
          borderRadius: 16,
          border: enabled
            ? '1px solid rgba(22, 163, 74, 0.35)'
            : '1px solid rgba(148, 163, 184, 0.3)',
          background: locked
            ? 'rgba(226, 232, 240, 0.58)'
            : enabled
              ? 'rgba(22, 163, 74, 0.08)'
              : 'rgba(248, 250, 252, 0.85)',
          textAlign: 'left',
          cursor: locked ? 'not-allowed' : 'pointer',
          opacity: locked ? 0.64 : 1,
        }}
      >
        <div>
          <strong>{item.label}</strong>
          <div className="position-mini-text" style={{ marginTop: 6 }}>
            {item.helper}
            {locked ? ' This option is locked because the parent permission is off.' : ''}
          </div>
        </div>

        <span
          className={`position-pill ${enabled ? 'active' : 'inactive'}`}
          style={{ minWidth: 88, textAlign: 'center' }}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </button>
    );
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-sliders2-vertical" />
          Access Control
        </span>
        <h1>Position Permissions</h1>
        <p>Role controls dashboard. Position permissions control enabled actions.</p>
      </div>

      {message && (
        <div className={`position-alert ${isError ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="position-surface">
        <div
          className="position-surface-inner"
          style={{
            display: 'grid',
            gridTemplateColumns: '320px minmax(0, 1fr)',
            gap: 24,
          }}
        >
          <section>
            <div className="position-table-toolbar" style={{ marginBottom: 14 }}>
              <input
                className="position-input position-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search position..."
              />

              <button
                type="button"
                onClick={() => void loadPositions()}
                disabled={loading}
                className="position-btn secondary"
              >
                <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} />
                Refresh
              </button>
            </div>

            <div
              style={{
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: 20,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.9)',
              }}
            >
              {loading ? (
                <div className="position-state">Loading positions...</div>
              ) : filteredPositions.length === 0 ? (
                <div className="position-state">No positions found.</div>
              ) : (
                <div style={{ display: 'grid' }}>
                  {filteredPositions.map((position) => {
                    const active = position.id === selectedPositionId;

                    return (
                      <button
                        key={position.id}
                        type="button"
                        onClick={() => setSelectedPositionId(position.id)}
                        style={{
                          padding: '16px 18px',
                          textAlign: 'left',
                          border: 0,
                          borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
                          background: active
                            ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(14, 165, 233, 0.10))'
                            : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <strong>{position.positionTitle}</strong>
                          <span
                            className={`position-pill ${position.status ? 'active' : 'inactive'}`}
                          >
                            {position.status ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="position-mini-text" style={{ marginTop: 6 }}>
                          {position.levelCode || '-'}{' '}
                          {position.roleName ? `• ${position.roleName}` : '• No role linked'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            {!selectedPosition ? (
              <div className="position-state">
                Select a position to manage permissions.
              </div>
            ) : !selectedPosition.roleName ? (
              <div className="position-alert error">
                This position is not connected to a dashboard role yet. Edit the position and choose a Dashboard Role first.
              </div>
            ) : (
              <>
                <div className="position-detail-summary" style={{ marginBottom: 20 }}>
                  <div className="position-metric-card">
                    <span>Selected position</span>
                    <strong>{selectedPosition.positionTitle}</strong>
                    <small>{selectedPosition.description || 'No description'}</small>
                  </div>

                  <div className="position-metric-card">
                    <span>Level</span>
                    <strong>{selectedPosition.levelCode || '-'}</strong>
                    <small>Hierarchy level</small>
                  </div>

                  <div className="position-metric-card">
                    <span>System role</span>
                    <strong>{selectedPosition.roleName}</strong>
                    <small>Dashboard comes from this role</small>
                  </div>

                  <div className="position-metric-card">
                    <span>Status</span>
                    <strong>{selectedPosition.status ? 'Active' : 'Inactive'}</strong>
                    <small>Inactive remains visible for audit</small>
                  </div>
                </div>

                <div
                  className="position-form-actions"
                  style={{
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>Available Permissions</h2>
                    <p className="position-mini-text" style={{ marginTop: 6 }}>
                      Parent permissions control whether related child permissions can be edited.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="position-btn secondary"
                      onClick={() => setPermissions(originalPermissions)}
                      disabled={!hasChanges || saving}
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      className="position-btn primary"
                      onClick={() => void handleSave()}
                      disabled={!hasChanges || saving}
                    >
                      <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`} />
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>

                {hasTeamAssignmentOptions && (
                  <div className="position-surface" style={{ margin: '0 0 18px' }}>
                    <div className="position-surface-inner">
                      <div
                        className="position-detail-section-title"
                        style={{ marginBottom: 16 }}
                      >
                        <div>
                        <h3>Team Assignment Eligibility</h3>
                        <p>Controls whether this position can be selected as Team Leader, Project Manager, or Team Member during team creation.</p>
                                                </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                          gap: 14,
                        }}
                      >
                        {teamAssignmentOptions
                          .filter(
                            (option) =>
                              option.value === 'none' || allowedFields.has(option.value),
                          )
                          .map((option) => {
                            const active = teamAssignmentMode === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => changeTeamAssignment(option.value)}
                                style={{
                                  padding: 18,
                                  borderRadius: 20,
                                  border: active
                                    ? '1px solid rgba(79, 70, 229, 0.55)'
                                    : '1px solid rgba(148, 163, 184, 0.32)',
                                  background: active
                                    ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(14, 165, 233, 0.12))'
                                    : 'rgba(248, 250, 252, 0.9)',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                }}
                              >
                                <strong>{option.label}</strong>
                                <p
                                  className="position-mini-text"
                                  style={{ margin: '8px 0 0' }}
                                >
                                  {option.helper}
                                </p>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 18 }}>
                  {visibleSections.map((section) => (
                    <div
                      key={section.title}
                      className="position-surface"
                      style={{ margin: 0 }}
                    >
                      <div className="position-surface-inner">
                        <div
                          className="position-detail-section-title"
                          style={{ marginBottom: 16 }}
                        >
                          <div>
                            <h3>{section.title}</h3>
                            <p>{section.description}</p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                          {section.parent && renderPermissionButton(section.parent)}

                          {(section.children ?? []).map((item) =>
                            renderPermissionButton(
                              item,
                              isParentChildLocked(item.key, permissions),
                            ),
                          )}

                          {(section.items ?? []).map((item) =>
                            renderPermissionButton(item),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="position-surface" style={{ marginTop: 22 }}>
                  <div className="position-surface-inner">
                    <div className="position-detail-section-title">
                      <div>
                        <h3>Audit History</h3>
                        <p>
                          Tracks who changed permission values for this position and when.
                        </p>
                      </div>
                    </div>

                    {auditRows.length === 0 ? (
                      <div className="position-state">
                        No audit history yet for this position.
                      </div>
                    ) : (
                      <div className="position-table-wrap">
                        <table className="position-table">
                          <thead>
                            <tr>
                              <th>Edited At</th>
                              <th>Edited By</th>
                              <th>Permission</th>
                              <th>Old Value</th>
                              <th>New Value</th>
                            </tr>
                          </thead>

                          <tbody>
                            {auditRows.map((row) => (
                              <tr key={row.id}>
                                <td>{formatDateTime(row.editedAt)}</td>
                                <td>{row.editedByName || row.editedBy || '-'}</td>
                                <td>{normalizeColumnName(row.columnName)}</td>
                                <td>{valueBadge(row.oldValue)}</td>
                                <td>{valueBadge(row.newValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default PositionPermissions;