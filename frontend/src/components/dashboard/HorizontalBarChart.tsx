import EmptyChartState from './EmptyChartState';
import {
    DASHBOARD_CHART_COLORS,
    formatDashboardNumber,
    hasDashboardChartData,
    toDashboardNumber,
    type DashboardChartDatum,
} from '../../utils/dashboardChartData';
import './dashboard.css';

type HorizontalBarChartProps = {
    data: DashboardChartDatum[];
    emptyTitle?: string;
    emptyDescription?: string;
    height?: number;
    valueFormatter?: (value: number, item?: DashboardChartDatum) => string;
    maxBars?: number;
    xAxisSuffix?: string;
};

const HorizontalBarChart = ({
                                data,
                                emptyTitle,
                                emptyDescription,
                                height = 300,
                                valueFormatter,
                                maxBars = 8,
                                xAxisSuffix = '',
                            }: HorizontalBarChartProps) => {
    const chartData = data
        .filter((item) => toDashboardNumber(item.value) > 0)
        .slice(0, maxBars);

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    const maxValue = Math.max(...chartData.map((item) => toDashboardNumber(item.value)), 1);

    return (
        <div className="dashboard-horizontal-chart" style={{ minHeight: height }}>
            {chartData.map((item, index) => {
                const value = toDashboardNumber(item.value);
                const percentage = Math.max((value / maxValue) * 100, 2);
                const color = item.color || DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
                const formattedValue = valueFormatter ? valueFormatter(value, item) : `${formatDashboardNumber(value)}${xAxisSuffix}`;

                return (
                    <div className="dashboard-horizontal-chart__row" key={`${item.label}-${index}`}>
                        <div className="dashboard-horizontal-chart__header">
                            <span className="dashboard-horizontal-chart__label" title={item.label}>{item.label}</span>
                            <strong>{formattedValue}</strong>
                        </div>
                        <div className="dashboard-horizontal-chart__track" aria-label={`${item.label}: ${formattedValue}`}>
                            <div
                                className="dashboard-horizontal-chart__fill"
                                style={{ width: `${percentage}%`, background: color }}
                            />
                        </div>
                        {item.detail ? <span className="dashboard-horizontal-chart__detail">{item.detail}</span> : null}
                    </div>
                );
            })}
        </div>
    );
};

export default HorizontalBarChart;
