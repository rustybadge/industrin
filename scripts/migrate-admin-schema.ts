import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

async function migrateAdminSchema() {
  console.log("Starting admin schema migration...\n");

  try {
    // 1. Add new columns to users table
    console.log("1. Adding admin columns to users table...");
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);
    console.log("✅ Added admin columns to users table");

    // 2. Add review columns to claim_requests table
    console.log("\n2. Adding review columns to claim_requests table...");
    await db.execute(sql`
      ALTER TABLE claim_requests 
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS review_notes TEXT
    `);
    console.log("✅ Added review columns to claim_requests table");

    // 3. Create company_users table
    console.log("\n3. Creating company_users table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS company_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id VARCHAR NOT NULL REFERENCES companies(id),
        email VARCHAR NOT NULL UNIQUE,
        name VARCHAR NOT NULL,
        role VARCHAR DEFAULT 'editor',
        access_token VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_by VARCHAR REFERENCES users(id),
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log("✅ Created company_users table");

    // 4. Create admin user (you)
    console.log("\n4. Creating admin user...");
    
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(sql`username = 'admin'`).limit(1);
    
    if (existingAdmin.length === 0) {
      // Create admin user with hashed password
      const hashedPassword = await bcrypt.hash('admin123', 10); // Change this password!
      
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isSuperAdmin: true,
      });
      
      console.log("✅ Created admin user:");
      console.log("   Username: admin");
      console.log("   Password: admin123");
      console.log("   ⚠️  IMPORTANT: Change this password immediately!");
    } else {
      console.log("✅ Admin user already exists");
    }

    // 5. Update existing users to have admin role
    console.log("\n5. Updating existing users...");
    await db.execute(sql`
      UPDATE users 
      SET role = 'admin', is_super_admin = true 
      WHERE role IS NULL
    `);
    console.log("✅ Updated existing users with admin role");

    console.log("\n🎉 Admin schema migration completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Login to admin dashboard at /admin/login");
    console.log("2. Change the default admin password");
    console.log("3. Start reviewing claim requests");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrateAdminSchema().catch(console.error);
