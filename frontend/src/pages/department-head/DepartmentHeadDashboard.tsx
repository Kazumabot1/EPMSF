import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileNameCell from '../../components/ProfileNameCell';
import { authStorage } from '../../services/authStorage';
import {
  emptyPositionPermission,
  positionPermissionService,
} from '../../services/positionPermissionService';
import type { PositionPermission } from '../../types/positionPermission';

type Section = {
  icon: string;
  label: string;
  description: string;
  live: boolean;
  to?: string;
  permissionField?: keyof PositionPermission;
};

const DepartmentHeadDashboard = () => {
  const user = authStorage.getUser();
  const [permissions, setPermissions] = useState(() => emptyPositionPermission());

  useEffect(() => {
    let cancelled = false;

    positionPermissionService
      .getMyPermissions()
      .then((data) => {
        if (!cancelled) setPermissions({ ...emptyPositionPermission(), ...data });
      })
      .catch(() => {
        if (!cancelled) setPermissions(emptyPositionPermission());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const person = {
    userId: user?.id || user?.userId,
    fullName: user?.fullName || user?.name,
    email: user?.email,
    employeeCode: user?.employeeCode,
    departmentName: user?.department,
    positionName: user?.position,
    roleName: 'Department Head',
    profileImageData: user?.profileImageData,
    profileImageType: user?.profileImageType,
  };

  const sections: Section[] = useMemo(
    () => [
      {
        icon: 'bi-pencil-square',
        label: 'Self-Assessment',
        description: 'Complete your own self-assessment form.',
        live: true,
        to: '/department-head/self-assessment',
      },
      {
        icon: 'bi-clipboard-data',
        label: 'Assessment Review',
        description: 'Review employee assessment scores and signatures.',
        live: true,
        to: '/department-head/assessment-scores',
        permissionField: 'selfAssessmentView',
      },
      {
        icon: 'bi-shield-check',
        label: 'Appraisal Review',
        description: 'Check manager appraisal review submissions.',
        live: true,
        to: '/department-head/appraisals/review',
        permissionField: 'appraisalApprove',
      },
      {
        icon: 'bi-clock-history',
        label: 'Review History',
        description: 'View department appraisal review history.',
        live: true,
        to: '/department-head/appraisals/history',
      },
      {
        icon: 'bi-chat-dots',
        label: 'Continuous Feedback',
        description: 'Give continuous feedback inside your department.',
        live: true,
        to: '/continuous-feedback',
        permissionField: 'continuousFeedbackGive',
      },
      {
        icon: 'bi-calendar-check',
        label: 'One-on-One',
        description: 'Manage one-on-one meetings and action items.',
        live: true,
        to: '/one-on-one-meetings',
        permissionField: 'oneOnOneCreate',
      },
      {
        icon: 'bi-file-earmark-bar-graph',
        label: 'Performance Reports',
        description: 'View department-level performance reports.',
        live: true,
        to: '/department-head/reports',
      },
      {
        icon: 'bi-clipboard2-pulse',
        label: 'PIP',
        description: 'Create and track performance improvement plans.',
        live: true,
        to: '/pip/create',
        permissionField: 'pipCreate',
      },
    ],
    [],
  );

  const visibleSections = sections.filter((section) => {
    if (!section.permissionField) return true;
    return Boolean(permissions[section.permissionField]);
  });

  return (
    <div className="employee-dashboard-page">
      <section className="employee-dashboard-hero">
        <div>
          <p className="employee-dashboard-kicker">Department Head Dashboard</p>
          <h1>Department performance workspace</h1>
          <p>Review assessments, appraisals, reports, feedback, and department performance tasks.</p>
        </div>

        <div className="employee-dashboard-profile-card">
          <ProfileNameCell
            person={person}
            size="lg"
            subtitle={user?.department || user?.position || user?.email || 'Department Head'}
          />
        </div>
      </section>

      <section className="employee-dashboard-grid">
        {visibleSections.map((section) => (
          <Link key={section.label} to={section.to || '#'} className="employee-dashboard-action-card">
            <span className="employee-dashboard-action-icon">
              <i className={`bi ${section.icon}`} />
            </span>
            <strong>{section.label}</strong>
            <p>{section.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default DepartmentHeadDashboard;