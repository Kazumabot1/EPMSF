/*Z*/
import { useEffect, useMemo, useState } from 'react';
import { positionService } from '../../services/positionService';
import {
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

type PermissionGroup = {
  title: string;
  description: string;
  items: PermissionItem[];
};

const allGroups: PermissionGroup[] = [
  {
    title: '1:1 Meetings',
    description: 'Controls who can create one-on-one meetings and the employee scope they may select.',
    items: [
      { key: 'oneOnOneCreate', label: 'Create 1:1 Meeting', helper: 'Allow this position to create one-on-one meetings.' },
      { key: 'oneOnOneDeptSelection', label: 'Department Selection', helper: 'Allow selecting employees from a department.' },
      { key: 'oneOnOneTeamSelection', label: 'Team Selection', helper: 'Allow selecting employees through team scope.' },
    ],
  },
  {
    title: 'Team Management',
    description: 'Controls team creation, view-only team access, editing, and history.',
    items: [
      { key: 'teamView', label: 'View Team Management', helper: 'Allow view-only team information, used for Team Leader positions.' },
      { key: 'teamCreate', label: 'Create Team', helper: 'Allow creating teams within the allowed department.' },
      { key: 'teamEdit', label: 'Edit Team', helper: 'Allow editing existing teams and memberships.' },
      { key: 'teamHistory', label: 'Team History', helper: 'Allow viewing team audit/history records.' },
    ],
  },
  {
    title: 'PIP',
    description: 'Controls performance improvement plan access.',
    items: [
      { key: 'pipViewAll', label: 'View PIP', helper: 'Allow read-only viewing of PIP records.' },
      { key: 'pipCreate', label: 'Create PIP', helper: 'Allow creating a new PIP.' },
      { key: 'pipEdit', label: 'Edit PIP', helper: 'Allow updating existing PIP records.' },
    ],
  },
  {
    title: 'KPI',
    description: 'Controls KPI visibility, HR CRUD, and manager input/scoring.',
    items: [
      { key: 'kpiView', label: 'View KPI', helper: 'Allow viewing KPI records.' },
      { key: 'kpiCreate', label: 'KPI Create', helper: 'Allow creating KPI records/templates.' },
      { key: 'kpiEdit', label: 'KPI Edit', helper: 'Allow editing KPI records/templates.' },
      { key: 'kpiInput', label: 'Input KPI', helper: 'Allow manager KPI input.' },
      { key: 'kpiScore', label: 'Input KPI Score', helper: 'Allow scoring KPI submissions.' },
    ],
  },
  {
    title: 'Appraisal',
    description: 'Controls appraisal view, input, review, approval, and signing.',
    items: [
      { key: 'appraisalView', label: 'View Appraisal', helper: 'Allow viewing appraisal records.' },
      { key: 'appraisalReview', label: 'Review Appraisal', helper: 'Allow review actions in the appraisal flow.' },
      { key: 'appraisalApprove', label: 'Approve Appraisal', helper: 'Allow HR approval actions.' },
      { key: 'appraisalScoreInput', label: 'Input Appraisal Score', helper: 'Allow manager appraisal score input.' },
      { key: 'appraisalSign', label: 'Sign Appraisal', helper: 'Allow appraisal signing.' },
    ],
  },
  {
    title: 'Self Assessment',
    description: 'Controls self-assessment view, input, lock, and sign actions.',
    items: [
      { key: 'selfAssessmentView', label: 'View Self Assessment', helper: 'Allow viewing self-assessment forms.' },
      { key: 'selfAssessmentInput', label: 'Input Self Assessment', helper: 'Allow self-assessment input.' },
      { key: 'selfAssessmentLock', label: 'Lock Self Assessment', helper: 'Allow locking self-assessment forms.' },
      { key: 'selfAssessmentSign', label: 'Sign Self Assessment', helper: 'Allow self-assessment signing.' },
    ],
  },
  {
    title: 'Feedback',
    description: 'Controls form creation and continuous feedback access.',
    items: [
      { key: 'feedbackFormCreate', label: 'Feedback Form Create', helper: 'Allow creating feedback forms.' },
      { key: 'continuousFeedbackView', label: 'View Continuous Feedback', helper: 'Allow viewing received continuous feedback.' },
      { key: 'continuousFeedbackGive', label: 'Allow Continuous Feedback', helper: 'Allow giving continuous feedback.' },
      { key: 'feedbackSend', label: 'Send Continuous Feedback', helper: 'Legacy compatibility flag for sending feedback.' },
    ],
  },
  {
    title: 'Organization / HR Data',
    description: 'Controls HR organization data access.',
    items: [
      { key: 'departmentCrud', label: 'Department CRUD', helper: 'Allow creating, editing, and deactivating departments.' },
      { key: 'departmentComparisonView', label: 'Department Comparison View', helper: 'Allow viewing department comparison reports.' },
      { key: 'positionCrud', label: 'Position CRUD', helper: 'Allow creating and editing positions.' },
      { key: 'employeeCrud', label: 'Employee CRUD', helper: 'Allow creating and editing employees.' },
      { key: 'employeeExcelImport', label: 'Employee Excel Import', helper: 'Allow employee Excel import.' },
    ],
  },
];

const allowedByRole: Record<string, PermissionField[]> = {
  HR: [
    'oneOnOneCreate', 'oneOnOneDeptSelection',
    'pipViewAll',
    'appraisalReview', 'appraisalApprove', 'appraisalView',
    'kpiCreate', 'kpiEdit', 'kpiView',
    'selfAssessmentView', 'selfAssessmentInput', 'selfAssessmentLock', 'selfAssessmentSign',
    'feedbackFormCreate', 'continuousFeedbackView',
    'departmentCrud', 'departmentComparisonView', 'positionCrud', 'employeeCrud', 'employeeExcelImport',
  ],
  DEPARTMENTHEAD: [
    'teamView', 'teamCreate', 'teamEdit', 'teamHistory',
    'oneOnOneCreate', 'oneOnOneDeptSelection',
    'pipCreate', 'pipViewAll',
    'appraisalReview', 'appraisalView', 'appraisalSign',
    'kpiView', 'selfAssessmentView', 'selfAssessmentSign', 'continuousFeedbackGive', 'feedbackSend',
  ],
  MANAGER: [
    'oneOnOneCreate', 'oneOnOneTeamSelection',
    'pipCreate', 'pipEdit',
    'appraisalReview', 'appraisalView', 'appraisalScoreInput', 'appraisalSign',
    'kpiInput', 'kpiScore',
    'selfAssessmentSign', 'continuousFeedbackGive', 'feedbackSend',
  ],
  EMPLOYEE: [
    'teamView', 'teamAssignAsLeader', 'teamAssignAsMember',
    'oneOnOneCreate', 'appraisalView', 'kpiView',
    'selfAssessmentView', 'selfAssessmentInput', 'selfAssessmentSign',
    'continuousFeedbackView', 'continuousFeedbackGive', 'feedbackSend',
  ],
  ADMIN: [
    'oneOnOneCreate', 'oneOnOneDeptSelection', 'oneOnOneTeamSelection',
    'teamView', 'teamCreate', 'teamEdit', 'teamHistory', 'teamAssignAsLeader', 'teamAssignAsPm', 'teamAssignAsMember',
    'pipViewAll', 'pipCreate', 'pipEdit',
    'appraisalView', 'appraisalReview', 'appraisalApprove', 'appraisalScoreInput', 'appraisalSign',
    'kpiView', 'kpiCreate', 'kpiEdit', 'kpiInput', 'kpiScore',
    'selfAssessmentView', 'selfAssessmentInput', 'selfAssessmentLock', 'selfAssessmentSign',
    'feedbackFormCreate', 'continuousFeedbackView', 'continuousFeedbackGive', 'feedbackSend',
    'departmentCrud', 'departmentComparisonView', 'positionCrud', 'employeeCrud', 'employeeExcelImport',
  ],
  CEO: ['appraisalView', 'departmentComparisonView', 'kpiView'],
};

const teamAssignmentOptions: Array<{
  value: TeamAssignmentMode;
  label: string;
  helper: string;
}> = [
  { value: 'none', label: 'No team assignment eligibility', helper: 'This position will not appear in team assignment selectors.' },
  { value: 'teamAssignAsLeader', label: 'Can be Team Leader', helper: 'This position can be selected as Team Leader.' },
  { value: 'teamAssignAsPm', label: 'Legacy PM flag', helper: 'Kept only for old data; new PM selector uses MANAGER role.' },
  { value: 'teamAssignAsMember', label: 'Can be Team Member', helper: 'This position can be selected as a normal member.' },
];

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .replace('DEPARTMENT_HEAD', 'DEPARTMENTHEAD');

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const normalizeColumnName = (value?: string | null) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const valueBadge = (value?: string | null) => {
  if (value === '1') return 'Enabled';
  if (value === '0') return 'Disabled';
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

const resetUnavailableFields = (permission: PositionPermission, allowedFields: Set<PermissionField>) => {
  const next = { ...permission };
  (Object.keys(next) as PermissionField[]).forEach((key) => {
    if (!allowedFields.has(key)) {
      (next as Record<PermissionField, boolean>)[key] = false;
    }
  });
  return next;
};

const PositionPermissions = () => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [permissions, setPermissions] = useState<PositionPermission>(emptyPositionPermission());
  const [originalPermissions, setOriginalPermissions] = useState<PositionPermission>(emptyPositionPermission());
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

  const visibleGroups = useMemo(
    () => allGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => allowedFields.has(item.key)) }))
      .filter((group) => group.items.length > 0),
    [allowedFields],
  );

  const filteredPositions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((position) =>
      [position.positionTitle, position.levelCode, position.roleName, position.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [positions, query]);

  const teamAssignmentMode = useMemo(() => getTeamAssignmentMode(permissions), [permissions]);
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
      setSelectedPositionId((prev) => (prev && data.some((item) => item.id === prev) ? prev : data[0]?.id ?? null));
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
      const normalized = buildTeamAssignmentPermission(permissionData, getTeamAssignmentMode(permissionData));
      setPermissions(normalized);
      setOriginalPermissions(normalized);
      setAuditRows(auditData);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Failed to load position permissions.');
      setPermissions(emptyPositionPermission());
      setOriginalPermissions(emptyPositionPermission());
      setAuditRows([]);
    }
  };

  useEffect(() => {
    void loadPositions();
  }, []);

  useEffect(() => {
    if (selectedPositionId) void loadPositionAccess(selectedPositionId);
  }, [selectedPositionId]);

  useEffect(() => {
    if (selectedPosition) {
      setPermissions((prev) => resetUnavailableFields(prev, allowedFields));
    }
  }, [selectedPosition?.id, roleKey]);

  const togglePermission = (key: PermissionField) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage('');
    setIsError(false);
  };

  const changeTeamAssignment = (mode: TeamAssignmentMode) => {
    if (mode !== 'none' && !allowedFields.has(mode)) return;
    setPermissions((prev) => buildTeamAssignmentPermission(prev, mode));
  };

  const handleSave = async () => {
    if (!selectedPositionId) return;
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const safePayload = resetUnavailableFields(
        buildTeamAssignmentPermission(permissions, getTeamAssignmentMode(permissions)),
        allowedFields,
      );
      const saved = await positionPermissionService.save(selectedPositionId, safePayload);
      const normalizedSaved = buildTeamAssignmentPermission(saved, getTeamAssignmentMode(saved));
      setPermissions(normalizedSaved);
      setOriginalPermissions(normalizedSaved);
      setMessage('Position permissions saved successfully.');
      const auditData = await positionPermissionService.getAudit(selectedPositionId);
      setAuditRows(auditData);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Failed to save position permissions.');
    } finally {
      setSaving(false);
    }
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

      {message && <div className={`position-alert ${isError ? 'error' : 'success'}`}>{message}</div>}

      <div className="position-surface">
        <div className="position-surface-inner position-permission-layout">
          <section>
            <div className="position-table-toolbar position-permission-toolbar">
              <input className="position-input position-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search position..." />
              <button type="button" onClick={() => void loadPositions()} disabled={loading} className="position-btn secondary">
                <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`} />
                Refresh
              </button>
            </div>

            <div className="position-list-panel">
              {loading ? (
                <div className="position-state">Loading positions...</div>
              ) : filteredPositions.length === 0 ? (
                <div className="position-state">No positions found.</div>
              ) : (
                <div className="position-list-stack">
                  {filteredPositions.map((position) => {
                    const active = position.id === selectedPositionId;
                    return (
                      <button
                        key={position.id}
                        type="button"
                        onClick={() => setSelectedPositionId(position.id)}
                        className={`position-list-item ${active ? 'active' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <strong>{position.positionTitle}</strong>
                          <span className={`position-pill ${position.status ? 'active' : 'inactive'}`}>{position.status ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="position-mini-text" style={{ marginTop: 6 }}>
                          {position.levelCode || '-'} {position.roleName ? `• ${position.roleName}` : '• No role linked'}
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
              <div className="position-state">Select a position to manage permissions.</div>
            ) : !selectedPosition.roleName ? (
              <div className="position-alert error">This position is not connected to a dashboard role yet. Edit the position and choose a Dashboard Role first.</div>
            ) : (
              <>
                <div className="position-detail-summary position-permission-summary">
                  <div className="position-metric-card"><span>Selected position</span><strong>{selectedPosition.positionTitle}</strong><small>{selectedPosition.description || 'No description'}</small></div>
                  <div className="position-metric-card"><span>Level</span><strong>{selectedPosition.levelCode || '-'}</strong><small>Hierarchy level</small></div>
                  <div className="position-metric-card"><span>System role</span><strong>{selectedPosition.roleName}</strong><small>Dashboard comes from this role</small></div>
                  <div className="position-metric-card"><span>Status</span><strong>{selectedPosition.status ? 'Active' : 'Inactive'}</strong><small>Inactive remains visible for audit</small></div>
                </div>

                <div className="position-form-actions position-permission-actions">
                  <div>
                    <h2 style={{ margin: 0 }}>Available Permissions</h2>
                    <p className="position-mini-text" style={{ marginTop: 6 }}>Only permissions valid for {selectedPosition.roleName} are shown.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="position-btn secondary" onClick={() => setPermissions(originalPermissions)} disabled={!hasChanges || saving}>Reset</button>
                    <button type="button" className="position-btn primary" onClick={() => void handleSave()} disabled={!hasChanges || saving}>
                      <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`} />
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>

                {allowedFields.has('teamAssignAsLeader') || allowedFields.has('teamAssignAsPm') || allowedFields.has('teamAssignAsMember') ? (
                  <div className="position-surface" style={{ margin: '0 0 18px' }}>
                    <div className="position-surface-inner">
                      <div className="position-detail-section-title" style={{ marginBottom: 16 }}>
                        <div><h3>Team Assignment Eligibility</h3><p>Only valid options for this position role can be selected.</p></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
                        {teamAssignmentOptions
                          .filter((option) => option.value === 'none' || allowedFields.has(option.value))
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
                                  border: active ? '1px solid rgba(37, 99, 235, 0.55)' : '1px solid rgba(148, 163, 184, 0.32)',
                                  background: active ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(14, 165, 233, 0.12))' : 'rgba(248, 250, 252, 0.9)',
                                  textAlign: 'left',
                                }}
                              >
                                <strong>{option.label}</strong>
                                <p className="position-mini-text" style={{ margin: '8px 0 0' }}>{option.helper}</p>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gap: 18 }}>
                  {visibleGroups.map((group) => (
                    <div key={group.title} className="position-surface" style={{ margin: 0 }}>
                      <div className="position-surface-inner">
                        <div className="position-detail-section-title" style={{ marginBottom: 16 }}>
                          <div><h3>{group.title}</h3><p>{group.description}</p></div>
                        </div>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {group.items.map((item) => {
                            const enabled = Boolean(permissions[item.key]);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => togglePermission(item.key)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr auto',
                                  alignItems: 'center',
                                  gap: 14,
                                  padding: '15px 18px',
                                  borderRadius: 16,
                                  border: enabled ? '1px solid rgba(22, 163, 74, 0.35)' : '1px solid rgba(148, 163, 184, 0.3)',
                                  background: enabled ? 'rgba(22, 163, 74, 0.08)' : 'rgba(248, 250, 252, 0.85)',
                                  textAlign: 'left',
                                }}
                              >
                                <div><strong>{item.label}</strong><div className="position-mini-text" style={{ marginTop: 6 }}>{item.helper}</div></div>
                                <span className={`position-pill ${enabled ? 'active' : 'inactive'}`} style={{ minWidth: 88, textAlign: 'center' }}>{enabled ? 'Enabled' : 'Disabled'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="position-surface" style={{ marginTop: 22 }}>
                  <div className="position-surface-inner">
                    <div className="position-detail-section-title"><div><h3>Audit History</h3><p>Tracks who changed permission values for this position and when.</p></div></div>
                    {auditRows.length === 0 ? <div className="position-state">No audit history yet for this position.</div> : (
                      <div className="position-table-wrap">
                        <table className="position-table">
                          <thead><tr><th>Edited At</th><th>Edited By</th><th>Permission</th><th>Old Value</th><th>New Value</th></tr></thead>
                          <tbody>
                            {auditRows.map((row) => (
                              <tr key={row.id}><td>{formatDateTime(row.editedAt)}</td><td>{row.editedByName || row.editedBy || '-'}</td><td>{normalizeColumnName(row.columnName)}</td><td>{valueBadge(row.oldValue)}</td><td>{valueBadge(row.newValue)}</td></tr>
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
