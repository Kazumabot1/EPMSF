import {
  DASHBOARD_OPTIONS,
  normalizeDashboard,
  type DashboardValue,
} from '../../utils/dashboardOptions';

type DashboardSelectorProps = {
  value?: string | null;
  roleName?: string | null;
  onChange: (value: DashboardValue) => void;
  disabled?: boolean;
  className?: string;
};

const DashboardSelector = ({
  value,
  roleName,
  onChange,
  disabled = false,
  className = '',
}: DashboardSelectorProps) => {
  const normalized = normalizeDashboard(value, roleName);
  const selected = DASHBOARD_OPTIONS.find((item) => item.value === normalized);

  return (
    <div className={className}>
      <select
        className="epms-emp-input-field"
        value={normalized}
        disabled={disabled}
        onChange={(event) => onChange(normalizeDashboard(event.target.value, roleName))}
      >
        {DASHBOARD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {selected && (
        <small style={{ display: 'block', marginTop: 6, color: '#64748b', lineHeight: 1.45 }}>
          {selected.helper}
        </small>
      )}
    </div>
  );
};

export default DashboardSelector;