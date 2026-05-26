export const normalizeList = (ids: Iterable<number>) => Array.from(new Set(ids)).sort((left, right) => left - right);
export const sameIds = (left: number[], right: number[]) => left.length === right.length && left.every((id, index) => id === right[index]);

export const sameStringSet = (left: Set<string>, right: Set<string>) =>
    left.size === right.size && Array.from(left).every(value => right.has(value));

export const roundPercent = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export const formatPercent = (value?: number | null) => {
    const rounded = roundPercent(Number(value ?? 0));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

export const allocateEqualPercentages = (count: number) => {
    if (count <= 0) return [];
    const baseCents = Math.floor(10000 / count);
    let remaining = 10000 - (baseCents * count);
    return Array.from({ length: count }, () => {
        const cents = baseCents + (remaining > 0 ? 1 : 0);
        if (remaining > 0) remaining -= 1;
        return roundPercent(cents / 100);
    });
};
