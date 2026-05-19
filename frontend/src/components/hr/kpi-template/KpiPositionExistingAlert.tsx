type Props = {
  templateTitle?: string;
  onEdit: () => void;
  onView: () => void;
};

export default function KpiPositionExistingAlert({ templateTitle, onEdit, onView }: Props) {
  const titleSuffix =
    templateTitle != null && templateTitle.trim().length > 0
      ? ` (“${templateTitle.trim()}”)`
      : '';

  return (
    <div
      className="mt-3 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-medium">A KPI template already exists for this position{titleSuffix}.</p>
      <p className="mt-1 text-amber-800/90">
        Pick another position for a new template, open the existing one, or save to update it with your KPI rows.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="kpi-tpl-btn-primary px-3 py-1.5 text-xs">
          <i className="bi bi-pencil-square" aria-hidden />
          Edit existing
        </button>
        <button type="button" onClick={onView} className="kpi-tpl-btn-secondary px-3 py-1.5 text-xs">
          <i className="bi bi-eye" aria-hidden />
          View existing
        </button>
      </div>
    </div>
  );
}
