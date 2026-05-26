import type { FeedbackCompetencyItem } from '../../../../../api/hrFeedbackApi';

type Props = {
    competencies: FeedbackCompetencyItem[];
    selectedCompetency: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onSelectCompetency: (code: string) => void;
    onManageCompetencies?: () => void;
};

const buildCompetencyKey = (competency: FeedbackCompetencyItem, index: number) =>
    `competency-filter-${competency.id && competency.id > 0 ? `id-${competency.id}` : `code-${competency.code || index}`}`;

export default function CompetencyLibraryPanel({
                                                   competencies,
                                                   selectedCompetency,
                                                   collapsed = false,
                                                   onToggleCollapsed,
                                                   onSelectCompetency,
                                                   onManageCompetencies,
                                               }: Props) {
    const activeQuestionTotal = competencies.reduce((sum, competency) => sum + (competency.activeQuestionCount ?? 0), 0);

    return (
        <aside className={`hfdqb-competency-panel hfdqb-filter-panel ${collapsed ? 'collapsed' : ''}`}>
            <div className="hfdqb-panel-head compact">
                <div className="hfdqb-panel-title-copy">
                    <p>Competency Filter</p>
                    <h3>{competencies.length} competencies</h3>
                </div>
                <div className="hfdqb-competency-panel-actions">
                    {onManageCompetencies ? (
                        <button type="button" className="hfdqb-icon-btn" title="Manage competencies" onClick={onManageCompetencies}>
                            <i className="bi bi-sliders" />
                        </button>
                    ) : null}
                    {onToggleCollapsed ? (
                        <button type="button" className="hfdqb-icon-btn" title={collapsed ? 'Expand competency panel' : 'Collapse competency panel'} onClick={onToggleCollapsed}>
                            <i className={`bi ${collapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar-inset-reverse'}`} />
                        </button>
                    ) : null}
                </div>
            </div>

            {!collapsed ? (
                <div className="hfdqb-library-note">
                    <i className="bi bi-info-circle" />
                    <span>Select a competency to filter questions. Edit competency names and descriptions from Manage Competencies.</span>
                </div>
            ) : null}

            <button
                type="button"
                className={`hfdqb-competency-row ${selectedCompetency === 'ALL' ? 'active' : ''}`}
                onClick={() => onSelectCompetency('ALL')}
                title="All Competencies"
            >
                <span className="hfdqb-comp-dot all"><i className="bi bi-grid-1x2" /></span>
                {!collapsed ? (
                    <span>
            <strong>All Competencies</strong>
            <small>Full question bank</small>
          </span>
                ) : null}
                {!collapsed ? <em>{activeQuestionTotal}</em> : null}
            </button>

            <div className="hfdqb-competency-list">
                {competencies.map((competency, index) => (
                    <button
                        type="button"
                        key={buildCompetencyKey(competency, index)}
                        className={`hfdqb-competency-row ${selectedCompetency === competency.code ? 'active' : ''}`}
                        onClick={() => onSelectCompetency(competency.code)}
                        title={competency.name}
                    >
                        <span className="hfdqb-comp-dot"><i className="bi bi-bullseye" /></span>
                        {!collapsed ? (
                            <span>
                <strong>{competency.name}</strong>
                <small>{competency.activeQuestionCount ?? 0} active · {competency.questionCount ?? 0} total</small>
              </span>
                        ) : null}
                        {!collapsed ? <em>{competency.activeQuestionCount ?? 0}</em> : null}
                    </button>
                ))}
            </div>
        </aside>
    );
}
