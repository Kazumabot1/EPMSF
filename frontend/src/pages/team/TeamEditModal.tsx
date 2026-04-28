// KHN new file
// Modal component to update an existing team's details, leader, and members
// import { useEffect, useState, type FormEvent } from "react";
// import {
//   updateTeam,
//   fetchCandidateUsers,
//   fetchCandidateMembers,
// } from "../../services/teamService";
//
// import type {
//   TeamResponse,
//   CandidateUser,
// } from "../../services/teamService";
// import { authStorage } from "../../services/authStorage";
//
// interface TeamEditModalProps {
//   team: TeamResponse;
//   onClose: () => void;
//   onUpdate: () => void;
// }
//
// const TeamEditModal = ({ team, onClose, onUpdate }: TeamEditModalProps) => {
//   const [employees, setEmployees] = useState<CandidateUser[]>([]);
//   const [potentialLeaders, setPotentialLeaders] = useState<CandidateUser[]>([]);
//
//   const [formData, setFormData] = useState({
//     teamName: team.teamName,
//     teamGoal: team.teamGoal || "",
//     status: team.status || "Active",
//     teamLeaderId: team.teamLeaderId ? team.teamLeaderId.toString() : "",
//   });
//
//   const [selectedMembers, setSelectedMembers] = useState<number[]>(
//     team.members
//       ? team.members
//           .map((m) => m.userId ?? m.employeeId)
//           .filter((id): id is number => id !== undefined && id !== null)
//       : []
//   );
//
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//
//   const getCurrentUserId = (): number => {
//     const user = authStorage.getUser();
//     return Number(user?.id || user?.userId || team.createdById || 1);
//   };
//
//   useEffect(() => {
//     const loadCandidates = async () => {
//       try {
//         const [members, users] = await Promise.all([
//           fetchCandidateMembers(team.departmentId),
//           fetchCandidateUsers(team.departmentId),
//         ]);
//
//         setEmployees(members);
//         setPotentialLeaders(users);
//       } catch (err) {
//         console.error("Failed to load candidates for edit", err);
//         setError("Failed to load potential members and leaders.");
//       }
//     };
//
//     loadCandidates();
//   }, [team.departmentId]);
//
//   const handleMemberToggle = (id: number) => {
//     setSelectedMembers((prev) =>
//       prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
//     );
//   };
//
//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setError("");
//
//     if (!formData.teamName || !formData.teamLeaderId) {
//       setError("Team Name and Team Leader are required.");
//       return;
//     }
//
//     try {
//       setLoading(true);
//
//       await updateTeam(team.id, {
//         teamName: formData.teamName.trim(),
//         departmentId: team.departmentId,
//         teamLeaderId: Number(formData.teamLeaderId),
//         createdById: getCurrentUserId(),
//         teamGoal: formData.teamGoal,
//         status: formData.status,
//         memberUserIds: selectedMembers,
//         memberEmployeeIds: selectedMembers,
//       });
//
//       onUpdate();
//     } catch (err: any) {
//       setError(
//         err.response?.data?.message ||
//           err.response?.data?.error ||
//           err.response?.data?.data ||
//           err.message ||
//           "Failed to update team."
//       );
//       console.error("Team update error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <div className="team-modal-overlay">
//       <div className="team-modal-content">
//         <div className="team-modal-header">
//           <h2>Edit Team: {team.teamName}</h2>
//           <button className="team-btn ghost" onClick={onClose}>
//             <i className="bi bi-x-lg"></i>
//           </button>
//         </div>
//
//         <div className="team-modal-body">
//           <form onSubmit={handleSubmit} id="team-edit-form">
//             <div className="team-field">
//               <label>
//                 Team Name <span className="team-required">*</span>
//               </label>
//               <input
//                 type="text"
//                 className="team-input"
//                 value={formData.teamName}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamName: e.target.value })
//                 }
//                 required
//               />
//             </div>
//
//             <div className="team-field">
//               <label>Department</label>
//               <input
//                 type="text"
//                 className="team-input"
//                 value={team.departmentName || ""}
//                 disabled
//               />
//               <small className="text-muted">Department cannot be changed.</small>
//             </div>
//
//             <div className="team-field">
//               <label>
//                 Team Leader <span className="team-required">*</span>
//               </label>
//               <select
//                 className="team-select"
//                 value={formData.teamLeaderId}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamLeaderId: e.target.value })
//                 }
//                 required
//               >
//                 <option value="">Select Leader</option>
//                 {potentialLeaders.map((leader) => {
//                   const isCurrentLeader = leader.id === team.teamLeaderId;
//                   const isDisabled =
//                     leader.isAvailable === false && !isCurrentLeader;
//
//                   return (
//                     <option
//                       key={leader.id}
//                       value={leader.id}
//                       disabled={isDisabled}
//                     >
//                       {leader.name}
//                       {isDisabled
//                         ? ` (Already in ${leader.currentTeamName})`
//                         : isCurrentLeader
//                         ? " (Current)"
//                         : ""}
//                     </option>
//                   );
//                 })}
//               </select>
//             </div>
//
//             <div className="team-field">
//               <label>Team Goal</label>
//               <textarea
//                 className="team-textarea"
//                 rows={3}
//                 value={formData.teamGoal}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamGoal: e.target.value })
//                 }
//               />
//             </div>
//
//             <div className="team-field">
//               <label>Members</label>
//               <div className="team-members-list">
//                 {employees.map((emp) => {
//                   const isCurrentMember = selectedMembers.includes(emp.id);
//                   const isLeader = Number(formData.teamLeaderId) === emp.id;
//                   const isDisabled =
//                     isLeader || (emp.isAvailable === false && !isCurrentMember);
//
//                   return (
//                     <label
//                       key={emp.id}
//                       className={`team-member-item ${
//                         isDisabled ? "disabled" : ""
//                       }`}
//                       title={
//                         isLeader
//                           ? "Team leader cannot also be a member"
//                           : isDisabled
//                           ? `This user is in ${emp.currentTeamName}`
//                           : ""
//                       }
//                     >
//                       <input
//                         type="checkbox"
//                         checked={isCurrentMember}
//                         onChange={() => handleMemberToggle(emp.id)}
//                         disabled={isDisabled}
//                       />
//                       <span>{emp.name}</span>
//                       {isDisabled && (
//                         <i
//                           className="bi bi-slash-circle ms-2 text-danger"
//                           style={{ fontSize: "0.8rem" }}
//                         />
//                       )}
//                     </label>
//                   );
//                 })}
//               </div>
//             </div>
//
//             <div className="team-field">
//               <label>Status</label>
//               <select
//                 className="team-select"
//                 value={formData.status}
//                 onChange={(e) =>
//                   setFormData({ ...formData, status: e.target.value })
//                 }
//               >
//                 <option value="Active">Active</option>
//                 <option value="Inactive">Inactive</option>
//               </select>
//               <small className="text-muted mt-1 d-block">
//                 Changing status to Active will fail if any selected member is
//                 currently active in another team.
//               </small>
//             </div>
//
//             {error && <div className="team-alert error mb-0">{error}</div>}
//           </form>
//         </div>
//
//         <div className="team-modal-footer">
//           <button type="button" className="team-btn secondary" onClick={onClose}>
//             Cancel
//           </button>
//           <button
//             type="submit"
//             form="team-edit-form"
//             className="team-btn primary"
//             disabled={loading}
//           >
//             <i
//               className={`bi ${
//                 loading ? "bi-arrow-repeat animate-spin" : "bi-check-lg"
//               }`}
//             />
//             {loading ? "Saving..." : "Save Changes"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default TeamEditModal;

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  updateTeam,
  fetchCandidateUsers,
  fetchCandidateMembers,
} from "../../services/teamService";

