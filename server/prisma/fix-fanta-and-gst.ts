import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FIXING FANTA AVAILABILITY ===");
  const updateFanta = await prisma.menuItem.updateMany({
    where: {
      name: { contains: "Fanta", mode: "insensitive" },
    },
    data: {
      isAvailable: true,
    },
  });
  console.log("Updated Fanta menu items:", updateFanta.count);

  console.log("=== CHECKING & UPDATING BRAND GST RATE ===");
  const brand = await prisma.brandSettings.findFirst();
  if (brand && (!brand.taxNumber || brand.taxNumber.trim() === "")) {
    console.log("Brand has no GST number. Setting defaultGstRate to 0.");
    await prisma.brandSettings.update({
      where: { id: brand.id },
      data: { defaultGstRate: 0 },
    });
    console.log("defaultGstRate set to 0.0");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
