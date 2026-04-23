import { useEffect, useState } from 'react';
import api from '../services/api';

function Home() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch((err) => {
        const status = err?.response?.status;

        if (status === 401 || status === 403) {
          setError('Your session is not authorized for this dashboard.');
          return;
        }

        setError('Failed to load dashboard');
      });
  }, []);

  return (
    <div className="hr-dashboard">
      <div className="hr-dashboard-title">
        <h2>HR Dashboard</h2>
        <p>Employee performance and configuration overview</p>
      </div>

      {error && <p className="hr-error">{error}</p>}
      {!data && !error && <p className="hr-loading">Loading...</p>}

      {data && (
        <>
          <section className="hr-stat-grid">
            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Total Employees</p>
                <span className="hr-stat-icon blue"><i className="bi bi-people" /></span>
              </div>
              <h3>{data.stats?.directReports ?? 0}</h3>
              <small>Visible to HR</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>KPIs Created</p>
                <span className="hr-stat-icon amber"><i className="bi bi-clipboard-check" /></span>
              </div>
              <h3>{data.stats?.kpisCreated ?? 0}</h3>
              <small>Configured by you</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Active PIPs</p>
                <span className="hr-stat-icon red"><i className="bi bi-exclamation-triangle" /></span>
              </div>
              <h3>{data.stats?.activePipsManaged ?? 0}</h3>
              <small>Currently tracked</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Unread Notifications</p>
                <span className="hr-stat-icon sky"><i className="bi bi-bell" /></span>
              </div>
              <h3>{data.stats?.unreadNotifications ?? 0}</h3>
              <small>Need attention</small>
            </article>
          </section>

          <section className="hr-panel-grid">
            <article className="hr-panel-card">
              <h4><i className="bi bi-person-badge" /> Logged in as</h4>
              <div className="hr-list-item">
                <strong>{data.user?.fullName ?? 'Unknown User'}</strong>
                <span className="active">{data.user?.position ?? '-'}</span>
              </div>
              <div className="hr-list-item">
                <strong>{data.user?.email ?? '-'}</strong>
                <span className="review">{data.user?.employeeCode ?? 'No code'}</span>
              </div>
            </article>

            <article className="hr-panel-card">
              <h4><i className="bi bi-bullseye" /> Recent KPIs</h4>
              {data.recentKpis?.length ? data.recentKpis.map((item: any) => (
                <div className="hr-list-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span className="pending">Weight {item.weight}</span>
                </div>
              )) : <p className="hr-loading">No KPI records yet.</p>}
            </article>

            <article className="hr-panel-card">
              <h4><i className="bi bi-bell" /> Recent Notifications</h4>
              {data.recentNotifications?.length ? data.recentNotifications.map((item: any) => (
                <div className="hr-list-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span className={item.read ? 'review' : 'pending'}>
                    {item.read ? 'Read' : 'Unread'}
                  </span>
                </div>
              )) : <p className="hr-loading">No notifications yet.</p>}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;