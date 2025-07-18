import { apiRequest } from "./queryClient";

export const api = {
  // Health and system
  getHealth: () => fetch("/api/health", { credentials: 'include' }).then(res => res.json()),
  testRedis: () => fetch("/api/redis/test", { credentials: 'include' }).then(res => res.json()),

  // Dashboard
  getDashboardMetrics: () => fetch("/api/dashboard/metrics", { credentials: 'include' }).then(res => res.json()),



  // Staff
  getStaff: () => fetch("/api/staff", { credentials: 'include' }).then(res => res.json()),
  createStaff: (data: any) => apiRequest("POST", "/api/staff", data),
};
