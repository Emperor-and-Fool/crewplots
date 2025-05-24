import { 
  users, rooms, guests, reservations, staff,
  type User, type InsertUser,
  type Room, type InsertRoom,
  type Guest, type InsertGuest,
  type Reservation, type InsertReservation, type ReservationWithDetails,
  type Staff, type InsertStaff
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Room methods
  getAllRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Guest methods
  getAllGuests(): Promise<Guest[]>;
  getGuest(id: number): Promise<Guest | undefined>;
  getGuestByEmail(email: string): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest | undefined>;

  // Reservation methods
  getAllReservations(): Promise<ReservationWithDetails[]>;
  getReservation(id: number): Promise<ReservationWithDetails | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, reservation: Partial<InsertReservation>): Promise<Reservation | undefined>;
  getRecentReservations(limit: number): Promise<ReservationWithDetails[]>;

  // Staff methods
  getAllStaff(): Promise<Staff[]>;
  getStaff(id: number): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;

  // Dashboard analytics
  getDashboardMetrics(): Promise<{
    totalRooms: number;
    occupancyRate: number;
    revenue: number;
    guestSatisfaction: number;
    roomStatusCounts: { status: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db
      .insert(rooms)
      .values(room)
      .returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updatedRoom] = await db
      .update(rooms)
      .set(room)
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom || undefined;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllGuests(): Promise<Guest[]> {
    return await db.select().from(guests);
  }

  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest || undefined;
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.email, email));
    return guest || undefined;
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [newGuest] = await db
      .insert(guests)
      .values(guest)
      .returning();
    return newGuest;
  }

  async updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest | undefined> {
    const [updatedGuest] = await db
      .update(guests)
      .set(guest)
      .where(eq(guests.id, id))
      .returning();
    return updatedGuest || undefined;
  }

  async getAllReservations(): Promise<ReservationWithDetails[]> {
    return await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .then(rows => rows.map(row => ({
        ...row.reservations,
        guest: row.guests!,
        room: row.rooms!
      })));
  }

  async getReservation(id: number): Promise<ReservationWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.reservations,
      guest: result.guests!,
      room: result.rooms!
    };
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [newReservation] = await db
      .insert(reservations)
      .values(reservation)
      .returning();
    return newReservation;
  }

  async updateReservation(id: number, reservation: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const [updatedReservation] = await db
      .update(reservations)
      .set(reservation)
      .where(eq(reservations.id, id))
      .returning();
    return updatedReservation || undefined;
  }

  async getRecentReservations(limit: number): Promise<ReservationWithDetails[]> {
    return await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(reservations.createdAt))
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.reservations,
        guest: row.guests!,
        room: row.rooms!
      })));
  }

  async getAllStaff(): Promise<Staff[]> {
    return await db.select().from(staff);
  }

  async getStaff(id: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember || undefined;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db
      .insert(staff)
      .values(staffData)
      .returning();
    return newStaff;
  }

  async getDashboardMetrics(): Promise<{
    totalRooms: number;
    occupancyRate: number;
    revenue: number;
    guestSatisfaction: number;
    roomStatusCounts: { status: string; count: number }[];
  }> {
    const totalRoomsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rooms);
    
    const totalRooms = totalRoomsResult[0]?.count || 0;

    const occupiedRoomsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rooms)
      .where(eq(rooms.status, 'occupied'));
    
    const occupiedRooms = occupiedRoomsResult[0]?.count || 0;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    const revenueResult = await db
      .select({ 
        total: sql<number>`coalesce(sum(${reservations.totalAmount}), 0)` 
      })
      .from(reservations)
      .where(eq(reservations.status, 'confirmed'));
    
    const revenue = Number(revenueResult[0]?.total) || 0;

    const roomStatusCounts = await db
      .select({
        status: rooms.status,
        count: sql<number>`count(*)`
      })
      .from(rooms)
      .groupBy(rooms.status);

    return {
      totalRooms,
      occupancyRate: Math.round(occupancyRate),
      revenue,
      guestSatisfaction: 4.8, // This would come from a reviews/ratings system
      roomStatusCounts
    };
  }
}

export const storage = new DatabaseStorage();
