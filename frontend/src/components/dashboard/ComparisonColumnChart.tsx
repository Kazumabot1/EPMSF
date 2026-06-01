/*Z*/import type { CSSProperties } from 'react';
import EmptyChartState from './EmptyChartState';
import {
    DASHBOARD_CHART_COLORS,
    formatDashboardNumber,
    hasDashboardChartData,
    toDashboardNumber,
    type DashboardChartDatum,
} from '../../utils/dashboardChartData';
import './dashboard.css';

export type ComparisonColumnDatum = DashboardChartDatum & {
    compareValue?: number;
    compareLabel?: string;
    compareColor?: string;
};

type ComparisonColumnChartProps = {
    data: ComparisonColumnDatum[];
    emptyTitle?: string;
    emptyDescription?: string;
    height?: number;
    maxBars?: number;
    primaryLabel?: string;
    comparisonLabel?: string;
    showComparison?: boolean;
    valueFormatter?: (value: number, item?: ComparisonColumnDatum) => string;
};

const makeSmoothPath = (points: Array<{ x: number; y: number }>, baseline: number) => {
    if (!points.length) return '';

    const line = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const midX = (previous.x + point.x) / 2;
        return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    }, '');

    const first = points[0];
    const last = points[points.length - 1];

    return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
};

const ComparisonColumnChart = ({
    data,
    emptyTitle,
    emptyDescription,
    height = 320,
    maxBars = 8,
    primaryLabel = 'This Period',
    comparisonLabel = 'Previous Period',
    showComparison = true,
    valueFormatter,
}: ComparisonColumnChartProps) => {
    const chartData = data
        .filter((item) => toDashboardNumber(item.value) > 0 || toDashboardNumber(item.compareValue) > 0)
        .slice(0, maxBars);

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    const maxValue = Math.max(
        ...chartData.flatMap((item) => showComparison ? [toDashboardNumber(item.value), toDashboardNumber(item.compareValue)] : [toDashboardNumber(item.value)]),
        1,
    );
    const baseline = 52;
    const top = 8;
    const chartHeight = baseline - top;
    const gap = 100 / chartData.length;
    const primaryColor = chartData[0]?.color || DASHBOARD_CHART_COLORS[0];
    const secondaryColor = chartData[0]?.compareColor || DASHBOARD_CHART_COLORS[1];

    const trendPoints = chartData.map((item, index) => {
        const centerX = gap * index + gap / 2;
        const compareValue = toDashboardNumber(item.compareValue ?? item.value);
        const y = baseline - (compareValue / maxValue) * chartHeight;
        return { x: centerX, y };
    });

    const areaPath = makeSmoothPath(trendPoints, baseline);
    const plotHeight = Math.max(190, height - 92);
    const chartStyle = {
        minHeight: height,
        '--comparison-plot-height': `${plotHeight}px`,
    } as CSSProperties;

    return (
        <div className="dashboard-comparison-chart" style={chartStyle}>
            <svg className="dashboard-comparison-chart__svg" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="dashboardComparisonArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(37, 99, 235, 0.22)" />
                        <stop offset="100%" stopColor="rgba(37, 99, 235, 0.02)" />
                    </linearGradient>
                </defs>
                <path className="dashboard-comparison-chart__area" d={areaPath} fill="url(#dashboardComparisonArea)" />
                <path
                    className="dashboard-comparison-chart__line"
                    d={trendPoints.reduce((path, point, index) => {
                        if (index === 0) return `M ${point.x} ${point.y}`;
                        const previous = trendPoints[index - 1];
                        const midX = (previous.x + point.x) / 2;
                        return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
                    }, '')}
                />
            </svg>

            <div className={`dashboard-comparison-chart__plot ${showComparison ? '' : 'dashboard-comparison-chart__plot--single'}`} aria-label={showComparison ? `${primaryLabel} and ${comparisonLabel} comparison` : `${primaryLabel} chart`}>
                {chartData.map((item, index) => {
                    const value = toDashboardNumber(item.value);
                    const compareValue = toDashboardNumber(item.compareValue);
                    const barHeight = Math.max((value / maxValue) * plotHeight, value > 0 ? 12 : 0);
                    const compareHeight = Math.max((compareValue / maxValue) * plotHeight, compareValue > 0 ? 12 : 0);
                    const color = item.color || DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
                    const compareColor = item.compareColor || DASHBOARD_CHART_COLORS[(index + 1) % DASHBOARD_CHART_COLORS.length];
                    const formattedValue = valueFormatter ? valueFormatter(value, item) : formatDashboardNumber(value);
                    const formattedCompare = valueFormatter ? valueFormatter(compareValue, item) : formatDashboardNumber(compareValue);

                    return (
                        <div className="dashboard-comparison-chart__group" key={`${item.label}-${index}`}>
                            <div className="dashboard-comparison-chart__bars">
                                <span className="dashboard-comparison-chart__value">{formattedValue}</span>
                                <span
                                    className="dashboard-comparison-chart__bar dashboard-comparison-chart__bar--primary"
                                    style={{ height: `${barHeight}px`, '--bar-color': color } as CSSProperties}
                                    title={`${item.label} ${primaryLabel}: ${formattedValue}`}
                                />
                                {showComparison ? (
                                    <span
                                        className="dashboard-comparison-chart__bar dashboard-comparison-chart__bar--secondary"
                                        style={{ height: `${compareHeight}px`, '--bar-color': compareColor } as CSSProperties}
                                        title={`${item.label} ${item.compareLabel || comparisonLabel}: ${formattedCompare}`}
                                    />
                                ) : null}
                            </div>
                            <span className="dashboard-comparison-chart__label" title={item.label}>{item.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="dashboard-comparison-chart__legend" aria-label="Chart legend">
                <span><i style={{ background: primaryColor }} />{primaryLabel}</span>
                {showComparison ? <span><i style={{ background: secondaryColor }} />{comparisonLabel}</span> : null}
            </div>
        </div>
    );
};

export default ComparisonColumnChart;
