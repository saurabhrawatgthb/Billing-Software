/**
 * Seed: Platform Super Admin
 * Creates the global platform admin account that can log into /saas-admin
 * Run with: npx tsx prisma/seed-platform-admin.ts
 */
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

async function main() {
  const email = "admin@omnipos.local";
  const password = "OmniAdmin@2026";

  const passwordHash = await bcrypt.hash(password, 12);

  // Check if already exists
  const existing = await prisma.user.findFirst({
    where: { email },
  });

  let admin;
  if (existing) {
    admin = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: "OmniPOS Super Admin",
        role: "SUPER_ADMIN",
        passwordHash,
        isActive: true,
        franchiseId: null,
        organizationId: null,
      },
    });
    console.log("✅ Platform admin updated.");
  } else {
    admin = await prisma.user.create({
      data: {
        email,
        name: "OmniPOS Super Admin",
        role: "SUPER_ADMIN",
        passwordHash,
        isActive: true,
        franchiseId: null,
        organizationId: null,
      },
    });
    console.log("✅ Platform admin created.");
  }

  console.log("\n=== PLATFORM SUPER ADMIN CREDENTIALS ===");
  console.log("  Email   :", admin.email);
  console.log("  Password: OmniAdmin@2026");
  console.log("  Role    :", admin.role);
  console.log("  ID      :", admin.id);
  console.log("=========================================\n");

  // List all existing organizations / tenants
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, ownerEmail: true, plan: true, subscriptionStatus: true },
  });
  if (orgs.length > 0) {
    console.log(`Found ${orgs.length} registered restaurant(s):`);
    orgs.forEach((o) => {
      console.log(`  - [${o.plan}/${o.subscriptionStatus}] ${o.name} (${o.ownerEmail})`);
    });
  } else {
    console.log("No restaurant organizations yet. Use /signup to register the first brand.");
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
