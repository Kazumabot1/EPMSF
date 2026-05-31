import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackService } from '../../services/feedbackService';
import { feedbackAnalyticsApi } from '../../api/feedbackAnalyticsApi';
import type { FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackReceivedItem } from '../../types/feedback';
import type { FeedbackResultItem } from '../../types/feedbackAnalytics';
import {
    Feedback360Avatar,
    Feedback360Banner,
    Feedback360ButtonLink,
    Feedback360CardGrid,
    Feedback360EmptyState,
    Feedback360Hero,
    Feedback360Icon,
    Feedback360InlineList,
    Feedback360MetricCard,
    Feedback360MetricGrid,
    Feedback360Panel,
    Feedback360PanelHeader,
    Feedback360ProgressBar,
    Feedback360Select,
    Feedback360Shell,
    Feedback360StatusPill,
    Feedback360Toolbar,
    Feedback360VisuallyGrouped,
    Feedback360Input,
    cx,
} from '../../components/feedback360/Feedback360Ui';

type WorkspaceKind = 'employee' | 'manager' | 'departmentHead';
type TaskStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED';
type RelationshipFilter = 'ALL' | FeedbackRelationshipType;

type TaskBucket = {
    key: string;
    title: string;
    description: string;
    tasks: FeedbackEvaluatorTask[];
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
            return plural ? 'Subordinate reviewers' : 'Subordinate reviewer';
        case 'SELF':
            return plural ? 'Self reviews' : 'Self review';
        default:
            return type ? type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Evaluator';
    }
};

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

const statusTone = (task: FeedbackEvaluatorTask) => {
    if (isOverdue(task)) return 'danger' as const;
    switch (task.status) {
        case 'SUBMITTED':
            return 'success' as const;
        case 'IN_PROGRESS':
            return 'purple' as const;
        case 'CANCELLED':
        case 'DECLINED':
            return 'warning' as const;
        default:
            return 'info' as const;
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
    if (task.status === 'IN_PROGRESS') return 'Continue draft';
    return 'Start feedback';
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
            description: 'Complete your feedback assignments and review your own published growth results. Managed employee summaries stay in the manager summary area.',
        };
    }
    if (pathname.startsWith('/department-head/')) {
        return {
            kind: 'departmentHead',
            homePath: '/department-head/feedback',
            canSeeAboutMe: false,
            title: '360 Feedback',
            description: 'Complete the 360 feedback assignments personally assigned to you. Department summaries stay in the department summary area.',
        };
    }
    return {
        kind: 'employee',
        homePath: '/employee/feedback',
        canSeeAboutMe: true,
        title: '360 Feedback',
        description: 'A private space to share thoughtful feedback and review your published growth insights.',
    };
};

