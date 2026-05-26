import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackService } from '../../services/feedbackService';
import { feedbackAnalyticsApi } from '../../api/feedbackAnalyticsApi';
import type { FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackReceivedItem } from '../../types/feedback';
import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import './feedback-evaluator.css';

type WorkspaceKind = 'employee' | 'manager' | 'departmentHead';
type TaskStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED';
type RelationshipFilter = 'ALL' | FeedbackRelationshipType;

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
    if (!value) return 'No deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const days = Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
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
    if (typeof task.completionPercent === 'number') return Math.max(0, Math.min(100, task.completionPercent));
    if (task.status === 'SUBMITTED') return 100;
    return 0;
};

const progressCopy = (task: FeedbackEvaluatorTask) => {
    if (typeof task.requiredQuestionCount === 'number' && task.requiredQuestionCount > 0) {
        return `${task.answeredRequiredQuestionCount ?? 0}/${task.requiredQuestionCount} complete`;
    }
    return `${taskProgress(task)}% complete`;
};

const taskActionLabel = (task: FeedbackEvaluatorTask) => {
    if (task.status === 'SUBMITTED') return 'View feedback';
    if (!task.canSubmit) return 'View';
    if (task.status === 'IN_PROGRESS') return 'Continue';
    return 'Start';
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
            description: 'A focused place to complete feedback and reflect on published growth results.',
        };
    }
    if (pathname.startsWith('/department-head/')) {
        return {
            kind: 'departmentHead',
            homePath: '/department-head/feedback',
            canSeeAboutMe: false,
            title: '360 Feedback',
            description: 'Complete the feedback requests assigned to you with care and clarity.',
        };
    }
    return {
        kind: 'employee',
        homePath: '/employee/feedback',
        canSeeAboutMe: true,
        title: '360 Feedback',
        description: 'A private space to share thoughtful feedback and review your growth insights.',
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
        case 'spark':
            return <svg className="feedback-v3-svg-icon section-icon spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9 12 3.5Z" fill="currentColor" stroke="none" /></svg>;
        default:
            return <svg className="feedback-v3-svg-icon section-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>;
    }
};

