import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './feedback360-ui.css';

export type Feedback360Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export const formatClassTone = (tone?: Feedback360Tone) => `f360-${tone ?? 'neutral'}`;

export const Feedback360Shell = ({
                                     children,
                                     className,
                                     compact = false,
                                 }: {
    children: ReactNode;
    className?: string;
    compact?: boolean;
}) => <main className={cx('f360-shell', compact && 'f360-shell-compact', className)}>{children}</main>;

export const Feedback360Hero = ({
                                    eyebrow,
                                    title,
                                    description,
                                    aside,
                                    action,
                                }: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    aside?: ReactNode;
    action?: ReactNode;
}) => (
    <section className="f360-hero">
        <div className="f360-hero-main">
            {eyebrow ? <span className="f360-eyebrow">{eyebrow}</span> : null}
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
            {action ? <div className="f360-hero-action">{action}</div> : null}
        </div>
        {aside ? <aside className="f360-hero-aside">{aside}</aside> : null}
    </section>
);

export const Feedback360Panel = ({
                                     children,
                                     className,
                                     padded = true,
                                 }: {
    children: ReactNode;
    className?: string;
    padded?: boolean;
}) => <section className={cx('f360-panel', !padded && 'f360-panel-flush', className)}>{children}</section>;

export const Feedback360PanelHeader = ({
                                           eyebrow,
                                           title,
                                           description,
                                           actions,
                                           compact = false,
                                       }: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    compact?: boolean;
}) => (
    <div className={cx('f360-panel-header', compact && 'f360-panel-header-compact')}>
        <div>
            {eyebrow ? <span className="f360-section-eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="f360-panel-actions">{actions}</div> : null}
    </div>
);

export const Feedback360MetricGrid = ({ children }: { children: ReactNode }) => (
    <section className="f360-metric-grid" aria-label="360 feedback summary">{children}</section>
);

export const Feedback360MetricCard = ({
                                          value,
                                          label,
                                          description,
                                          tone = 'neutral',
                                          onClick,
                                      }: {
    value: ReactNode;
    label: ReactNode;
    description?: ReactNode;
    tone?: Feedback360Tone;
    onClick?: () => void;
}) => {
    const content = (
        <>
            <span>{value}</span>
            <strong>{label}</strong>
            {description ? <small>{description}</small> : null}
        </>
    );

    if (onClick) {
        return (
            <button type="button" className={cx('f360-metric-card', formatClassTone(tone))} onClick={onClick}>
                {content}
            </button>
        );
    }

    return <div className={cx('f360-metric-card', formatClassTone(tone))}>{content}</div>;
};

export const Feedback360Toolbar = ({ children }: { children: ReactNode }) => <div className="f360-toolbar">{children}</div>;

export const Feedback360Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx('f360-input', className)} {...props} />;

export const Feedback360Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx('f360-input', className)} {...props} />;

export const Feedback360Banner = ({
                                      tone = 'info',
                                      children,
                                  }: {
    tone?: Feedback360Tone;
    children: ReactNode;
}) => <div className={cx('f360-banner', formatClassTone(tone))}>{children}</div>;

export const Feedback360EmptyState = ({
                                          title,
                                          description,
                                          action,
                                      }: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}) => (
    <div className="f360-empty-state">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
        {action ? <div>{action}</div> : null}
    </div>
);

export const Feedback360StatusPill = ({
                                          children,
                                          tone = 'neutral',
                                      }: {
    children: ReactNode;
    tone?: Feedback360Tone;
}) => <span className={cx('f360-pill', formatClassTone(tone))}>{children}</span>;

export const Feedback360ProgressBar = ({
                                           value,
                                           label,
                                       }: {
    value: number;
    label?: string;
}) => {
    const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    return (
        <div className="f360-progress" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue} role="progressbar">
            <i style={{ '--f360-progress-value': `${safeValue}%` } as CSSProperties} />
        </div>
    );
};

