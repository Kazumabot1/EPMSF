import React, { useEffect, useState } from "react";
import {
  createTeam,
  fetchCandidateMembers,
  fetchCandidateUsers,
  fetchDepartments,
} from "../../services/teamService";

import type {
  CandidateUser,
  Department,
  TeamRequest,
} from "../../services/teamService";
import { authStorage } from "../../services/authStorage";

interface TeamCreateProps {
  embedded?: boolean;
  onCancel?: () => void;
  onCreated?: () => void;
}

const TeamCreate: React.FC<TeamCreateProps> = ({
  embedded = false,
  onCancel,
  onCreated,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);

  const [teamName, setTeamName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [teamLeaderId, setTeamLeaderId] = useState<number | "">("");
  const [teamGoal, setTeamGoal] = useState("");
  const [status, setStatus] = useState("Active");
  const [memberUserIds, setMemberUserIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getCurrentUserId = (): number => {
    const user = authStorage.getUser();
    return Number(user?.id || user?.userId || 1);
  };

  const isCandidateAvailable = (user: CandidateUser): boolean => {
    return user.available ?? user.isAvailable ?? true;
  };

  const candidateLabel = (user: CandidateUser): string => {
    if (!isCandidateAvailable(user)) {
      return `${user.name} ⚠️ (already in a team: ${
        user.currentTeamName || "Unknown Team"
      })`;
    }

    return user.name;
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (departmentId !== "") {
      loadCandidates(Number(departmentId));
    } else {
      setLeaders([]);
      setMembers([]);
      setTeamLeaderId("");
      setMemberUserIds([]);
    }
  }, [departmentId]);

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments", error);
      setMessage("Failed to fetch departments. Please login again.");
    }
  };

  const loadCandidates = async (deptId: number) => {
    try {
      const [leaderData, memberData] = await Promise.all([
        fetchCandidateUsers(deptId),
        fetchCandidateMembers(deptId),
      ]);

      setLeaders(leaderData);
      setMembers(memberData);
      setTeamLeaderId("");
      setMemberUserIds([]);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
      setMessage("Failed to fetch users. Please check your login session.");
    }
  };

  const toggleMember = (id: number) => {
    const member = members.find((item) => item.id === id);

    if (!member) return;

    if (!isCandidateAvailable(member)) {
      setMessage(
        `${member.name} is already in a team: ${
          member.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    if (Number(teamLeaderId) === id) {
      setMessage("Team leader cannot also be a member.");
      return;
    }

    setMemberUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setTeamName("");
    setDepartmentId("");
    setTeamLeaderId("");
    setTeamGoal("");
    setStatus("Active");
    setMemberUserIds([]);
    setLeaders([]);
    setMembers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim() || departmentId === "" || teamLeaderId === "") {
      setMessage("Please fill all required fields.");
      return;
    }

    const selectedLeader = leaders.find(
      (leader) => leader.id === Number(teamLeaderId)
    );

    if (selectedLeader && !isCandidateAvailable(selectedLeader)) {
      setMessage(
        `${selectedLeader.name} is already in a team: ${
          selectedLeader.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    const unavailableMember = members.find(
      (member) => memberUserIds.includes(member.id) && !isCandidateAvailable(member)
    );

    if (unavailableMember) {
      setMessage(
        `${unavailableMember.name} is already in a team: ${
          unavailableMember.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    if (memberUserIds.includes(Number(teamLeaderId))) {
      setMessage("Team leader cannot also be a member.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        createdById: getCurrentUserId(),
        teamGoal,
        status,
        memberUserIds,
        memberEmployeeIds: memberUserIds,
      };

      await createTeam(request);

      setMessage("Team created successfully.");
      resetForm();

      if (onCreated) {
        onCreated();
      }
    } catch (error: any) {
      console.error("Failed to create team", error);
      setMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.data ||
          "Failed to save team."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "" : "p-6 max-w-3xl mx-auto"}>
      {!embedded && <h1 className="text-2xl font-semibold mb-6">Create Team</h1>}

      {message && <div className="team-alert mb-3">{message}</div>}

      <form onSubmit={handleSubmit} className="team-form">
        <div className="team-field">
          <label>
            Team Name <span className="team-required">*</span>
          </label>
          <input
            className="team-input"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            required
          />
        </div>

        <div className="team-field">
          <label>
            Department <span className="team-required">*</span>
          </label>
          <select
            className="team-select"
            value={departmentId}
            onChange={(e) =>
              setDepartmentId(e.target.value ? Number(e.target.value) : "")
            }
            required
          >
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.departmentName || dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="team-field">
          <label>
            Team Leader <span className="team-required">*</span>
          </label>
          <select
            className="team-select"
            value={teamLeaderId}
            onChange={(e) =>
              setTeamLeaderId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={!departmentId}
            required
          >
            <option value="">Select team leader</option>
            {leaders.map((leader) => {
              const disabled = !isCandidateAvailable(leader);

              return (
                <option key={leader.id} value={leader.id} disabled={disabled}>
                  {candidateLabel(leader)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="team-field">
          <label>Team Goal</label>
          <textarea
            className="team-textarea"
            value={teamGoal}
            onChange={(e) => setTeamGoal(e.target.value)}
            placeholder="Enter team goal"
            rows={3}
          />
        </div>

        <div className="team-field">
          <label>Status</label>
          <select
            className="team-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="team-field">
          <label>Members</label>

          {!departmentId && (
            <p className="text-muted">Select a department first.</p>
          )}

          {departmentId && members.length === 0 && (
            <p className="text-muted">No members found.</p>
          )}

          <div className="team-members-list">
            {members.map((member) => {
              const isLeader = Number(teamLeaderId) === member.id;
              const isSelected = memberUserIds.includes(member.id);
              const alreadyInTeam = !isCandidateAvailable(member);
              const disabled = isLeader || alreadyInTeam;

              return (
                <label
                  key={member.id}
                  className={`team-member-item ${disabled ? "disabled" : ""}`}
                  title={
                    isLeader
                      ? "Team leader cannot also be a member"
                      : alreadyInTeam
                      ? `Already in a team: ${
                          member.currentTeamName || "Unknown Team"
                        }`
                      : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                    disabled={disabled}
                  />
                  <span>
                    {candidateLabel(member)}
                    {isLeader ? " (selected as team leader)" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="team-modal-footer">
          {embedded && (
            <button
              type="button"
              className="team-btn secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}

          <button type="submit" disabled={loading} className="team-btn primary">
            {loading ? "Creating..." : "Create Team"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamCreate;