import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import type { FeedbackAssignmentStatus, FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const isOverdue = (task: FeedbackEvaluatorTask) => {
  if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) {
    return false;
  }
  return new Date(task.dueAt).getTime() < Date.now();
};

const taskTone = (status: FeedbackAssignmentStatus, overdue = false) => {
  if (overdue) return 'danger';
  switch (status) {
    case 'SUBMITTED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'DECLINED':
    case 'CANCELLED':
      return 'muted';
    default:
      return 'info';
  }
};

const relationshipLabel = (type: FeedbackRelationshipType) => {
  switch (type) {
    case 'MANAGER':
      return 'Manager feedback';
    case 'PEER':
      return 'Peer feedback';
    case 'SUBORDINATE':
      return 'Subordinate feedback';
    case 'SELF':
      return 'Self review';
    default:
      return type;
  }
};

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

type FilterKey = 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'ALL';

const MyTasksPage = () => {
  const tasksQuery = useMyFeedbackTasks();
  const [filter, setFilter] = useState<FilterKey>('OPEN');

  const tasks = tasksQuery.data ?? [];
  const stats = useMemo(() => {
    const submitted = tasks.filter((task) => task.status === 'SUBMITTED').length;
    const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter(isOverdue).length;
    const open = tasks.filter((task) => task.canSubmit).length;
    return { total: tasks.length, open, inProgress, submitted, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'ALL') return tasks;
    if (filter === 'OPEN') return tasks.filter((task) => task.canSubmit);
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  return (
      <div className="feedback-evaluator-stack">
        <section className="feedback-evaluator-hero feedback-evaluator-hero-compact">
          <div className="feedback-evaluator-metric">
            <span>Total assignments</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="feedback-evaluator-metric">
            <span>Open tasks</span>
            <strong>{stats.open}</strong>
          </div>
          <div className="feedback-evaluator-metric">
            <span>In progress</span>
            <strong>{stats.inProgress}</strong>
          </div>
          <div className={`feedback-evaluator-metric ${stats.overdue > 0 ? 'is-danger' : ''}`}>
            <span>Overdue</span>
            <strong>{stats.overdue}</strong>
          </div>
        </section>

        {tasksQuery.isLoading ? (
            <div className="feedback-evaluator-empty">Loading your feedback assignments...</div>
        ) : tasksQuery.error instanceof Error ? (
            <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div>
        ) : tasks.length === 0 ? (
            <div className="feedback-evaluator-empty">
              No feedback assignments are currently assigned to you.
            </div>
        ) : (
            <section className="feedback-evaluator-card">
              <div className="feedback-evaluator-card-header feedback-evaluator-card-header-wrap">
                <div>
                  <p className="feedback-workspace-kicker">Assigned work</p>
                  <h2>My feedback tasks</h2>
                  <span>Draft campaigns stay hidden until HR activates them. Closed campaigns are read-only.</span>
                </div>

                <div className="feedback-evaluator-filter-group" aria-label="Filter feedback tasks">
                  {([
                    ['OPEN', 'Open'],
                    ['IN_PROGRESS', 'Drafts'],
                    ['SUBMITTED', 'Submitted'],
                    ['ALL', 'All'],
                  ] as Array<[FilterKey, string]>).map(([key, label]) => (
                      <button
                          key={key}
                          className={filter === key ? 'active' : ''}
                          type="button"
                          onClick={() => setFilter(key)}
                      >
                        {label}
                      </button>
                  ))}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                  <div className="feedback-evaluator-empty">No assignments match this filter.</div>
              ) : (
                  <div className="feedback-evaluator-task-grid">
                    {filteredTasks.map((task) => {
                      const overdue = isOverdue(task);
                      return (
                          <article key={task.assignmentId} className="feedback-evaluator-task-card">
                            <div className="feedback-evaluator-task-topline">
                      <span className={`feedback-evaluator-status ${taskTone(task.status, overdue)}`}>
                        {overdue ? 'OVERDUE' : task.status.replace('_', ' ')}
                      </span>
                              {task.anonymous ? (
                                  <small className="feedback-evaluator-anonymous-pill">Anonymous</small>
                              ) : null}
                            </div>

                            <div className="feedback-evaluator-person-row">
                              <div className="feedback-evaluator-avatar">{initials(task.targetEmployeeName)}</div>
                              <div>
                                <strong>{task.targetEmployeeName}</strong>
                                <span>{relationshipLabel(task.relationshipType)}</span>
                              </div>
                            </div>

                            <div className="feedback-evaluator-task-meta">
                              <div>
                                <span>Campaign</span>
                                <strong>{task.campaignName}</strong>
                                <small>{task.campaignStatus}</small>
                              </div>
                              <div>
                                <span>Deadline</span>
                                <strong>{formatDateTime(task.dueAt)}</strong>
                              </div>
                              {task.submittedAt ? (
                                  <div>
                                    <span>Submitted</span>
                                    <strong>{formatDateTime(task.submittedAt)}</strong>
                                  </div>
                              ) : null}
                            </div>

                            {task.lifecycleMessage ? (
                                <div className={`feedback-evaluator-banner ${task.canSubmit ? 'info' : 'warning'} compact`}>
                                  {task.lifecycleMessage}
                                </div>
                            ) : null}

                            <Link
                                className="feedback-evaluator-primary feedback-evaluator-task-action"
                                to={`/feedback/assignments/${task.assignmentId}`}
                            >
                              {task.status === 'SUBMITTED' ? 'View submission' : task.canSubmit ? (task.status === 'IN_PROGRESS' ? 'Continue draft' : 'Open form') : 'View read-only'}
                            </Link>
                          </article>
                      );
                    })}
                  </div>
              )}
            </section>
        )}
      </div>
  );
};

export default MyTasksPage;
