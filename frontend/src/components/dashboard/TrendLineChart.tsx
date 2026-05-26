import EmptyChartState from './EmptyChartState';
import {
    formatDashboardNumber,
    hasDashboardChartData,
    toDashboardNumber,
    type DashboardChartDatum,
} from '../../utils/dashboardChartData';
import './dashboard.css';

type TrendLineChartProps = {
    data: DashboardChartDatum[];
    emptyTitle?: string;
    emptyDescription?: string;
    height?: number;
    valueFormatter?: (value: number, item?: DashboardChartDatum) => string;
    yAxisSuffix?: string;
};

const buildPath = (points: Array<{ x: number; y: number }>) => {
    if (!points.length) return '';
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
};

const TrendLineChart = ({
                            data,
                            emptyTitle,
                            emptyDescription,
                            height = 280,
                            valueFormatter,
                            yAxisSuffix = '',
                        }: TrendLineChartProps) => {
    const chartData = data.filter((item) => item.label);

    if (!hasDashboardChartData(chartData)) {
        return <EmptyChartState compact title={emptyTitle} description={emptyDescription} />;
    }

    const values = chartData.map((item) => toDashboardNumber(item.value));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);
    const width = 360;
    const svgHeight = 180;
    const padding = { top: 18, right: 18, bottom: 34, left: 34 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = svgHeight - padding.top - padding.bottom;

    const points = chartData.map((item, index) => {
        const x = padding.left + (chartData.length === 1 ? innerWidth / 2 : (index / (chartData.length - 1)) * innerWidth);
        const y = padding.top + innerHeight - ((toDashboardNumber(item.value) - minValue) / range) * innerHeight;
        return { x, y };
    });

    const linePath = buildPath(points);
    const areaPath = points.length
        ? `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
        : '';

    return (
        <div className="dashboard-trend-chart" style={{ minHeight: height }}>
            <svg viewBox={`0 0 ${width} ${svgHeight}`} role="img" aria-label="Trend chart">
                <line className="dashboard-trend-chart__grid" x1={padding.left} x2={width - padding.right} y1={padding.top} y2={padding.top} />
                <line className="dashboard-trend-chart__grid" x1={padding.left} x2={width - padding.right} y1={padding.top + innerHeight / 2} y2={padding.top + innerHeight / 2} />
                <line className="dashboard-trend-chart__grid" x1={padding.left} x2={width - padding.right} y1={padding.top + innerHeight} y2={padding.top + innerHeight} />
                <text className="dashboard-trend-chart__axis" x={padding.left - 8} y={padding.top + 4} textAnchor="end">
                    {formatDashboardNumber(maxValue)}{yAxisSuffix}
                </text>
                <text className="dashboard-trend-chart__axis" x={padding.left - 8} y={padding.top + innerHeight + 4} textAnchor="end">
                    {formatDashboardNumber(minValue)}{yAxisSuffix}
                </text>
                <path className="dashboard-trend-chart__area" d={areaPath} />
                <path className="dashboard-trend-chart__line" d={linePath} />
                {points.map((point, index) => {
                    const item = chartData[index];
                    const value = toDashboardNumber(item.value);
                    const label = valueFormatter ? valueFormatter(value, item) : `${formatDashboardNumber(value)}${yAxisSuffix}`;

                    return (
                        <g key={`${item.label}-${index}`}>
                            <circle className="dashboard-trend-chart__dot" cx={point.x} cy={point.y} r="4">
                                <title>{`${item.label}: ${label}`}</title>
                            </circle>
                            {(index === 0 || index === chartData.length - 1 || chartData.length <= 4) ? (
                                <text className="dashboard-trend-chart__label" x={point.x} y={svgHeight - 10} textAnchor="middle">
                                    {item.label}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TrendLineChart;
