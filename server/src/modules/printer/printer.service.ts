import { PrinterType } from "@prisma/client";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";
import { emitToFranchise } from "../../lib/socket.js";

export const printerSchema = z.object({
  name: z.string().trim().min(1, "Printer name is required"),
  type: z.nativeEnum(PrinterType),
  ipAddress: z.string().trim().optional().nullable(),
  port: z.number().int().optional().nullable().default(9100),
  stationId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePrinterSchema = printerSchema.partial();

export async function listPrinters(franchiseId: string | null) {
  if (!franchiseId) return [];

  return prisma.printer.findMany({
    where: { franchiseId },
    include: {
      station: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function createPrinter(
  data: z.infer<typeof printerSchema>,
  franchiseId: string,
  currentUserId?: string
) {
  if (data.stationId) {
    const station = await prisma.preparationStation.findUnique({ where: { id: data.stationId } });
    if (!station || station.franchiseId !== franchiseId) {
      throw new AppError("Invalid preparation station selected", 400);
    }
  }

  const printer = await prisma.printer.create({
    data: {
      franchiseId,
      name: data.name,
      type: data.type,
      ipAddress: data.ipAddress || null,
      port: data.port || 9100,
      stationId: data.stationId || null,
      isActive: data.isActive,
    },
    include: { station: true },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "CREATE_PRINTER",
    entity: "Printer",
    entityId: printer.id,
    newData: printer,
  });

  emitToFranchise(franchiseId, "printer:updated", printer);
  return printer;
}

export async function updatePrinter(
  id: string,
  data: z.infer<typeof updatePrinterSchema>,
  franchiseId: string,
  currentUserId?: string
) {
  const existing = await prisma.printer.findUnique({ where: { id } });
  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Printer not found", 404);
  }

  if (data.stationId) {
    const station = await prisma.preparationStation.findUnique({ where: { id: data.stationId } });
    if (!station || station.franchiseId !== franchiseId) {
      throw new AppError("Invalid preparation station selected", 400);
    }
  }

  const updated = await prisma.printer.update({
    where: { id },
    data,
    include: { station: true },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "UPDATE_PRINTER",
    entity: "Printer",
    entityId: id,
    oldData: existing,
    newData: updated,
  });

  emitToFranchise(franchiseId, "printer:updated", updated);
  return updated;
}

export async function deletePrinter(id: string, franchiseId: string, currentUserId?: string) {
  const existing = await prisma.printer.findUnique({ where: { id } });
  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Printer not found", 404);
  }

  await prisma.printer.delete({ where: { id } });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "DELETE_PRINTER",
    entity: "Printer",
    entityId: id,
    oldData: existing,
  });

  emitToFranchise(franchiseId, "printer:updated", { id, deleted: true });
  return { success: true, message: "Printer configuration deleted" };
}

/**
 * Generate formatted text / ESC-POS representation for KOT or Receipt printing
 */
export async function generatePrintPayload(type: "KOT" | "RECEIPT", targetId: string, franchiseId: string | null) {
  if (type === "KOT") {
    const kot = await prisma.kOT.findUnique({
      where: { id: targetId },
      include: {
        station: true,
        order: {
          include: {
            tableSession: { include: { table: true } },
          },
        },
        items: {
          include: { menuItem: true },
        },
        franchise: true,
      },
    });

    if (!kot || (franchiseId && kot.franchiseId !== franchiseId)) {
      throw new AppError("KOT not found", 404);
    }

    const tableStr = kot.order.tableSession?.table ? `मेज / Table: ${kot.order.tableSession.table.tableNumber}` : "पार्सल / Takeaway";
    const stationStr = kot.station ? kot.station.name : "Main Kitchen";
    const dateStr = new Date(kot.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let lines = [
      "================================",
      "     किचन ऑर्डर टिकट • KOT      ",
      `          ${stationStr}         `,
      "================================",
      `टोकन / KOT #: ${kot.kotNumber}`,
      `आर्डर / Order: ${kot.order.orderNumber}`,
      `${tableStr}`,
      `समय / Time  : ${dateStr}`,
      "--------------------------------",
      "व्यंजन / Item                Qty",
      "--------------------------------",
    ];

    for (const item of kot.items) {
      const name = item.menuItem.name.padEnd(24, " ").substring(0, 24);
      const qty = String(item.quantity).padStart(4, " ");
      lines.push(`${name} ${qty}`);
      if (item.notes) {
        lines.push(`  * Note: ${item.notes}`);
      }
    }

    lines.push("--------------------------------");
    lines.push("*** रसोई प्रति • KITCHEN COPY ***");
    lines.push("================================");

    return {
      type: "KOT",
      rawText: lines.join("\n"),
      kot,
    };
  }

  // RECEIPT
  const invoice = await prisma.invoice.findUnique({
    where: { id: targetId },
    include: {
      order: {
        include: {
          items: { include: { menuItem: true } },
          tableSession: { include: { table: true } },
        },
      },
      payments: true,
      franchise: true,
    },
  });

  if (!invoice || (franchiseId && invoice.franchiseId !== franchiseId)) {
    throw new AppError("Invoice not found", 404);
  }

  const brand = await prisma.brandSettings.findFirst();
  const brandName = brand?.businessName?.trim().toUpperCase() || "MADRASI DOSA";
  const franchiseName = invoice.franchise.name.toUpperCase();
  const franchiseAddress = invoice.franchise.address?.trim() || brand?.address?.trim() || "";
  const franchisePhone = invoice.franchise.phone?.trim() || brand?.phone?.trim() || "";
  const gstin = brand?.taxNumber?.trim() ? `GSTIN: ${brand.taxNumber.trim()}` : "";
  const fssai = brand?.fssaiNumber?.trim() ? `FSSAI: ${brand.fssaiNumber.trim()}` : "";
  const currSym = brand?.currencySymbol || "₹";

  const isDineIn = !!invoice.order.tableSession?.table;
  const tableStr = isDineIn
    ? `डाइन-इन / Table ${invoice.order.tableSession!.table.tableNumber}`
    : "पार्सल / Takeaway";
  const dateStr = new Date(invoice.createdAt).toLocaleString();

  let lines = [
    "================================",
    "     || श्री गणेशाय नमः ||     ",
    `     ${brandName}     `,
    "  मद्रासी डोसा • असली दक्षिण भारतीय स्वाद  ",
    `--- ${franchiseName} ---`,
  ];

  if (franchiseAddress) {
    lines.push(`  ${franchiseAddress}  `);
  }
  if (franchisePhone) {
    lines.push(`  दूरभाष / Phone: ${franchisePhone}  `);
  }
  if (gstin) {
    lines.push(`  ${gstin}  `);
  }
  if (fssai) {
    lines.push(`  ${fssai}  `);
  }
  lines.push("================================");
  lines.push(`बिल / Tax Invoice: ${invoice.invoiceNumber}`);
  lines.push(`आर्डर / Order   : ${invoice.order.orderNumber}`);
  lines.push(`${tableStr}`);
  lines.push(`दिनांक / Date   : ${dateStr}`);
  lines.push("--------------------------------");
  lines.push("व्यंजन / Item    मात्रा/Qty   मूल्य");
  lines.push("--------------------------------");

  for (const item of invoice.order.items) {
    const name = item.menuItem.name.padEnd(16, " ").substring(0, 16);
    const qty = String(item.quantity).padStart(3, " ");
    const price = `${currSym}${Number(item.totalPrice).toFixed(2)}`.padStart(11, " ");
    lines.push(`${name} ${qty} ${price}`);
  }

  lines.push("--------------------------------");
  lines.push(`उपयोग / Subtotal:     ${currSym}${Number(invoice.subtotal).toFixed(2)}`);
  if (Number(invoice.discount) > 0) {
    lines.push(`छूट / Discount:      -${currSym}${Number(invoice.discount).toFixed(2)}`);
  }
  lines.push(`कर / Tax (GST):       ${currSym}${Number(invoice.tax).toFixed(2)}`);
  lines.push("================================");
  lines.push(`कुल देय / TOTAL:      ${currSym}${Number(invoice.total).toFixed(2)}`);
  lines.push("================================");

  if (invoice.payments.length > 0) {
    lines.push("भुगतान विवरण / PAYMENTS:");
    for (const p of invoice.payments) {
      const pMethodUpper = (p.method || "").toUpperCase();
      const methodHindi = pMethodUpper.includes("CASH")
        ? "नकद / CASH"
        : pMethodUpper.includes("UPI")
        ? "यूपीआई / UPI"
        : pMethodUpper.includes("CARD")
        ? "कार्ड / CARD"
        : p.method;
      lines.push(`  ${methodHindi.padEnd(14, " ")}: ${currSym}${Number(p.amount).toFixed(2)} [${p.status}]`);
    }
  }

  lines.push("--------------------------------");
  lines.push("      धन्यवाद! पुनः पधारें      ");
  lines.push(" Thank You! Please Visit Again  ");
  lines.push("    Follow Us On Instagram:    ");
  lines.push("     📸 @madrasidosaoffical     ");
  lines.push("================================");

  return {
    type: "RECEIPT",
    rawText: lines.join("\n"),
    invoice,
  };
}
