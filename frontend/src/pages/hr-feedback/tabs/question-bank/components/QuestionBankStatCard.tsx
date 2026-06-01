type Props = {
    icon: string;
    label: string;
    value: string | number;
    note: string;
    tone: 'indigo' | 'violet' | 'cyan' | 'emerald' | 'orange';
};

const toneClass: Record<Props['tone'], string> = {
    indigo: 'bg-blue-50 text-blue-700',
    violet: 'bg-blue-50 text-blue-700',
    cyan: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
};

export default function QuestionBankStatCard({ icon, label, value, note, tone }: Props) {
    return (
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${toneClass[tone]}`}><i className={icon} /></span>
            <div className="min-w-0">
                <small className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</small>
                <strong className="mt-1 block text-2xl font-black tracking-tight text-slate-950">{value}</strong>
                <em className="mt-1 block truncate text-xs font-semibold not-italic text-slate-500">{note}</em>
            </div>
        </div>
    );
}
