import { db } from "../server/db.js";
import { companyUsers } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function deleteCompanyUser() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email address");
    console.log("Usage: npm run delete-company-user <email>");
    process.exit(1);
  }

  console.log(`🗑️  Deleting company user with email: ${email}...\n`);

  try {
    const deleted = await db
      .delete(companyUsers)
      .where(eq(companyUsers.email, email))
      .returning();

    if (deleted.length === 0) {
      console.log("❌ No company user found with that email");
    } else {
      console.log("✅ Deleted company user:");
      console.log(`   - Email: ${deleted[0].email}`);
      console.log(`   - Name: ${deleted[0].name}`);
      console.log(`   - Company ID: ${deleted[0].companyId}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

deleteCompanyUser();


