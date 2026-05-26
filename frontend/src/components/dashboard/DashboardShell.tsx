import type { ReactNode } from 'react';
import './dashboard.css';

type DashboardShellVariant = 'default' | 'slate' | 'emerald' | 'violet' | 'amber';

type DashboardShellProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    metaLabel?: string;
    metaValue?: ReactNode;
    metaDetail?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    variant?: DashboardShellVariant;
    className?: string;
};

const DashboardShell = ({
                            eyebrow = 'Dashboard',
                            title,
                            description,
                            metaLabel,
                            metaValue,
                            metaDetail,
                            actions,
                            children,
                            variant = 'default',
                            className = '',
                        }: DashboardShellProps) => {
    const shellClassName = ['dashboard-shell', variant !== 'default' ? `dashboard-shell--${variant}` : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <main className={shellClassName}>
            <section className="dashboard-hero">
                <span className="dashboard-hero__orb dashboard-hero__orb--one" aria-hidden="true" />
                <span className="dashboard-hero__orb dashboard-hero__orb--two" aria-hidden="true" />

                <div className="dashboard-hero__content">
                    <span className="dashboard-hero__eyebrow">{eyebrow}</span>
                    <h1>{title}</h1>
                    {description ? <p>{description}</p> : null}
                    {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
                </div>

                {(metaLabel || metaValue || metaDetail) ? (
                    <aside className="dashboard-hero__aside" aria-label="Dashboard summary">
                        {metaLabel ? <span>{metaLabel}</span> : null}
                        {metaValue ? <strong>{metaValue}</strong> : null}
                        {metaDetail ? <small>{metaDetail}</small> : null}
                    </aside>
                ) : null}
            </section>

            {children}
        </main>
    );
};

export default DashboardShell;
