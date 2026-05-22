import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type {
    FeedbackCampaign,
    FeedbackTargetEmployee,
    FeedbackDepartmentOption,
    FeedbackTeamOption,
    EvaluatorConfigInput,
} from '../../../types/feedbackCampaign';

interface Props {
    campaign: FeedbackCampaign | null;
    targetIds: number[];
    savedTargetIds: number[];
    evalConfig: EvaluatorConfigInput;
    onCampaignSelected?: (campaign: FeedbackCampaign) => void;
    onTargetsDraftChange: (ids: number[]) => void;
    onEvalConfigChange: (config: EvaluatorConfigInput) => void;
    onTargetsSaved: (ids: number[], config: EvaluatorConfigInput, campaign: FeedbackCampaign) => void;
    onTargetsSet: (ids: number[], config: EvaluatorConfigInput) => void;
}

const DEFAULT_CONFIG: EvaluatorConfigInput = {
    includeManager: true,
    includeTeamPeers: true,
    includeDepartmentPeers: true,
    includeProjectPeers: false,
    includeCrossTeamPeers: false,
    includeSubordinates: true,
    includeSelf: false,
    peerCount: 3,
};

const editableStatuses = new Set(['DRAFT']);

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((left, right) => left - right);

const sameIds = (left: number[], right: number[]) => {
    const a = normalizeIds(left);
    const b = normalizeIds(right);
    return a.length === b.length && a.every((value, index) => value === b[index]);
};

