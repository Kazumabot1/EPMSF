import api from './api';

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
}

export interface TeamOption {
  id: number;
  teamName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  teamLeaderId?: number | null;
  teamLeaderName?: string | null;
  projectManagerId?: number | null;
  projectManagerName?: string | null;
}

export interface TeamEmployeeOption {
  id: number;
  employeeId: number;
  userId?: number | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  positionTitle?: string | null;
}

export interface OneOnOneAccessContext {
  accessMode:
    | 'NO_CREATE'
    | 'EMPLOYEE'
    | 'HR'
    | 'DEPARTMENT_HEAD'
    | 'TEAM_MANAGER'
    | 'DEPARTMENT_SELECTION'
    | 'DEPARTMENT_AND_TEAM_SELECTION'
    | 'DEFAULT_DEPARTMENT'
    | 'TEAM_SELECTION'
    | 'MANAGED_TEAM_ONLY';
  departmentId?: number | null;
  departmentName?: string | null;
  canCreate: boolean;
  canSelectDepartment: boolean;
  canSelectTeam: boolean;
  teamRequired: boolean;
  canUseDepartmentEmployeeScope: boolean;
}

export interface OneOnOneActionItem {
  id?: number;
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Meeting {
  id: number;
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  managerId?: number | null;
  managerFirstName?: string | null;
  managerLastName?: string | null;
  creatorUserId?: number | null;
  creatorName?: string | null;
  creatorEmail?: string | null;
  scheduledDate: string;
  location?: string | null;
  notes?: string | null;
  status?: boolean | null;
  firstMeetingEndDate?: string | null;
  followUpDate?: string | null;
  followUpGoal?: string | null;
  followUpNotes?: string | null;
  followUpLocation?: string | null;
  followUpStatus?: boolean | null;
  followUpEndDate?: string | null;
  followUpReminder24hSent?: boolean | null;
  isFinalized?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  parentMeetingId?: number | null;
  followUp?: boolean | null;
  followUpMeetingId?: number | null;
  followUpStartDate?: string | null;
  followUpMeetingNotes?: string | null;
  actionItem?: OneOnOneActionItem | null;
}

export interface CreateMeetingRequest {
  employeeId: number;
  departmentId?: number;
  teamId?: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
}

export interface UpdateMeetingRequest {
  employeeId?: number;
  departmentId?: number;
  teamId?: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  followUpNotes?: string;
}

export interface FollowUpRequest {
  followUpDate: string;
  location?: string;
  followUpGoal?: string;
  followUpNotes?: string;
}

export interface SaveActionItemRequest {
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
}

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export async function getOneOnOneContext(): Promise<OneOnOneAccessContext> {
  const response = await api.get('/one-on-one-meetings/context');
  return unwrap<OneOnOneAccessContext>(response);
}

export async function getMyOneOnOneTeams(): Promise<TeamOption[]> {
  const response = await api.get('/one-on-one-meetings/my-teams');
  return unwrap<TeamOption[]>(response);
}

export async function getOneOnOneTeams(departmentId?: number): Promise<TeamOption[]> {
  const response = await api.get('/one-on-one-meetings/teams', {
    params: departmentId ? { departmentId } : undefined,
  });
  return unwrap<TeamOption[]>(response);
}

export async function getActiveEmployeesByTeam(
  teamId: number,
  departmentId?: number,
): Promise<TeamEmployeeOption[]> {
  const response = await api.get(`/one-on-one-meetings/teams/${teamId}/active-employees`, {
    params: departmentId ? { departmentId } : undefined,
  });
  return unwrap<TeamEmployeeOption[]>(response);
}

export async function getActiveEmployeesByDepartment(
  departmentId: number,
): Promise<TeamEmployeeOption[]> {
  const response = await api.get(`/one-on-one-meetings/departments/${departmentId}/active-employees`);
  return unwrap<TeamEmployeeOption[]>(response);
}

export async function createMeeting(payload: CreateMeetingRequest): Promise<Meeting> {
  const response = await api.post('/one-on-one-meetings', payload);
  return unwrap<Meeting>(response);
}

export async function updateMeeting(
  meetingId: number,
  payload: UpdateMeetingRequest,
): Promise<Meeting> {
  const response = await api.put(`/one-on-one-meetings/${meetingId}`, payload);
  return unwrap<Meeting>(response);
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/upcoming');
  return unwrap<Meeting[]>(response);
}

export async function getOngoingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/ongoing');
  return unwrap<Meeting[]>(response);
}

export async function getPastMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/past');
  return unwrap<Meeting[]>(response);
}

export async function getMeetingById(id: number): Promise<Meeting> {
  const response = await api.get(`/one-on-one-meetings/${id}`);
  return unwrap<Meeting>(response);
}

export async function finishMeeting(id: number): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${id}/finish`);
  return unwrap<Meeting>(response);
}

export async function createFollowUpMeeting(
  meetingId: number,
  payload: FollowUpRequest,
): Promise<Meeting> {
  const response = await api.put(`/one-on-one-meetings/${meetingId}/follow-up`, payload);
  return unwrap<Meeting>(response);
}

export async function setFollowUp(
  meetingId: number,
  payload: FollowUpRequest,
): Promise<Meeting> {
  return createFollowUpMeeting(meetingId, payload);
}

export async function deleteMeeting(id: number): Promise<void> {
  await api.delete(`/one-on-one-meetings/${id}`);
}

export async function saveActionItem(
  meetingIdOrPayload: number | SaveActionItemRequest,
  payload?: SaveActionItemRequest,
): Promise<OneOnOneActionItem> {
  const body =
    typeof meetingIdOrPayload === 'number'
      ? { ...(payload || {}), meetingId: meetingIdOrPayload }
      : meetingIdOrPayload;

  const response = await api.post('/one-on-one-action-items', body);
  return unwrap<OneOnOneActionItem>(response);
}

export async function getActionItems(): Promise<OneOnOneActionItem[]> {
  const response = await api.get('/one-on-one-action-items');
  return unwrap<OneOnOneActionItem[]>(response);
}

export async function getActionItemByMeetingId(
  meetingId: number,
): Promise<OneOnOneActionItem | null> {
  const response = await api.get(`/one-on-one-action-items/meeting/${meetingId}`);
  return unwrap<OneOnOneActionItem | null>(response);
}

export async function updateActionItem(
  id: number,
  payload: SaveActionItemRequest,
): Promise<OneOnOneActionItem> {
  const response = await api.put(`/one-on-one-action-items/${id}`, payload);
  return unwrap<OneOnOneActionItem>(response);
}