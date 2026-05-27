import api from './api';

export type NotificationSetting = {
    category: string;
    label: string;
    description?: string | null;
    enabled: boolean;
    locked: boolean;
    defaultEnabled?: boolean | null;
    lockReason?: string | null;
    displayOrder?: number | null;
};

export type NotificationSettingUpdate = {
    category: string;
    enabled: boolean;
};

const unwrap = <T,>(payload: any, fallback: T): T => {
    return payload?.data?.data ?? payload?.data ?? fallback;
};

const normalizeSettings = (payload: unknown): NotificationSetting[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .map((item: any) => ({
            category: String(item?.category ?? '').trim(),
            label: String(item?.label ?? item?.category ?? 'Notification setting').trim(),
            description: item?.description ?? null,
            enabled: item?.enabled !== false,
            locked: item?.locked === true,
            defaultEnabled: item?.defaultEnabled ?? null,
            lockReason: item?.lockReason ?? null,
            displayOrder: Number.isFinite(Number(item?.displayOrder)) ? Number(item.displayOrder) : null,
        }))
        .filter((item) => item.category.length > 0)
        .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
};

export const notificationSettingsService = {
    async getMySettings(): Promise<NotificationSetting[]> {
        const response = await api.get('/notification-settings/me');
        return normalizeSettings(unwrap<unknown>(response, []));
    },

    async updateMySettings(settings: NotificationSettingUpdate[]): Promise<NotificationSetting[]> {
        const response = await api.put('/notification-settings/me', { settings });
        return normalizeSettings(unwrap<unknown>(response, []));
    },
};
