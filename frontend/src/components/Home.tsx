import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem('epmsUserEmail');

    if (!email) {
      navigate('/login');
      return;
    }

    api.get('/api/dashboard/summary', {
      params: { email },
    })
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard'));
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
              <h3>{data.stats.directReports + 8}</h3>
              <small>{data.stats.directReports} active</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Pending Appraisals</p>
                <span className="hr-stat-icon amber"><i className="bi bi-clipboard-check" /></span>
              </div>
              <h3>{Math.max(1, data.stats.kpisCreated - 1)}</h3>
              <small>Require action</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Active PIPs</p>
                <span className="hr-stat-icon red"><i className="bi bi-exclamation-triangle" /></span>
              </div>
              <h3>1</h3>
              <small>Being monitored</small>
            </article>

            <article className="hr-stat-card">
              <div className="hr-stat-card-head">
                <p>Pending Feedback</p>
                <span className="hr-stat-icon sky"><i className="bi bi-bullseye" /></span>
              </div>
              <h3>{data.stats.unreadNotifications}</h3>
              <small>Awaiting responses</small>
            </article>
          </section>

          <section className="hr-panel-grid">
            <article className="hr-panel-card">
              <h4><i className="bi bi-calendar-event" /> Upcoming Deadlines</h4>
              <div className="hr-list-item">
                <strong>Annual Review 2024</strong>
                <span className="active">Active</span>
              </div>
              <div className="hr-list-item">
                <strong>Mid-Year Review 2024</strong>
                <span className="review">In Review</span>
              </div>
              <div className="hr-list-item">
                <strong>KPI Finalization</strong>
                <span className="pending">Pending</span>
              </div>
            </article>

            <article className="hr-panel-card">
              <h4><i className="bi bi-bullseye" /> KPI Status Overview</h4>
              <div className="hr-progress-row">
                <span>Active</span>
                <div><em style={{ width: '88%' }} /></div>
                <small>7 KPIs (88%)</small>
              </div>
              <div className="hr-progress-row">
                <span>Completed</span>
                <div><em style={{ width: '13%' }} /></div>
                <small>1 KPI (13%)</small>
              </div>
              <div className="hr-progress-row">
                <span>Draft</span>
                <div><em style={{ width: '0%' }} /></div>
                <small>0 KPIs (0%)</small>
              </div>
            </article>

            <article className="hr-panel-card">
              <h4><i className="bi bi-check2-circle" /> Pending Tasks</h4>
              <button type="button" className="hr-task-btn">Review 3 appraisal submissions</button>
              <button type="button" className="hr-task-btn">Configure Q3 appraisal cycle</button>
              <button type="button" className="hr-task-btn">Assign KPIs to new hires</button>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;