export default function TargetEvaluatorTab({
                                               campaign,
                                               targetIds,
                                               savedTargetIds,
                                               evalConfig,
                                               onCampaignSelected,
                                               onTargetsDraftChange,
                                               onEvalConfigChange,
                                               onTargetsSaved,
                                               onTargetsSet,
                                           }: Props) {
    const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>(campaign?.id ?? '');
    const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [teams, setTeams] = useState<FeedbackTeamOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingTargets, setSavingTargets] = useState(false);
    const [targetsSaved, setTargetsSaved] = useState(false);

    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState<number | ''>('');
    const [teamFilter, setTeamFilter] = useState<number | ''>('');
    const [selected, setSelected] = useState<Set<number>>(new Set(targetIds));
    const config = evalConfig ?? DEFAULT_CONFIG;
    const [saveError, setSaveError] = useState('');

    const activeCampaign = useMemo(() => {
        if (campaign?.id) return campaign;
        if (!selectedCampaignId) return null;
        return campaigns.find(item => item.id === selectedCampaignId) ?? null;
    }, [campaign, campaigns, selectedCampaignId]);

    const openCampaigns = useMemo(
        () => campaigns,
        [campaigns],
    );

    useEffect(() => {
        setLoading(true);
        setError('');
        Promise.all([
            feedbackCampaignApi.getEmployees(),
            feedbackCampaignApi.getDepartments(),
            feedbackCampaignApi.getTeams(),
            hrFeedbackApi.getAllCampaigns(),
        ])
            .then(([emps, depts, t, campaignList]) => {
                setEmployees(emps);
                setDepartments(depts);
                setTeams(t);
                setCampaigns(campaignList);
            })
            .catch(e => setError(e instanceof Error ? e.message : 'Failed to load target setup data.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (campaign?.id) {
            setSelectedCampaignId(campaign.id);
        }
    }, [campaign?.id]);

    useEffect(() => {
        if (campaign?.id || selectedCampaignId || campaigns.length === 0) return;
        const defaultCampaign =
            campaigns.find(item => item.status === 'DRAFT') ??
            campaigns.find(item => item.status === 'ACTIVE') ??
            campaigns[0];

        if (defaultCampaign) {
            setSelectedCampaignId(defaultCampaign.id);
            onCampaignSelected?.(defaultCampaign);
        }
    }, [campaign?.id, campaigns, onCampaignSelected, selectedCampaignId]);

    useEffect(() => {
        const nextIds = targetIds.length > 0 ? targetIds : (activeCampaign?.targetEmployeeIds ?? []);
        setSelected(new Set(nextIds));
        setTargetsSaved(false);
        setSaveError('');
    }, [activeCampaign?.id, activeCampaign?.targetEmployeeIds?.join(','), targetIds.join(',')]);

    const filtered = employees.filter(emp => {
        const matchSearch = !search || emp.fullName.toLowerCase().includes(search.toLowerCase());
        const matchDept = !deptFilter || emp.currentDepartmentId === deptFilter;
        const matchTeam = !teamFilter || teams.find(t => t.id === teamFilter)?.memberEmployeeIds.includes(emp.id);
        return matchSearch && matchDept && matchTeam;
    });

    const isDraft = activeCampaign ? editableStatuses.has(activeCampaign.status) : false;
    const selectedIds = useMemo(() => normalizeIds([...selected]), [selected]);
    const persistedTargetIds = activeCampaign?.targetEmployeeIds ?? savedTargetIds ?? [];
    const hasUnsavedTargetChanges = !sameIds(selectedIds, persistedTargetIds);

    const applySelected = (next: Set<number>) => {
        setSelected(next);
        onTargetsDraftChange([...next]);
        setTargetsSaved(false);
        setSaveError('');
    };

    const updateConfig = (patch: Partial<EvaluatorConfigInput>) => {
        onEvalConfigChange({ ...config, ...patch });
        setSaveError('');
    };

    const toggleEmp = (id: number) => {
        if (!isDraft) return;
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        applySelected(next);
    };

    const selectAll = () => {
        if (!isDraft) return;
        applySelected(new Set(filtered.map(e => e.id)));
    };

    const clearAll = () => {
        if (!isDraft) return;
        applySelected(new Set());
    };

    const initials = (name: string) =>
        name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

    const handleCampaignChange = (value: string) => {
        const nextId = value ? Number(value) : '';
        setSelectedCampaignId(nextId);
        setTargetsSaved(false);
        setSaveError('');

        if (nextId) {
            const selectedCampaign = campaigns.find(item => item.id === nextId);
            if (selectedCampaign) onCampaignSelected?.(selectedCampaign);
        }
    };

    const refreshSelectedCampaign = async () => {
        if (!activeCampaign) return null;
        const latest = await feedbackCampaignApi.getCampaign(activeCampaign.id);
        setCampaigns(prev => prev.map(item => item.id === latest.id ? latest : item));
        onCampaignSelected?.(latest);
        return latest;
    };

    const handleSaveTargets = async () => {
        if (!activeCampaign) {
            setSaveError('Choose a campaign before saving targets.');
            return;
        }
        if (!isDraft) {
            setSaveError('Targets can only be changed while the campaign is DRAFT.');
            return;
        }
        if (selected.size === 0) {
            setSaveError('Select at least one target employee.');
            return;
        }

        setSaveError('');
        setSavingTargets(true);
        try {
            const updated = await feedbackCampaignApi.assignTargets(activeCampaign.id, { employeeIds: [...selected] });
            setCampaigns(prev => prev.map(item => item.id === updated.id ? updated : item));
            onCampaignSelected?.(updated);
            const savedIds = updated.targetEmployeeIds?.length ? updated.targetEmployeeIds : [...selected];
            setSelected(new Set(savedIds));
            onTargetsSaved(savedIds, config, updated);
            setTargetsSaved(true);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to save campaign targets.');
        } finally {
            setSavingTargets(false);
        }
    };

    const configValid =
        (config.includeManager ||
            config.includeSelf ||
            config.includeSubordinates ||
            config.includeTeamPeers ||
            config.includeDepartmentPeers ||
            config.includeProjectPeers ||
            config.includeCrossTeamPeers) &&
        config.peerCount > 0;

    const handleContinue = async () => {
        if (!activeCampaign) {
            setSaveError('Choose a campaign before continuing to assignment preview.');
            return;
        }
        if (!configValid) {
            setSaveError('Select at least one evaluator source and a valid peer count.');
            return;
        }
        if (selected.size === 0) {
            setSaveError('Select at least one target employee.');
            return;
        }

        if (hasUnsavedTargetChanges) {
            setSaveError('You changed the target employees but have not saved them yet. Click Save Targets first so Preview uses the same employees that are stored in the campaign.');
            return;
        }

        const latest = targetsSaved ? await refreshSelectedCampaign() : activeCampaign;
        const savedIds = latest?.targetEmployeeIds?.length ? latest.targetEmployeeIds : persistedTargetIds;
        if (latest) onCampaignSelected?.(latest);
        onTargetsSet(savedIds, config);
    };

    const evalOptions = [
        { key: 'includeManager' as const, label: 'Direct Manager', desc: 'Assigns the reporting manager as evaluator' },
        { key: 'includeDepartmentPeers' as const, label: 'Department Peers', desc: 'Random peers from the same department; works without teams' },
        { key: 'includeTeamPeers' as const, label: 'Team Peers', desc: 'Prioritizes members of the same active team' },
        { key: 'includeSubordinates' as const, label: 'Direct Subordinates', desc: 'Direct reports provide upward feedback' },
        { key: 'includeSelf' as const, label: 'Self Feedback', desc: 'Target employee evaluates self' },
        { key: 'includeProjectPeers' as const, label: 'Project Peers', desc: 'Peers from shared project assignments' },
        { key: 'includeCrossTeamPeers' as const, label: 'Other-Team Peers', desc: 'Other active teams in the same department' },
    ];

    const renderCampaignSelector = () => (
        <div className="hfd-campaign-select-bar">
            <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Campaign:</label>
            <select
                className="hfd-select"
                value={activeCampaign?.id ?? selectedCampaignId}
                onChange={event => handleCampaignChange(event.target.value)}
            >
                <option value="">— Choose an existing campaign —</option>
                {openCampaigns.map(item => (
                    <option key={item.id} value={item.id}>
                        {item.name} ({item.status}){item.targetCount ? ` - ${item.targetCount} target(s)` : ''}
                    </option>
                ))}
            </select>
            {activeCampaign && <span className={`hfd-status-badge ${activeCampaign.status}`}>{activeCampaign.status}</span>}
        </div>
    );

    if (loading) {
        return <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading campaigns and employees...</div>;
    }

    if (!activeCampaign) {
        return (
            <div>
                <div className="hfd-card-header">
                    <div className="hfd-card-title">
                        <i className="bi bi-people" />
                        <div>
                            <h2>Target & Evaluator Configuration</h2>
                            <p>Resume an existing draft campaign or create a new one in Campaign Setup.</p>
                        </div>
                    </div>
                </div>
                {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
                {renderCampaignSelector()}
                <div className="hfd-empty">
                    <i className="bi bi-folder2-open" />
                    <p>No campaign selected. Choose an existing campaign above, or create one in the Campaign Setup tab.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="hfd-card-header">
                <div className="hfd-card-title">
                    <i className="bi bi-people" />
                    <div>
                        <h2>Target & Evaluator Configuration</h2>
                        <p>Campaign: <strong>{activeCampaign.name}</strong></p>
                    </div>
                </div>
                <span className={`hfd-status-badge ${activeCampaign.status}`}>{activeCampaign.status}</span>
            </div>

            {renderCampaignSelector()}
            {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
            {saveError && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{saveError}</div>}
            {!isDraft && (
                <div className="hfd-alert hfd-alert-warning">
                    <i className="bi bi-lock-fill" />
                    Target changes are locked because this campaign is {activeCampaign.status}. Use a DRAFT campaign to edit targets.
                </div>
            )}

            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
                <i className="bi bi-person-check" style={{ marginRight: 6, color: '#6366f1' }} />
                1. Select Target Employees
                <span className="hfd-selected-count" style={{ marginLeft: 10 }}>
          <i className="bi bi-check2" /> {selected.size} selected
        </span>
            </h3>

            <div className="hfd-filter-bar">
                <input className="hfd-input" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="hfd-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value ? +e.target.value : '')}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="hfd-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value ? +e.target.value : '')}>
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
                </select>
                <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={selectAll} disabled={!isDraft}>Select All</button>
                <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={clearAll} disabled={!isDraft}>Clear</button>
            </div>

            <div className="hfd-employee-list">
                {filtered.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>No employees match the filters.</p>
                ) : filtered.map(emp => (
                    <div
                        key={emp.id}
                        className={`hfd-employee-card ${selected.has(emp.id) ? 'selected' : ''}`}
                        onClick={() => toggleEmp(emp.id)}
                        role="button"
                        aria-disabled={!isDraft}
                    >
                        <div className="hfd-employee-avatar">{initials(emp.fullName)}</div>
                        <div>
                            <div className="hfd-employee-name">{emp.fullName}</div>
                            <div className="hfd-employee-dept">{emp.currentDepartment ?? 'No dept'}</div>
                        </div>
                        {selected.has(emp.id) && <i className="bi bi-check-circle-fill" style={{ color: '#6366f1', marginLeft: 'auto' }} />}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 12 }}>
                <button
                    className="hfd-btn hfd-btn-secondary hfd-btn-sm"
                    onClick={handleSaveTargets}
                    disabled={savingTargets || selected.size === 0 || !isDraft}
                >
                    {savingTargets ? <><i className="bi bi-arrow-repeat" /> Saving...</> : <><i className="bi bi-floppy" /> Save Targets</>}
                </button>
                {targetsSaved && <span style={{ marginLeft: 10, color: '#16a34a', fontSize: '0.85rem' }}><i className="bi bi-check-circle" /> Targets saved</span>}
                {hasUnsavedTargetChanges && !targetsSaved && (
                    <span style={{ marginLeft: 10, color: '#b45309', fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-triangle" /> Unsaved target changes
              </span>
                )}
            </div>

            <hr style={{ margin: '24px 0', borderColor: '#f1f5f9' }} />

            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
                <i className="bi bi-person-lines-fill" style={{ marginRight: 6, color: '#6366f1' }} />
                2. Evaluator Configuration
            </h3>

            <div className="hfd-eval-grid">
                {evalOptions.map(opt => (
                    <div
                        key={opt.key}
                        className={`hfd-eval-option ${config[opt.key] ? 'checked' : ''}`}
                        onClick={() => updateConfig({ [opt.key]: !config[opt.key] } as Partial<EvaluatorConfigInput>)}
                    >
                        <input
                            type="checkbox"
                            checked={config[opt.key] as boolean}
                            onChange={() => {}}
                            onClick={e => e.stopPropagation()}
                        />
                        <div className="hfd-eval-option-body">
                            <strong>{opt.label}</strong>
                            <span>{opt.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hfd-field" style={{ maxWidth: 240 }}>
                <label className="hfd-label">Peer Count (per target) <span>*</span></label>
                <input
                    type="number"
                    className="hfd-input"
                    min={1}
                    max={10}
                    value={config.peerCount}
                    onChange={e => updateConfig({ peerCount: Math.max(1, Number(e.target.value) || 1) })}
                />
            </div>

            {hasUnsavedTargetChanges && (
                <div className="hfd-alert hfd-alert-warning" style={{ marginTop: 14 }}>
                    <i className="bi bi-exclamation-triangle" />
                    Save Targets before Preview. This prevents the selected employee list, manual evaluator target list, and target summary from showing different data.
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <button
                    id="btn-continue-to-preview"
                    className="hfd-btn hfd-btn-primary"
                    onClick={handleContinue}
                    disabled={selected.size === 0 || !configValid}
                >
                    <i className="bi bi-arrow-right" /> Continue to Preview
                </button>
            </div>
        </div>
    );
}
