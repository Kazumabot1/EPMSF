// KHN new file
// (Component to display and manage teams)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTeams, type TeamResponse } from '../../services/teamService';
import TeamEditModal from './TeamEditModal'; // KHN added part
import './team-ui.css';

const TeamManagement = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null); // KHN added part

    const loadTeams = async () => {
        try {
            setLoading(true);
            const data = await fetchTeams();
            setTeams(data);
        } catch (err) {
            setError('Failed to load teams. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeams();
    }, []);

    // KHN added part
    const handleModalUpdate = () => {
        setSelectedTeam(null);
        loadTeams();
    };

    return (
        <div className="team-page">
            <div className="team-hero">
                <span className="team-hero-badge">
                    <i className="bi bi-people" />
                    Collaboration Hub
                </span>
                <h1>Team Management</h1>
                <p>Manage your organizational units, assign leaders, and track team performance across departments.</p>
            </div>

            <div className="team-surface">
                <div className="team-surface-inner">
                    <div className="team-table-toolbar">
                        <button 
                            className="team-btn primary"
                            onClick={() => navigate('/hr/team/create')}
                        >
                            <i className="bi bi-plus-lg" />
                            Create New Team
                        </button>
                    </div>

                    {loading ? (
                        <div className="team-state">
                            <i className="bi bi-hourglass-split animate-pulse" />
                            Loading teams...
                        </div>
                    ) : error ? (
                        <div className="team-state">
                            <i className="bi bi-exclamation-triangle" />
                            <div className="team-alert error">{error}</div>
                            <button className="team-btn secondary" onClick={loadTeams} style={{marginTop: '16px'}}>Retry</button>
                        </div>
                    ) : teams.length === 0 ? (
                        <div className="team-state">
                            <i className="bi bi-person-plus" />
                            <h3>No Teams Yet</h3>
                            <p>Start by creating your first team to organize members.</p>
                        </div>
                    ) : (
                        <div className="team-table-wrap">
                            <table className="team-table">
                                <thead>
                                    <tr>
                                        <th>Team Name</th>
                                        <th>Department</th>
                                        <th>Team Leader</th>
                                        <th>Created Date</th>
                                        <th>Status</th>
                                        <th>Members</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map(team => (
                                        <tr key={team.id}>
                                            <td><strong>{team.teamName}</strong></td>
                                            <td>{team.departmentName}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <i className="bi bi-person-badge text-indigo-500" />
                                                    {team.teamLeaderName}
                                                </div>
                                            </td>
                                            <td>{new Date(team.createdDate).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`team-pill ${team.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                                                    {team.status}
                                                </span>
                                            </td>
                                            <td>{team.members?.length || 0} Members</td>
                                            <td>
                                                {/* KHN modified part: Open modal instead of navigate */}
                                                <button className="team-btn ghost" onClick={() => setSelectedTeam(team)}>
                                                    <i className="bi bi-pencil-square" />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* KHN added part: Render Modal */}
            {selectedTeam && (
                <TeamEditModal 
                    team={selectedTeam} 
                    onClose={() => setSelectedTeam(null)} 
                    onUpdate={handleModalUpdate}
                />
            )}
        </div>
    );
};

export default TeamManagement;
