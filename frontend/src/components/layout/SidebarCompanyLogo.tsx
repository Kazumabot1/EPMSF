import hrLogo from '../../assets/hr-logo.png';
import './SidebarCompanyLogo.css';

const SidebarCompanyLogo = () => {
  return (
    <img
      src={hrLogo}
      alt="ACE Data Systems Ltd"
      className="sidebar-company-logo"
      width={50}
      height={50}
      decoding="async"
    />
  );
};

export default SidebarCompanyLogo;
