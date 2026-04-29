// // oneOnOneService.ts
// import api from './api';
// // oneOnOneService.ts
//
// // ---------------------------------------------------------------
// // Types
// // ---------------------------------------------------------------
//
// export interface Meeting {
//   id: number;
//   employeeId: number;
//   employeeFirstName: string;
//   employeeLastName: string;
//   managerId: number;
//   managerFirstName: string;
//   managerLastName: string;
//   scheduledDate: string; // ISO datetime string
//   notes: string | null;
//   status: boolean;
//   followUpDate: string | null;
//   isFinalized: string | null;
//   createdAt: string;
//   parentMeetingId: number | null;
//   followUp: boolean;
//   actionItem: ActionItem | null;
// }
//
// export interface ActionItem {
//   id: number;
//   meetingId: number;
//   description: string;
//   updatedAt: string;
// }
//
// export interface CreateMeetingPayload {
//   employeeId: number;
//   scheduledDate: string; // ISO datetime: "2026-05-01T10:30:00"
//   notes: string;
//   parentMeetingId?: number | null;
// }
//
// export interface SaveActionItemPayload {
//   meetingId: number;
//   description: string;
// }
//
// export interface FollowUpPayload {
//   followUpDate: string; // ISO datetime
// }
//
// type ApiResponse<T> = { data: T; message: string; success: boolean };
//
// // ---------------------------------------------------------------
// // Meeting API
// // ---------------------------------------------------------------
//
// export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>('/one-on-one-meetings', payload);
//   return res.data.data;
// };
//
// export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/upcoming');
//   return res.data.data ?? [];
// };
//
// export const getOngoingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/ongoing');
//   return res.data.data ?? [];
// };
//
// export const getPastMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/past');
//   return res.data.data ?? [];
// };
//
// export const getMeetingById = async (id: number): Promise<Meeting> => {
//   const res = await api.get<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`);
//   return res.data.data;
// };
//
// export const finishMeeting = async (id: number): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/finish`);
//   return res.data.data;
// };
//
// export const setFollowUp = async (id: number, payload: FollowUpPayload): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/follow-up`, payload);
//   return res.data.data;
// };
//
// // ---------------------------------------------------------------
// // Action Item API
// // ---------------------------------------------------------------
//
// export const saveActionItem = async (payload: SaveActionItemPayload): Promise<ActionItem> => {
//   const res = await api.post<ApiResponse<ActionItem>>('/one-on-one-action-items', payload);
//   return res.data.data;
// };
//
// export const getActionItemByMeeting = async (meetingId: number): Promise<ActionItem | null> => {
//   const res = await api.get<ApiResponse<ActionItem | null>>(`/one-on-one-action-items/meeting/${meetingId}`);
//   return res.data.data;
// };
//
// // ---------------------------------------------------------------
// // Employee dropdown
// // ---------------------------------------------------------------
//
// export interface EmployeeOption {
//   id: number;
//   firstName: string;
//   lastName: string;
// }
//
// export const getActiveEmployeesByDepartment = async (departmentId: number): Promise<EmployeeOption[]> => {
//   const res = await api.get<ApiResponse<EmployeeOption[]>>(`/employees/active-by-department/${departmentId}`);
//   return res.data.data ?? [];
// };


// khn (chatgpt)
// import api from './api';
//
// export interface Meeting {
//   id: number;
//   employeeId: number;
//   employeeFirstName: string;
//   employeeLastName: string;
//   managerId: number;
//   managerFirstName: string;
//   managerLastName: string;
//   scheduledDate: string;
//   notes: string | null;
//   status: boolean;
//   followUpDate: string | null;
//   isFinalized: string | null;
//   createdAt: string;
//   updatedAt?: string | null;
//   parentMeetingId: number | null;
//   followUp: boolean;
//   actionItem: ActionItem | null;
// }
//
// export interface ActionItem {
//   id: number;
//   meetingId: number;
//   description: string;
//   updatedAt: string;
// }
//
// export interface CreateMeetingPayload {
//   employeeId: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   forceCreate?: boolean;
// }
//
// export interface UpdateMeetingPayload {
//   employeeId?: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   forceCreate?: boolean;
// }
//
// export interface SaveActionItemPayload {
//   meetingId: number;
//   description: string;
// }
//
// export interface FollowUpPayload {
//   followUpDate: string;
// }
//
// export interface EmployeeOption {
//   id: number;
//   firstName: string;
//   lastName: string;
// }
//
// type ApiResponse<T> = { data: T; message: string; success: boolean };
//
// export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>('/one-on-one-meetings', payload);
//   return res.data.data;
// };
//
// export const updateMeeting = async (
//   id: number,
//   payload: UpdateMeetingPayload
// ): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`, payload);
//   return res.data.data;
// };
//
// export const deleteMeeting = async (id: number): Promise<void> => {
//   await api.delete(`/one-on-one-meetings/${id}`);
// };
//
// export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/upcoming');
//   return res.data.data ?? [];
// };
//
// export const getOngoingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/ongoing');
//   return res.data.data ?? [];
// };
//
// export const getPastMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/past');
//   return res.data.data ?? [];
// };
//
// export const getMeetingById = async (id: number): Promise<Meeting> => {
//   const res = await api.get<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`);
//   return res.data.data;
// };
//
// export const finishMeeting = async (id: number): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/finish`);
//   return res.data.data;
// };
//
// export const setFollowUp = async (id: number, payload: FollowUpPayload): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/follow-up`, payload);
//   return res.data.data;
// };
//
// export const saveActionItem = async (payload: SaveActionItemPayload): Promise<ActionItem> => {
//   const res = await api.post<ApiResponse<ActionItem>>('/one-on-one-action-items', payload);
//   return res.data.data;
// };
//
// export const getActionItemByMeeting = async (meetingId: number): Promise<ActionItem | null> => {
//   const res = await api.get<ApiResponse<ActionItem | null>>(
//     `/one-on-one-action-items/meeting/${meetingId}`
//   );
//   return res.data.data;
// };
//
// export const getActiveEmployeesByDepartment = async (
//   departmentId: number
// ): Promise<EmployeeOption[]> => {
//   const res = await api.get<ApiResponse<EmployeeOption[]>>(
//     `/employees/active-by-department/${departmentId}`
//   );
//   return res.data.data ?? [];
// };

