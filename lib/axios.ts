import axios from "axios";

// Single shared axios instance used by every page/component.
// baseURL points at our own Next.js API routes, and withCredentials makes
// sure the httpOnly auth cookie set by /api/auth/login is sent on every call.
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