import type { TeamResponse, CandidateUser } from "../../services/teamService";
import { authStorage } from "../../services/authStorage";

interface TeamEditModalProps {
  team: TeamResponse;
  onClose: () => void;
  onUpdate: () => void;
}

const TeamEditModal = ({ team, onClose, onUpdate }: TeamEditModalProps) => {
  const [employees, setEmployees] = useState<CandidateUser[]>([]);
  const [potentialLeaders, setPotentialLeaders] = useState<CandidateUser[]>([]);

  const [formData, setFormData] = useState({
    teamName: team.teamName || "",
    teamGoal: team.teamGoal || "",
    status: team.status || "Active",
    teamLeaderId: team.teamLeaderId ? String(team.teamLeaderId) : "",
  });

  const [selectedMembers, setSelectedMembers] = useState<number[]>(
    team.members
      ? team.members
          .map((m) => m.userId ?? m.employeeId)
          .filter((id): id is number => id !== undefined && id !== null)
      : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changeMessages, setChangeMessages] = useState<string[]>([]);

  const getCurrentUserId = (): number | undefined => {
    const user = authStorage.getUser();
    const id = user?.id || user?.userId;
    return id ? Number(id) : undefined;
  };

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const [memberData, leaderData] = await Promise.all([
          fetchCandidateMembers(team.departmentId),
          fetchCandidateUsers(team.departmentId),
        ]);

        const currentLeaderExists = leaderData.some(
          (leader) => Number(leader.id) === Number(team.teamLeaderId)
        );

        const fixedLeaders = currentLeaderExists
          ? leaderData
          : [
              {
                id: team.teamLeaderId,
                name: team.teamLeaderName,
                isAvailable: true,
                currentTeamId: team.id,
                currentTeamName: team.teamName,
              },
              ...leaderData,
            ];

        setEmployees(memberData);
        setPotentialLeaders(fixedLeaders);
      } catch (err) {
        console.error("Failed to load candidates for edit", err);
        setError("Failed to load potential members and leaders.");
      }
    };

    loadCandidates();
  }, [team]);

  const originalMembers = useMemo(() => {
    return team.members
      ? team.members
          .map((m) => m.userId ?? m.employeeId)
          .filter((id): id is number => id !== undefined && id !== null)
      : [];
  }, [team.members]);

  const getMemberName = (id: number) => {
    const found = employees.find((e) => Number(e.id) === Number(id));
    return found?.name || `User ID ${id}`;
  };

  const getLeaderName = (id: number | string) => {
    const found = potentialLeaders.find((l) => Number(l.id) === Number(id));
    return found?.name || `User ID ${id}`;
  };

  const buildChangeMessages = () => {
    const changes: string[] = [];

    if (formData.teamName.trim() !== team.teamName) {
      changes.push(`Team name will change from "${team.teamName}" to "${formData.teamName.trim()}".`);
    }

    if ((formData.teamGoal || "") !== (team.teamGoal || "")) {
      changes.push("Team goal will be updated.");
    }

    if (Number(formData.teamLeaderId) !== Number(team.teamLeaderId)) {
      changes.push(
        `Team leader will change from "${team.teamLeaderName}" to "${getLeaderName(
          formData.teamLeaderId
        )}".`
      );
    }

    if ((formData.status || "").toLowerCase() !== (team.status || "").toLowerCase()) {
      if (formData.status.toLowerCase() === "inactive") {
        changes.push("Are you sure you are going to inactive this team?");
      } else {
        changes.push(`Team status will change from "${team.status}" to "${formData.status}".`);
      }
    }

    const addedMembers = selectedMembers.filter((id) => !originalMembers.includes(id));
    const removedMembers = originalMembers.filter((id) => !selectedMembers.includes(id));

    if (addedMembers.length > 0) {
      changes.push(
        `Members will be added: ${addedMembers.map(getMemberName).join(", ")}.`
      );
    }

    if (removedMembers.length > 0) {
      changes.push(
        `Members will be removed: ${removedMembers.map(getMemberName).join(", ")}.`
      );
    }

    return changes;
  };

  const handleMemberToggle = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const getBackendError = (err: any) => {
    if (err?.response?.status === 403) {
      return "Request failed with status code 403. Please log out and log in again, then try once more.";
    }

    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.response?.data?.data ||
      err.message ||
      "Failed to update team."
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.teamName.trim() || !formData.teamLeaderId) {
      setError("Team Name and Team Leader are required.");
      return;
    }

    const changes = buildChangeMessages();

    if (changes.length === 0) {
      setError("No changes detected.");
      return;
    }

    setChangeMessages(changes);
    setShowConfirmModal(true);
  };

  const confirmUpdate = async () => {
    try {
      setLoading(true);
      setError("");

      await updateTeam(team.id, {
        teamName: formData.teamName.trim(),
        departmentId: team.departmentId,
        teamLeaderId: Number(formData.teamLeaderId),
        createdById: getCurrentUserId(),
        teamGoal: formData.teamGoal,
        status: formData.status,
        memberUserIds: selectedMembers,
        memberEmployeeIds: selectedMembers,
      });

      setShowConfirmModal(false);
      onUpdate();
    } catch (err: any) {
      console.error("Team update error:", err);
      setShowConfirmModal(false);
      setError(getBackendError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="team-modal-overlay">
        <div className="team-modal-content">
          <div className="team-modal-header">
            <h2>Edit Team: {team.teamName}</h2>
            <button type="button" className="team-btn ghost" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="team-modal-body">
            <form onSubmit={handleSubmit} id="team-edit-form">
              <div className="team-field">
                <label>
                  Team Name <span className="team-required">*</span>
                </label>
                <input
                  type="text"
                  className="team-input"
                  value={formData.teamName}
                  onChange={(e) =>
                    setFormData({ ...formData, teamName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="team-field">
                <label>Department</label>
                <input
                  type="text"
                  className="team-input"
                  value={team.departmentName || ""}
                  disabled
                />
                <small className="text-muted">Department cannot be changed.</small>
              </div>

              <div className="team-field">
                <label>
                  Team Leader <span className="team-required">*</span>
                </label>
                <select
                  className="team-select"
                  value={formData.teamLeaderId}
                  onChange={(e) =>
                    setFormData({ ...formData, teamLeaderId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Leader</option>

                  {potentialLeaders.map((leader) => {
                    const isCurrentLeader =
                      Number(leader.id) === Number(team.teamLeaderId);

                    const isDisabled =
                      leader.isAvailable === false && !isCurrentLeader;

                    return (
                      <option
                        key={leader.id}
                        value={leader.id}
                        disabled={isDisabled}
                      >
                        {leader.name}
                        {isCurrentLeader
                          ? " (Current)"
                          : isDisabled
                          ? ` (Already in ${leader.currentTeamName})`
                          : ""}
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
                  onChange={(e) =>
                    setFormData({ ...formData, teamGoal: e.target.value })
                  }
                />
              </div>

              <div className="team-field">
                <label>Members</label>

                <div className="team-members-list">
                  {employees.map((emp) => {
                    const isCurrentMember = selectedMembers.includes(emp.id);
                    const isLeader = Number(formData.teamLeaderId) === emp.id;

                    const isDisabled =
                      isLeader || (emp.isAvailable === false && !isCurrentMember);

                    return (
                      <label
                        key={emp.id}
                        className={`team-member-item ${
                          isDisabled ? "disabled" : ""
                        }`}
                        title={
                          isLeader
                            ? "Team leader cannot also be a member"
                            : isDisabled
                            ? `This user is in ${emp.currentTeamName}`
                            : ""
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isCurrentMember}
                          onChange={() => handleMemberToggle(emp.id)}
                          disabled={isDisabled}
                        />
                        <span>{emp.name}</span>
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
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {error && <div className="team-alert error mb-0">{error}</div>}
            </form>
          </div>

          <div className="team-modal-footer">
            <button
              type="button"
              className="team-btn secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="team-edit-form"
              className="team-btn primary"
              disabled={loading}
            >
              <i
                className={`bi ${
                  loading ? "bi-arrow-repeat animate-spin" : "bi-check-lg"
                }`}
              />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="team-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>Confirm Changes</h2>
              <button
                type="button"
                className="team-btn ghost"
                onClick={() => setShowConfirmModal(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="team-modal-body">
              <p>Please confirm the following changes:</p>

              <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                {changeMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-btn secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                No
              </button>

              <button
                type="button"
                className="team-btn primary"
                onClick={confirmUpdate}
                disabled={loading}
              >
                {loading ? "Saving..." : "Yes, Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamEditModal;