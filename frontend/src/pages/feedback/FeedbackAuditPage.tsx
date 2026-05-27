import { useState } from 'react';
import { feedbackService } from '../../services/feedbackService';
import type { AuditLogEntry } from '../../types/feedback';
import { EmptyState, RecentIdList, SectionIntro, auditEntityLabel, auditEntityOptions, formatDateTime, loadRecentIds } from './feedback-ui';

const prettyValue = (value?: string | null) => {
  if (!value) {
    return 'No value recorded.';
  }

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

const FeedbackAuditPage = () => {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [recentCampaignIds] = useState<number[]>(() => loadRecentIds('campaigns'));
  const [recentAssignmentIds] = useState<number[]>(() => loadRecentIds('requests'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    try {
      setBusy(true);
      setError('');
      const data = await feedbackService.getAuditLogs(
          entityType || undefined,
          entityId.trim() ? Number(entityId) : undefined,
      );
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs.');
    } finally {
      setBusy(false);
    }
  };

  return (
      <div className="feedback-stack">
        <div className="feedback-module-grid">
          <section className="feedback-panel soft">
            <SectionIntro
                title="Audit filters"
                body="Filter feedback audit history by record type and reference number."
            />

            <div className="feedback-form-grid">
              <div className="feedback-field">
                <label htmlFor="audit-entity-type">Record type</label>
                <input
                    id="audit-entity-type"
                    className="kpi-input"
                    list="feedback-audit-entity-types"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    placeholder="Example: ASSIGNMENT"
                />
                <datalist id="feedback-audit-entity-types">
                  {auditEntityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </datalist>
              </div>

              <div className="feedback-field">
                <label htmlFor="audit-entity-id">Record reference number</label>
                <input
                    id="audit-entity-id"
                    className="kpi-input"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="Example: 88"
                />
              </div>
            </div>

            <div className="feedback-actions">
              <button className="kpi-btn-ghost" disabled={busy} onClick={() => void loadLogs()}>
                {busy ? 'Loading...' : 'Load audit history'}
              </button>
            </div>

            {error ? <div className="feedback-message error">{error}</div> : null}
          </section>

          <aside className="feedback-panel">
            <SectionIntro
                title="Recent references"
                body="Use saved campaign and assignment references to filter audit history faster."
            />

            <RecentIdList
                title="Recent campaigns"
                ids={recentCampaignIds}
                emptyLabel="Campaign references appear after you create or update campaigns."
                onPick={(id) => setEntityId(String(id))}
            />
            <RecentIdList
                title="Recent assignments"
                ids={recentAssignmentIds}
                emptyLabel="Assignment references appear after assignments are generated or updated."
                onPick={(id) => setEntityId(String(id))}
            />
          </aside>
        </div>

        <section className="feedback-panel">
          <SectionIntro
              title="Audit log results"
              body="Audit records are displayed as readable change cards with before and after values."
          />

          {logs.length === 0 ? (
              <EmptyState
                  title="No audit logs loaded"
                  body="Run a search above to review changes to campaigns, assignments, feedback responses, or published summaries."
              />
          ) : (
              <div className="feedback-entity-card-grid">
                {logs.map((log) => (
                    <article key={log.id} className="feedback-entity-card">
                      <header>
                        <div>
                          <h3>{log.action}</h3>
                          <p>
                            {auditEntityLabel(log.entityType)} #{log.entityId} • Log #{log.id}
                          </p>
                        </div>
                        <strong>{formatDateTime(log.timestamp)}</strong>
                      </header>

                      <div className="feedback-key-value-grid">
                        <div className="feedback-key-value">
                          <span>User reference</span>
                          <strong>{log.userId ? `#${log.userId}` : '-'}</strong>
                        </div>
                        <div className="feedback-key-value">
                          <span>Reason</span>
                          <strong>{log.reason || '-'}</strong>
                        </div>
                      </div>

                      <div className="feedback-audit-values">
                        <div>
                          <span>Previous value</span>
                          <pre className="feedback-code-block">{prettyValue(log.oldValue)}</pre>
                        </div>
                        <div>
                          <span>New value</span>
                          <pre className="feedback-code-block">{prettyValue(log.newValue)}</pre>
                        </div>
                      </div>
                    </article>
                ))}
              </div>
          )}
        </section>
      </div>
  );
};

export default FeedbackAuditPage;