export const Feedback360Avatar = ({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' }) => {
    const value = (name || 'Employee')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';
    return <div className={cx('f360-avatar', size === 'sm' && 'f360-avatar-sm')} aria-hidden="true">{value}</div>;
};

export const Feedback360ButtonLink = ({
                                          to,
                                          children,
                                          variant = 'primary',
                                      }: {
    to: string;
    children: ReactNode;
    variant?: 'primary' | 'secondary';
}) => <Link className={cx('f360-button-link', variant === 'secondary' && 'f360-button-secondary')} to={to}>{children}</Link>;

export const Feedback360Button = ({
                                      children,
                                      variant = 'primary',
                                      className,
                                      ...props
                                  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) => (
    <button className={cx('f360-button', variant === 'secondary' && 'f360-button-secondary', className)} {...props}>{children}</button>
);

export const Feedback360InfoGrid = ({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 | 4 }) => (
    <div className={cx('f360-info-grid', `f360-info-grid-${columns}`)}>{children}</div>
);

export const Feedback360InfoItem = ({ label, value }: { label: ReactNode; value?: ReactNode }) => (
    <div className="f360-info-item">
        <span>{label}</span>
        <strong>{value ?? '—'}</strong>
    </div>
);

export const Feedback360Field = ({
                                     label,
                                     children,
                                     hint,
                                 }: {
    label: ReactNode;
    children: ReactNode;
    hint?: ReactNode;
}) => (
    <label className="f360-field">
        <span>{label}</span>
        {children}
        {hint ? <small>{hint}</small> : null}
    </label>
);

export const Feedback360CharacterCount = ({
                                              current,
                                              max,
                                              min,
                                              optional = false,
                                              invalid = false,
                                              valid = false,
                                          }: {
    current: number;
    max: number;
    min?: number;
    optional?: boolean;
    invalid?: boolean;
    valid?: boolean;
}) => (
    <small className={cx('f360-character-count', invalid && 'invalid', valid && 'valid')}>
        {current}/{max} characters{min ? ` · minimum ${min}` : ''}{optional ? ' · optional' : ''}
    </small>
);

export const Feedback360GuidanceGrid = ({
                                            items,
                                        }: {
    items: Array<{ title: ReactNode; body: ReactNode; tone?: Feedback360Tone }>;
}) => (
    <section className="f360-guidance-grid">
        {items.map((item, index) => (
            <article key={index} className={cx('f360-guidance-card', formatClassTone(item.tone ?? 'info'))}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
            </article>
        ))}
    </section>
);

export const Feedback360HelpTip = ({
                                       label = 'Evaluator guidance',
                                       children,
                                   }: {
    label?: string;
    children: ReactNode;
}) => (
    <details className="f360-help-tip">
        <summary aria-label={label} title={label}>?</summary>
        <div role="note">
            <strong>{label}</strong>
            <p>{children}</p>
        </div>
    </details>
);

export const Feedback360Icon = ({ type = 'spark' }: { type?: 'spark' | 'check' | 'clock' | 'draft' | 'play' | 'document' }) => {
    switch (type) {
        case 'play':
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5L8 5.5Z" /></svg>;
        case 'clock':
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7.8v4.7l3.2 1.8" /></svg>;
        case 'draft':
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h6.5L17 9v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V5.5Z" /><path d="M13.5 5.5V9H17" /><path d="m10 14.7 4.9-4.9 1.2 1.2-4.9 4.9-2.1.9.9-2.1Z" /></svg>;
        case 'check':
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m8.6 12.2 2.3 2.3 4.6-4.8" /></svg>;
        case 'document':
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h7l3 3v12H7z" /><path d="M14 4.5V8h3" /><path d="M9.5 12h5M9.5 15h5" /></svg>;
        default:
            return <svg className="f360-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9 12 3.5Z" /></svg>;
    }
};

export const Feedback360SectionGrid = ({ children }: { children: ReactNode }) => <div className="f360-section-grid">{children}</div>;

export const Feedback360CardGrid = ({ children }: { children: ReactNode }) => <div className="f360-card-grid">{children}</div>;

export const Feedback360InlineList = ({ children }: { children: ReactNode }) => <div className="f360-inline-list">{children}</div>;

export const Feedback360VisuallyGrouped = ({
                                               children,
                                               className,
                                               ...props
                                           }: HTMLAttributes<HTMLDivElement>) => <div className={cx('f360-group', className)} {...props}>{children}</div>;


export type Feedback360WorkspaceStep = {
    label: ReactNode;
    description?: ReactNode;
    to: string;
    end?: boolean;
};

export const Feedback360PageHeader = ({
                                          eyebrow,
                                          title,
                                          description,
                                          actions,
                                          meta,
                                      }: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    meta?: ReactNode;
}) => (
    <section className="f360-page-header">
        <div className="f360-page-header-copy">
            {eyebrow ? <span className="f360-eyebrow">{eyebrow}</span> : null}
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
            {meta ? <div className="f360-page-header-meta">{meta}</div> : null}
        </div>
        {actions ? <div className="f360-page-header-actions">{actions}</div> : null}
    </section>
);

export const Feedback360WorkspaceTabs = ({
                                             steps,
                                         }: {
    steps: Feedback360WorkspaceStep[];
}) => (
    <nav className="f360-workspace-tabs" aria-label="360 feedback workspace">
        {steps.map((step) => (
            <NavLink
                key={String(step.to)}
                to={step.to}
                end={step.end}
                className={({ isActive }) => cx('f360-workspace-tab', isActive && 'active')}
            >
                <span>{step.label}</span>
                {step.description ? <small>{step.description}</small> : null}
            </NavLink>
        ))}
    </nav>
);

export const Feedback360WorkspaceCard = ({
                                             children,
                                             className,
                                             ...props
                                         }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cx('f360-workspace-card', className)} {...props}>{children}</div>
);

export const Feedback360SummaryStrip = ({ children }: { children: ReactNode }) => (
    <section className="f360-summary-strip">{children}</section>
);

export const Feedback360SummaryItem = ({
                                           label,
                                           value,
                                           hint,
                                           tone = 'neutral',
                                       }: {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    tone?: Feedback360Tone;
}) => (
    <div className={cx('f360-summary-item', formatClassTone(tone))}>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
    </div>
);

export const Feedback360MicroNote = ({
                                         children,
                                         tone = 'info',
                                     }: {
    children: ReactNode;
    tone?: Feedback360Tone;
}) => <div className={cx('f360-micro-note', formatClassTone(tone))}>{children}</div>;
