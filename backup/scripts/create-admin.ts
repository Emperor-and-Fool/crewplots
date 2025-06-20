import { db } from '../server/db';
import { users } from '../shared/schema';
import * as bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    // Admin credentials - Remember these for login
    const adminUser = {
      username: 'admin',
      password: 'adminpass123', // This will be hashed below
      email: 'admin@example.com',
      name: 'System Administrator',
      role: 'manager' as const,
      locationId: null,
    };

    // Check if the admin user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, adminUser.username)
    });

    if (existingUser) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Create the admin user
    const [createdUser] = await db.insert(users).values({
      ...adminUser,
      password: hashedPassword,
    }).returning();

    console.log('Admin user created successfully');
    console.log('Username:', adminUser.username);
    console.log('Password:', adminUser.password); // Shows the unhashed password for login
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();