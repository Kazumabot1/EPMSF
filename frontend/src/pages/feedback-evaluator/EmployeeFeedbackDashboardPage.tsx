import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackService } from '../../services/feedbackService';
import { feedbackAnalyticsApi } from '../../api/feedbackAnalyticsApi';
import type { FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackReceivedItem } from '../../types/feedback';
import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import './feedback-evaluator.css';

type ViewKey = 'TO_GIVE' | 'ABOUT_ME';
type WorkspaceKind = 'employee' | 'manager' | 'departmentHead';
type TaskStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED';
type RelationshipFilter = 'ALL' | FeedbackRelationshipType;

type TaskGroup = {
    key: string;
    label: string;
    tone: 'danger' | 'warning' | 'info' | 'draft' | 'success';
    items: FeedbackEvaluatorTask[];
};

type FeedbackReceivedQuestionItem = {
    questionId: number;
    questionText?: string | null;
    questionOrder?: number | null;
    sectionTitle?: string | null;
    sectionOrder?: number | null;
    ratingValue?: number | null;
    comment?: string | null;
};

type FeedbackReceivedItemWithQuestions = FeedbackReceivedItem & {
    questionItems?: FeedbackReceivedQuestionItem[];
};

type ResultItem = {
    item: FeedbackReceivedItemWithQuestions;
    relationship: string;
    relationshipLabel: string;
};

type CampaignGroup = {
    key: string;
    campaignId: number;
    campaignName: string;
    status?: string;
    items: ResultItem[];
};

type CompetencyResult = {
    key: string;
    name: string;
    averageScore: number;
    responseCount: number;
};

type CommentRelationshipGroup = {
    relationship: string;
    label: string;
    comments: string[];
};

type QuestionCommentGroup = {
    key: string;
    sectionTitle?: string | null;
    questionText?: string | null;
    relationships: CommentRelationshipGroup[];
};

const MS_PER_DAY = 86_400_000;
const RELATIONSHIP_ORDER = ['SELF', 'MANAGER', 'PEER', 'SUBORDINATE'] as const;

const relationshipLabel = (type: FeedbackRelationshipType | string | null | undefined, plural = false) => {
    switch (type) {
        case 'MANAGER':
            return plural ? 'Managers' : 'Manager';
        case 'PEER':
            return plural ? 'Peers' : 'Peer';
        case 'SUBORDINATE':
            return plural ? 'Direct reports' : 'Direct report';
        case 'SELF':
            return plural ? 'Self review' : 'Self review';
        default:
            return type ? type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Evaluator';
    }
};

const initials = (name?: string | null) =>
    (name || 'Employee')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

const formatDate = (value?: string | null) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const daysUntil = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    return `in ${days} day${days === 1 ? '' : 's'}`;
};

const isOverdue = (task: FeedbackEvaluatorTask) => {
    if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) return false;
    return new Date(task.dueAt).getTime() < Date.now();
};

const isDueSoon = (task: FeedbackEvaluatorTask) => {
    if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) return false;
    const due = new Date(task.dueAt).getTime();
    if (Number.isNaN(due)) return false;
    const days = (due - Date.now()) / MS_PER_DAY;
    return days >= 0 && days <= 7;
};

const statusLabel = (task: FeedbackEvaluatorTask) => {
    if (isOverdue(task)) return 'Overdue';
    switch (task.status) {
        case 'IN_PROGRESS':
            return 'Draft saved';
        case 'SUBMITTED':
            return 'Completed';
        case 'CANCELLED':
            return 'Cancelled';
        case 'DECLINED':
            return 'Declined';
        default:
            return 'Not started';
    }
};

const taskProgress = (task: FeedbackEvaluatorTask) => {
    if (task.status === 'SUBMITTED') return 100;
    if (task.status === 'IN_PROGRESS') return 50;
    return 0;
};

const taskActionLabel = (task: FeedbackEvaluatorTask) => {
    if (task.status === 'SUBMITTED') return 'View';
    if (!task.canSubmit) return 'View';
    if (task.status === 'IN_PROGRESS') return 'Continue';
    return 'Start now';
};

const scoreText = (score?: number | null) => (typeof score === 'number' ? `${score.toFixed(1)}%` : 'No score');
const bandText = (score?: number | null, scoreCategory?: string | null) => {
    if (scoreCategory && scoreCategory.trim()) return scoreCategory;
    if (typeof score !== 'number') return 'Not available';
    if (score >= 86) return 'Outstanding';
    if (score >= 71) return 'Good';
    if (score >= 60) return 'Meets requirement';
    if (score >= 40) return 'Needs improvement';
    return 'Unsatisfactory';
};

