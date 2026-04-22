// KHN modified files
// (Component to create new teams with candidate exclusivity rules)

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    createTeam, 
    fetchDepartments, 
    fetchCandidateEmployees, 
    fetchCandidateUsers,
    type CandidateResponse
} from '../../services/teamService';
import './team-ui.css';

interface TeamCreateProps {
    embedded?: boolean;
    onCancel?: () => void;
    onCreated?: () => void;
}

const TeamCreate = ({ embedded = false, onCancel, onCreated }: TeamCreateProps) => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<CandidateResponse[]>([]);
    const [potentialLeaders, setPotentialLeaders] = useState<CandidateResponse[]>([]);
    
    const [formData, setFormData] = useState({
        teamName: '',
        departmentId: '',
        teamLeaderId: '',
        teamGoal: '',
        status: 'Active'
    });
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // KHN added part (Load candidates instead of all employees)
                const [depts, emps] = await Promise.all([fetchDepartments(), fetchCandidateEmployees()]);
                setDepartments(depts);
                setEmployees(emps);
            } catch (err) {
                console.error('Failed to load initial data', err);
            }
        };
        loadInitialData();
    }, []);

    const handleDepartmentChange = async (deptId: string) => {
        setFormData(prev => ({ ...prev, departmentId: deptId, teamLeaderId: '' }));
        if (deptId) {
            try {
                // KHN added part (Load candidate users for exclusivity)
                const users = await fetchCandidateUsers(Number(deptId));
                setPotentialLeaders(users);
            } catch (err) {
                console.error('Failed to load candidate users for department', err);
                setPotentialLeaders([]);
            }
        } else {
            setPotentialLeaders([]);
        }
    };

    const handleMemberToggle = (id: number) => {
        setSelectedMembers(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.teamName || !formData.departmentId || !formData.teamLeaderId) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setLoading(true);
            const currentUserId = localStorage.getItem('id'); // KHN added part
            
            await createTeam({
                teamName: formData.teamName,
                departmentId: Number(formData.departmentId),
                teamLeaderId: Number(formData.teamLeaderId),
                createdById: Number(currentUserId) || 1, // KHN: Use real ID from login
                teamGoal: formData.teamGoal,
                status: formData.status,
                memberEmployeeIds: selectedMembers
            });
            setSuccess('Team created successfully!');
            if (onCreated) {
                setTimeout(() => onCreated(), 500);
            } else {
                setTimeout(() => navigate('/hr/team'), 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create team. Please check your input.');
            console.error('Team creation error:', err); // KHN added part
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }
        navigate('/hr/team');
    };

    const formMarkup = (
        <form onSubmit={handleSubmit}>
            <div className="team-field">
                <label>Team Name <span className="team-required">*</span></label>
                <input 
                    type="text" 
                    className="team-input"
                    placeholder="e.g. Frontend Development"
                    value={formData.teamName}
                    onChange={e => setFormData({...formData, teamName: e.target.value})}
                    required
                />
            </div>

            <div className="team-form-grid">
                <div className="team-field">
                    <label>Department <span className="team-required">*</span></label>
                    <select 
                        className="team-select"
                        value={formData.departmentId}
                        onChange={e => handleDepartmentChange(e.target.value)}
                        required
                    >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                            // KHN added part (Use department_name to match user requirement)
                            <option key={d.id} value={d.id}>{d.department_name || d.departmentName}</option>
                        ))}
                    </select>
                </div>

                <div className="team-field">
                    <label>Team Leader <span className="team-required">*</span></label>
                    <select 
                        className="team-select"
                        value={formData.teamLeaderId}
                        onChange={e => setFormData({...formData, teamLeaderId: e.target.value})}
                        disabled={!formData.departmentId}
                        required
                    >
                        <option value="">{formData.departmentId ? 'Select Leader' : 'Choose Department first'}</option>
                        {potentialLeaders.map(l => (
                            // KHN added part (Exclusivity disable logic with text)
                            <option key={l.id} value={l.id} disabled={!l.isAvailable}>
                                {l.name} {!l.isAvailable ? `(Already in ${l.currentTeamName})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="team-field">
                <label>Team Goal</label>
                <textarea 
                    className="team-textarea"
                    rows={3}
                    placeholder="What is the objective of this team?"
                    value={formData.teamGoal}
                    onChange={e => setFormData({...formData, teamGoal: e.target.value})}
                />
            </div>

            <div className="team-field">
                <label>Members</label>
                <div className="team-members-list">
                    {employees.map(emp => (
                        // KHN added part (Exclusivity tooltip and styling)
                        <label key={emp.id} className={`team-member-item ${!emp.isAvailable ? 'disabled' : ''}`} title={!emp.isAvailable ? `This user is in ${emp.currentTeamName}` : ''}>
                            <input 
                                type="checkbox" 
                                checked={selectedMembers.includes(emp.id)}
                                onChange={() => handleMemberToggle(emp.id)}
                                disabled={!emp.isAvailable}
                            />
                            <span>{emp.name}</span>
                            {!emp.isAvailable && <i className="bi bi-slash-circle ms-2 text-danger" style={{fontSize: '0.8rem'}} />}
                        </label>
                    ))}
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
            </div>

            {error && <div className="team-alert error">{error}</div>}
            {success && <div className="team-alert success">{success}</div>}

            <div className="flex justify-end gap-3 mt-8">
                <button type="button" className="team-btn secondary" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="team-btn primary" disabled={loading}>
                    <i className={`bi ${loading ? 'bi-arrow-repeat animate-spin' : 'bi-check-lg'}`} />
                    {loading ? 'Creating...' : 'Create Team'}
                </button>
            </div>
        </form>
    );

    return (
        embedded ? (
            <div className="team-surface-inner">
                {formMarkup}
            </div>
        ) : (
            <div className="team-page">
                <div className="team-hero">
                    <span className="team-hero-badge">
                        <i className="bi bi-plus-circle" />
                        New Team
                    </span>
                    <h1>Create Team</h1>
                    <p>Define your team details, select a leader, and add department members.</p>
                </div>

                <div className="team-form-card team-surface">
                    <div className="team-surface-inner">
                        {formMarkup}
                    </div>
                </div>
            </div>
        )
    );
};

export default TeamCreate;
