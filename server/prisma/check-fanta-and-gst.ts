import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING ALL MENU ITEMS ===");
  const allMenuItems = await prisma.menuItem.findMany({
    include: {
      category: true,
      recipe: {
        include: {
          items: {
            include: { inventoryItem: true },
          },
        },
      },
    },
  });
  console.log("Found menu items count:", allMenuItems.length);
  for (const item of allMenuItems) {
    console.log(`- [${item.id}] ${item.name} (${item.code}) | Price: ₹${item.price} | Available: ${item.isAvailable} | Category: ${item.category?.name}`);
    if (item.recipe) {
      console.log(`  Recipe: ${item.recipe.name}, items:`, item.recipe.items.map(i => `${i.inventoryItem.name} (${i.quantity} ${i.unit})`));
    }
  }

  console.log("\n=== CHECKING ALL INVENTORY ITEMS ===");
  const inventoryItems = await prisma.inventoryItem.findMany();
  console.log("Found inventory items count:", inventoryItems.length);
  for (const inv of inventoryItems) {
    console.log(`- [${inv.id}] ${inv.name} | Current Stock: ${inv.currentStock} ${inv.unit} | Min: ${inv.minimumStock}`);
  }

  console.log("\n=== CHECKING BRAND SETTINGS & GST ===");
  const brand = await prisma.brandSettings.findFirst();
  console.log("Brand Settings:", brand);

  await prisma.$disconnect();
}

main().catch(console.error);
