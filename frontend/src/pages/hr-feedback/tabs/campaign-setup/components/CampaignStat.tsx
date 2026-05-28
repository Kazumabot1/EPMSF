export const CampaignStat = ({ icon, label, value, note, tone }: { icon: string; label: string; value: number | string; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
        <span className="hfdq-stat-icon"><i className={icon} /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{note}</em>
        </div>
    </div>
);
