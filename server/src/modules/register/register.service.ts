import { RegisterStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";

export async function getCurrentRegister(franchiseId: string) {
  const current = await prisma.dailyRegister.findFirst({
    where: {
      franchiseId,
      status: RegisterStatus.OPEN,
    },
    include: {
      openedBy: { select: { id: true, name: true, email: true, role: true } },
      franchise: { select: { id: true, name: true, code: true } },
    },
    orderBy: { openedAt: "desc" },
  });

  if (!current) {
    return null;
  }

  // Calculate live sales from openedAt till now
  const payments = await prisma.payment.findMany({
    where: {
      franchiseId,
      createdAt: { gte: current.openedAt },
      status: "COMPLETED",
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      franchiseId,
      createdAt: { gte: current.openedAt },
      isDormant: false,
    },
  });

  let liveCashSales = 0;
  let liveUpiSales = 0;
  let liveCardSales = 0;
  let liveAggregatorSales = 0;
  let liveTotalSales = 0;

  for (const p of payments) {
    liveTotalSales += p.amount;
    if (p.method === "CASH") liveCashSales += p.amount;
    else if (p.method === "UPI") liveUpiSales += p.amount;
    else if (p.method === "CARD") liveCardSales += p.amount;
    else liveAggregatorSales += p.amount;
  }

  let liveTax = 0;
  let liveDiscounts = 0;
  for (const inv of invoices) {
    liveTax += inv.tax || 0;
    liveDiscounts += inv.discount || 0;
  }

  const liveExpectedCash = current.openingFloat + liveCashSales;

  return {
    ...current,
    liveMetrics: {
      cashSales: liveCashSales,
      upiSales: liveUpiSales,
      cardSales: liveCardSales,
      aggregatorSales: liveAggregatorSales,
      totalSales: liveTotalSales,
      totalOrdersCount: invoices.length,
      totalTaxCollected: liveTax,
      totalDiscounts: liveDiscounts,
      expectedCash: liveExpectedCash,
    },
  };
}

export async function openRegister(
  franchiseId: string,
  userId: string,
  openingFloat: number = 0,
  notes?: string
) {
  // Check if already open
  const existing = await prisma.dailyRegister.findFirst({
    where: {
      franchiseId,
      status: RegisterStatus.OPEN,
    },
  });

  if (existing) {
    throw new AppError("A daily register session is already open for this branch. Please close it first.", 400);
  }

  const register = await prisma.dailyRegister.create({
    data: {
      franchiseId,
      openedById: userId,
      openingFloat: openingFloat >= 0 ? openingFloat : 0,
      openingNotes: notes,
      status: RegisterStatus.OPEN,
      openedAt: new Date(),
    },
    include: {
      openedBy: { select: { id: true, name: true, email: true, role: true } },
      franchise: { select: { id: true, name: true, code: true } },
    },
  });

  await logAudit({
    franchiseId,
    userId,
    action: "OPEN_DAILY_REGISTER",
    entity: "DailyRegister",
    entityId: register.id,
    newData: { openingFloat, openedAt: register.openedAt },
  });

  return register;
}

export async function closeRegister(
  registerId: string,
  userId: string,
  closingCash: number,
  notes?: string
) {
  const register = await prisma.dailyRegister.findUnique({
    where: { id: registerId },
  });

  if (!register) {
    throw new AppError("Register session not found", 404);
  }

  if (register.status === RegisterStatus.CLOSED) {
    throw new AppError("This register session is already closed", 400);
  }

  const closedAt = new Date();

  // Aggregate actual sales completed during the session
  const payments = await prisma.payment.findMany({
    where: {
      franchiseId: register.franchiseId,
      createdAt: { gte: register.openedAt, lte: closedAt },
      status: "COMPLETED",
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      franchiseId: register.franchiseId,
      createdAt: { gte: register.openedAt, lte: closedAt },
      isDormant: false,
    },
  });

  let totalCashSales = 0;
  let totalUpiSales = 0;
  let totalCardSales = 0;
  let totalAggregatorSales = 0;
  let grandTotal = 0;

  for (const p of payments) {
    grandTotal += p.amount;
    if (p.method === "CASH") totalCashSales += p.amount;
    else if (p.method === "UPI") totalUpiSales += p.amount;
    else if (p.method === "CARD") totalCardSales += p.amount;
    else totalAggregatorSales += p.amount;
  }

  let totalTax = 0;
  let totalDiscounts = 0;
  for (const inv of invoices) {
    totalTax += inv.tax || 0;
    totalDiscounts += inv.discount || 0;
  }

  const expectedCash = register.openingFloat + totalCashSales;
  const cashDifference = closingCash - expectedCash;

  const closedRegister = await prisma.dailyRegister.update({
    where: { id: registerId },
    data: {
      status: RegisterStatus.CLOSED,
      closedAt,
      closedById: userId,
      closingCash,
      expectedCash,
      cashDifference,
      cashSales: totalCashSales,
      upiSales: totalUpiSales,
      cardSales: totalCardSales,
      aggregatorSales: totalAggregatorSales,
      totalSales: grandTotal,
      totalOrdersCount: invoices.length,
      totalTaxCollected: totalTax,
      totalDiscounts,
      closingNotes: notes,
    },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
      franchise: { select: { id: true, name: true, code: true } },
    },
  });

  await logAudit({
    franchiseId: register.franchiseId,
    userId,
    action: "CLOSE_DAILY_REGISTER",
    entity: "DailyRegister",
    entityId: register.id,
    newData: {
      closingCash,
      expectedCash,
      cashDifference,
      totalSales: grandTotal,
      ordersCount: invoices.length,
    },
  });

  return closedRegister;
}

export async function getRegisterHistory(franchiseId?: string | null, limit: number = 30) {
  return prisma.dailyRegister.findMany({
    where: franchiseId ? { franchiseId } : undefined,
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
      franchise: { select: { id: true, name: true, code: true } },
    },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}
