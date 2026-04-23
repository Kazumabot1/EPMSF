import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type HeaderProps = {
  collapsed: boolean;
};

const Header = ({ collapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuItemRef = useRef<HTMLButtonElement>(null);
  const logoutMenuItemRef = useRef<HTMLButtonElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const email = localStorage.getItem('email') ?? localStorage.getItem('epmsUserEmail') ?? 'hr@company.com';
  const userName = localStorage.getItem('fullName') ?? 'Emily Rodriguez';
  const roleName = localStorage.getItem('roleName') ?? 'Hr';

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    localStorage.removeItem('epmsUserEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('id');
    localStorage.removeItem('employeeCode');
    navigate('/login');
  };

  const handleProfile = () => {
    setIsUserMenuOpen(false);
    navigate('/profile');
  };

  const menuItems = [profileMenuItemRef, logoutMenuItemRef];

  const moveFocus = (direction: 1 | -1) => {
    const activeIndex = menuItems.findIndex((itemRef) => itemRef.current === document.activeElement);
    const currentIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = (currentIndex + direction + menuItems.length) % menuItems.length;
    menuItems[nextIndex].current?.focus();
  };

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (isUserMenuOpen) {
      profileMenuItemRef.current?.focus();
    }
  }, [isUserMenuOpen]);

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

        <div className="hr-user-menu" ref={userMenuRef}>
          <button
            type="button"
            className="hr-user-chip"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-controls="hr-user-dropdown-menu"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setIsUserMenuOpen(true);
              }
            }}
          >
            <span className="hr-user-avatar">{email.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{userName}</strong>
              <small>{roleName}</small>
            </div>
            <i className={`bi ${isUserMenuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
          </button>

          {isUserMenuOpen && (
            <div id="hr-user-dropdown-menu" className="hr-user-dropdown" role="menu" aria-label="User menu">
              <button
                ref={profileMenuItemRef}
                type="button"
                className="hr-user-dropdown-item"
                role="menuitem"
                onClick={handleProfile}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocus(1);
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocus(-1);
                  }
                }}
              >
                <i className="bi bi-person" />
                <span>Profile</span>
              </button>
              <button
                ref={logoutMenuItemRef}
                type="button"
                className="hr-user-dropdown-item hr-user-dropdown-item-danger"
                role="menuitem"
                onClick={handleLogout}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocus(1);
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocus(-1);
                  }
                }}
              >
                <i className="bi bi-box-arrow-right" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        
      </div>
    </header>
  );
};

export default Header;
