import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appraisalCycleService, appraisalTemplateService } from '../../services/appraisalService';
import type { AppraisalCycleResponse, AppraisalTemplateResponse } from '../../types/appraisal';
import './appraisal.css';

const AppraisalCycleDashboardPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeCycles = useMemo(() => cycles.filter((cycle) => cycle.status === 'ACTIVE').length, [cycles]);
  const draftCycles = useMemo(() => cycles.filter((cycle) => cycle.status === 'DRAFT').length, [cycles]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [templateList, cycleList] = await Promise.all([
        appraisalTemplateService.list(),
        appraisalCycleService.list(),
      ]);
      setTemplates(templateList);
      setCycles(cycleList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load appraisal dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <div
      className="appraisal-page appraisal-dashboard-page"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="appraisal-dashboard-hero">
        <div className="appraisal-dashboard-orb one" />
        <div className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">
              <i className="bi bi-clipboard-check" />
              HR Appraisal Management
            </p>
            <h1>Appraisal Cycle Dashboard</h1>
            <p>
              Manage reusable template forms, create appraisal cycles, and monitor appraisal cycles from one place.
            </p>
          </div>

          <div className="appraisal-dashboard-actions">
            <button
              className="appraisal-button hero-white"
              type="button"
              onClick={() => navigate('/hr/appraisal/template-forms?openCreate=1')}
            >
              <i className="bi bi-file-earmark-plus" />
              Create Template Form
            </button>
            <button
              className="appraisal-button hero-outline"
              type="button"
              onClick={() => navigate('/hr/appraisal/cycles?openCreate=1')}
            >
              <i className="bi bi-calendar-plus" />
              Create Appraisal Cycle
            </button>
          </div>
        </div>
      </div>

      {error && <div className="appraisal-card appraisal-message-card">{error}</div>}

      <div className="appraisal-dashboard-stats">
        <button
          className="appraisal-dashboard-stat-card"
          type="button"
          onClick={() => navigate('/hr/appraisal/template-forms')}
        >
          <span className="appraisal-dashboard-stat-icon indigo"><i className="bi bi-folder2-open" /></span>
          <span className="appraisal-dashboard-stat-label">Total Template Forms</span>
          <strong>{loading ? '...' : templates.length}</strong>
          <small>Click to view template forms</small>
        </button>

        <button
          className="appraisal-dashboard-stat-card"
          type="button"
          onClick={() => navigate('/hr/appraisal/cycles')}
        >
          <span className="appraisal-dashboard-stat-icon violet"><i className="bi bi-calendar2-week" /></span>
          <span className="appraisal-dashboard-stat-label">Total Appraisal Cycle</span>
          <strong>{loading ? '...' : cycles.length}</strong>
          <small>Click to view appraisal cycles</small>
        </button>

        <div className="appraisal-dashboard-stat-card passive">
          <span className="appraisal-dashboard-stat-icon green"><i className="bi bi-play-circle" /></span>
          <span className="appraisal-dashboard-stat-label">Active Cycles</span>
          <strong>{loading ? '...' : activeCycles}</strong>
          <small>Visible to managers</small>
        </div>

        <div className="appraisal-dashboard-stat-card passive">
          <span className="appraisal-dashboard-stat-icon amber"><i className="bi bi-pencil-square" /></span>
          <span className="appraisal-dashboard-stat-label">Draft Cycles</span>
          <strong>{loading ? '...' : draftCycles}</strong>
          <small>Waiting for activation</small>
        </div>
      </div>
    </div>
  );
};

export default AppraisalCycleDashboardPage;
