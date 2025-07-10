import { apiRequest } from "./queryClient";

export const api = {
  // Health and system
  getHealth: () => fetch("/api/health", { credentials: 'include' }).then(res => res.json()),
  testRedis: () => fetch("/api/redis/test", { credentials: 'include' }).then(res => res.json()),

  // Dashboard
  getDashboardMetrics: () => fetch("/api/dashboard/metrics", { credentials: 'include' }).then(res => res.json()),

  // Rooms
  getRooms: () => fetch("/api/rooms", { credentials: 'include' }).then(res => res.json()),
  getRoom: (id: number) => fetch(`/api/rooms/${id}`, { credentials: 'include' }).then(res => res.json()),
  createRoom: (data: any) => apiRequest("POST", "/api/rooms", data),
  updateRoom: (id: number, data: any) => apiRequest("PUT", `/api/rooms/${id}`, data),
  deleteRoom: (id: number) => apiRequest("DELETE", `/api/rooms/${id}`),

  // Guests
  getGuests: () => fetch("/api/guests", { credentials: 'include' }).then(res => res.json()),
  getGuest: (id: number) => fetch(`/api/guests/${id}`, { credentials: 'include' }).then(res => res.json()),
  createGuest: (data: any) => apiRequest("POST", "/api/guests", data),

  // Reservations
  getReservations: () => fetch("/api/reservations", { credentials: 'include' }).then(res => res.json()),
  getRecentReservations: (limit?: number) => 
    fetch(`/api/reservations/recent${limit ? `?limit=${limit}` : ""}`, { credentials: 'include' }).then(res => res.json()),
  getReservation: (id: number) => fetch(`/api/reservations/${id}`, { credentials: 'include' }).then(res => res.json()),
  createReservation: (data: any) => apiRequest("POST", "/api/reservations", data),

  // Staff
  getStaff: () => fetch("/api/staff", { credentials: 'include' }).then(res => res.json()),
  createStaff: (data: any) => apiRequest("POST", "/api/staff", data),
};
