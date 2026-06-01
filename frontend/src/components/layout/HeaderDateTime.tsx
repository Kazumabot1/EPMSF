import { useEffect, useState } from 'react';
import { formatDateTimeParenFromDate } from '../hr/kpi-template/kpiTemplateDateFormat';

type Props = {
  className?: string;
};

const HeaderDateTime = ({ className = 'app-header-datetime' }: Props) => {
  const [clock, setClock] = useState(() => {
    const date = new Date();
    return { label: formatDateTimeParenFromDate(date), iso: date.toISOString() };
  });

  useEffect(() => {
    const tick = () => {
      const date = new Date();
      setClock({ label: formatDateTimeParenFromDate(date), iso: date.toISOString() });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={className} aria-live="polite">
      <i className="bi bi-clock" aria-hidden />
      <time dateTime={clock.iso} className="app-header-datetime__text">
        {clock.label}
      </time>
    </div>
  );
};

export default HeaderDateTime;
