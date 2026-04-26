import { useAuth } from '../../contexts/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="hr-profile-page">
      <div className="hr-profile-hero">
        <h1>Your profile</h1>
        <p>Details from your signed-in session. Contact HR if anything needs to be updated.</p>
      </div>

      <div className="hr-profile-card">
        <dl className="hr-profile-grid">
          <div>
            <dt>Full name</dt>
            <dd>{user.fullName || '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Employee code</dt>
            <dd>{user.employeeCode || '—'}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>{user.position || '—'}</dd>
          </div>
          <div className="hr-profile-span-2">
            <dt>Roles</dt>
            <dd>{user.roles?.length ? user.roles.join(', ') : '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default ProfilePage;
