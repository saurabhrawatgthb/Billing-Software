import prisma from "../lib/prisma.js";

async function purgeOrdersAndBills() {
  console.log("==========================================================");
  console.log("  STARTING TARGETED ORDERS & BILLS RESET (CLEAN START)");
  console.log("==========================================================");

  // 1. Delete Payments
  const paymentsDeleted = await prisma.payment.deleteMany({});
  console.log(`✓ Deleted ${paymentsDeleted.count} Payments`);

  // 2. Delete Invoices
  const invoicesDeleted = await prisma.invoice.deleteMany({});
  console.log(`✓ Deleted ${invoicesDeleted.count} Invoices`);

  // 3. Delete KOT Items
  const kotItemsDeleted = await prisma.kOTItem.deleteMany({});
  console.log(`✓ Deleted ${kotItemsDeleted.count} KOT Items`);

  // 4. Delete KOTs
  const kotsDeleted = await prisma.kOT.deleteMany({});
  console.log(`✓ Deleted ${kotsDeleted.count} KOTs`);

  // 5. Delete Order Items
  const orderItemsDeleted = await prisma.orderItem.deleteMany({});
  console.log(`✓ Deleted ${orderItemsDeleted.count} Order Items`);

  // 6. Delete Orders
  const ordersDeleted = await prisma.order.deleteMany({});
  console.log(`✓ Deleted ${ordersDeleted.count} Orders`);

  // 7. Delete Table Sessions
  const tableSessionsDeleted = await prisma.tableSession.deleteMany({});
  console.log(`✓ Deleted ${tableSessionsDeleted.count} Table Sessions`);

  // 8. Delete Customer Visits
  const customerVisitsDeleted = await prisma.customerVisit.deleteMany({});
  console.log(`✓ Deleted ${customerVisitsDeleted.count} Customer Visits`);

  // 9. Reset Customer order metrics
  const customersReset = await prisma.customer.updateMany({
    data: {
      totalVisits: 0,
      totalSpend: 0,
      averageOrderValue: 0,
      lastVisitAt: null,
      firstVisitAt: null,
    },
  });
  console.log(`✓ Reset order metrics for ${customersReset.count} Customers`);

  // 10. Reset all Tables to AVAILABLE and 0 occupancy
  const tablesReset = await prisma.restaurantTable.updateMany({
    data: {
      status: "AVAILABLE",
      currentOccupancy: 0,
    },
  });
  console.log(`✓ Reset ${tablesReset.count} Restaurant Tables to AVAILABLE (0 occupancy)`);

  // 11. Delete Daily Registers (Shift registers) for clean daily start
  const registersDeleted = await prisma.dailyRegister.deleteMany({});
  console.log(`✓ Deleted ${registersDeleted.count} Daily Registers`);

  // 12. Delete order-related notifications & audit logs
  const notificationsDeleted = await prisma.notification.deleteMany({});
  console.log(`✓ Cleared ${notificationsDeleted.count} Notifications`);

  console.log("\n==========================================================");
  console.log("  VERIFYING DATABASE STATE AFTER PURGE");
  console.log("==========================================================");

  const [
    remainingOrders,
    remainingInvoices,
    remainingPayments,
    remainingKOTs,
    remainingSessions,
    remainingTables,
    remainingMenuItems,
    remainingCategories,
    remainingUsers,
    remainingFranchises,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.kOT.count(),
    prisma.tableSession.count(),
    prisma.restaurantTable.count(),
    prisma.menuItem.count(),
    prisma.category.count(),
    prisma.user.count(),
    prisma.franchise.count(),
  ]);

  console.log({
    remainingOrders,
    remainingInvoices,
    remainingPayments,
    remainingKOTs,
    remainingSessions,
    remainingTables,
    remainingMenuItems,
    remainingCategories,
    remainingUsers,
    remainingFranchises,
  });

  const occupiedTables = await prisma.restaurantTable.findMany({
    where: {
      OR: [
        { status: { not: "AVAILABLE" } },
        { currentOccupancy: { gt: 0 } },
      ],
    },
  });

  console.log(`Non-available tables: ${occupiedTables.length}`);

  if (
    remainingOrders === 0 &&
    remainingInvoices === 0 &&
    remainingPayments === 0 &&
    remainingKOTs === 0 &&
    remainingSessions === 0 &&
    occupiedTables.length === 0
  ) {
    console.log("\n✅ SUCCESS: Database has been cleanly reset for fresh operation!");
  } else {
    console.warn("\n⚠️ WARNING: Some records were not fully cleared.");
  }
}

purgeOrdersAndBills()
  .catch((e) => {
    console.error("❌ Error purging orders and bills:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
