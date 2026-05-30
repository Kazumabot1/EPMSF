/*Z*/export type DashboardChartDatum = {
    label: string;
    value: number;
    percentage?: number;
    detail?: string;
    color?: string;
    raw?: unknown;
};

export type DashboardCompletionDatum = DashboardChartDatum & {
    completed: number;
    pending: number;
    total: number;
};

export const DASHBOARD_CHART_COLORS = [
    '#7c5cff',
    '#8ec5ff',
    '#62cdbb',
    '#ffbd72',
    '#f6d365',
    '#f59aaa',
    '#3b82f6',
    '#94a3b8',
];


export const resolveDashboardChartColor = (
    index: number,
    preferredColor?: string,
    usedColors?: Set<string>,
) => {
    const fallbackColor = DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
    const requestedColor = preferredColor || fallbackColor;

    if (!usedColors) return requestedColor;

    const normalize = (color: string) => color.trim().toLowerCase();
    const normalizedRequested = normalize(requestedColor);

    if (!usedColors.has(normalizedRequested)) {
        usedColors.add(normalizedRequested);
        return requestedColor;
    }

    for (let offset = 1; offset <= DASHBOARD_CHART_COLORS.length; offset += 1) {
        const candidate = DASHBOARD_CHART_COLORS[(index + offset) % DASHBOARD_CHART_COLORS.length];
        const normalizedCandidate = normalize(candidate);

        if (!usedColors.has(normalizedCandidate)) {
            usedColors.add(normalizedCandidate);
            return candidate;
        }
    }

    return requestedColor;
};

const STATUS_COLOR_MAP: Record<string, string> = {
    active: '#35b79d',
    approved: '#35b79d',
    completed: '#35b79d',
    submitted: '#8ec5ff',
    pending: '#ffbd72',
    draft: '#94a3b8',
    inactive: '#cbd5e1',
    disabled: '#cbd5e1',
    archived: '#cbd5e1',
    rejected: '#ef6678',
    overdue: '#ef6678',
    failed: '#ef6678',
    inprogress: '#7c5cff',
    in_progress: '#7c5cff',
};

export const toDashboardNumber = (value?: number | string | null) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const normalized = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(normalized) ? normalized : 0;
    }
    return 0;
};

export const clampDashboardPercent = (value?: number | string | null) => {
    const numericValue = toDashboardNumber(value);
    return Math.max(0, Math.min(100, numericValue));
};

export const formatDashboardNumber = (value?: number | string | null) => {
    return toDashboardNumber(value).toLocaleString();
};

export const formatDashboardCompactNumber = (value?: number | string | null) => {
    return Intl.NumberFormat(undefined, {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(toDashboardNumber(value));
};

export const formatDashboardPercent = (value?: number | string | null, fractionDigits = 1) => {
    return `${toDashboardNumber(value).toFixed(fractionDigits)}%`;
};

export const normalizeDashboardStatus = (value?: string | null) => {
    return String(value || 'Unknown')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getDashboardStatusColor = (value?: string | null, fallbackIndex = 0) => {
    const key = String(value || '')
        .replace(/\s+/g, '_')
        .toLowerCase();

    return STATUS_COLOR_MAP[key] || STATUS_COLOR_MAP[key.replace(/_/g, '')] || DASHBOARD_CHART_COLORS[fallbackIndex % DASHBOARD_CHART_COLORS.length];
};

export const hasDashboardChartData = (data: DashboardChartDatum[]) => {
    return data.some((item) => toDashboardNumber(item.value) > 0);
};

export const withDashboardPercentages = (data: DashboardChartDatum[]) => {
    const total = data.reduce((sum, item) => sum + toDashboardNumber(item.value), 0);

    return data.map((item) => ({
        ...item,
        percentage: total > 0 ? (toDashboardNumber(item.value) / total) * 100 : 0,
    }));
};

export const buildStatusDistribution = <T,>(
    rows: T[],
    getStatus: (row: T) => string | null | undefined,
    getValue?: (row: T) => number | string | null | undefined,
): DashboardChartDatum[] => {
    const statusMap = new Map<string, number>();

    rows.forEach((row) => {
        const rawStatus = getStatus(row) || 'Unknown';
        const label = normalizeDashboardStatus(rawStatus);
        const currentValue = statusMap.get(label) || 0;
        statusMap.set(label, currentValue + toDashboardNumber(getValue ? getValue(row) : 1));
    });

    return withDashboardPercentages(
        Array.from(statusMap.entries()).map(([label, value], index) => ({
            label,
            value,
            color: getDashboardStatusColor(label, index),
        })),
    );
};

export const buildTopValueBars = <T,>(
    rows: T[],
    getLabel: (row: T) => string | null | undefined,
    getValue: (row: T) => number | string | null | undefined,
    limit = 8,
): DashboardChartDatum[] => {
    return rows
        .map((row, index) => ({
            label: getLabel(row) || 'Unknown',
            value: toDashboardNumber(getValue(row)),
            color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
            raw: row,
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, limit);
};

export const buildScoreBands = <T,>(
    rows: T[],
    getScore: (row: T) => number | string | null | undefined,
): DashboardChartDatum[] => {
    const bands = [
        { label: 'Outstanding', min: 86, max: 100, color: '#62cdbb' },
        { label: 'Exceeds Requirements', min: 71, max: 85.999, color: '#7c5cff' },
        { label: 'Meets Requirements', min: 60, max: 70.999, color: '#8ec5ff' },
        { label: 'Needs Improvement', min: 40, max: 59.999, color: '#ffbd72' },
        { label: 'Unsatisfactory', min: 0, max: 39.999, color: '#f59aaa' },
    ];

    const data = bands.map((band) => ({
        label: band.label,
        value: rows.filter((row) => {
            const score = toDashboardNumber(getScore(row));
            return score >= band.min && score <= band.max;
        }).length,
        color: band.color,
    }));

    return withDashboardPercentages(data);
};

export const buildCompletionBars = <T,>(
    rows: T[],
    getLabel: (row: T) => string | null | undefined,
    getCompleted: (row: T) => number | string | null | undefined,
    getTotal: (row: T) => number | string | null | undefined,
    limit = 8,
): DashboardCompletionDatum[] => {
    return rows
        .map((row, index) => {
            const completed = toDashboardNumber(getCompleted(row));
            const total = toDashboardNumber(getTotal(row));
            const pending = Math.max(total - completed, 0);

            return {
                label: getLabel(row) || 'Unknown',
                value: total > 0 ? (completed / total) * 100 : 0,
                percentage: total > 0 ? (completed / total) * 100 : 0,
                completed,
                pending,
                total,
                color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                raw: row,
            };
        })
        .filter((item) => item.total > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, limit);
};

