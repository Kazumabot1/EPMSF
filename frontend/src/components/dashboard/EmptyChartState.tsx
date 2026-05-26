import type { ReactNode } from 'react';
import './dashboard.css';

type EmptyChartStateProps = {
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    compact?: boolean;
};

const EmptyChartState = ({
                             title = 'No data available',
                             description = 'There is not enough information to visualize this section yet.',
                             icon = <i className="bi bi-bar-chart-line" aria-hidden="true" />,
                             compact = false,
                         }: EmptyChartStateProps) => {
    const content = (
        <div>
            <span className="dashboard-empty-state__icon">{icon}</span>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
        </div>
    );

    if (compact) {
        return <div className="dashboard-inline-empty">{content}</div>;
    }

    return <div className="dashboard-empty-state">{content}</div>;
};

export default EmptyChartState;
