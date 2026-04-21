import { useNavigate } from 'react-router-dom';

type HeaderProps = {
  collapsed: boolean;
};

const Header = ({ collapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const email = localStorage.getItem('epmsUserEmail') ?? 'hr@company.com';
  const userName = 'Emily Rodriguez';

  const handleLogout = () => {
    localStorage.removeItem('epmsUserEmail');
    navigate('/login');
  };

  return (
    <header className={`hr-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-header-search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search employees, KPI, appraisals..." />
      </div>

      <div className="hr-header-actions">
        <button type="button" className="hr-icon-button hr-notification" aria-label="Notifications">
          <i className="bi bi-bell" />
          <span>1</span>
        </button>

        <div className="hr-user-chip">
          <span className="hr-user-avatar">{email.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{userName}</strong>
            <small>Hr</small>
          </div>
          <i className="bi bi-chevron-down" />
        </div>

        <button type="button" className="hr-logout-button" onClick={handleLogout} title="Logout">
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>
    </header>
  );
};

export default Header;
