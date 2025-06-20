import { apiRequest } from "./queryClient";

export const api = {
  // Health and system
  getHealth: () => fetch("/api/health").then(res => res.json()),
  testRedis: () => fetch("/api/redis/test").then(res => res.json()),

  // Dashboard
  getDashboardMetrics: () => fetch("/api/dashboard/metrics").then(res => res.json()),

  // Rooms
  getRooms: () => fetch("/api/rooms").then(res => res.json()),
  getRoom: (id: number) => fetch(`/api/rooms/${id}`).then(res => res.json()),
  createRoom: (data: any) => apiRequest("POST", "/api/rooms", data),
  updateRoom: (id: number, data: any) => apiRequest("PUT", `/api/rooms/${id}`, data),
  deleteRoom: (id: number) => apiRequest("DELETE", `/api/rooms/${id}`),

  // Guests
  getGuests: () => fetch("/api/guests").then(res => res.json()),
  getGuest: (id: number) => fetch(`/api/guests/${id}`).then(res => res.json()),
  createGuest: (data: any) => apiRequest("POST", "/api/guests", data),

  // Reservations
  getReservations: () => fetch("/api/reservations").then(res => res.json()),
  getRecentReservations: (limit?: number) => 
    fetch(`/api/reservations/recent${limit ? `?limit=${limit}` : ""}`).then(res => res.json()),
  getReservation: (id: number) => fetch(`/api/reservations/${id}`).then(res => res.json()),
  createReservation: (data: any) => apiRequest("POST", "/api/reservations", data),

  // Staff
  getStaff: () => fetch("/api/staff").then(res => res.json()),
  createStaff: (data: any) => apiRequest("POST", "/api/staff", data),
};
