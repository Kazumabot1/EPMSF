import type { ReactNode } from 'react';
import './dashboard.css';

type DashboardMetricTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';
type DashboardMetricTrendDirection = 'up' | 'down' | 'flat';

type DashboardMetricTrend = {
    label: ReactNode;
    direction?: DashboardMetricTrendDirection;
};

type DashboardMetricCardProps = {
    title: ReactNode;
    value: ReactNode;
    detail?: ReactNode;
    icon?: ReactNode;
    tone?: DashboardMetricTone;
    trend?: DashboardMetricTrend;
    className?: string;
};

const DashboardMetricCard = ({
                                 title,
                                 value,
                                 detail,
                                 icon,
                                 tone = 'blue',
                                 trend,
                                 className = '',
                             }: DashboardMetricCardProps) => {
    const cardClassName = [
        'dashboard-metric-card',
        tone !== 'blue' ? `dashboard-metric-card--${tone}` : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const trendDirection = trend?.direction ?? 'flat';
    const trendIcon = trendDirection === 'up' ? 'bi-arrow-up-right' : trendDirection === 'down' ? 'bi-arrow-down-right' : 'bi-dash-lg';

    return (
        <article className={cardClassName}>
            <div className="dashboard-metric-card__header">
                <div>
                    <span className="dashboard-metric-card__title">{title}</span>
                    <strong className="dashboard-metric-card__value">{value}</strong>
                    {detail ? <small className="dashboard-metric-card__detail">{detail}</small> : null}
                </div>
                {icon ? <span className="dashboard-metric-card__icon">{icon}</span> : null}
            </div>

            {trend ? (
                <span className={`dashboard-metric-card__trend dashboard-metric-card__trend--${trendDirection}`}>
          <i className={`bi ${trendIcon}`} aria-hidden="true" />
                    {trend.label}
        </span>
            ) : null}
        </article>
    );
};

export default DashboardMetricCard;
