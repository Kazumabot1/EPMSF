import EmptyChartState from './EmptyChartState';/*Z*/
import {
    formatDashboardNumber,
    resolveDashboardChartColor,
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
    const usedColors = new Set<string>();
    const chartData = withDashboardPercentages(data)
        .filter((item) => toDashboardNumber(item.value) > 0)
        .map((item, index) => ({
            ...item,
            chartColor: resolveDashboardChartColor(index, item.color, usedColors),
        }));

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="dashboard-status-list">
            {chartData.map((item, index) => {
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
                                style={{ width: `${Math.max(percentage, 2)}%`, background: item.chartColor }}
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