// khn (chatgpt)

//oneOnOneService.ts file:
import api from './api';

export interface Meeting {
  id: number;
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  managerId: number;
  managerFirstName: string;
  managerLastName: string;
  scheduledDate: string;
  notes: string | null;
  followUpNotes?: string | null;
  status: boolean;
  followUpDate: string | null;
  isFinalized: string | null;
  createdAt: string;
  updatedAt?: string | null;
  parentMeetingId: number | null;
  followUp: boolean;
  actionItem: ActionItem | null;
}

export interface ActionItem {
  id: number;
  meetingId: number;
  description: string;
  updatedAt: string;
}

export interface CreateMeetingPayload {
  employeeId: number;
  scheduledDate: string;
  notes: string;
  parentMeetingId?: number | null;
  followUpNotes?: string | null;
}

export interface UpdateMeetingPayload {
  employeeId?: number;
  scheduledDate: string;
  notes: string;
  parentMeetingId?: number | null;
  followUpNotes?: string | null;
}

export interface SaveActionItemPayload {
  meetingId: number;
  description: string;
}

export interface FollowUpPayload {
  followUpDate: string;
}

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
}

type ApiResponse<T> = { data: T; message: string; success: boolean };

const unwrapData = <T>(payload: any, fallback: T): T => {
  if (payload?.data !== undefined) return payload.data as T;
  if (payload !== undefined) return payload as T;
  return fallback;
};

export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
  const res = await api.post<ApiResponse<Meeting>>('/one-on-one-meetings', payload);
  return unwrapData<Meeting>(res.data, {} as Meeting);
};

export const updateMeeting = async (
  id: number,
  payload: UpdateMeetingPayload
): Promise<Meeting> => {
  const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`, payload);
  return unwrapData<Meeting>(res.data, {} as Meeting);
};

export const deleteMeeting = async (id: number): Promise<void> => {
  await api.delete(`/one-on-one-meetings/${id}`);
};

export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
  const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/upcoming');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const getOngoingMeetings = async (): Promise<Meeting[]> => {
  const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/ongoing');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const getPastMeetings = async (): Promise<Meeting[]> => {
  const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/past');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const getMeetingById = async (id: number): Promise<Meeting> => {
  const res = await api.get<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`);
  return unwrapData<Meeting>(res.data, {} as Meeting);
};

export const finishMeeting = async (id: number): Promise<Meeting> => {
  const res = await api.post<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/finish`);
  return unwrapData<Meeting>(res.data, {} as Meeting);
};

export const setFollowUp = async (id: number, payload: FollowUpPayload): Promise<Meeting> => {
  const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/follow-up`, payload);
  return unwrapData<Meeting>(res.data, {} as Meeting);
};

export const saveActionItem = async (payload: SaveActionItemPayload): Promise<ActionItem> => {
  const res = await api.post<ApiResponse<ActionItem>>('/one-on-one-action-items', payload);
  return unwrapData<ActionItem>(res.data, {} as ActionItem);
};

export const getActionItemByMeeting = async (meetingId: number): Promise<ActionItem | null> => {
  const res = await api.get<ApiResponse<ActionItem | null>>(
    `/one-on-one-action-items/meeting/${meetingId}`
  );
  return res.data?.data ?? null;
};

export const getActiveEmployeesByDepartment = async (
  departmentId: number
): Promise<EmployeeOption[]> => {
  const res = await api.get<ApiResponse<EmployeeOption[]>>(
    `/employees/active-by-department/${departmentId}`
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
};
