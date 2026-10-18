import bcrypt from "bcryptjs";
import prisma from "./lib/prisma.js";

async function main() {
  const hash12345 = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.findFirst({ where: { email: "admin@restaurant.local" } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hash12345 },
    });
    console.log("Updated admin@restaurant.local password to: Admin@12345");
  }

  // Also create/update a default demo manager
  const demoManagerHash = await bcrypt.hash("Password@123", 12);
  const existingFranchise = await prisma.franchise.findFirst();
  if (existingFranchise) {
    const existingMgr = await prisma.user.findFirst({ where: { email: "manager@restaurant.local" } });
    if (existingMgr) {
      await prisma.user.update({
        where: { id: existingMgr.id },
        data: { passwordHash: demoManagerHash, franchiseId: existingFranchise.id },
      });
    } else {
      await prisma.user.create({
        data: {
          name: "Demo Manager",
          email: "manager@restaurant.local",
          passwordHash: demoManagerHash,
          role: "FRANCHISE_MANAGER",
          franchiseId: existingFranchise.id,
        },
      });
    }
    console.log("Upserted demo manager: manager@restaurant.local / Password@123");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
