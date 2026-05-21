import { Link } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import ProfileNameCell from '../../components/ProfileNameCell';
import '../employee/employee-dashboard.css';

type DashboardAction = {
  icon: string;
  label: string;
  description: string;
  path: string;
};

const actions: DashboardAction[] = [
  {
    icon: 'bi-bullseye',
    label: 'My KPIs',
    description: 'View your assigned KPI results and progress.',
    path: '/employee/kpis',
  },
  {
    icon: 'bi-pencil-square',
    label: 'Self-Assessment',
    description: 'Fill or review your self-assessment form.',
    path: '/employee/self-assessment',
  },
  {
    icon: 'bi-clipboard-check',
    label: 'My Appraisals',
    description: 'Review appraisal records and history.',
    path: '/employee/appraisals',
  },
  {
    icon: 'bi-chat-dots',
    label: 'Continuous Feedback',
    description: 'View received feedback and activity.',
    path: '/employee/continuous-feedback',
  },
  {
    icon: 'bi-calendar-check',
    label: 'One-on-Ones',
    description: 'Check one-on-one meeting notes and tasks.',
    path: '/employee/one-on-ones',
  },
  {
    icon: 'bi-clipboard2-pulse',
    label: 'PIP',
    description: 'View your performance improvement plans.',
    path: '/pip/past-plans',
  },
];

const EmployeeMyDashboard = () => {
  const user = authStorage.getUser();

  const person = {
    userId: user?.id || user?.userId,
    fullName: user?.fullName || user?.name,
    email: user?.email,
    employeeCode: user?.employeeCode,
    departmentName: user?.department,
    positionName: user?.position,
    roleName: 'Employee',
    profileImageData: user?.profileImageData,
    profileImageType: user?.profileImageType,
  };

  return (
    <div className="employee-dashboard-page">
      <section className="employee-dashboard-hero">
        <div>
          <p className="employee-dashboard-kicker">Employee Dashboard</p>
          <h1>Welcome back</h1>
          <p>Access your performance records, self-assessments, feedback, and KPI progress.</p>
        </div>

        <div className="employee-dashboard-profile-card">
          <ProfileNameCell
            person={person}
            size="lg"
            subtitle={user?.position || user?.email || 'Employee'}
          />
        </div>
      </section>

      <section className="employee-dashboard-grid">
        {actions.map((item) => (
          <Link key={item.path} to={item.path} className="employee-dashboard-action-card">
            <span className="employee-dashboard-action-icon">
              <i className={`bi ${item.icon}`} />
            </span>
            <strong>{item.label}</strong>
            <p>{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default EmployeeMyDashboard;