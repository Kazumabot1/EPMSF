import EmptyChartState from './EmptyChartState';
import {
    DASHBOARD_CHART_COLORS,
    formatDashboardNumber,
    formatDashboardPercent,
    hasDashboardChartData,
    toDashboardNumber,
    withDashboardPercentages,
    type DashboardChartDatum,
} from '../../utils/dashboardChartData';
import './dashboard.css';

type StatusDistributionChartProps = {
    data: DashboardChartDatum[];
    emptyTitle?: string;
    emptyDescription?: string;
    valueFormatter?: (value: number, item?: DashboardChartDatum) => string;
};

const StatusDistributionChart = ({
                                     data,
                                     emptyTitle,
                                     emptyDescription,
                                     valueFormatter,
                                 }: StatusDistributionChartProps) => {
    const chartData = withDashboardPercentages(data).filter((item) => toDashboardNumber(item.value) > 0);

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="dashboard-status-list">
            {chartData.map((item, index) => {
                const color = item.color || DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
                const value = toDashboardNumber(item.value);
                const percentage = toDashboardNumber(item.percentage);

                return (
                    <div className="dashboard-status-list__item" key={`${item.label}-${index}`}>
                        <div className="dashboard-status-list__top">
                            <span>{item.label}</span>
                            <span>{valueFormatter ? valueFormatter(value, item) : formatDashboardNumber(value)}</span>
                        </div>
                        <div className="dashboard-status-list__track" aria-hidden="true">
                            <div
                                className="dashboard-status-list__fill"
                                style={{ width: `${Math.max(percentage, 2)}%`, background: color }}
                            />
                        </div>
                        <span className="dashboard-status-list__meta">{formatDashboardPercent(percentage)} of total</span>
                    </div>
                );
            })}
        </div>
    );
};

export default StatusDistributionChart;
