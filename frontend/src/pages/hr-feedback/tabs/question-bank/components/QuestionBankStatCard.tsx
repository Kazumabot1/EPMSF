type Props = {
    icon: string;
    label: string;
    value: string | number;
    note: string;
    tone: 'indigo' | 'violet' | 'cyan' | 'emerald' | 'orange';
};

export default function QuestionBankStatCard({ icon, label, value, note, tone }: Props) {
    return (
        <div className={`hfdqb-stat-card ${tone}`}>
            <span className="hfdqb-stat-icon"><i className={icon} /></span>
            <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <em>{note}</em>
            </div>
        </div>
    );
}
