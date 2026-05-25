import type { ReactNode } from 'react';
import './dashboard.css';

type DashboardChartCardSize = 'default' | 'compact' | 'tall';

type DashboardChartCardProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
    size?: DashboardChartCardSize;
    className?: string;
};

const DashboardChartCard = ({
                                title,
                                subtitle,
                                action,
                                footer,
                                children,
                                size = 'default',
                                className = '',
                            }: DashboardChartCardProps) => {
    const cardClassName = [
        'dashboard-chart-card',
        size !== 'default' ? `dashboard-chart-card--${size}` : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section className={cardClassName}>
            <header className="dashboard-chart-card__header">
                <div className="dashboard-chart-card__title-area">
                    <h2 className="dashboard-chart-card__title">{title}</h2>
                    {subtitle ? <p className="dashboard-chart-card__subtitle">{subtitle}</p> : null}
                </div>
                {action ? <div className="dashboard-chart-card__action">{action}</div> : null}
            </header>
            <div className="dashboard-chart-card__body">{children}</div>
            {footer ? <footer className="dashboard-chart-card__footer">{footer}</footer> : null}
        </section>
    );
};

export default DashboardChartCard;
