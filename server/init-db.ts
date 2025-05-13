import { db } from "./db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Function to ensure admin user exists in the database
export async function ensureAdminUserExists() {
  try {
    console.log('Checking if admin user exists...');
    
    // Admin credentials
    const adminUser = {
      username: 'admin',
      password: 'adminpass123', // Will be hashed
      email: 'admin@example.com',
      name: 'System Administrator',
      role: 'manager' as const,
      locationId: null,
      createdAt: new Date(),
    };

    // Check if admin user already exists
    const existingUsers = await db.select().from(users).where(eq(users.username, adminUser.username));
    
    if (existingUsers.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Create admin user
    const result = await db.insert(users).values({
      ...adminUser,
      password: hashedPassword,
    });

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}