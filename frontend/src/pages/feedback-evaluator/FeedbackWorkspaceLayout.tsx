// import { NavLink, Outlet } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import './feedback-evaluator.css';
//
// const FeedbackWorkspaceLayout = () => {
//   const { user, logout } = useAuth();
//   const roleSet = new Set((user?.roles ?? []).map((role) => role.toUpperCase()));
//   const canViewTeamSummary = ['MANAGER', 'HR', 'HRADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ADMIN'].some((role) =>
//     roleSet.has(role),
//   );
//
//   const dashboardPath = user?.dashboard === 'EMPLOYEE_DASHBOARD' ? '/employee/dashboard' : '/dashboard';
//
//   return (
//     <div className="feedback-workspace-shell">
//       <header className="feedback-workspace-header">
//         <div>
//           <p className="feedback-workspace-kicker">360 Feedback</p>
//           <h1>Feedback Workspace</h1>
//           <span>Assigned tasks, result aggregation views, and campaign-safe anonymity handling.</span>
//         </div>
//
//         <div className="feedback-workspace-actions">
//           <NavLink className="feedback-workspace-link" to={dashboardPath}>
//             Back to dashboard
//           </NavLink>
//           <button
//             className="feedback-workspace-logout"
//             onClick={() => {
//               logout();
//               window.location.href = '/login';
//             }}
//             type="button"
//           >
//             Log out
//           </button>
//         </div>
//       </header>
//
//       <nav className="feedback-workspace-nav">
//         <NavLink
//           className={({ isActive }) =>
//             `feedback-workspace-tab ${isActive ? 'active' : ''}`
//           }
//           to="/feedback/my-tasks"
//         >
//           My tasks
//         </NavLink>
//         <NavLink
//           className={({ isActive }) =>
//             `feedback-workspace-tab ${isActive ? 'active' : ''}`
//           }
//           to="/feedback/my-result"
//         >
//           My result
//         </NavLink>
//         {canViewTeamSummary ? (
//           <NavLink
//             className={({ isActive }) =>
//               `feedback-workspace-tab ${isActive ? 'active' : ''}`
//             }
//             to="/feedback/team-summary"
//           >
//             Team summary
//           </NavLink>
//         ) : null}
//       </nav>
//
//       <main className="feedback-workspace-main">
//         <Outlet />
//       </main>
//     </div>
//   );
// };
//
// export default FeedbackWorkspaceLayout;