const buildSearchText = (task: FeedbackEvaluatorTask) => [
    task.targetEmployeeName,
    task.relationshipType,
    task.campaignName,
    task.status,
    task.campaignStatus,
].filter(Boolean).join(' ').toLowerCase();

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
        tasks.forEach((task) => campaigns.set(task.campaignId, task.campaignName || `Campaign #${task.campaignId}`));
        return Array.from(campaigns.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    }, [tasks]);

    const taskStats = useMemo(() => {
        const toComplete = tasks.filter((task) => task.status === 'PENDING').length;
        const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const submitted = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const publishedResults = new Set(ownResults.map((item) => item.campaignId)).size;
        return { toComplete, inProgress, submitted, publishedResults };
    }, [ownResults, tasks]);

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

    const taskBuckets = useMemo<TaskBucket[]>(() => [
        {
            key: 'to-complete',
            title: 'To complete',
            description: 'Not started yet. Open the assignment and complete each rating with a comment.',
            tasks: sortedTasks.filter((task) => task.status === 'PENDING'),
        },
        {
            key: 'in-progress',
            title: 'In progress',
            description: 'Drafts you already started and can still edit while the campaign is open.',
            tasks: sortedTasks.filter((task) => task.status === 'IN_PROGRESS'),
        },
        {
            key: 'submitted',
            title: 'Submitted',
            description: 'Final feedback that is locked and available only as read-only.',
            tasks: sortedTasks.filter((task) => task.status === 'SUBMITTED'),
        },
    ], [sortedTasks]);

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
        return (
            <Feedback360VisuallyGrouped className={cx('f360-task-card', isOverdue(task) && 'f360-overdue')} key={task.assignmentId}>
                <Feedback360Avatar name={task.targetEmployeeName} />
                <div>
                    <Feedback360InlineList>
                        <Feedback360StatusPill tone="brand">{relationshipLabel(task.relationshipType)}</Feedback360StatusPill>
                        <Feedback360StatusPill tone={statusTone(task)}>{statusLabel(task)}</Feedback360StatusPill>
                    </Feedback360InlineList>
                    <h3>{task.targetEmployeeName}</h3>
                    <p>{task.campaignName}</p>
                    <Feedback360ProgressBar value={progress} label={progressCopy(task)} />
                    <small>{progressCopy(task)} · {daysUntil(task.dueAt)}</small>
                </div>
                <div className="f360-task-action">
                    <Feedback360ButtonLink to={`${workspace.homePath}/assignments/${task.assignmentId}`} variant={task.status === 'SUBMITTED' ? 'secondary' : 'primary'}>
                        {taskActionLabel(task)}
                    </Feedback360ButtonLink>
                </div>
            </Feedback360VisuallyGrouped>
        );
    };

    const renderTaskBucket = (bucket: TaskBucket) => (
        <Feedback360Panel key={bucket.key}>
            <Feedback360PanelHeader
                compact
                eyebrow={`${bucket.tasks.length} assignment${bucket.tasks.length === 1 ? '' : 's'}`}
                title={bucket.title}
                description={bucket.description}
            />
            <Feedback360CardGrid>{bucket.tasks.map(renderTaskCard)}</Feedback360CardGrid>
        </Feedback360Panel>
    );

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
            <Feedback360Panel>
                <Feedback360PanelHeader compact title="Self vs others" description="See how your self-view compares with feedback from other groups." />
                <div className="f360-score-grid">
                    {rows.map((row) => (
                        <div className="f360-score-cell" key={row.relationship}>
                            <span>{row.label}</span>
                            <strong>{row.allowed && row.score != null ? scoreText(row.score) : 'Not enough feedback'}</strong>
                        </div>
                    ))}
                </div>
            </Feedback360Panel>
        );
    };

    const renderCompetencyBreakdown = (competencies: CompetencyResult[]) => {
        if (competencies.length === 0) {
            return <Feedback360EmptyState title="Competency breakdown is not available." description="This published result does not include enough mapped competency data." />;
        }
        const strongest = competencies.slice(0, 3);
        const development = competencies.length > 3 ? [...competencies].sort((a, b) => a.averageScore - b.averageScore || a.name.localeCompare(b.name)).slice(0, 3) : [];

        return (
            <>
                <Feedback360Panel>
                    <Feedback360PanelHeader compact title="Competency breakdown" description="Average score by competency from the published feedback set." />
                    <div className="f360-section-grid">
                        {competencies.map((competency) => (
                            <div className="f360-competency-row" key={competency.key}>
                                <div>
                                    <strong>{competency.name}</strong>
                                    <span>{competency.responseCount} rating{competency.responseCount === 1 ? '' : 's'}</span>
                                </div>
                                <div>
                                    <b>{scoreText(competency.averageScore)}</b>
                                    <Feedback360ProgressBar value={competency.averageScore} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Feedback360Panel>
                <div className="f360-strength-grid">
                    <Feedback360Panel>
                        <Feedback360PanelHeader compact title="Strengths" />
                        <ul>{strongest.map((competency) => <li key={`strength-${competency.key}`}>{competency.name}</li>)}</ul>
                    </Feedback360Panel>
                    <Feedback360Panel>
                        <Feedback360PanelHeader compact title="Development areas" />
                        {development.length > 0 ? <ul>{development.map((competency) => <li key={`development-${competency.key}`}>{competency.name}</li>)}</ul> : <p>Not enough competency data to identify development areas.</p>}
                    </Feedback360Panel>
                </div>
            </>
        );
    };

    const renderWrittenComments = (campaign: CampaignGroup) => {
        const groups = buildQuestionCommentGroups(campaign.items);
        return (
            <Feedback360Panel>
                <Feedback360PanelHeader compact title="Written comments" description="Comments are grouped by question and evaluator group. Evaluator names are never shown." />
                {groups.length === 0 ? (
                    <Feedback360EmptyState title="No written comments are available." description="HR may have hidden comments or the campaign may not include comment publishing." />
                ) : (
                    <div className="f360-section-grid">
                        {groups.map((group) => (
                            <article className="f360-question-comment-card" key={group.key}>
                                <span>{group.sectionTitle || 'Competency'}</span>
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
            </Feedback360Panel>
        );
    };

    const renderScoreExplanation = () => (
        <Feedback360Panel>
            <Feedback360PanelHeader compact title="Score explanation" />
            <div className="f360-score-grid">
                <div className="f360-score-cell"><span>86–100</span><strong>Outstanding</strong></div>
                <div className="f360-score-cell"><span>71–85</span><strong>Good</strong></div>
                <div className="f360-score-cell"><span>60–70</span><strong>Meets requirement</strong></div>
                <div className="f360-score-cell"><span>40–59</span><strong>Needs improvement</strong></div>
                <div className="f360-score-cell"><span>0–39</span><strong>Unsatisfactory</strong></div>
            </div>
        </Feedback360Panel>
    );

    const renderCampaign = (campaign: CampaignGroup) => {
        const expanded = Boolean(expandedCampaigns[campaign.key]);
        const summary = summaryByCampaignId.get(campaign.campaignId);
        const flags = publishContentFlags(summary, campaign);
        const competencies = buildCompetencyResults(campaign.items);
        const score = summary?.averageScore ?? averageScore(campaign.items.map((item) => item.item.overallScore));
        const scoreCategory = bandText(score, summary?.scoreCategory);
        return (
            <Feedback360VisuallyGrouped key={campaign.key}>
                <button type="button" className="f360-result-head" onClick={() => toggleCampaign(campaign.key)} aria-expanded={expanded}>
                    <span className="f360-result-icon"><Feedback360Icon type="spark" /></span>
                    <div>
                        <h3>{campaign.campaignName}</h3>
                        <p>Published 360 feedback result</p>
                    </div>
                    <strong className="f360-result-score">{flags.includeOverallScore ? scoreText(score) : 'Published'}</strong>
                    <Feedback360StatusPill tone={expanded ? 'brand' : 'neutral'}>{expanded ? 'Hide' : 'View'}</Feedback360StatusPill>
                </button>
                {expanded ? (
                    <div className="f360-result-body">
                        <section className="f360-document-header">
                            <p>ACE Data Systems Ltd.,</p>
                            <h2>360° Feedback Result</h2>
                            <div>
                                <span>Campaign: {campaign.campaignName}</span>
                                {summary?.publishedAt ? <span>Published: {formatDate(summary.publishedAt)}</span> : null}
                            </div>
                        </section>

                        {flags.includeOverallScore ? (
                            <section className="f360-overall-score">
                                <span>Overall result</span>
                                <strong>{scoreText(score)}</strong>
                                <em>{scoreCategory}</em>
                            </section>
                        ) : null}

                        {flags.includeSelfVsOthers ? renderSelfVsOthers(summary, campaign) : null}
                        {flags.includeCompetencyBreakdown ? renderCompetencyBreakdown(competencies) : null}
                        {flags.includeComments ? renderWrittenComments(campaign) : <Feedback360EmptyState title="Written comments were not included by HR." />}
                        {flags.includeScoreExplanation ? renderScoreExplanation() : null}
                    </div>
                ) : null}
            </Feedback360VisuallyGrouped>
        );
    };

    const openAssignmentCount = taskStats.toComplete + taskStats.inProgress;

    return (
        <Feedback360Shell>
            <Feedback360Hero
                eyebrow="360 feedback workspace"
                title={workspace.title}
                description={workspace.description}
                aside={(
                    <>
                        <span>{openAssignmentCount > 0 ? 'Next assignment' : 'All caught up'}</span>
                        <strong>{primaryTask && primaryTask.status !== 'SUBMITTED' ? `${relationshipLabel(primaryTask.relationshipType)} for ${primaryTask.targetEmployeeName}` : 'No open feedback assignments'}</strong>
                        <p>{primaryTask && primaryTask.status !== 'SUBMITTED' ? `${progressCopy(primaryTask)} · ${daysUntil(primaryTask.dueAt)}` : 'New assignments will appear here when HR launches a campaign.'}</p>
                        {primaryTask && primaryTask.status !== 'SUBMITTED' ? (
                            <Feedback360ButtonLink to={`${workspace.homePath}/assignments/${primaryTask.assignmentId}`}>Continue feedback</Feedback360ButtonLink>
                        ) : null}
                    </>
                )}
            />

            <Feedback360MetricGrid>
                <Feedback360MetricCard value={taskStats.toComplete} label="To complete" tone="info" onClick={() => setTaskStatusFilter('PENDING')} />
                <Feedback360MetricCard value={taskStats.inProgress} label="In progress" tone="purple" onClick={() => setTaskStatusFilter('IN_PROGRESS')} />
                <Feedback360MetricCard value={taskStats.submitted} label="Submitted" tone="success" onClick={() => setTaskStatusFilter('SUBMITTED')} />
                <Feedback360MetricCard value={taskStats.publishedResults} label="Published result available" tone="brand" onClick={() => setTaskStatusFilter('ALL')} />
            </Feedback360MetricGrid>

            <Feedback360Panel>
                <Feedback360PanelHeader
                    eyebrow="My assignments"
                    title="Feedback to complete"
                    description="These are only the 360 feedback assignments personally assigned to you. Every question uses rating 1–5 with a required supporting comment."
                    actions={(
                        <Feedback360Toolbar>
                            <Feedback360Input type="search" placeholder="Search employee or campaign" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                            <Feedback360Select value={taskCampaignFilter} onChange={(event) => setTaskCampaignFilter(event.target.value)}>
                                <option value="ALL">All campaigns</option>
                                {taskCampaignOptions.map((campaign) => <option key={`task-campaign-${campaign.id}`} value={String(campaign.id)}>{campaign.name}</option>)}
                            </Feedback360Select>
                            <Feedback360Select value={taskRelationshipFilter} onChange={(event) => setTaskRelationshipFilter(event.target.value as RelationshipFilter)}>
                                <option value="ALL">All relationships</option>
                                <option value="MANAGER">Manager</option>
                                <option value="PEER">Peer</option>
                                <option value="SUBORDINATE">Subordinate reviewer</option>
                                <option value="SELF">Self</option>
                            </Feedback360Select>
                            <Feedback360Select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}>
                                <option value="ALL">All statuses</option>
                                <option value="PENDING">Not started</option>
                                <option value="IN_PROGRESS">Draft saved</option>
                                <option value="SUBMITTED">Completed</option>
                            </Feedback360Select>
                        </Feedback360Toolbar>
                    )}
                />

                {tasksQuery.isLoading ? <Feedback360EmptyState title="Loading assigned feedback..." /> : null}
                {tasksQuery.error instanceof Error ? <Feedback360Banner tone="danger">{tasksQuery.error.message}</Feedback360Banner> : null}
                {!tasksQuery.isLoading && !tasksQuery.error && sortedTasks.length === 0 ? (
                    <Feedback360EmptyState title="No feedback assignments right now." description="Your feedback assignments will appear here when there is something to complete." />
                ) : null}
            </Feedback360Panel>

            {!tasksQuery.isLoading && !tasksQuery.error && sortedTasks.length > 0 ? (
                <div>{taskBuckets.filter((bucket) => bucket.tasks.length > 0).map(renderTaskBucket)}</div>
            ) : null}

            {workspace.canSeeAboutMe ? (
                <Feedback360Panel>
                    <Feedback360PanelHeader
                        compact
                        eyebrow="Published result available"
                        title="My published 360 results"
                        description="Published results are separate from assignments you need to complete. Some feedback may be hidden when the confidentiality threshold is not met."
                    />
                    {dashboardQuery.isLoading || resultSummaryQuery.isLoading ? <Feedback360EmptyState title="Loading published feedback..." /> : null}
                    {dashboardQuery.error instanceof Error ? <Feedback360Banner tone="danger">{dashboardQuery.error.message}</Feedback360Banner> : null}
                    {resultSummaryQuery.error instanceof Error ? <Feedback360Banner tone="danger">{resultSummaryQuery.error.message}</Feedback360Banner> : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length === 0 ? (
                        <Feedback360EmptyState title="No published results yet." description="Your feedback results will appear here when HR publishes them." />
                    ) : null}
                    {!dashboardQuery.isLoading && !resultSummaryQuery.isLoading && !dashboardQuery.error && !resultSummaryQuery.error && campaignGroups.length > 0 ? (
                        <div className="f360-section-grid">{campaignGroups.map(renderCampaign)}</div>
                    ) : null}
                </Feedback360Panel>
            ) : null}
        </Feedback360Shell>
    );
};

export default EmployeeFeedbackDashboardPage;
