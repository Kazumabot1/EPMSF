import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    notificationSettingsService,
    type NotificationSetting,
} from '../services/notificationSettingsService';
import './notifications-page.css';

type SettingsGroup = {
    title: string;
    description: string;
    tone: 'required' | 'optional';
    settings: NotificationSetting[];
};

const lockedReason = (setting: NotificationSetting) => {
    return setting.lockReason?.trim() || 'Required for workflow safety';
};

const buildUpdatePayload = (settings: NotificationSetting[], changed: NotificationSetting) => {
    const nextEnabled = !changed.enabled;

    return settings
        .filter((setting) => !setting.locked)
        .map((setting) => ({
            category: setting.category,
            enabled: setting.category === changed.category ? nextEnabled : setting.enabled,
        }));
};

export default function NotificationSettings() {
    const [settings, setSettings] = useState<NotificationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingCategory, setSavingCategory] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            try {
                const data = await notificationSettingsService.getMySettings();
                if (mounted) setSettings(data);
            } catch (error) {
                console.error('Failed to load notification settings:', error);
                toast.error('Notification settings could not be loaded.');
                if (mounted) setSettings([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const requiredSettings = useMemo(
        () => settings.filter((setting) => setting.locked),
        [settings],
    );

    const optionalSettings = useMemo(
        () => settings.filter((setting) => !setting.locked),
        [settings],
    );

    const optionalEnabledCount = useMemo(
        () => optionalSettings.filter((setting) => setting.enabled).length,
        [optionalSettings],
    );

    const groups = useMemo<SettingsGroup[]>(() => {
        return [
            {
                title: 'Required notifications',
                description:
                    'These stay on because they affect tasks, approvals, deadlines, or official performance records.',
                tone: 'required' as const,
                settings: requiredSettings,
            },
            {
                title: 'Optional notifications',
                description: 'Choose which non-critical updates you want to receive.',
                tone: 'optional' as const,
                settings: optionalSettings,
            },
        ].filter((group) => group.settings.length > 0);
    }, [optionalSettings, requiredSettings]);

    const handleToggle = async (setting: NotificationSetting) => {
        if (setting.locked || savingCategory) return;

        const previousSettings = settings;
        const nextSettings = settings.map((item) =>
            item.category === setting.category ? { ...item, enabled: !item.enabled } : item,
        );

        setSettings(nextSettings);
        setSavingCategory(setting.category);

        try {
            const saved = await notificationSettingsService.updateMySettings(
                buildUpdatePayload(previousSettings, setting),
            );
            setSettings(saved);
            toast.success('Notification settings updated.');
        } catch (error: any) {
            console.error('Failed to update notification setting:', error);
            setSettings(previousSettings);
            toast.error(error?.response?.data?.message || 'Could not update this setting.');
        } finally {
            setSavingCategory(null);
        }
    };

    return (
        <div className="notif-page notification-settings-page">
            <div className="notification-settings-shell">
                <div className="notification-settings-hero">
                    <div className="notification-settings-hero-copy">
                        <div className="notif-breadcrumb notification-settings-breadcrumb">
                            Dashboard <span>/</span> Notifications <span>/</span> Settings
                        </div>

                        <div className="notification-settings-eyebrow">
                            <i className="bi bi-bell" aria-hidden />
                            Notification preferences
                        </div>

                        <h1>Notification Settings</h1>
                        <p>
                            Reduce noise from non-critical updates while keeping the alerts that protect your work,
                            deadlines, and approvals.
                        </p>
                    </div>

                    <div className="notification-settings-hero-panel" aria-label="Notification protection summary">
                        <div className="notification-settings-summary-icon">
                            <i className="bi bi-shield-check" aria-hidden />
                        </div>
                        <div>
                            <h2>Important alerts stay protected</h2>
                            <p>
                                Required workflow notices remain active so KPI, appraisal, 360 feedback, PIP,
                                meeting, and workforce actions are not missed.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="notification-settings-toolbar" aria-label="Notification settings overview">
                    <div className="notification-settings-stat">
                        <span>Required</span>
                        <strong>{requiredSettings.length}</strong>
                        <small>always on</small>
                    </div>
                    <div className="notification-settings-stat">
                        <span>Optional</span>
                        <strong>
                            {optionalEnabledCount}/{optionalSettings.length}
                        </strong>
                        <small>currently on</small>
                    </div>
                    <Link to="/notifications" className="notif-btn-outline notification-settings-back-btn">
                        <i className="bi bi-arrow-left" aria-hidden />
                        Back to notifications
                    </Link>
                </div>

                {loading ? (
                    <div className="notif-empty notification-settings-empty">Loading notification settings…</div>
                ) : groups.length === 0 ? (
                    <div className="notif-empty notification-settings-empty">
                        No notification settings are available yet.
                    </div>
                ) : (
                    <div className="notification-settings-groups">
                        {groups.map((group) => (
                            <section
                                className={`notification-settings-group notification-settings-group-${group.tone}`}
                                key={group.title}
                            >
                                <div className="notification-settings-group-header">
                                    <div>
                    <span className="notification-settings-group-kicker">
                      {group.tone === 'required' ? 'Protected' : 'Customizable'}
                    </span>
                                        <h2>{group.title}</h2>
                                        <p>{group.description}</p>
                                    </div>
                                </div>

                                <div className="notification-settings-list">
                                    {group.settings.map((setting) => {
                                        const isSaving = savingCategory === setting.category;
                                        return (
                                            <article className="notification-setting-card" key={setting.category}>
                                                <div className="notification-setting-main">
                                                    <div className="notification-setting-title-row">
                                                        <h3>{setting.label}</h3>
                                                        {setting.locked ? (
                                                            <span className="notification-setting-pill notification-setting-pill-locked">
                                Locked
                              </span>
                                                        ) : (
                                                            <span className="notification-setting-pill notification-setting-pill-optional">
                                Optional
                              </span>
                                                        )}
                                                    </div>

                                                    {setting.description && <p>{setting.description}</p>}

                                                    <div className="notification-setting-helper">
                                                        {setting.locked
                                                            ? lockedReason(setting)
                                                            : setting.enabled
                                                                ? 'You will receive these updates.'
                                                                : 'You will not receive these non-critical updates.'}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className={`notification-setting-toggle ${setting.enabled ? 'notification-setting-toggle-on' : ''}`}
                                                    role="switch"
                                                    aria-checked={setting.enabled}
                                                    aria-label={`${setting.label} notifications`}
                                                    disabled={setting.locked || Boolean(savingCategory)}
                                                    onClick={() => handleToggle(setting)}
                                                >
                                                    <span className="notification-setting-toggle-knob" />
                                                    <span className="notification-setting-toggle-text">
                            {isSaving ? 'Saving' : setting.enabled ? 'On' : 'Off'}
                          </span>
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
