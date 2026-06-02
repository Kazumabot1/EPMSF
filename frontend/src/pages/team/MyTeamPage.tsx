import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMyTeams, type TeamResponse } from '../../services/teamService';

const getApiErrorMessage = (err: any) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Unable to load your team information.';

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const formatStatus = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return value
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getMemberName = (member: TeamResponse['members'][number]) =>
    member.userName || member.employeeName || 'Unnamed member';

const getInitials = (name: string) => {
  const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

  return initials || 'U';
};

const getMemberRole = (member: TeamResponse['members'][number], team: TeamResponse) => {
  if (member.userId === team.teamLeaderId) {
    return 'Team Leader';
  }

  if (member.userId === team.projectManagerId) {
    return 'Project Manager';
  }

  return 'Member';
};

const SummaryCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 truncate text-xl font-bold leading-tight text-slate-950" title={String(value)}>
        {value}
      </div>
    </div>
);

const DetailCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 break-words text-base font-bold leading-snug text-slate-950">{value}</div>
    </div>
);

const MyTeamPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchMyTeams();
      const safeTeams = Array.isArray(data) ? data : [];

      setTeams(safeTeams);
      setSelectedTeamId((previous) => {
        if (previous && safeTeams.some((team) => team.id === previous)) {
          return previous;
        }

        return safeTeams[0]?.id ?? null;
      });
    } catch (err: any) {
      setTeams([]);
      setSelectedTeamId(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  }, [teams, selectedTeamId]);

  const totalMembers = selectedTeam?.members?.length ?? 0;

  return (
      <main className="-mx-7 -my-6 min-h-[calc(100vh-86px)] bg-white px-7 py-4 font-sans text-slate-950">
        <div className="mx-auto w-full max-w-[1120px] space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">My Team</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Team Composition</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  View your team structure, key roles, members, department, goal, and current status.
                </p>
              </div>

              <button
                  type="button"
                  onClick={loadTeams}
                  disabled={loading}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </section>

          {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
          )}

          {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-10 rounded-xl bg-slate-100" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="h-20 rounded-2xl bg-slate-100" />
                    <div className="h-20 rounded-2xl bg-slate-100" />
                    <div className="h-20 rounded-2xl bg-slate-100" />
                  </div>
                </div>
              </section>
          ) : !selectedTeam ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-base font-bold text-slate-950">No active team found</p>
                <p className="mt-2 text-sm text-slate-500">You are not currently assigned to an active team.</p>
              </section>
          ) : (
              <>
                {teams.length > 1 && (
                    <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <label htmlFor="my-team-select" className="text-sm font-bold text-slate-700">
                        Select team
                      </label>
                      <select
                          id="my-team-select"
                          value={selectedTeam.id}
                          onChange={(event) => setSelectedTeamId(Number(event.target.value))}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.teamName}
                            </option>
                        ))}
                      </select>
                    </section>
                )}

                <section className="grid gap-3 md:grid-cols-3">
                  <SummaryCard label="Team" value={selectedTeam.teamName || '—'} />
                  <SummaryCard label="Department" value={selectedTeam.departmentName || '—'} />
                  <SummaryCard label="Members" value={totalMembers} />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailCard label="Team Leader" value={selectedTeam.teamLeaderName || '—'} />
                    <DetailCard label="Project Manager" value={selectedTeam.projectManagerName || '—'} />
                    <DetailCard label="Status" value={formatStatus(selectedTeam.status)} />
                    <DetailCard label="Created" value={formatDate(selectedTeam.createdDate)} />
                  </div>

                  {selectedTeam.teamGoal && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Team Goal</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{selectedTeam.teamGoal}</p>
                      </div>
                  )}

                  <div className="mt-5">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-950">Team Members</h2>
                        <p className="text-sm text-slate-500">Current active members in this team.</p>
                      </div>
                      <span className="text-sm font-bold text-slate-600">
                    {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
                  </span>
                    </div>

                    {selectedTeam.members?.length ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                              <thead className="bg-slate-50">
                              <tr>
                                <th className="w-16 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  No.
                                </th>
                                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Member
                                </th>
                                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Role in Team
                                </th>
                                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Joined
                                </th>
                              </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                              {selectedTeam.members.map((member, index) => {
                                const memberName = getMemberName(member);
                                const roleLabel = getMemberRole(member, selectedTeam);

                                return (
                                    <tr
                                        key={`${member.userId ?? member.employeeId ?? index}-${memberName}`}
                                        className="transition hover:bg-slate-50"
                                    >
                                      <td className="px-4 py-3 font-semibold text-slate-600">{index + 1}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex min-w-[220px] items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
                                      {getInitials(memberName)}
                                    </span>
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-950" title={memberName}>
                                              {memberName}
                                            </p>
                                            <p
                                                className="truncate text-xs font-semibold text-slate-500"
                                                title={selectedTeam.departmentName || 'Team member'}
                                            >
                                              {selectedTeam.departmentName || 'Team member'}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                    {roleLabel}
                                  </span>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-700">
                                        {formatDate(member.startedDate)}
                                      </td>
                                    </tr>
                                );
                              })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-slate-500">
                            No active members are recorded for this team.
                          </p>
                        </div>
                    )}
                  </div>
                </section>
              </>
          )}
        </div>
      </main>
  );
};

export default MyTeamPage;
