import type { ReactNode } from 'react';
import './dashboard.css';

type InsightTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

type InsightCardProps = {
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    tone?: InsightTone;
    children?: ReactNode;
    className?: string;
};

const InsightCard = ({
                         title,
                         description,
                         icon = <i className="bi bi-lightbulb" aria-hidden="true" />,
                         tone = 'info',
                         children,
                         className = '',
                     }: InsightCardProps) => {
    const cardClassName = ['dashboard-insight-card', `dashboard-insight-card--${tone}`, className]
        .filter(Boolean)
        .join(' ');

    return (
        <article className={cardClassName}>
            <div className="dashboard-insight-card__header">
                <span className="dashboard-insight-card__icon">{icon}</span>
                <div>
                    <h3 className="dashboard-insight-card__title">{title}</h3>
                    {description ? <p className="dashboard-insight-card__description">{description}</p> : null}
                </div>
            </div>
            {children ? <div className="dashboard-insight-card__body">{children}</div> : null}
        </article>
    );
};

export default InsightCard;