const ratingToPercent = (rating?: number | null) => {
    if (typeof rating !== 'number') return null;
    return Math.max(0, Math.min(5, rating)) * 20;
};

const averageScore = (scores: Array<number | null | undefined>) => {
    const valid = scores.filter((score): score is number => typeof score === 'number');
    return valid.length ? valid.reduce((sum, score) => sum + score, 0) / valid.length : null;
};

const resultRelationship = (item: FeedbackReceivedItem) => item.relationshipType ?? item.sourceType ?? 'EVALUATOR';

const canDisplayRelationshipScore = (relationship: string, count?: number | null) => {
    const safeCount = count ?? 0;
    if (relationship === 'PEER' || relationship === 'SUBORDINATE') return safeCount >= 2;
    return safeCount > 0;
};

const publishContentFlags = (summary?: FeedbackResultItem, campaign?: CampaignGroup) => {
    const first = campaign?.items[0]?.item;
    return {
        includeOverallScore: summary?.includeOverallScore ?? first?.includeOverallScore ?? true,
        includeCompetencyBreakdown: summary?.includeCompetencyBreakdown ?? first?.includeCompetencyBreakdown ?? true,
        includeSelfVsOthers: summary?.includeSelfVsOthers ?? first?.includeSelfVsOthers ?? true,
        includeComments: summary?.includeComments ?? first?.includeComments ?? false,
        includeScoreExplanation: summary?.includeScoreExplanation ?? first?.includeScoreExplanation ?? true,
    };
};

const relationshipScoreFromSummary = (summary: FeedbackResultItem | undefined, relationship: string) => {
    switch (relationship) {
        case 'SELF':
            return summary?.selfAverageScore ?? null;
        case 'MANAGER':
            return summary?.managerAverageScore ?? null;
        case 'PEER':
            return summary?.peerAverageScore ?? null;
        case 'SUBORDINATE':
            return summary?.subordinateAverageScore ?? null;
        default:
            return null;
    }
};

const relationshipCountFromSummary = (summary: FeedbackResultItem | undefined, relationship: string, fallbackItems: ResultItem[]) => {
    switch (relationship) {
        case 'SELF':
            return summary?.selfResponses ?? fallbackItems.length;
        case 'MANAGER':
            return summary?.managerResponses ?? fallbackItems.length;
        case 'PEER':
            return summary?.peerResponses ?? fallbackItems.length;
        case 'SUBORDINATE':
            return summary?.subordinateResponses ?? fallbackItems.length;
        default:
            return fallbackItems.length;
    }
};

const buildCompetencyResults = (items: ResultItem[]): CompetencyResult[] => {
    const groups = new Map<string, { name: string; scores: number[] }>();
    items.forEach(({ item }) => {
        (item.questionItems ?? []).forEach((question) => {
            const percent = ratingToPercent(question.ratingValue);
            if (percent == null) return;
            const name = question.sectionTitle?.trim() || 'Unmapped competency';
            const key = name.toLowerCase();
            if (!groups.has(key)) {
                groups.set(key, { name, scores: [] });
            }
            groups.get(key)?.scores.push(percent);
        });
    });
    return Array.from(groups.entries())
        .map(([key, group]) => ({
            key,
            name: group.name,
            averageScore: group.scores.reduce((sum, score) => sum + score, 0) / Math.max(1, group.scores.length),
            responseCount: group.scores.length,
        }))
        .sort((a, b) => b.averageScore - a.averageScore || a.name.localeCompare(b.name));
};

