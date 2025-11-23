import { db } from "../server/db.js";
import { companies, companyUsers, claimRequests } from "../shared/schema.js";
import { eq, ilike } from "drizzle-orm";

async function checkRustySupport() {
  console.log("🔍 Checking for Rusty Support AB...\n");

  try {
    // 1. Find the company
    console.log("1. Looking for company...");
    const company = await db
      .select()
      .from(companies)
      .where(ilike(companies.name, '%rusty support%'))
      .limit(1);

    if (company.length === 0) {
      console.log("❌ No company found with name containing 'Rusty Support'");
      console.log("\n💡 Creating test company 'Rusty Support AB'...");
      
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: "Rusty Support AB",
          slug: "rusty-support-ab",
          description: "Test company for claim testing",
          categories: [],
          location: "Stockholm",
          region: "Stockholm",
          contactEmail: "info@rustysupport.se",
          city: "Stockholm",
          postalCode: "111 11",
        })
        .returning();
      
      console.log("✅ Created test company:", newCompany);
      return;
    }

    console.log("✅ Found company:", {
      id: company[0].id,
      name: company[0].name,
      slug: company[0].slug,
      contactEmail: company[0].contactEmail,
    });

    const companyId = company[0].id;

    // 2. Check for company users
    console.log("\n2. Checking for company users...");
    const users = await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.companyId, companyId));

    if (users.length === 0) {
      console.log("❌ No company users found for this company");
    } else {
      console.log(`✅ Found ${users.length} company user(s):`);
      users.forEach((user) => {
        console.log(`   - Email: ${user.email}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Active: ${user.isActive}`);
        console.log(`     Created: ${user.createdAt}`);
        console.log(`     Access Token: ${user.accessToken}`);
        console.log("");
      });
    }

    // 3. Check for claim requests
    console.log("3. Checking for claim requests...");
    const claims = await db
      .select()
      .from(claimRequests)
      .where(eq(claimRequests.companyId, companyId));

    if (claims.length === 0) {
      console.log("❌ No claim requests found for this company");
    } else {
      console.log(`✅ Found ${claims.length} claim request(s):`);
      claims.forEach((claim) => {
        console.log(`   - Email: ${claim.email}`);
        console.log(`     Name: ${claim.name}`);
        console.log(`     Status: ${claim.status}`);
        console.log(`     Submitted: ${claim.submittedAt}`);
        console.log(`     Reviewed: ${claim.reviewedAt || "Not reviewed"}`);
        console.log("");
      });
    }

    console.log("\n💡 To delete a company user and try again:");
    console.log("   Run: npm run delete-company-user <email>");

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

checkRustySupport();

