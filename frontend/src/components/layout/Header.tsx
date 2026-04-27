import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type HeaderProps = {
  collapsed: boolean;
};

const Header = ({ collapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? 'user@company.com';
  const userName = user?.fullName ?? 'User';
  const primaryRole = user?.roles?.[0] ?? 'User';
  const avatarLetter = (userName.trim().charAt(0) || email.charAt(0)).toUpperCase();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login', { replace: true });
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

        <div className="hr-user-menu" ref={menuRef}>
          <button
            type="button"
            className="hr-user-chip"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="hr-user-dropdown"
            id="hr-user-menu-button"
          >
            <span className="hr-user-avatar" aria-hidden>
              {avatarLetter}
            </span>

            <div className="hr-user-chip-meta">
              <strong>{userName}</strong>
              <small>{primaryRole}</small>
            </div>

            <i className={`bi hr-user-chevron ${menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden />
          </button>

          {menuOpen && (
            <div
              className="hr-user-dropdown"
              id="hr-user-dropdown"
              role="menu"
              aria-labelledby="hr-user-menu-button"
            >
              <Link
                to="/hr/profile"
                className="hr-user-dropdown-item"
                role="menuitem"
                onClick={closeMenu}
              >
                <i className="bi bi-person" />
                Profile
              </Link>
              <button
                type="button"
                className="hr-user-dropdown-item hr-user-dropdown-item-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
