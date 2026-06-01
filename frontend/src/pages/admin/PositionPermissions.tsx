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
  HRADMIN: [
    'oneOnOneCreate', 'oneOnOneDeptSelection', 'oneOnOneTeamSelection',
    'teamView', 'teamCreate', 'teamEdit', 'teamHistory', 'teamAssignAsLeader', 'teamAssignAsPm', 'teamAssignAsMember',
    'pipViewAll', 'pipCreate', 'pipEdit',
    'appraisalView', 'appraisalReview', 'appraisalApprove', 'appraisalScoreInput', 'appraisalSign',
    'kpiView', 'kpiCreate', 'kpiEdit', 'kpiInput', 'kpiScore',
    'selfAssessmentView', 'selfAssessmentInput', 'selfAssessmentLock', 'selfAssessmentSign',
    'feedbackFormCreate', 'continuousFeedbackView', 'continuousFeedbackGive', 'feedbackSend',
    'departmentCrud', 'departmentComparisonView', 'positionCrud', 'employeeCrud', 'employeeExcelImport',
  ],
  HR_ADMIN: [
    'oneOnOneCreate', 'oneOnOneDeptSelection', 'oneOnOneTeamSelection',
    'teamView', 'teamCreate', 'teamEdit', 'teamHistory', 'teamAssignAsLeader', 'teamAssignAsPm', 'teamAssignAsMember',
    'pipViewAll', 'pipCreate', 'pipEdit',
    'appraisalView', 'appraisalReview', 'appraisalApprove', 'appraisalScoreInput', 'appraisalSign',
    'kpiView', 'kpiCreate', 'kpiEdit', 'kpiInput', 'kpiScore',
    'selfAssessmentView', 'selfAssessmentInput', 'selfAssessmentLock', 'selfAssessmentSign',
    'feedbackFormCreate', 'continuousFeedbackView', 'continuousFeedbackGive', 'feedbackSend',
    'departmentCrud', 'departmentComparisonView', 'positionCrud', 'employeeCrud', 'employeeExcelImport',
  ],
};

const normalizeRoleName = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .replace('DEPARTMENT_HEAD', 'DEPARTMENTHEAD');

const isExecutivePosition = (position: PositionResponse) => {
  const role = normalizeRoleName(position.roleName);
  const title = normalizeRoleName(position.positionTitle);
  return (
    role === 'CEO' ||
    role === 'EXECUTIVE' ||
    title.includes('CEO') ||
    title.includes('CHAIRMAN') ||
    title.includes('EXECUTIVE')
  );
};

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

const resetUnavailableFields = (permission: PositionPermission, allowedFields: Set<PermissionField>) => {
  const next = { ...permission };
  (Object.keys(next) as PermissionField[]).forEach((key) => {
    if (!allowedFields.has(key)) {
      (next as Record<PermissionField, boolean>)[key] = false;
    }
  });

  if (!next.oneOnOneCreate) {
    next.oneOnOneDeptSelection = false;
    next.oneOnOneTeamSelection = false;
    next.oneOnOnePermission = false;
  } else {
    next.oneOnOnePermission = true;
  }

  return next;
};

const isPermissionLocked = (key: PermissionField, permissions: PositionPermission) => {
  if (key === 'oneOnOneDeptSelection' || key === 'oneOnOneTeamSelection') {
    return !permissions.oneOnOneCreate;
  }

  return false;
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
      const visiblePositions = data.filter((position) => !isExecutivePosition(position));
      setPositions(visiblePositions);
      setSelectedPositionId((prev) => (
        prev && visiblePositions.some((item) => item.id === prev)
          ? prev
          : visiblePositions[0]?.id ?? null
      ));
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
      const normalized = resetUnavailableFields(permissionData, allowedFields);
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
    setPermissions((prev) => {
      if (isPermissionLocked(key, prev)) {
        return prev;
      }

      const next = { ...prev, [key]: !prev[key] };
      if (key === 'oneOnOneCreate' && !next.oneOnOneCreate) {
        next.oneOnOneDeptSelection = false;
        next.oneOnOneTeamSelection = false;
      }

      return resetUnavailableFields(next, allowedFields);
    });
    setMessage('');
    setIsError(false);
  };

  const handleSave = async () => {
    if (!selectedPositionId) return;
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const safePayload = resetUnavailableFields(permissions, allowedFields);
      const saved = await positionPermissionService.save(selectedPositionId, safePayload);
      const normalizedSaved = resetUnavailableFields(saved, allowedFields);
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

                <div style={{ display: 'grid', gap: 18 }}>
                  {visibleGroups.map((group) => (
                    <div key={group.title} className="position-surface" style={{ margin: 0 }}>
                      <div className="position-surface-inner">
                        <div className="position-detail-section-title" style={{ marginBottom: 16 }}>
                          <div><h3>{group.title}</h3><p>{group.description}</p></div>
                        </div>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {group.items.map((item) => {
                            const locked = isPermissionLocked(item.key, permissions);
                            const enabled = !locked && Boolean(permissions[item.key]);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => togglePermission(item.key)}
                                disabled={locked}
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
                                  cursor: locked ? 'not-allowed' : 'pointer',
                                  opacity: locked ? 0.62 : 1,
                                }}
                              >
                                <div>
                                  <strong>{item.label}</strong>
                                  <div className="position-mini-text" style={{ marginTop: 6 }}>
                                    {locked ? 'Enable Create 1:1 Meeting first.' : item.helper}
                                  </div>
                                </div>
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