const buildQuestionCommentGroups = (items: ResultItem[]): QuestionCommentGroup[] => {
    const groups = new Map<string, QuestionCommentGroup>();
    items.forEach(({ item, relationship }) => {
        (item.questionItems ?? []).forEach((question) => {
            const comment = question.comment?.trim();
            if (!comment) return;
            const key = `${question.questionId}-${question.questionText ?? ''}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    sectionTitle: question.sectionTitle,
                    questionText: question.questionText,
                    relationships: [],
                });
            }
            const group = groups.get(key);
            if (!group) return;
            let relationshipGroup = group.relationships.find((entry) => entry.relationship === relationship);
            if (!relationshipGroup) {
                relationshipGroup = { relationship, label: relationshipLabel(relationship), comments: [] };
                group.relationships.push(relationshipGroup);
            }
            relationshipGroup.comments.push(comment);
        });
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            relationships: group.relationships.sort((a, b) => RELATIONSHIP_ORDER.indexOf(a.relationship as never) - RELATIONSHIP_ORDER.indexOf(b.relationship as never)),
        }))
        .filter((group) => group.relationships.some((entry) => entry.comments.length > 0));
};

const resolveWorkspace = (pathname: string): { kind: WorkspaceKind; homePath: string; canSeeAboutMe: boolean; title: string; description: string } => {
    if (pathname.startsWith('/manager/')) {
        return {
            kind: 'manager',
            homePath: '/manager/feedback',
            canSeeAboutMe: true,
            title: '360 Feedback',
            description: 'Complete feedback assigned to you and review published feedback about you.',
        };
    }
    if (pathname.startsWith('/department-head/')) {
        return {
            kind: 'departmentHead',
            homePath: '/department-head/feedback',
            canSeeAboutMe: false,
            title: '360 Feedback',
            description: 'Complete manager feedback assignments for employees in your responsibility area.',
        };
    }
    return {
        kind: 'employee',
        homePath: '/employee/feedback',
        canSeeAboutMe: true,
        title: '360 Feedback',
        description: 'Complete feedback assigned to you and review published feedback about you.',
    };
};

const buildSearchText = (task: FeedbackEvaluatorTask) => [
    task.targetEmployeeName,
    task.relationshipType,
    task.campaignName,
    task.status,
    task.campaignStatus,
].filter(Boolean).join(' ').toLowerCase();

const SectionIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'start':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" /></svg>;
        case 'clock':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7.75v4.5l3 1.75" /><path d="M17.5 6.5 19 5" /></svg>;
        case 'draft':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h6.5L17 9v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V5.5Z" /><path d="M13.5 5.5V9H17" /><path d="m10 14.75 4.9-4.9 1.25 1.25-4.9 4.9-2.15.9.9-2.15Z" fill="currentColor" stroke="none" /></svg>;
        case 'check':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m8.6 12.2 2.25 2.25 4.55-4.8" /></svg>;
        case 'bolt':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M13.25 2.75 6.75 12h4l-1 9.25L17.25 12h-4l0-9.25Z" fill="currentColor" stroke="none" /></svg>;
        case 'campaign':
            return <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5" width="15" height="14" rx="2.5" /><path d="M8 3.75v3.5M16 3.75v3.5M4.5 9.5h15" /></svg>;
        default:
            return <span className={`feedback-v3-css-icon ${type}`} aria-hidden="true" />;
    }
};

const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg className={`feedback-v3-svg-icon chevron ${open ? 'open' : ''}`} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.5 7.5 10 12l4.5-4.5" />
    </svg>
);

const EmployeeFeedbackDashboardPage = () => {
    const location = useLocation();
    const workspace = useMemo(() => resolveWorkspace(location.pathname), [location.pathname]);
    const [activeView, setActiveView] = useState<ViewKey>('TO_GIVE');
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('ALL');
    const [taskCampaignFilter, setTaskCampaignFilter] = useState('ALL');
    const [taskRelationshipFilter, setTaskRelationshipFilter] = useState<RelationshipFilter>('ALL');
    const [expandedTaskGroups, setExpandedTaskGroups] = useState<Record<string, boolean>>({});
    const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});

    const tasksQuery = useMyFeedbackTasks();
    const dashboardQuery = useQuery({
        queryKey: ['feedback-dashboard', workspace.kind],
        queryFn: feedbackService.getEmployeeDashboard,
        enabled: workspace.canSeeAboutMe,
    });
    const resultSummaryQuery = useQuery({
        queryKey: ['feedback-my-result', workspace.kind],
        queryFn: feedbackAnalyticsApi.getMyResult,
        enabled: workspace.canSeeAboutMe,
    });

    const tasks = tasksQuery.data ?? [];
    const ownResults = dashboardQuery.data?.ownFeedbackResults ?? [];
    const resultSummaries = resultSummaryQuery.data?.results ?? [];

    useEffect(() => {
        if (!workspace.canSeeAboutMe && activeView === 'ABOUT_ME') {
            setActiveView('TO_GIVE');
        }
    }, [activeView, workspace.canSeeAboutMe]);


    const taskCampaignOptions = useMemo(() => Array.from(new Set(tasks.map((task) => task.campaignName).filter(Boolean))).sort(), [tasks]);

    const taskStats = useMemo(() => {
        const drafts = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const completed = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const dueSoon = tasks.filter((task) => isDueSoon(task) && !isOverdue(task)).length;
        const toStart = tasks.filter((task) => task.canSubmit && task.status === 'PENDING' && !isOverdue(task)).length;
        return { toStart, dueSoon, drafts, completed };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const search = taskSearch.trim().toLowerCase();
        return tasks.filter((task) => {
            if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) return false;
            if (taskCampaignFilter !== 'ALL' && task.campaignName !== taskCampaignFilter) return false;
            if (taskRelationshipFilter !== 'ALL' && task.relationshipType !== taskRelationshipFilter) return false;
            if (search && !buildSearchText(task).includes(search)) return false;
            return true;
        });
    }, [taskCampaignFilter, taskRelationshipFilter, taskSearch, taskStatusFilter, tasks]);

    const taskGroups = useMemo<TaskGroup[]>(() => [
        { key: 'overdue', label: 'Overdue', tone: 'danger', items: filteredTasks.filter(isOverdue) },
        { key: 'dueSoon', label: 'Due soon', tone: 'warning', items: filteredTasks.filter((task) => isDueSoon(task) && !isOverdue(task)) },
        { key: 'toStart', label: 'To start', tone: 'info', items: filteredTasks.filter((task) => task.canSubmit && task.status === 'PENDING' && !isOverdue(task) && !isDueSoon(task)) },
        { key: 'draftsSaved', label: 'Drafts saved', tone: 'draft', items: filteredTasks.filter((task) => task.status === 'IN_PROGRESS') },
        { key: 'completed', label: 'Completed', tone: 'success', items: filteredTasks.filter((task) => task.status === 'SUBMITTED') },
    ], [filteredTasks]);

    const displayResults = useMemo<ResultItem[]>(() => ownResults.map((item) => {
        const relationship = resultRelationship(item);
        return { item, relationship, relationshipLabel: relationshipLabel(relationship) };
    }), [ownResults]);

    const campaignGroups = useMemo<CampaignGroup[]>(() => {
        const groups = new Map<string, CampaignGroup>();
        displayResults.forEach((result) => {
            const key = `campaign-${result.item.campaignId}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    campaignId: result.item.campaignId,
                    campaignName: result.item.campaignName,
                    status: result.item.campaignStatus,
                    items: [],
                });
            }
            groups.get(key)?.items.push(result);
        });
        return Array.from(groups.values()).sort((a, b) => b.campaignId - a.campaignId);
    }, [displayResults]);

    const summaryByCampaignId = useMemo(() => {
        const map = new Map<number, FeedbackResultItem>();
        resultSummaries.forEach((summary) => map.set(summary.campaignId, summary));
        return map;
    }, [resultSummaries]);

    const toggleTaskGroup = (key: string) => setExpandedTaskGroups((current) => ({ ...current, [key]: !current[key] }));
    const toggleCampaign = (key: string) => setExpandedCampaigns((current) => ({ ...current, [key]: !current[key] }));

    const renderTaskRow = (task: FeedbackEvaluatorTask) => {
        const progress = taskProgress(task);
        return (
            <div className="feedback-v3-task-row" key={task.assignmentId}>
                <div className="feedback-v3-employee-cell">
                    <div className="feedback-v3-avatar">{initials(task.targetEmployeeName)}</div>
                    <div>
                        <strong>{task.targetEmployeeName}</strong>
                        <span>{relationshipLabel(task.relationshipType)}</span>
                    </div>
                </div>
                <span className={`feedback-v3-role-pill ${task.relationshipType.toLowerCase()}`}>{relationshipLabel(task.relationshipType)}</span>
                <strong className="feedback-v3-muted-strong">{task.campaignName}</strong>
                <div className="feedback-v3-date-cell">
                    <strong>{formatDate(task.dueAt)}</strong>
                    <span className={isOverdue(task) ? 'danger' : isDueSoon(task) ? 'warning' : ''}>{daysUntil(task.dueAt)}</span>
                </div>
                <div className="feedback-v3-progress-cell">
                    <span>{progress}%</span>
                    <div className="feedback-v3-progress-track"><i style={{ width: `${progress}%` }} /></div>
                </div>
                <span className={`feedback-v3-status-pill ${isOverdue(task) ? 'danger' : task.status.toLowerCase()}`}>{statusLabel(task)}</span>
                <Link className="feedback-v3-action-button" to={`${workspace.homePath}/assignments/${task.assignmentId}`}>
                    {taskActionLabel(task)}
                </Link>
            </div>
        );
    };

    const renderTaskGroup = (group: TaskGroup) => {
        const expanded = Boolean(expandedTaskGroups[group.key]);
        return (
            <section className={`feedback-v3-accordion ${group.tone}`} key={group.key}>
                <button type="button" className="feedback-v3-accordion-head" onClick={() => toggleTaskGroup(group.key)}>
                    <span>{group.label}</span>
                    <strong>{group.items.length}</strong>
                    <ChevronIcon open={expanded} />
                </button>
                {expanded ? (
                    <div className="feedback-v3-task-table">
                        {group.items.length > 0 ? (
                            <>
                                <div className="feedback-v3-task-table-head">
                                    <span>Employee</span>
                                    <span>Role</span>
                                    <span>Campaign</span>
                                    <span>Deadline</span>
                                    <span>Completion</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>
                                {group.items.map(renderTaskRow)}
                            </>
                        ) : (
                            <div className="feedback-v3-empty-row">Nothing here right now.</div>
                        )}
                    </div>
                ) : null}
            </section>
        );
    };

    const renderSelfVsOthers = (summary: FeedbackResultItem | undefined, campaign: CampaignGroup) => {
        const rows = RELATIONSHIP_ORDER.map((relationship) => {
            const fallbackItems = campaign.items.filter((item) => item.relationship === relationship);
            const count = relationshipCountFromSummary(summary, relationship, fallbackItems);
            const allowed = canDisplayRelationshipScore(relationship, count);
            const fallbackScore = averageScore(fallbackItems.map((item) => item.item.overallScore));
            const score = relationshipScoreFromSummary(summary, relationship) ?? fallbackScore;
            return { relationship, label: relationshipLabel(relationship), count, allowed, score };
        });

        return (
            <section className="feedback-v3-published-section">
                <div className="feedback-v3-published-section-head">
                    <h3>Self vs others</h3>
                    <p>Compare how you rated yourself with feedback from other evaluator groups.</p>
                </div>
                <div className="feedback-v3-comparison-grid">
                    {rows.map((row) => (
                        <div key={row.relationship}>
                            <span>{row.label}</span>
                            <strong>{row.allowed && row.score != null ? scoreText(row.score) : 'Not enough feedback'}</strong>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderCompetencyBreakdown = (competencies: CompetencyResult[]) => {
        if (competencies.length === 0) {
            return <p className="feedback-v3-muted-card">Competency breakdown is not available for this published result.</p>;
        }
        const strongest = competencies.slice(0, 3);
        const development = competencies.length > 3 ? [...competencies].sort((a, b) => a.averageScore - b.averageScore || a.name.localeCompare(b.name)).slice(0, 3) : [];

        return (
            <>
                <section className="feedback-v3-published-section">
                    <div className="feedback-v3-published-section-head">
                        <h3>Competency breakdown</h3>
                        <p>Average score by competency from the published feedback set.</p>
                    </div>
                    <div className="feedback-v3-competency-list">
                        {competencies.map((competency) => (
                            <div className="feedback-v3-competency-row" key={competency.key}>
                                <div>
                                    <strong>{competency.name}</strong>
                                    <span>{competency.responseCount} rating{competency.responseCount === 1 ? '' : 's'}</span>
                                </div>
                                <div>
                                    <b>{scoreText(competency.averageScore)}</b>
                                    <i style={{ width: `${Math.max(0, Math.min(100, competency.averageScore))}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <div className="feedback-v3-strength-grid">
                    <section className="feedback-v3-published-section compact">
                        <h3>Strengths</h3>
                        <ul>
                            {strongest.map((competency) => <li key={`strength-${competency.key}`}>{competency.name}</li>)}
                        </ul>
                    </section>
                    <section className="feedback-v3-published-section compact">
                        <h3>Development areas</h3>
                        {development.length > 0 ? (
                            <ul>{development.map((competency) => <li key={`development-${competency.key}`}>{competency.name}</li>)}</ul>
                        ) : (
                            <p>Not enough competency data to identify development areas.</p>
                        )}
                    </section>
                </div>
            </>
        );
    };

    const renderWrittenComments = (campaign: CampaignGroup) => {
        const groups = buildQuestionCommentGroups(campaign.items);
        return (
            <section className="feedback-v3-published-section">
                <div className="feedback-v3-published-section-head">
                    <h3>Written comments</h3>
                    <p>Comments are grouped by question and evaluator group. Evaluator names are never shown.</p>
                </div>
                {groups.length === 0 ? (
                    <p className="feedback-v3-muted-card">No written comments are available for this published result.</p>
                ) : (
                    <div className="feedback-v3-question-comment-stack">
                        {groups.map((group) => (
                            <article className="feedback-v3-question-comment-card" key={group.key}>
                                <span>{group.sectionTitle || 'Question'}</span>
                                <strong>{group.questionText}</strong>
                                <div className="feedback-v3-comment-relationship-stack">
                                    {group.relationships.map((relationship) => (
                                        <div key={`${group.key}-${relationship.relationship}`}>
                                            <b>{relationship.label} feedback</b>
                                            <ul>
                                                {relationship.comments.map((comment, index) => <li key={`${group.key}-${relationship.relationship}-${index}`}>{comment}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        );
    };

    const renderScoreExplanation = () => (
        <section className="feedback-v3-score-explanation-card">
            <strong>Score explanation</strong>
            <div><span>86–100</span><em>Outstanding</em></div>
            <div><span>71–85</span><em>Good</em></div>
            <div><span>60–70</span><em>Meets requirement</em></div>
            <div><span>40–59</span><em>Needs improvement</em></div>
            <div><span>0–39</span><em>Unsatisfactory</em></div>
        </section>
    );

    const renderCampaign = (campaign: CampaignGroup) => {
        const expanded = Boolean(expandedCampaigns[campaign.key]);
        const summary = summaryByCampaignId.get(campaign.campaignId);
        const flags = publishContentFlags(summary, campaign);
        const competencies = buildCompetencyResults(campaign.items);
        const score = summary?.averageScore ?? averageScore(campaign.items.map((item) => item.item.overallScore));
        const scoreCategory = bandText(score, summary?.scoreCategory);
        return (
            <article className={`feedback-v3-campaign-card ${expanded ? 'expanded' : ''}`} key={campaign.key}>
                <div className="feedback-v3-campaign-head published">
                    <button type="button" className="feedback-v3-campaign-open" onClick={() => toggleCampaign(campaign.key)} aria-expanded={expanded}>
                        <div className="feedback-v3-campaign-title">
                            <span className="feedback-v3-campaign-icon"><SectionIcon type="campaign" /></span>
                            <div>
                                <h3>{campaign.campaignName}</h3>
                                <small>Published 360 feedback result</small>
                            </div>
                        </div>
                    </button>
                    <div className="feedback-v3-campaign-stat"><span>Overall result</span><strong>{flags.includeOverallScore ? scoreText(score) : 'Not included'}</strong></div>
                    <div className="feedback-v3-campaign-stat"><span>Result band</span><strong>{flags.includeOverallScore ? scoreCategory : 'Not included'}</strong></div>
                    <button type="button" className="feedback-v3-campaign-collapse" onClick={() => toggleCampaign(campaign.key)} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${campaign.campaignName}`}><ChevronIcon open={expanded} /></button>
                </div>
                {expanded ? (
                    <div className="feedback-v3-campaign-body published-result">
                        <section className="feedback-v3-result-document-header">
                            <p>ACE Data Systems Ltd.,</p>
                            <h2>360° Feedback Result</h2>
                            <div>
                                <span>Campaign: {campaign.campaignName}</span>
                                {summary?.publishedAt ? <span>Published: {formatDate(summary.publishedAt)}</span> : null}
                            </div>
                        </section>

                        {flags.includeOverallScore ? (
                            <section className="feedback-v3-overall-result-card">
                                <span>Overall result</span>
                                <strong>{scoreText(score)}</strong>
                                <em>{scoreCategory}</em>
                            </section>
                        ) : null}

                        {flags.includeSelfVsOthers ? renderSelfVsOthers(summary, campaign) : null}
                        {flags.includeCompetencyBreakdown ? renderCompetencyBreakdown(competencies) : null}
                        {flags.includeComments ? renderWrittenComments(campaign) : <p className="feedback-v3-muted-card">Written comments were not included by HR.</p>}
                        {flags.includeScoreExplanation ? renderScoreExplanation() : null}

                    </div>
                ) : null}
            </article>
        );
    };

    return (
        <div className="feedback-v3-page">
            <div className="feedback-v3-workspace-title">
                <div>
                    <h1>{workspace.title}</h1>
                    <p>{workspace.description}</p>
                </div>
            </div>

            <div className="feedback-v3-switch" aria-label="Switch feedback workspace">
                <button type="button" className={activeView === 'TO_GIVE' ? 'active' : ''} onClick={() => setActiveView('TO_GIVE')}>To Give</button>
                {workspace.canSeeAboutMe ? (
                    <button type="button" className={activeView === 'ABOUT_ME' ? 'active' : ''} onClick={() => setActiveView('ABOUT_ME')}>About Me</button>
                ) : null}
            </div>

            {activeView === 'TO_GIVE' ? (
                <section className="feedback-v3-panel feedback-v3-assigned-panel">
                    <div className="feedback-v3-panel-head">
                        <div className="feedback-v3-leaf"><SectionIcon type="bolt" /></div>
                        <div>
                            <h1>Assigned feedback</h1>
                            <p>Complete the feedback requests assigned to you.</p>
                        </div>
                    </div>

                    <div className="feedback-v3-filter-bar">
                        <input type="search" placeholder="Search by employee or campaign" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                        <select value={taskCampaignFilter} onChange={(event) => setTaskCampaignFilter(event.target.value)}>
                            <option value="ALL">All campaigns</option>
                            {taskCampaignOptions.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
                        </select>
                        <select value={taskRelationshipFilter} onChange={(event) => setTaskRelationshipFilter(event.target.value as RelationshipFilter)}>
                            <option value="ALL">All relationships</option>
                            <option value="MANAGER">Manager</option>
                            <option value="PEER">Peer</option>
                            <option value="SUBORDINATE">Direct report</option>
                            <option value="SELF">Self</option>
                        </select>
                        <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}>
                            <option value="ALL">All statuses</option>
                            <option value="PENDING">Not started</option>
                            <option value="IN_PROGRESS">Draft saved</option>
                            <option value="SUBMITTED">Completed</option>
                        </select>
                    </div>

                    <div className="feedback-v3-summary-grid">
                        <button type="button" className="info" onClick={() => setTaskStatusFilter('PENDING')}><span><SectionIcon type="start" /></span><strong>{taskStats.toStart}</strong><small>To start</small></button>
                        <button type="button" className="warning" onClick={() => setTaskStatusFilter('ALL')}><span><SectionIcon type="clock" /></span><strong>{taskStats.dueSoon}</strong><small>Due soon</small></button>
                        <button type="button" className="draft" onClick={() => setTaskStatusFilter('IN_PROGRESS')}><span><SectionIcon type="draft" /></span><strong>{taskStats.drafts}</strong><small>Drafts saved</small></button>
                        <button type="button" className="success" onClick={() => setTaskStatusFilter('SUBMITTED')}><span><SectionIcon type="check" /></span><strong>{taskStats.completed}</strong><small>Completed</small></button>
                    </div>

                    {tasksQuery.isLoading ? <div className="feedback-v3-empty-row">Loading assigned feedback...</div> : null}
                    {tasksQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div> : null}
                    {!tasksQuery.isLoading && !tasksQuery.error ? <div className="feedback-v3-accordion-stack">{taskGroups.map(renderTaskGroup)}</div> : null}
                </section>
            ) : (
                <section className="feedback-v3-panel feedback-v3-about-panel">
                    <div className="feedback-v3-panel-head">
                        <div className="feedback-v3-leaf"><SectionIcon type="bolt" /></div>
                        <div>
                            <h1>Feedback about you</h1>
                            <p>Review published 360 feedback results released by HR.</p>
                        </div>
                    </div>

                    {dashboardQuery.isLoading || resultSummaryQuery.isLoading ? <div className="feedback-v3-empty-row">Loading published feedback...</div> : null}
                    {dashboardQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{dashboardQuery.error.message}</div> : null}
                    {resultSummaryQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{resultSummaryQuery.error.message}</div> : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length === 0 ? (
                        <div className="feedback-v3-empty-row">No published feedback is available yet.</div>
                    ) : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length > 0 ? (
                        <div className="feedback-v3-campaign-list">
                            {campaignGroups.map(renderCampaign)}
                        </div>
                    ) : null}
                </section>
            )}
        </div>
    );
};

export default EmployeeFeedbackDashboardPage;
