// add KHN ( Chatgpt)
// meetingService.js

/*
import axios from "./axios";

export const getUpcomingMeetings = () => {
  return axios.get("/one-on-one-meetings/upcoming");
};

export const createMeeting = (data) => {
  return axios.post("/one-on-one-meetings", data);
};

export const updateMeeting = (id, data) => {
  return axios.put(`/one-on-one-meetings/${id}`, data);
};

export const deleteMeeting = (id) => {
  return axios.delete(`/one-on-one-meetings/${id}`);
};*/
import api from "./api";

export const getUpcomingMeetings = async () => {
  const res = await api.get("/one-on-one-meetings/upcoming");
  return res.data.data ?? [];
};

export const createMeeting = async (data) => {
  const res = await api.post("/one-on-one-meetings", data);
  return res.data.data;
};

export const updateMeeting = async (id, data) => {
  const res = await api.put(`/one-on-one-meetings/${id}`, data);
  return res.data.data;
};

export const deleteMeeting = async (id) => {
  const res = await api.delete(`/one-on-one-meetings/${id}`);
  return res.data;
};
