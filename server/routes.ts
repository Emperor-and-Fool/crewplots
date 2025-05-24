import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initRedis, testRedisConnection, cacheGet, cacheSet } from "./redis";
import { insertRoomSchema, insertGuestSchema, insertReservationSchema, insertStaffSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Redis connection (non-blocking)
  initRedis().catch(() => {
    console.log('Redis will be available when server starts');
  });

  // Health check endpoints
  app.get("/api/health", async (req, res) => {
    try {
      const redisStatus = await testRedisConnection();
      res.json({ 
        status: "healthy", 
        database: "connected",
        redis: redisStatus
      });
    } catch (error) {
      res.status(500).json({ 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/redis/test", async (req, res) => {
    const result = await testRedisConnection();
    res.json(result);
  });

  // Dashboard analytics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const cacheKey = "dashboard:metrics";
      let metrics = await cacheGet(cacheKey);
      
      if (!metrics) {
        metrics = await storage.getDashboardMetrics();
        await cacheSet(cacheKey, metrics, 300); // Cache for 5 minutes
      }
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Room endpoints
  app.get("/api/rooms", async (req, res) => {
    try {
      const cacheKey = "rooms:all";
      let rooms = await cacheGet(cacheKey);
      
      if (!rooms) {
        rooms = await storage.getAllRooms();
        await cacheSet(cacheKey, rooms, 600); // Cache for 10 minutes
      }
      
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const room = await storage.getRoom(id);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const validatedData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid room data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.put("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(id, validatedData);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid room data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRoom(id);
      
      if (!success) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete room" });
    }
  });

  // Guest endpoints
  app.get("/api/guests", async (req, res) => {
    try {
      const guests = await storage.getAllGuests();
      res.json(guests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guests" });
    }
  });

  app.get("/api/guests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const guest = await storage.getGuest(id);
      
      if (!guest) {
        return res.status(404).json({ error: "Guest not found" });
      }
      
      res.json(guest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guest" });
    }
  });

  app.post("/api/guests", async (req, res) => {
    try {
      const validatedData = insertGuestSchema.parse(req.body);
      const guest = await storage.createGuest(validatedData);
      res.status(201).json(guest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid guest data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create guest" });
    }
  });

  // Reservation endpoints
  app.get("/api/reservations", async (req, res) => {
    try {
      const reservations = await storage.getAllReservations();
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  app.get("/api/reservations/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const reservations = await storage.getRecentReservations(limit);
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent reservations" });
    }
  });

  app.get("/api/reservations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reservation = await storage.getReservation(id);
      
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      res.json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservation" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const validatedData = insertReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(validatedData);
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid reservation data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  // Staff endpoints
  app.get("/api/staff", async (req, res) => {
    try {
      const staffMembers = await storage.getAllStaff();
      res.json(staffMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const validatedData = insertStaffSchema.parse(req.body);
      const staffMember = await storage.createStaff(validatedData);
      res.status(201).json(staffMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid staff data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
