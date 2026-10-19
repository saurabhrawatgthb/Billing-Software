import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

async function main() {
  console.log("=== INSPECTING CURRENT DATABASE RECORDS ===");

  const collections = [
    { name: "kOTItem", model: prisma.kOTItem },
    { name: "kOT", model: prisma.kOT },
    { name: "orderItem", model: prisma.orderItem },
    { name: "payment", model: prisma.payment },
    { name: "invoice", model: prisma.invoice },
    { name: "order", model: prisma.order },
    { name: "tableSession", model: prisma.tableSession },
    { name: "restaurantTable", model: prisma.restaurantTable },
    { name: "recipeItem", model: prisma.recipeItem },
    { name: "recipe", model: prisma.recipe },
    { name: "menuItem", model: prisma.menuItem },
    { name: "category", model: prisma.category },
    { name: "preparationStation", model: prisma.preparationStation },
    { name: "printer", model: prisma.printer },
    { name: "inventoryTransaction", model: prisma.inventoryTransaction },
    { name: "purchaseItem", model: prisma.purchaseItem },
    { name: "purchase", model: prisma.purchase },
    { name: "inventoryItem", model: prisma.inventoryItem },
    { name: "expense", model: prisma.expense },
    { name: "expenseCategory", model: prisma.expenseCategory },
    { name: "payrollItem", model: prisma.payrollItem },
    { name: "payroll", model: prisma.payroll },
    { name: "salaryStructure", model: prisma.salaryStructure },
    { name: "employeeAdvance", model: prisma.employeeAdvance },
    { name: "leaveRequest", model: prisma.leaveRequest },
    { name: "attendance", model: prisma.attendance },
    { name: "employee", model: prisma.employee },
    { name: "communicationLog", model: prisma.communicationLog },
    { name: "campaignRule", model: prisma.campaignRule },
    { name: "campaign", model: prisma.campaign },
    { name: "customerPreference", model: prisma.customerPreference },
    { name: "customerVisit", model: prisma.customerVisit },
    { name: "customer", model: prisma.customer },
    { name: "notification", model: prisma.notification },
    { name: "auditLog", model: prisma.auditLog },
    { name: "aggregatorIntegration", model: prisma.aggregatorIntegration },
    { name: "brandSettings", model: prisma.brandSettings },
    { name: "user", model: prisma.user },
    { name: "franchise", model: prisma.franchise },
  ];

  for (const c of collections) {
    try {
      const count = await (c.model as any).count();
      if (count > 0) {
        console.log(`- ${c.name}: ${count} records`);
      }
    } catch (err: any) {
      console.warn(`Could not count ${c.name}: ${err.message}`);
    }
  }

  console.log("\n=== PURGING ALL DEMO & TEST DATA ===");

  // 1. Orders, Invoices, Payments, KOTs
  await prisma.kOTItem.deleteMany({});
  console.log("✓ Purged KOT Items");

  await prisma.kOT.deleteMany({});
  console.log("✓ Purged KOTs");

  await prisma.orderItem.deleteMany({});
  console.log("✓ Purged Order Items");

  await prisma.payment.deleteMany({});
  console.log("✓ Purged Payments");

  await prisma.invoice.deleteMany({});
  console.log("✓ Purged Invoices");

  await prisma.order.deleteMany({});
  console.log("✓ Purged Orders");

  // 2. Tables & Sessions
  await prisma.tableSession.deleteMany({});
  console.log("✓ Purged Table Sessions");

  await prisma.restaurantTable.deleteMany({});
  console.log("✓ Purged Restaurant Tables");

  // 3. Menu, Recipes, Categories, Stations, Printers
  await prisma.recipeItem.deleteMany({});
  console.log("✓ Purged Recipe Items");

  await prisma.recipe.deleteMany({});
  console.log("✓ Purged Recipes");

  await prisma.menuItem.deleteMany({});
  console.log("✓ Purged Menu Items");

  await prisma.category.deleteMany({});
  console.log("✓ Purged Categories");

  await prisma.preparationStation.deleteMany({});
  console.log("✓ Purged Preparation Stations");

  await prisma.printer.deleteMany({});
  console.log("✓ Purged Printers");

  // 4. Inventory & Purchases
  await prisma.inventoryTransaction.deleteMany({});
  console.log("✓ Purged Inventory Transactions");

  await prisma.purchaseItem.deleteMany({});
  console.log("✓ Purged Purchase Items");

  await prisma.purchase.deleteMany({});
  console.log("✓ Purged Purchases");

  await prisma.inventoryItem.deleteMany({});
  console.log("✓ Purged Inventory Items");

  // 5. Expenses
  await prisma.expense.deleteMany({});
  console.log("✓ Purged Expenses");

  await prisma.expenseCategory.deleteMany({});
  console.log("✓ Purged Expense Categories");

  // 6. HR, Payroll, Employees
  await prisma.payrollItem.deleteMany({});
  console.log("✓ Purged Payroll Items");

  await prisma.payroll.deleteMany({});
  console.log("✓ Purged Payroll Records");

  await prisma.salaryStructure.deleteMany({});
  console.log("✓ Purged Salary Structures");

  await prisma.employeeAdvance.deleteMany({});
  console.log("✓ Purged Employee Advances");

  await prisma.leaveRequest.deleteMany({});
  console.log("✓ Purged Leave Requests");

  await prisma.attendance.deleteMany({});
  console.log("✓ Purged Attendance Logs");

  await prisma.employee.deleteMany({});
  console.log("✓ Purged Employees");

  // 7. CRM, Customers, Campaigns
  await prisma.communicationLog.deleteMany({});
  console.log("✓ Purged Communication Logs");

  await prisma.campaignRule.deleteMany({});
  console.log("✓ Purged Campaign Rules");

  await prisma.campaign.deleteMany({});
  console.log("✓ Purged Campaigns");

  await prisma.customerPreference.deleteMany({});
  console.log("✓ Purged Customer Preferences");

  await prisma.customerVisit.deleteMany({});
  console.log("✓ Purged Customer Visits");

  await prisma.customer.deleteMany({});
  console.log("✓ Purged Customers");

  // 8. Notifications, Audit Logs, Aggregators
  await prisma.notification.deleteMany({});
  console.log("✓ Purged Notifications");

  await prisma.auditLog.deleteMany({});
  console.log("✓ Purged Audit Logs");

  await prisma.aggregatorIntegration.deleteMany({});
  console.log("✓ Purged Aggregator Integrations");

  // 9. Reset Brand Settings to clean empty state
  await prisma.brandSettings.deleteMany({});
  console.log("✓ Reset Brand Settings");

  // 10. Users & Franchises:
  // Delete all non-admin users or users attached to demo franchises
  await prisma.user.deleteMany({
    where: {
      email: {
        not: "admin@restaurant.local",
      },
    },
  });
  console.log("✓ Purged Demo Users (except Super Admin)");

  // Delete all franchises
  await prisma.franchise.deleteMany({});
  console.log("✓ Purged Demo Franchises");

  // 11. Ensure Super Admin account exists and is detached from any franchise
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.upsert({
    where: {
      email: "admin@restaurant.local",
    },
    update: {
      franchiseId: null,
      name: "System Administrator",
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: "System Administrator",
      email: "admin@restaurant.local",
      passwordHash,
      role: "SUPER_ADMIN",
      franchiseId: null,
      isActive: true,
    },
  });

  console.log("\n=== SUPER ADMIN ACCOUNT READY ===");
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
  console.log(`Password: Admin@12345`);

  console.log("\n=== VERIFYING CLEAN STATE ===");
  for (const c of collections) {
    const count = await (c.model as any).count();
    console.log(`- ${c.name}: ${count}`);
  }

  console.log("\n✓ All demo data successfully removed!");
}

main()
  .catch((err) => {
    console.error("Error during cleanup:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
