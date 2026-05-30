import EmptyChartState from './EmptyChartState';
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

type DonutSummaryChartProps = {
    data: DashboardChartDatum[];
    totalLabel?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    height?: number;
    valueFormatter?: (value: number, item?: DashboardChartDatum) => string;
};

const CIRCLE_RADIUS = 38;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const DonutSummaryChart = ({
                               data,
                               totalLabel = 'Total',
                               emptyTitle,
                               emptyDescription,
                               height = 260,
                               valueFormatter,
                           }: DonutSummaryChartProps) => {
    const usedColors = new Set<string>();
    const chartData = withDashboardPercentages(data)
        .filter((item) => toDashboardNumber(item.value) > 0)
        .map((item, index) => ({
            ...item,
            chartColor: resolveDashboardChartColor(index, item.color, usedColors),
        }));
    const total = chartData.reduce((sum, item) => sum + toDashboardNumber(item.value), 0);

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    let segmentOffset = 0;

    return (
        <div className="dashboard-donut-layout">
            <div className="dashboard-donut-center" style={{ minHeight: height }}>
                <div className="dashboard-donut-svg-wrap" style={{ width: Math.min(height, 260), height: Math.min(height, 260) }}>
                    <svg className="dashboard-donut-svg" viewBox="0 0 100 100" role="img" aria-label={`${totalLabel}: ${formatDashboardNumber(total)}`}>
                        <circle className="dashboard-donut-svg__track" cx="50" cy="50" r={CIRCLE_RADIUS} />
                        {chartData.map((item, index) => {
                            const value = toDashboardNumber(item.value);
                            const percentage = total > 0 ? value / total : 0;
                            const segmentLength = percentage * CIRCLE_CIRCUMFERENCE;
                            const dashOffset = -segmentOffset;
                            segmentOffset += segmentLength;

                            return (
                                <circle
                                    className="dashboard-donut-svg__segment"
                                    key={`${item.label}-${index}`}
                                    cx="50"
                                    cy="50"
                                    r={CIRCLE_RADIUS}
                                    stroke={item.chartColor}
                                    strokeDasharray={`${segmentLength} ${CIRCLE_CIRCUMFERENCE - segmentLength}`}
                                    strokeDashoffset={dashOffset}
                                >
                                    <title>{`${item.label}: ${valueFormatter ? valueFormatter(value, item) : formatDashboardNumber(value)} (${formatDashboardPercent(item.percentage)})`}</title>
                                </circle>
                            );
                        })}
                    </svg>
                    <div className="dashboard-donut-svg__label" aria-hidden="true">
                        <strong>{valueFormatter ? valueFormatter(total) : formatDashboardNumber(total)}</strong>
                        <span>{totalLabel}</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="dashboard-donut-total dashboard-donut-total--desktop">
                    <strong>{valueFormatter ? valueFormatter(total) : formatDashboardNumber(total)}</strong>
                    <span>{totalLabel}</span>
                </div>
                <div className="dashboard-chart-legend" aria-label="Chart legend">
                    {chartData.map((item, index) => (
                        <span className="dashboard-chart-legend__item" key={`${item.label}-${index}`}>
              <span
                  className="dashboard-chart-legend__dot"
                  style={{ background: item.chartColor }}
              />
                            {item.label} · {formatDashboardPercent(item.percentage)}
            </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DonutSummaryChart;
/*Z*/