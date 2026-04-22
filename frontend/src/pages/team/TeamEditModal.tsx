// KHN new file
// (Modal component to update an existing team's details, leader, and members)

import { useState, useEffect, type FormEvent } from 'react';
import { updateTeam, fetchCandidateUsers, fetchCandidateEmployees, type TeamResponse, type CandidateResponse } from '../../services/teamService';

interface TeamEditModalProps {
    team: TeamResponse;
    onClose: () => void;
    onUpdate: () => void;
}

const TeamEditModal = ({ team, onClose, onUpdate }: TeamEditModalProps) => {
    const [employees, setEmployees] = useState<CandidateResponse[]>([]);
    const [potentialLeaders, setPotentialLeaders] = useState<CandidateResponse[]>([]);
    
    const [formData, setFormData] = useState({
        teamName: team.teamName,
        teamGoal: team.teamGoal || '',
        status: team.status,
        teamLeaderId: team.teamLeaderId ? team.teamLeaderId.toString() : ''
    });
    
    // Initialize selected members from the team's current members
    const [selectedMembers, setSelectedMembers] = useState<number[]>(
        team.members ? team.members.map(m => m.employeeId) : []
    );
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadCandidates = async () => {
            try {
                const [emps, users] = await Promise.all([
                    fetchCandidateEmployees(),
                    fetchCandidateUsers(team.departmentId)
                ]);
                setEmployees(emps);
                setPotentialLeaders(users);
            } catch (err) {
                console.error('Failed to load candidates for edit', err);
                setError('Failed to load potential members and leaders.');
            }
        };
        loadCandidates();
    }, [team.departmentId]);

    const handleMemberToggle = (id: number) => {
        setSelectedMembers(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.teamName || !formData.teamLeaderId) {
            setError('Team Name and Team Leader are required.');
            return;
        }

        try {
            setLoading(true);
            const currentUserId = localStorage.getItem('id');
            
            await updateTeam(team.id, {
                teamName: formData.teamName,
                departmentId: team.departmentId, // Cannot change dept
                teamLeaderId: Number(formData.teamLeaderId),
                createdById: Number(currentUserId) || 1, // Will act as updatedBy
                teamGoal: formData.teamGoal,
                status: formData.status,
                memberEmployeeIds: selectedMembers
            });
            onUpdate();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update team.');
            console.error('Team update error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="team-modal-overlay">
            <div className="team-modal-content">
                <div className="team-modal-header">
                    <h2>Edit Team: {team.teamName}</h2>
                    <button className="team-btn ghost" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <div className="team-modal-body">
                    <form onSubmit={handleSubmit} id="team-edit-form">
                        <div className="team-field">
                            <label>Team Name <span className="team-required">*</span></label>
                            <input 
                                type="text" 
                                className="team-input"
                                value={formData.teamName}
                                onChange={e => setFormData({...formData, teamName: e.target.value})}
                                required
                            />
                        </div>

                        <div className="team-field">
                            <label>Department</label>
                            <input 
                                type="text" 
                                className="team-input"
                                value={team.departmentName}
                                disabled
                            />
                            <small className="text-muted">Department cannot be changed.</small>
                        </div>

                        <div className="team-field">
                            <label>Team Leader <span className="team-required">*</span></label>
                            <select 
                                className="team-select"
                                value={formData.teamLeaderId}
                                onChange={e => setFormData({...formData, teamLeaderId: e.target.value})}
                                required
                            >
                                <option value="">Select Leader</option>
                                {potentialLeaders.map(l => {
                                    // Allow selecting if they are the CURRENT leader OR if they are available
                                    const isCurrentLeader = l.id === team.teamLeaderId;
                                    const isDisabled = !l.isAvailable && !isCurrentLeader;
                                    
                                    return (
                                        <option key={l.id} value={l.id} disabled={isDisabled}>
                                            {l.name} {isDisabled ? `(Already in ${l.currentTeamName})` : isCurrentLeader ? '(Current)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="team-field">
                            <label>Team Goal</label>
                            <textarea 
                                className="team-textarea"
                                rows={3}
                                value={formData.teamGoal}
                                onChange={e => setFormData({...formData, teamGoal: e.target.value})}
                            />
                        </div>

                        <div className="team-field">
                            <label>Members</label>
                            <div className="team-members-list">
                                {employees.map(emp => {
                                    const isCurrentMember = selectedMembers.includes(emp.id);
                                    const isDisabled = !emp.isAvailable && !isCurrentMember;
                                    
                                    return (
                                        <label key={emp.id} className={`team-member-item ${isDisabled ? 'disabled' : ''}`} title={isDisabled ? `This user is in ${emp.currentTeamName}` : ''}>
                                            <input 
                                                type="checkbox" 
                                                checked={isCurrentMember}
                                                onChange={() => handleMemberToggle(emp.id)}
                                                disabled={isDisabled}
                                            />
                                            <span>{emp.name}</span>
                                            {isDisabled && <i className="bi bi-slash-circle ms-2 text-danger" style={{fontSize: '0.8rem'}} />}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="team-field">
                            <label>Status</label>
                            <select 
                                className="team-select"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <small className="text-muted mt-1 d-block">
                                Note: Changing status to Active will fail if any selected member is currently active in another team.
                            </small>
                        </div>

                        {error && <div className="team-alert error mb-0">{error}</div>}
                    </form>
                </div>
                
                <div className="team-modal-footer">
                    <button type="button" className="team-btn secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" form="team-edit-form" className="team-btn primary" disabled={loading}>
                        <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-check-lg'}`} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeamEditModal;