const EmployeeFeedbackDashboardPage = () => {
    const location = useLocation();
    const workspace = useMemo(() => resolveWorkspace(location.pathname), [location.pathname]);
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('ALL');
    const [taskCampaignFilter, setTaskCampaignFilter] = useState('ALL');
    const [taskRelationshipFilter, setTaskRelationshipFilter] = useState<RelationshipFilter>('ALL');
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

    const taskCampaignOptions = useMemo(() => {
        const campaigns = new Map<number, string>();
        tasks.forEach((task) => {
            campaigns.set(task.campaignId, task.campaignName || `Campaign #${task.campaignId}`);
        });
        return Array.from(campaigns.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    }, [tasks]);

    const taskStats = useMemo(() => {
        const open = tasks.filter((task) => task.status !== 'SUBMITTED' && task.status !== 'CANCELLED' && task.status !== 'DECLINED').length;
        const drafts = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const completed = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const dueSoon = tasks.filter((task) => isDueSoon(task) && !isOverdue(task)).length;
        return { open, dueSoon, drafts, completed };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const search = taskSearch.trim().toLowerCase();
        return tasks.filter((task) => {
            if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) return false;
            if (taskCampaignFilter !== 'ALL' && String(task.campaignId) !== taskCampaignFilter) return false;
            if (taskRelationshipFilter !== 'ALL' && task.relationshipType !== taskRelationshipFilter) return false;
            if (search && !buildSearchText(task).includes(search)) return false;
            return true;
        });
    }, [taskCampaignFilter, taskRelationshipFilter, taskSearch, taskStatusFilter, tasks]);

    const sortedTasks = useMemo(() => [...filteredTasks].sort((a, b) => {
        if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
        if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
        if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
        return new Date(a.dueAt ?? '2999-01-01').getTime() - new Date(b.dueAt ?? '2999-01-01').getTime();
    }), [filteredTasks]);

    const primaryTask = useMemo(() => sortedTasks.find((task) => task.status !== 'SUBMITTED' && task.canSubmit) ?? sortedTasks[0], [sortedTasks]);

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

    const toggleCampaign = (key: string) => setExpandedCampaigns((current) => ({ ...current, [key]: !current[key] }));

    const renderTaskCard = (task: FeedbackEvaluatorTask) => {
        const progress = taskProgress(task);
        const open = task.status !== 'SUBMITTED' && task.status !== 'CANCELLED' && task.status !== 'DECLINED';
        return (
            <article className={`feedback-warm-task-card ${open ? 'open' : 'complete'} ${isOverdue(task) ? 'overdue' : ''}`} key={task.assignmentId}>
                <div className="feedback-warm-avatar">{initials(task.targetEmployeeName)}</div>
                <div className="feedback-warm-task-main">
                    <div className="feedback-warm-task-top">
                        <span>{relationshipLabel(task.relationshipType)}</span>
                        <b>{statusLabel(task)}</b>
                    </div>
                    <h3>{task.targetEmployeeName}</h3>
                    <p>{task.campaignName}</p>
                    <div className="feedback-warm-task-progress" aria-label={progressCopy(task)}>
                        <i style={{ width: `${progress}%` }} />
                    </div>
                    <small>{progressCopy(task)} · {daysUntil(task.dueAt)}</small>
                </div>
                <Link className="feedback-warm-task-action" to={`${workspace.homePath}/assignments/${task.assignmentId}`}>
                    {taskActionLabel(task)}
                </Link>
            </article>
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
            <section className="feedback-warm-result-section">
                <div className="feedback-warm-section-title">
                    <h3>Self vs others</h3>
                    <p>See how your self-view compares with feedback from other groups.</p>
                </div>
                <div className="feedback-warm-comparison-grid">
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
            return <p className="feedback-warm-muted-card">Competency breakdown is not available for this published result.</p>;
        }
        const strongest = competencies.slice(0, 3);
        const development = competencies.length > 3 ? [...competencies].sort((a, b) => a.averageScore - b.averageScore || a.name.localeCompare(b.name)).slice(0, 3) : [];

        return (
            <>
                <section className="feedback-warm-result-section">
                    <div className="feedback-warm-section-title">
                        <h3>Competency breakdown</h3>
                        <p>Average score by competency from the published feedback set.</p>
                    </div>
                    <div className="feedback-warm-competency-list">
                        {competencies.map((competency) => (
                            <div className="feedback-warm-competency-row" key={competency.key}>
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
                <div className="feedback-warm-strength-grid">
                    <section className="feedback-warm-result-section compact">
                        <h3>Strengths</h3>
                        <ul>{strongest.map((competency) => <li key={`strength-${competency.key}`}>{competency.name}</li>)}</ul>
                    </section>
                    <section className="feedback-warm-result-section compact">
                        <h3>Development areas</h3>
                        {development.length > 0 ? <ul>{development.map((competency) => <li key={`development-${competency.key}`}>{competency.name}</li>)}</ul> : <p>Not enough competency data to identify development areas.</p>}
                    </section>
                </div>
            </>
        );
    };

    const renderWrittenComments = (campaign: CampaignGroup) => {
        const groups = buildQuestionCommentGroups(campaign.items);
        return (
            <section className="feedback-warm-result-section">
                <div className="feedback-warm-section-title">
                    <h3>Written comments</h3>
                    <p>Comments are grouped by question and evaluator group. Evaluator names are never shown.</p>
                </div>
                {groups.length === 0 ? (
                    <p className="feedback-warm-muted-card">No written comments are available for this published result.</p>
                ) : (
                    <div className="feedback-warm-question-comment-stack">
                        {groups.map((group) => (
                            <article className="feedback-warm-question-comment-card" key={group.key}>
                                <span>{group.sectionTitle || 'Question'}</span>
                                <strong>{group.questionText}</strong>
                                <div>
                                    {group.relationships.map((relationship) => (
                                        <section key={`${group.key}-${relationship.relationship}`}>
                                            <b>{relationship.label} feedback</b>
                                            <ul>{relationship.comments.map((comment, index) => <li key={`${group.key}-${relationship.relationship}-${index}`}>{comment}</li>)}</ul>
                                        </section>
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
        <section className="feedback-warm-score-explanation">
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
            <article className={`feedback-warm-result-card ${expanded ? 'expanded' : ''}`} key={campaign.key}>
                <button type="button" className="feedback-warm-result-head" onClick={() => toggleCampaign(campaign.key)} aria-expanded={expanded}>
                    <span><SectionIcon type="spark" /></span>
                    <div>
                        <h3>{campaign.campaignName}</h3>
                        <p>Published 360 feedback result</p>
                    </div>
                    <strong>{flags.includeOverallScore ? scoreText(score) : 'Published'}</strong>
                    <em>{expanded ? 'Hide' : 'View'}</em>
                </button>
                {expanded ? (
                    <div className="feedback-warm-result-body">
                        <section className="feedback-warm-result-document-header">
                            <p>ACE Data Systems Ltd.,</p>
                            <h2>360° Feedback Result</h2>
                            <div>
                                <span>Campaign: {campaign.campaignName}</span>
                                {summary?.publishedAt ? <span>Published: {formatDate(summary.publishedAt)}</span> : null}
                            </div>
                        </section>

                        {flags.includeOverallScore ? (
                            <section className="feedback-warm-overall-result">
                                <span>Overall result</span>
                                <strong>{scoreText(score)}</strong>
                                <em>{scoreCategory}</em>
                            </section>
                        ) : null}

                        {flags.includeSelfVsOthers ? renderSelfVsOthers(summary, campaign) : null}
                        {flags.includeCompetencyBreakdown ? renderCompetencyBreakdown(competencies) : null}
                        {flags.includeComments ? renderWrittenComments(campaign) : <p className="feedback-warm-muted-card">Written comments were not included by HR.</p>}
                        {flags.includeScoreExplanation ? renderScoreExplanation() : null}
                    </div>
                ) : null}
            </article>
        );
    };

    return (
        <div className="feedback-warm-page">
            <section className="feedback-warm-hero">
                <div>
                    <span>Private growth space</span>
                    <h1>{workspace.title}</h1>
                    <p>{workspace.description}</p>
                </div>
                <aside>
                    <span>{taskStats.open > 0 ? 'Next step' : 'All caught up'}</span>
                    <strong>{primaryTask && primaryTask.status !== 'SUBMITTED' ? `${relationshipLabel(primaryTask.relationshipType)} for ${primaryTask.targetEmployeeName}` : 'No open feedback requests'}</strong>
                    <p>{primaryTask && primaryTask.status !== 'SUBMITTED' ? `${progressCopy(primaryTask)} · ${daysUntil(primaryTask.dueAt)}` : 'New requests will appear here when HR launches a campaign.'}</p>
                    {primaryTask && primaryTask.status !== 'SUBMITTED' ? (
                        <Link className="feedback-warm-primary-link" to={`${workspace.homePath}/assignments/${primaryTask.assignmentId}`}>Continue feedback</Link>
                    ) : null}
                </aside>
            </section>

            <section className="feedback-warm-stat-grid" aria-label="360 feedback summary">
                <button type="button" onClick={() => setTaskStatusFilter('ALL')}><span>{taskStats.open}</span><strong>Open requests</strong></button>
                <button type="button" onClick={() => setTaskStatusFilter('ALL')}><span>{taskStats.dueSoon}</span><strong>Due soon</strong></button>
                <button type="button" onClick={() => setTaskStatusFilter('IN_PROGRESS')}><span>{taskStats.drafts}</span><strong>Drafts saved</strong></button>
                <button type="button" onClick={() => setTaskStatusFilter('SUBMITTED')}><span>{taskStats.completed}</span><strong>Completed</strong></button>
            </section>

            <section className="feedback-warm-section-card">
                <div className="feedback-warm-section-heading">
                    <div>
                        <span>Share with care</span>
                        <h2>Feedback to give</h2>
                        <p>Take your time. Clear examples help people grow.</p>
                    </div>
                    <div className="feedback-warm-filter-bar">
                        <input type="search" placeholder="Search employee or campaign" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                        <select value={taskCampaignFilter} onChange={(event) => setTaskCampaignFilter(event.target.value)}>
                            <option value="ALL">All campaigns</option>
                            {taskCampaignOptions.map((campaign) => <option key={`task-campaign-${campaign.id}`} value={String(campaign.id)}>{campaign.name}</option>)}
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
                </div>

                {tasksQuery.isLoading ? <div className="feedback-warm-empty-card">Loading assigned feedback...</div> : null}
                {tasksQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div> : null}
                {!tasksQuery.isLoading && !tasksQuery.error && sortedTasks.length === 0 ? (
                    <div className="feedback-warm-empty-card">
                        <strong>Nothing here right now.</strong>
                        <p>Your feedback requests will appear here when there is something to complete.</p>
                    </div>
                ) : null}
                {!tasksQuery.isLoading && !tasksQuery.error && sortedTasks.length > 0 ? (
                    <div className="feedback-warm-task-grid">{sortedTasks.map(renderTaskCard)}</div>
                ) : null}
            </section>

            {workspace.canSeeAboutMe ? (
                <section className="feedback-warm-section-card">
                    <div className="feedback-warm-section-heading simple">
                        <div>
                            <span>Growth insights</span>
                            <h2>My feedback results</h2>
                            <p>Your published 360 feedback results will appear here after HR releases them.</p>
                        </div>
                    </div>
                    {dashboardQuery.isLoading || resultSummaryQuery.isLoading ? <div className="feedback-warm-empty-card">Loading published feedback...</div> : null}
                    {dashboardQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{dashboardQuery.error.message}</div> : null}
                    {resultSummaryQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{resultSummaryQuery.error.message}</div> : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length === 0 ? (
                        <div className="feedback-warm-empty-card"><strong>No published results yet.</strong><p>Your feedback results will appear here when HR publishes them.</p></div>
                    ) : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length > 0 ? (
                        <div className="feedback-warm-result-list">{campaignGroups.map(renderCampaign)}</div>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
};

export default EmployeeFeedbackDashboardPage;
