import EmptyChartState from './EmptyChartState';
import {
    formatDashboardNumber,
    hasDashboardComparisonData,
    resolveDashboardChartColor,
    toDashboardNumber,
    type DashboardComparisonDatum,
    type DashboardComparisonSeries,
} from '../../utils/dashboardChartData';
import './dashboard.css';

type ComparisonBarChartProps = {
    data: DashboardComparisonDatum[];
    series: DashboardComparisonSeries[];
    emptyTitle?: string;
    emptyDescription?: string;
    height?: number;
    maxGroups?: number;
    valueFormatter?: (value: number, series: DashboardComparisonSeries, item: DashboardComparisonDatum) => string;
};

const ComparisonBarChart = ({
                                data,
                                series,
                                emptyTitle,
                                emptyDescription,
                                height = 280,
                                maxGroups = 6,
                                valueFormatter,
                            }: ComparisonBarChartProps) => {
    const chartRows = data
        .filter((item) => item.label && series.some((entry) => toDashboardNumber(item.values[entry.key]) > 0))
        .slice(0, maxGroups);

    if (!hasDashboardComparisonData(chartRows, series)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    const maxValue = Math.max(
        ...chartRows.flatMap((item) => series.map((entry) => toDashboardNumber(item.values[entry.key]))),
        1,
    );
    const usedColors = new Set<string>();
    const resolvedSeries = series.map((entry, index) => ({
        ...entry,
        color: resolveDashboardChartColor(index, entry.color, usedColors),
    }));

    return (
        <div className="dashboard-comparison-chart" style={{ minHeight: height }}>
            <div className="dashboard-chart-legend dashboard-chart-legend--left" aria-label="Comparison legend">
                {resolvedSeries.map((entry) => (
                    <span className="dashboard-chart-legend__item" key={entry.key}>
                        <span className="dashboard-chart-legend__dot" style={{ background: entry.color }} />
                        {entry.label}
                    </span>
                ))}
            </div>

            <div className="dashboard-comparison-chart__rows">
                {chartRows.map((item) => (
                    <div className="dashboard-comparison-chart__group" key={item.label}>
                        <div className="dashboard-comparison-chart__group-header">
                            <strong title={item.label}>{item.label}</strong>
                            {item.detail ? <span>{item.detail}</span> : null}
                        </div>

                        <div className="dashboard-comparison-chart__series-list">
                            {resolvedSeries.map((entry) => {
                                const value = toDashboardNumber(item.values[entry.key]);
                                const percentage = Math.max((value / maxValue) * 100, value > 0 ? 3 : 0);
                                const formattedValue = valueFormatter
                                    ? valueFormatter(value, entry, item)
                                    : formatDashboardNumber(value);

                                return (
                                    <div className="dashboard-comparison-chart__series" key={`${item.label}-${entry.key}`}>
                                        <span className="dashboard-comparison-chart__series-label">{entry.label}</span>
                                        <span
                                            className="dashboard-comparison-chart__track"
                                            aria-label={`${item.label}, ${entry.label}: ${formattedValue}`}
                                        >
                                            <span
                                                className="dashboard-comparison-chart__fill"
                                                style={{ width: `${percentage}%`, background: entry.color }}
                                            />
                                        </span>
                                        <strong>{formattedValue}</strong>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComparisonBarChart;
