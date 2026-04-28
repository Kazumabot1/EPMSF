// import React, { useEffect, useState } from "react";
// import {
//   createTeam,
//   fetchCandidateMembers,
//   fetchCandidateUsers,
//   fetchDepartments,
// } from "../../services/teamService";
//
// import type {
//   CandidateUser,
//   Department,
//   TeamRequest,
// } from "../../services/teamService";
// import { authStorage } from "../../services/authStorage";
//
// interface TeamCreateProps {
//   embedded?: boolean;
//   onCancel?: () => void;
//   onCreated?: () => void;
// }
//
// const TeamCreate: React.FC<TeamCreateProps> = ({
//   embedded = false,
//   onCancel,
//   onCreated,
// }) => {
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [leaders, setLeaders] = useState<CandidateUser[]>([]);
//   const [members, setMembers] = useState<CandidateUser[]>([]);
//
//   const [teamName, setTeamName] = useState("");
//   const [departmentId, setDepartmentId] = useState<number | "">("");
//   const [teamLeaderId, setTeamLeaderId] = useState<number | "">("");
//   const [teamGoal, setTeamGoal] = useState("");
//   const [status, setStatus] = useState("Active");
//   const [memberUserIds, setMemberUserIds] = useState<number[]>([]);
//
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//
//   const getCurrentUserId = (): number => {
//     const user = authStorage.getUser();
//     return Number(user?.id || user?.userId || 1);
//   };
//
//   useEffect(() => {
//     loadDepartments();
//   }, []);
//
//   useEffect(() => {
//     if (departmentId !== "") {
//       loadCandidates(Number(departmentId));
//     } else {
//       setLeaders([]);
//       setMembers([]);
//       setTeamLeaderId("");
//       setMemberUserIds([]);
//     }
//   }, [departmentId]);
//
//   const loadDepartments = async () => {
//     try {
//       const data = await fetchDepartments();
//       setDepartments(data);
//     } catch (error) {
//       console.error("Failed to fetch departments", error);
//       setMessage("Failed to fetch departments. Please login again.");
//     }
//   };
//
//   const loadCandidates = async (deptId: number) => {
//     try {
//       const [leaderData, memberData] = await Promise.all([
//         fetchCandidateUsers(deptId),
//         fetchCandidateMembers(deptId),
//       ]);
//
//       setLeaders(leaderData);
//       setMembers(memberData);
//       setTeamLeaderId("");
//       setMemberUserIds([]);
//     } catch (error) {
//       console.error("Failed to fetch candidates", error);
//       setMessage("Failed to fetch users. Please check your login session.");
//     }
//   };
//
//   const toggleMember = (id: number) => {
//     setMemberUserIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };
//
//   const resetForm = () => {
//     setTeamName("");
//     setDepartmentId("");
//     setTeamLeaderId("");
//     setTeamGoal("");
//     setStatus("Active");
//     setMemberUserIds([]);
//     setLeaders([]);
//     setMembers([]);
//   };
//
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//
//     if (!teamName.trim() || departmentId === "" || teamLeaderId === "") {
//       setMessage("Please fill all required fields.");
//       return;
//     }
//
//     try {
//       setLoading(true);
//       setMessage("");
//
//       const request: TeamRequest = {
//         teamName: teamName.trim(),
//         departmentId: Number(departmentId),
//         teamLeaderId: Number(teamLeaderId),
//         createdById: getCurrentUserId(),
//         teamGoal,
//         status,
//         memberUserIds,
//         memberEmployeeIds: memberUserIds,
//       };
//
//       await createTeam(request);
//
//       setMessage("Team created successfully.");
//       resetForm();
//
//       if (onCreated) {
//         onCreated();
//       }
//     } catch (error: any) {
//       console.error("Failed to create team", error);
//       setMessage(
//         error?.response?.data?.message ||
//           error?.response?.data?.error ||
//           error?.response?.data?.data ||
//           "Failed to create team."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <div className={embedded ? "" : "p-6 max-w-3xl mx-auto"}>
//       {!embedded && <h1 className="text-2xl font-semibold mb-6">Create Team</h1>}
//
//       {message && <div className="team-alert mb-3">{message}</div>}
//
//       <form onSubmit={handleSubmit} className="team-form">
//         <div className="team-field">
//           <label>
//             Team Name <span className="team-required">*</span>
//           </label>
//           <input
//             className="team-input"
//             value={teamName}
//             onChange={(e) => setTeamName(e.target.value)}
//             placeholder="Enter team name"
//             required
//           />
//         </div>
//
//         <div className="team-field">
//           <label>
//             Department <span className="team-required">*</span>
//           </label>
//           <select
//             className="team-select"
//             value={departmentId}
//             onChange={(e) =>
//               setDepartmentId(e.target.value ? Number(e.target.value) : "")
//             }
//             required
//           >
//             <option value="">Select department</option>
//             {departments.map((dept) => (
//               <option key={dept.id} value={dept.id}>
//                 {dept.departmentName || dept.name}
//               </option>
//             ))}
//           </select>
//         </div>
//
//         <div className="team-field">
//           <label>
//             Team Leader <span className="team-required">*</span>
//           </label>
//           <select
//             className="team-select"
//             value={teamLeaderId}
//             onChange={(e) =>
//               setTeamLeaderId(e.target.value ? Number(e.target.value) : "")
//             }
//             disabled={!departmentId}
//             required
//           >
//             <option value="">Select team leader</option>
//             {leaders.map((leader) => (
//               <option
//                 key={leader.id}
//                 value={leader.id}
//                 disabled={leader.isAvailable === false}
//               >
//                 {leader.name}
//                 {leader.isAvailable === false
//                   ? ` (Already in ${leader.currentTeamName})`
//                   : ""}
//               </option>
//             ))}
//           </select>
//         </div>
//
//         <div className="team-field">
//           <label>Team Goal</label>
//           <textarea
//             className="team-textarea"
//             value={teamGoal}
//             onChange={(e) => setTeamGoal(e.target.value)}
//             placeholder="Enter team goal"
//             rows={3}
//           />
//         </div>
//
//         <div className="team-field">
//           <label>Status</label>
//           <select
//             className="team-select"
//             value={status}
//             onChange={(e) => setStatus(e.target.value)}
//           >
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//
//         <div className="team-field">
//           <label>Team Members</label>
//
//           {!departmentId && (
//             <p className="text-muted">Select a department first.</p>
//           )}
//
//           {departmentId && members.length === 0 && (
//             <p className="text-muted">No available members found.</p>
//           )}
//
//           <div className="team-members-list">
//             {members.map((member) => {
//               const isLeader = Number(teamLeaderId) === member.id;
//               const isSelected = memberUserIds.includes(member.id);
//               const isDisabled =
//                 isLeader || (member.isAvailable === false && !isSelected);
//
//               return (
//                 <label
//                   key={member.id}
//                   className={`team-member-item ${
//                     isDisabled ? "disabled" : ""
//                   }`}
//                   title={
//                     isLeader
//                       ? "Team leader cannot also be a member"
//                       : isDisabled
//                       ? `This user is in ${member.currentTeamName}`
//                       : ""
//                   }
//                 >
//                   <input
//                     type="checkbox"
//                     checked={isSelected}
//                     onChange={() => toggleMember(member.id)}
//                     disabled={isDisabled}
//                   />
//                   <span>{member.name}</span>
//                 </label>
//               );
//             })}
//           </div>
//         </div>
//
//         <div className="team-modal-footer">
//           {embedded && (
//             <button
//               type="button"
//               className="team-btn secondary"
//               onClick={onCancel}
//               disabled={loading}
//             >
//               Cancel
//             </button>
//           )}
//
//           <button type="submit" disabled={loading} className="team-btn primary">
//             {loading ? "Creating..." : "Create Team"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };
//
// export default TeamCreate;

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

  const getCurrentUserId = (): number | null => {
    const user = authStorage.getUser();
    const id = user?.id || user?.userId;
    return id ? Number(id) : null;
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
      console.error(error);
      setMessage("Failed to fetch departments. Please login again.");
    }
  };

  const loadCandidates = async (deptId: number) => {
    try {
      setMessage("");

      const [leaderData, memberData] = await Promise.all([
        fetchCandidateUsers(deptId),
        fetchCandidateMembers(deptId),
      ]);

      setLeaders(leaderData);
      setMembers(memberData);
      setTeamLeaderId("");
      setMemberUserIds([]);
    } catch (error) {
      console.error(error);
      setMessage("Failed to fetch users. Please check your login session.");
    }
  };

  const toggleMember = (id: number) => {
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

  const getBackendError = (error: any) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.response?.data?.data ||
      error?.message ||
      "Failed to create team."
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const createdById = getCurrentUserId();

    if (!createdById) {
      setMessage("Current user not found. Please login again.");
      return;
    }

    if (!teamName.trim()) {
      setMessage("Team name is required.");
      return;
    }

    if (departmentId === "") {
      setMessage("Department is required.");
      return;
    }

    if (teamLeaderId === "") {
      setMessage("Team leader is required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        createdById,
        teamGoal: teamGoal.trim(),
        status,
        memberUserIds,
      };

      await createTeam(request);

      setMessage("Team created successfully.");
      resetForm();

      if (onCreated) {
        onCreated();
      }
    } catch (error: any) {
      console.error("Failed to create team:", error);
      setMessage(getBackendError(error));
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
            <option value="">
              {!departmentId
                ? "Select department first"
                : leaders.length === 0
                ? "No TeamLeader users found"
                : "Select team leader"}
            </option>

            {leaders.map((leader) => (
              <option
                key={leader.id}
                value={leader.id}
                disabled={leader.isAvailable === false}
              >
                {leader.name}
                {leader.isAvailable === false
                  ? ` (Already in ${leader.currentTeamName})`
                  : ""}
              </option>
            ))}
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
          <label>Team Members</label>

          {!departmentId && <p className="text-muted">Select a department first.</p>}

          {departmentId && members.length === 0 && (
            <p className="text-muted">No available members found.</p>
          )}

          <div className="team-members-list">
            {members.map((member) => {
              const isLeader = Number(teamLeaderId) === member.id;
              const isSelected = memberUserIds.includes(member.id);
              const isDisabled =
                isLeader || (member.isAvailable === false && !isSelected);

              return (
                <label
                  key={member.id}
                  className={`team-member-item ${isDisabled ? "disabled" : ""}`}
                  title={
                    isLeader
                      ? "Team leader cannot also be a member"
                      : isDisabled
                      ? `This user is in ${member.currentTeamName}`
                      : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                    disabled={isDisabled}
                  />
                  <span>{member.name}</span>
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