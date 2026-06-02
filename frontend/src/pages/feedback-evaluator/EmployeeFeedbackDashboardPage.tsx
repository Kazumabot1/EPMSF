import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackAnalyticsApi } from '../../api/feedbackAnalyticsApi';
import type { FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackCompetencyResult, FeedbackPublishedComment, FeedbackResultItem } from '../../types/feedbackAnalytics';
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

type PublishedRelationshipRow = {
    relationship: FeedbackRelationshipType;
    label: string;
    score?: number | null;
    count: number;
    visible: boolean;
    hiddenReason?: string | null;
};

type PublishedCommentGroup = {
    key: string;
    title: string;
    items: FeedbackPublishedComment[];
};

const MS_PER_DAY = 86_400_000;
const RELATIONSHIP_ORDER: FeedbackRelationshipType[] = ['SELF', 'MANAGER', 'PEER', 'SUBORDINATE'];

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
    if (!value) return 'Not published yet';
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

const sectionAllowed = (value?: boolean | null) => value === true;

const privacyForRelationship = (result: FeedbackResultItem, relationship: FeedbackRelationshipType) => (
    result.relationshipPrivacy?.find((item) => item.relationshipType === relationship)
);

const relationshipScore = (result: FeedbackResultItem, relationship: FeedbackRelationshipType) => {
    switch (relationship) {
        case 'SELF':
            return result.selfAverageScore ?? null;
        case 'MANAGER':
            return result.managerAverageScore ?? null;
        case 'PEER':
            return result.peerAverageScore ?? null;
        case 'SUBORDINATE':
            return result.subordinateAverageScore ?? null;
        default:
            return null;
    }
};

const relationshipCount = (result: FeedbackResultItem, relationship: FeedbackRelationshipType) => {
    switch (relationship) {
        case 'SELF':
            return result.selfResponses ?? 0;
        case 'MANAGER':
            return result.managerResponses ?? 0;
        case 'PEER':
            return result.peerResponses ?? 0;
        case 'SUBORDINATE':
            return result.subordinateResponses ?? 0;
        default:
            return 0;
    }
};

const buildRelationshipRows = (result: FeedbackResultItem): PublishedRelationshipRow[] => RELATIONSHIP_ORDER.map((relationship) => {
    const privacy = privacyForRelationship(result, relationship);
    const count = relationshipCount(result, relationship);
    const score = relationshipScore(result, relationship);
    const visible = privacy?.visibleOutsideHr ?? score != null;
    return {
        relationship,
        label: privacy?.label ?? relationshipLabel(relationship),
        score,
        count,
        visible,
        hiddenReason: privacy?.hiddenReason ?? null,
    };
});

const groupedPublishedComments = (comments?: FeedbackPublishedComment[]): PublishedCommentGroup[] => {
    const groups = new Map<string, PublishedCommentGroup>();
    (comments ?? [])
        .filter((comment) => comment.comment?.trim())
        .forEach((comment) => {
            const title = comment.competencyName?.trim()
                || comment.competencyCode?.trim()
                || comment.questionText?.trim()
                || 'Other feedback';
            const key = title.toLowerCase();
            if (!groups.has(key)) {
                groups.set(key, { key, title, items: [] });
            }
            groups.get(key)?.items.push(comment);
        });
    return Array.from(groups.values()).sort((a, b) => a.title.localeCompare(b.title));
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
    const resultSummaryQuery = useQuery({
        queryKey: ['feedback-my-result', workspace.kind],
        queryFn: feedbackAnalyticsApi.getMyResult,
        enabled: workspace.canSeeAboutMe,
    });

    const tasks = tasksQuery.data ?? [];
    const resultSummaries = resultSummaryQuery.data?.results ?? [];

    const publishedResults = useMemo(() => [...resultSummaries].sort((a, b) => {
        const left = new Date(a.publishedAt ?? a.summarizedAt ?? '').getTime();
        const right = new Date(b.publishedAt ?? b.summarizedAt ?? '').getTime();
        const normalizedLeft = Number.isNaN(left) ? 0 : left;
        const normalizedRight = Number.isNaN(right) ? 0 : right;
        return normalizedRight - normalizedLeft || b.campaignId - a.campaignId;
    }), [resultSummaries]);

    const taskCampaignOptions = useMemo(() => {
        const campaigns = new Map<number, string>();
        tasks.forEach((task) => campaigns.set(task.campaignId, task.campaignName || `Campaign #${task.campaignId}`));
        return Array.from(campaigns.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    }, [tasks]);

    const taskStats = useMemo(() => {
        const toComplete = tasks.filter((task) => task.status === 'PENDING').length;
        const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const submitted = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const publishedResultsCount = resultSummaries.length;
        return { toComplete, inProgress, submitted, publishedResults: publishedResultsCount };
    }, [resultSummaries.length, tasks]);

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

    const renderLockedSection = (title: string, description = 'HR did not include this section in the published result.') => (
        <Feedback360EmptyState title={title} description={description} />
    );

    const renderOverallScore = (result: FeedbackResultItem) => (
        <section className="f360-overall-score">
            <span>Overall result</span>
            <strong>{scoreText(result.averageScore)}</strong>
            <em>{bandText(result.averageScore, result.scoreCategory)}</em>
        </section>
    );

    const renderSelfVsOthers = (result: FeedbackResultItem) => {
        const rows = buildRelationshipRows(result);
        return (
            <Feedback360Panel>
                <Feedback360PanelHeader compact title="Self vs others" description="Only privacy-safe relationship summaries are shown. Protected groups stay hidden when the response threshold is not met." />
                <div className="f360-score-grid">
                    {rows.map((row) => (
                        <div className="f360-score-cell" key={row.relationship}>
                            <span>{row.label}</span>
                            <strong>{row.visible && row.score != null ? scoreText(row.score) : 'Hidden for privacy'}</strong>
                            <small>{row.visible ? `${row.count} response${row.count === 1 ? '' : 's'}` : row.hiddenReason ?? 'Not enough feedback to show safely'}</small>
                        </div>
                    ))}
                </div>
            </Feedback360Panel>
        );
    };

    const renderCompetencyBreakdown = (competencies?: FeedbackCompetencyResult[]) => {
        const safeCompetencies = competencies ?? [];
        if (safeCompetencies.length === 0) {
            return <Feedback360EmptyState title="Competency breakdown is not available." description="This published result does not include enough mapped competency data." />;
        }
        const sortedCompetencies = [...safeCompetencies].sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1) || a.competencyName.localeCompare(b.competencyName));
        const strongest = sortedCompetencies.slice(0, 3);
        const development = sortedCompetencies.length > 3
            ? [...sortedCompetencies].sort((a, b) => (a.averageScore ?? 101) - (b.averageScore ?? 101) || a.competencyName.localeCompare(b.competencyName)).slice(0, 3)
            : [];

        return (
            <>
                <Feedback360Panel>
                    <Feedback360PanelHeader compact title="Competency breakdown" description="Average score by competency from the published privacy-safe summary." />
                    <div className="f360-section-grid">
                        {sortedCompetencies.map((competency) => (
                            <div className="f360-competency-row" key={competency.competencyCode || competency.competencyName}>
                                <div>
                                    <strong>{competency.competencyName}</strong>
                                    <span>{competency.responseCount} rating{competency.responseCount === 1 ? '' : 's'} · {competency.questionCount} question{competency.questionCount === 1 ? '' : 's'}</span>
                                </div>
                                <div>
                                    <b>{scoreText(competency.averageScore)}</b>
                                    <Feedback360ProgressBar value={competency.averageScore ?? 0} />
                                </div>
                                {competency.relationshipBreakdown?.length ? (
                                    <div className="f360-score-grid">
                                        {competency.relationshipBreakdown.map((row) => (
                                            <div className="f360-score-cell" key={`${competency.competencyCode}-${row.relationshipType}`}>
                                                <span>{row.label ?? relationshipLabel(row.relationshipType)}</span>
                                                <strong>{row.visibleOutsideHr === false ? 'Hidden for privacy' : scoreText(row.averageScore)}</strong>
                                                <small>{row.visibleOutsideHr === false ? row.hiddenReason ?? 'Not enough feedback to show safely' : `${row.responseCount} response${row.responseCount === 1 ? '' : 's'}`}</small>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </Feedback360Panel>
                <div className="f360-strength-grid">
                    <Feedback360Panel>
                        <Feedback360PanelHeader compact title="Strengths" />
                        <ul>{strongest.map((competency) => <li key={`strength-${competency.competencyCode || competency.competencyName}`}>{competency.competencyName}</li>)}</ul>
                    </Feedback360Panel>
                    <Feedback360Panel>
                        <Feedback360PanelHeader compact title="Development areas" />
                        {development.length > 0 ? <ul>{development.map((competency) => <li key={`development-${competency.competencyCode || competency.competencyName}`}>{competency.competencyName}</li>)}</ul> : <p>Not enough competency data to identify development areas.</p>}
                    </Feedback360Panel>
                </div>
            </>
        );
    };

    const renderWrittenComments = (result: FeedbackResultItem) => {
        const groups = groupedPublishedComments(result.comments);
        return (
            <Feedback360Panel>
                <Feedback360PanelHeader compact title="Written comments" description="Only comments approved for publication and safe to show are displayed. Evaluator names are never shown." />
                {groups.length === 0 ? (
                    <Feedback360EmptyState title="No written comments are available." description="HR may have hidden comments or the confidentiality threshold may not be met." />
                ) : (
                    <div className="f360-section-grid">
                        {groups.map((group) => (
                            <article className="f360-question-comment-card" key={group.key}>
                                <span>{group.title}</span>
                                <div>
                                    {group.items.map((comment, index) => (
                                        <section key={`${group.key}-${comment.relationshipType}-${index}`}>
                                            <b>{comment.label ?? relationshipLabel(comment.relationshipType)} feedback</b>
                                            {comment.questionText ? <small>{comment.questionText}</small> : null}
                                            <ul><li>{comment.comment}</li></ul>
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

    const renderScoreExplanation = (result: FeedbackResultItem) => (
        <Feedback360Panel>
            <Feedback360PanelHeader compact title="Score explanation" description="This note explains how HR published the visible result." />
            <div className="f360-score-grid">
                <div className="f360-score-cell"><span>Method</span><strong>{result.scoreCalculationMethod?.replace(/_/g, ' ') || 'Published summary'}</strong></div>
                <div className="f360-score-cell"><span>Confidence</span><strong>{result.confidenceLevel?.replace(/_/g, ' ') || 'Not available'}</strong></div>
                <div className="f360-score-cell"><span>Total responses</span><strong>{result.totalResponses}</strong></div>
                <div className="f360-score-cell"><span>Completion</span><strong>{typeof result.completionRate === 'number' ? `${result.completionRate.toFixed(0)}%` : 'Not available'}</strong></div>
            </div>
            {result.scoreCalculationNote ? <p>{result.scoreCalculationNote}</p> : null}
            {result.publishNote ? <p>{result.publishNote}</p> : null}
            <div className="f360-score-grid">
                <div className="f360-score-cell"><span>86–100</span><strong>Outstanding</strong></div>
                <div className="f360-score-cell"><span>71–85</span><strong>Good</strong></div>
                <div className="f360-score-cell"><span>60–70</span><strong>Meets requirement</strong></div>
                <div className="f360-score-cell"><span>40–59</span><strong>Needs improvement</strong></div>
                <div className="f360-score-cell"><span>0–39</span><strong>Unsatisfactory</strong></div>
            </div>
        </Feedback360Panel>
    );

    const renderPrivacyExplanation = () => (
        <Feedback360Banner tone="info">
            Peer and subordinate feedback is shown only as aggregated, privacy-safe data. When a group does not meet the confidentiality threshold, its score and comments stay hidden.
        </Feedback360Banner>
    );

    const renderPublishedResult = (result: FeedbackResultItem) => {
        const key = `${result.campaignId}-${result.targetEmployeeId}-${result.publishedAt ?? result.summarizedAt}`;
        const expanded = Boolean(expandedCampaigns[key]);
        return (
            <Feedback360VisuallyGrouped key={key}>
                <button type="button" className="f360-result-head" onClick={() => toggleCampaign(key)} aria-expanded={expanded}>
                    <span className="f360-result-icon"><Feedback360Icon type="spark" /></span>
                    <div>
                        <h3>{result.campaignName}</h3>
                        <p>Published 360 feedback result</p>
                    </div>
                    <strong className="f360-result-score">{sectionAllowed(result.includeOverallScore) ? scoreText(result.averageScore) : 'Published'}</strong>
                    <Feedback360StatusPill tone={expanded ? 'brand' : 'neutral'}>{expanded ? 'Hide' : 'View'}</Feedback360StatusPill>
                </button>
                {expanded ? (
                    <div className="f360-result-body">
                        <section className="f360-document-header">
                            <p>ACE Data Systems Ltd.,</p>
                            <h2>360° Feedback Result</h2>
                            <div>
                                <span>Campaign: {result.campaignName}</span>
                                <span>Published: {formatDate(result.publishedAt)}</span>
                            </div>
                        </section>

                        {sectionAllowed(result.includeOverallScore) ? renderOverallScore(result) : renderLockedSection('Overall score was not included by HR.')}
                        {sectionAllowed(result.includeSelfVsOthers) ? renderSelfVsOthers(result) : renderLockedSection('Self vs others was not included by HR.')}
                        {sectionAllowed(result.includeCompetencyBreakdown) ? renderCompetencyBreakdown(result.competencyBreakdown) : renderLockedSection('Competency breakdown was not included by HR.')}
                        {sectionAllowed(result.includeComments) ? renderWrittenComments(result) : renderLockedSection('Written comments were not included by HR.')}
                        {sectionAllowed(result.includeScoreExplanation) ? renderScoreExplanation(result) : null}
                        {renderPrivacyExplanation()}
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
                />

                <div className="f360-assignment-toolbar-row">
                    <Feedback360Toolbar>
                        <Feedback360Input
                            className="f360-assignment-search"
                            type="search"
                            placeholder="Search employee or campaign"
                            value={taskSearch}
                            onChange={(event) => setTaskSearch(event.target.value)}
                        />
                        <Feedback360Select
                            className="f360-assignment-filter"
                            value={taskCampaignFilter}
                            onChange={(event) => setTaskCampaignFilter(event.target.value)}
                        >
                            <option value="ALL">All campaigns</option>
                            {taskCampaignOptions.map((campaign) => <option key={`task-campaign-${campaign.id}`} value={String(campaign.id)}>{campaign.name}</option>)}
                        </Feedback360Select>
                        <Feedback360Select
                            className="f360-assignment-filter"
                            value={taskRelationshipFilter}
                            onChange={(event) => setTaskRelationshipFilter(event.target.value as RelationshipFilter)}
                        >
                            <option value="ALL">All relationships</option>
                            <option value="MANAGER">Manager</option>
                            <option value="PEER">Peer</option>
                            <option value="SUBORDINATE">Subordinate reviewer</option>
                            <option value="SELF">Self</option>
                        </Feedback360Select>
                        <Feedback360Select
                            className="f360-assignment-filter"
                            value={taskStatusFilter}
                            onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}
                        >
                            <option value="ALL">All statuses</option>
                            <option value="PENDING">Not started</option>
                            <option value="IN_PROGRESS">Draft saved</option>
                            <option value="SUBMITTED">Completed</option>
                        </Feedback360Select>
                    </Feedback360Toolbar>
                </div>

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
                    {resultSummaryQuery.isLoading ? <Feedback360EmptyState title="Loading published feedback..." /> : null}
                    {resultSummaryQuery.error instanceof Error ? <Feedback360Banner tone="danger">{resultSummaryQuery.error.message}</Feedback360Banner> : null}
                    {!resultSummaryQuery.isLoading && !resultSummaryQuery.error && publishedResults.length === 0 ? (
                        <Feedback360EmptyState title="No published results yet." description="Your feedback results will appear here when HR publishes them." />
                    ) : null}
                    {!resultSummaryQuery.isLoading && !resultSummaryQuery.error && publishedResults.length > 0 ? (
                        <div className="f360-section-grid">{publishedResults.map(renderPublishedResult)}</div>
                    ) : null}
                </Feedback360Panel>
            ) : null}
        </Feedback360Shell>
    );
};

export default EmployeeFeedbackDashboardPage;
