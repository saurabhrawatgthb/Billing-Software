import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, TableStatus } from "@prisma/client";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";
import { emitToFranchise } from "../../lib/socket.js";
import { CRMService } from "../crm/crm.service.js";

export const createInvoiceSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  discount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CASH),
  autoCompletePayment: z.boolean().optional().default(true),
  transactionId: z.string().optional().nullable(),
  splitPayments: z
    .array(
      z.object({
        method: z.nativeEnum(PaymentMethod),
        amount: z.number().positive(),
        transactionId: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export const markDormantSchema = z.object({
  reason: z.string().min(3, "Mandatory reason required to mark bill as dormant"),
  notes: z.string().optional(),
});

export const verifyDormantSchema = z.object({
  action: z.enum(["APPROVE_VOID", "REINSTATE"]),
  notes: z.string().optional(),
});

export async function listInvoices(
  franchiseId: string | null,
  filters: {
    startDate?: string;
    endDate?: string;
    isDormant?: boolean | string;
    dormantStatus?: string;
    orderSource?: string;
  },
  userRole?: string
) {
  if (!franchiseId && userRole !== "SUPER_ADMIN") return [];

  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (filters.startDate || filters.endDate) {
    dateFilter = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      e.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }
  }

  let dormantFilter: boolean | undefined = undefined;
  if (filters.isDormant === true || filters.isDormant === "true") {
    dormantFilter = true;
  } else if (filters.isDormant === false || filters.isDormant === "false") {
    dormantFilter = false;
  }

  return prisma.invoice.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),
      createdAt: dateFilter,
      isDormant: dormantFilter,
      dormantStatus: filters.dormantStatus || undefined,
      order: filters.orderSource ? { orderSource: filters.orderSource } : undefined,
    },
    include: {
      order: {
        include: {
          items: {
            include: { menuItem: true },
          },
          tableSession: {
            include: { table: true },
          },
        },
      },
      payments: true,
      franchise: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(id: string, franchiseId: string | null, userRole?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: {
            include: { menuItem: true },
          },
          tableSession: {
            include: { table: true },
          },
        },
      },
      payments: true,
      franchise: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!invoice || (userRole !== "SUPER_ADMIN" && franchiseId && invoice.franchiseId !== franchiseId)) {
    throw new AppError("Invoice not found", 404);
  }

  // Compute total paid so far
  const totalPaid = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const remainingBalance = Math.max(0, Number(invoice.total) - totalPaid);

  return {
    ...invoice,
    totalPaid,
    remainingBalance,
    isFullyPaid: remainingBalance <= 0.01,
  };
}

export async function createInvoiceForOrder(
  data: z.input<typeof createInvoiceSchema>,
  franchiseId: string,
  currentUserId?: string
) {
  const validated = createInvoiceSchema.parse(data);
  const order = await prisma.order.findUnique({
    where: { id: validated.orderId },
    include: {
      items: true,
      invoice: true,
      tableSession: { include: { table: true } },
    },
  });

  if (!order || order.franchiseId !== franchiseId) {
    throw new AppError("Order not found in this franchise", 404);
  }

  if (order.invoice) {
    return getInvoiceById(order.invoice.id, franchiseId);
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new AppError("Cannot generate invoice for a cancelled order", 400);
  }

  const brand = await prisma.brandSettings.findFirst();

  // Recalculate if discount is overridden. If business is non-GST (no taxNumber), GST rate is 0.
  const isGstRegistered = Boolean(brand?.taxNumber && brand.taxNumber.trim().length > 0);
  let defaultRate = isGstRegistered ? (brand?.defaultGstRate ?? 5.0) : 0.0;
  let gstRateUsed = validated.taxRate !== undefined ? validated.taxRate : defaultRate;
  if (!isGstRegistered && (validated.taxRate === undefined || validated.taxRate === 5)) {
    gstRateUsed = 0.0;
  }

  let subtotalNum = Number(order.subtotal);
  let discountNum = validated.discount !== undefined ? validated.discount : Number(order.discount);
  let taxNum = Number(order.tax);

  if (validated.discount !== undefined || validated.taxRate !== undefined || !isGstRegistered) {
    const taxable = Math.max(0, subtotalNum - discountNum);
    taxNum = (taxable * gstRateUsed) / 100;
  }
  const taxableNum = Math.max(0, subtotalNum - discountNum);
  const totalNum = Math.max(0, taxableNum + taxNum);

  // Statutory GST Breakdown (50% CGST + 50% SGST)
  const halfRate = Number((gstRateUsed / 2).toFixed(2));
  const halfTax = Number((taxNum / 2).toFixed(2));

  // Generate unique invoice number
  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { code: true },
  });
  const fCode = franchise?.code ? `${franchise.code}-` : "";
  const countToday = await prisma.invoice.count({ where: { franchiseId } });
  const now = new Date();
  const datePrefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const invoiceNumber = `INV-${fCode}${datePrefix}-${String(countToday + 1).padStart(4, "0")}`;

  const shouldCompletePayment = validated.autoCompletePayment !== false;
  const paymentMethod = validated.paymentMethod || PaymentMethod.CASH;

  const invoiceResult = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        franchiseId,
        orderId: validated.orderId,
        invoiceNumber,
        subtotal: Number(subtotalNum.toFixed(2)),
        discount: Number(discountNum.toFixed(2)),
        tax: Number(taxNum.toFixed(2)),
        total: Number(totalNum.toFixed(2)),
        // GST Audit breakdown
        taxableAmount: Number(taxableNum.toFixed(2)),
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: halfTax,
        igstRate: 0,
        igstAmount: 0,
        gstin: brand?.taxNumber || null,
        isDormant: false,
        dormantStatus: "ACTIVE",
      },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            tableSession: { include: { table: true } },
          },
        },
        payments: true,
      },
    });

    // Auto-record completed payment at the exact point of bill generation (single or split)
    let paymentRecords: any[] = [];
    if (shouldCompletePayment && totalNum > 0) {
      if (validated.splitPayments && validated.splitPayments.length > 0) {
        for (const s of validated.splitPayments) {
          if (s.amount > 0) {
            const p = await tx.payment.create({
              data: {
                franchiseId,
                invoiceId: newInvoice.id,
                amount: Number(s.amount.toFixed(2)),
                method: s.method,
                status: PaymentStatus.COMPLETED,
                transactionId: s.transactionId || `AUTO-SPLIT-${Date.now().toString().slice(-6)}`,
                paidAt: now,
              },
            });
            paymentRecords.push(p);
          }
        }
      } else {
        const p = await tx.payment.create({
          data: {
            franchiseId,
            invoiceId: newInvoice.id,
            amount: Number(totalNum.toFixed(2)),
            method: paymentMethod,
            status: PaymentStatus.COMPLETED,
            transactionId: validated.transactionId || `AUTO-PAID-${Date.now().toString().slice(-6)}`,
            paidAt: now,
          },
        });
        paymentRecords.push(p);
      }
    }

    await tx.order.update({
      where: { id: validated.orderId },
      data: {
        status: OrderStatus.BILLED,
        discount: Number(discountNum.toFixed(2)),
        tax: Number(taxNum.toFixed(2)),
        total: Number(totalNum.toFixed(2)),
      },
    });

    if (order.tableSession?.tableId) {
      await tx.restaurantTable.update({
        where: { id: order.tableSession.tableId },
        data: {
          status: shouldCompletePayment ? TableStatus.AVAILABLE : TableStatus.BILLING,
          currentOccupancy: shouldCompletePayment ? 0 : undefined,
        },
      });

      if (shouldCompletePayment) {
        await tx.tableSession.update({
          where: { id: order.tableSession.id },
          data: { endedAt: now },
        });
      }
    }

    return { newInvoice, paymentRecords };
  });

  if (order.tableSession?.tableId) {
    emitToFranchise(franchiseId, "table:status_changed", {
      tableId: order.tableSession.tableId,
      status: shouldCompletePayment ? TableStatus.AVAILABLE : TableStatus.BILLING,
    });
    if (shouldCompletePayment) {
      emitToFranchise(franchiseId, "table:session_closed", {
        tableId: order.tableSession.tableId,
        sessionId: order.tableSession.id,
      });
    }
  }

  for (const pr of invoiceResult.paymentRecords) {
    emitToFranchise(franchiseId, "payment:received", pr);
  }

  emitToFranchise(franchiseId, "order:status_changed", { orderId: order.id, status: OrderStatus.BILLED });
  emitToFranchise(franchiseId, "invoice:created", invoiceResult.newInvoice);

  if (shouldCompletePayment && order.id) {
    CRMService.recordCustomerTransaction(order.id).catch((err) => {
      console.error("CRM transaction hook error in createInvoice:", err);
    });
  }

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "CREATE_INVOICE",
    entity: "Invoice",
    entityId: invoiceResult.newInvoice.id,
    newData: {
      invoiceNumber: invoiceResult.newInvoice.invoiceNumber,
      total: invoiceResult.newInvoice.total,
      paymentCompleted: shouldCompletePayment,
      paymentMethod,
    },
  });

  return getInvoiceById(invoiceResult.newInvoice.id, franchiseId, "SUPER_ADMIN");
}

/**
 * Manager & Cashier Anti-Fraud Protection:
 * Managers CANNOT hard-delete bills. They can only mark them as DORMANT with a mandatory reason.
 * Dormant bills are excluded from physical day totals and sent to Super Admin for audit.
 */
export async function markInvoiceDormant(
  invoiceId: string,
  franchiseId: string | null,
  reason: string,
  user?: { id?: string; userId?: string; name?: string; role?: string }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: { tableSession: true },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (user?.role !== "SUPER_ADMIN" && franchiseId && invoice.franchiseId !== franchiseId) {
    throw new AppError("Unauthorized to modify this invoice", 403);
  }

  if (invoice.isDormant) {
    throw new AppError("Invoice is already marked as dormant", 400);
  }

  const staffName = user?.name || "Franchise Staff";
  const staffId = user?.id || user?.userId || null;

  const updatedInvoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        isDormant: true,
        dormantReason: reason.trim(),
        dormantBy: staffName,
        dormantById: staffId,
        dormantAt: new Date(),
        dormantStatus: "PENDING_AUDIT",
      },
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

    // If order was attached to an active table session, release the table
    if (invoice.order.tableSession?.tableId) {
      await tx.restaurantTable.update({
        where: { id: invoice.order.tableSession.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
      await tx.tableSession.update({
        where: { id: invoice.order.tableSession.id },
        data: { endedAt: new Date() },
      });
    }

    return inv;
  });

  if (invoice.order.tableSession?.tableId) {
    emitToFranchise(invoice.franchiseId, "table:status_changed", {
      tableId: invoice.order.tableSession.tableId,
      status: TableStatus.AVAILABLE,
    });
  }

  emitToFranchise(invoice.franchiseId, "invoice:dormant_marked", updatedInvoice);

  await logAudit({
    franchiseId: invoice.franchiseId,
    userId: staffId ?? undefined,
    action: "MARK_INVOICE_DORMANT",
    entity: "Invoice",
    entityId: invoiceId,
    newData: {
      invoiceNumber: invoice.invoiceNumber,
      dormantReason: reason.trim(),
      dormantBy: staffName,
    },
  });

  return updatedInvoice;
}

/**
 * Super Admin Verification & Audit Authority:
 * Super Admin reviews dormant bills to approve void or reinstate them.
 */
export async function verifyDormantInvoice(
  invoiceId: string,
  action: "APPROVE_VOID" | "REINSTATE",
  adminNotes: string,
  adminUser?: { id?: string; userId?: string; name?: string; role?: string }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true, franchise: true },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  const adminName = adminUser?.name || "Super Admin";
  const adminId = adminUser?.id || adminUser?.userId || null;

  const isReinstating = action === "REINSTATE";

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      isDormant: !isReinstating,
      dormantStatus: isReinstating ? "REINSTATED" : "VERIFIED_VOID",
      verifiedBy: adminName,
      verifiedAt: new Date(),
      adminAuditNotes: adminNotes?.trim() || (isReinstating ? "Reinstated by Super Admin" : "Void approved by Super Admin"),
    },
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

  emitToFranchise(invoice.franchiseId, "invoice:dormant_verified", updatedInvoice);

  await logAudit({
    franchiseId: invoice.franchiseId,
    userId: adminId ?? undefined,
    action: "VERIFY_DORMANT_INVOICE",
    entity: "Invoice",
    entityId: invoiceId,
    newData: {
      action,
      invoiceNumber: invoice.invoiceNumber,
      verifiedBy: adminName,
      adminAuditNotes: adminNotes,
    },
  });

  return updatedInvoice;
}

/**
 * Super Admin GST Filing & Statutory Tax Control Center:
 * Aggregates all invoices across franchises with B2C/B2B breakdown for GSTR-1 preparation.
 */
export async function getGstAuditReport(
  franchiseId: string | null,
  filters: {
    startDate?: string;
    endDate?: string;
    includeDormant?: boolean | string;
  },
  userRole?: string
) {
  if (!franchiseId && userRole !== "SUPER_ADMIN") return null;

  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (filters.startDate || filters.endDate) {
    dateFilter = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      e.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }
  }

  const includeDormant = filters.includeDormant === true || filters.includeDormant === "true";

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),
      createdAt: dateFilter,
      ...(includeDormant ? {} : { isDormant: false }),
    },
    include: {
      order: {
        include: {
          items: { include: { menuItem: true } },
          customer: true,
        },
      },
      payments: true,
      franchise: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate statutory totals
  let grossTotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTaxCollected = 0;
  let dormantCount = 0;
  let dormantTotal = 0;

  for (const inv of invoices) {
    if (inv.isDormant) {
      dormantCount++;
      dormantTotal += Number(inv.total);
      // Skip dormant amounts from active tax liability calculation
      continue;
    }

    grossTotal += Number(inv.total);
    const taxable = inv.taxableAmount !== null && inv.taxableAmount !== undefined
      ? Number(inv.taxableAmount)
      : Math.max(0, Number(inv.subtotal) - Number(inv.discount));
    taxableTotal += taxable;

    const cgst = inv.cgstAmount !== null && inv.cgstAmount !== undefined
      ? Number(inv.cgstAmount)
      : Number((inv.tax / 2).toFixed(2));
    const sgst = inv.sgstAmount !== null && inv.sgstAmount !== undefined
      ? Number(inv.sgstAmount)
      : Number((inv.tax / 2).toFixed(2));

    cgstTotal += cgst;
    sgstTotal += sgst;
    totalTaxCollected += Number(inv.tax);
  }

  return {
    summary: {
      totalInvoicesCount: invoices.length - dormantCount,
      grossTotal: Number(grossTotal.toFixed(2)),
      taxableTotal: Number(taxableTotal.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
      dormantCount,
      dormantTotal: Number(dormantTotal.toFixed(2)),
    },
    invoices,
  };
}

/**
 * Permanently Delete an Invoice (Super Admin testing / database cleanup)
 * Completely deletes invoice, deletes its payments, and cancels order
 * so database space is freed and sales revenue reports accurately reflect the removal.
 */
export async function deleteInvoice(id: string, franchiseId: string | null, userId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true, order: true },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (franchiseId && invoice.franchiseId !== franchiseId) {
    throw new AppError("Invoice not found in this franchise", 404);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete associated payments
    await tx.payment.deleteMany({
      where: { invoiceId: id },
    });

    // 2. Delete the invoice
    await tx.invoice.delete({
      where: { id },
    });

    // 3. Mark the order as CANCELLED so it is excluded from sales revenue reports
    if (invoice.orderId) {
      await tx.order.update({
        where: { id: invoice.orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    }
  });

  emitToFranchise(invoice.franchiseId, "invoice:deleted", { invoiceId: id });

  await logAudit({
    franchiseId: invoice.franchiseId,
    userId,
    action: "DELETE_INVOICE",
    entity: "Invoice",
    entityId: id,
    oldData: {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      orderId: invoice.orderId,
    },
  });

  return { success: true, message: `Invoice #${invoice.invoiceNumber} permanently deleted` };
}

// ========================
// HIGH-SPEED POS FAST BILL
// ========================

export const fastBillSchema = z.object({
  tableId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().optional(),
  partyName: z.string().trim().optional(),
  guestCount: z.number().int().positive().default(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, "Menu item ID is required"),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        notes: z.string().trim().optional().nullable(),
      })
    )
    .min(1, "At least one item is required"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  splitPayments: z
    .array(
      z.object({
        method: z.nativeEnum(PaymentMethod),
        amount: z.number().positive(),
      })
    )
    .optional(),
});

export async function fastBill(
  input: z.input<typeof fastBillSchema>,
  franchiseId: string,
  _currentUserId?: string
) {
  const data = fastBillSchema.parse(input);

  // 1. Fetch menu items in single query
  const menuItemIds = data.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      franchiseId,
    },
    select: { id: true, name: true, price: true },
  });

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));
  let subtotalNum = 0;

  const processedItems = data.items.map((item) => {
    const dbItem = itemMap.get(item.menuItemId);
    const unitPrice = dbItem ? Number(dbItem.price) : 0;
    const totalPrice = unitPrice * item.quantity;
    subtotalNum += totalPrice;
    return {
      menuItemId: item.menuItemId,
      name: dbItem?.name || "Dish Item",
      quantity: item.quantity,
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2)),
      notes: item.notes || null,
    };
  });

  // 2. Compute tax and discounts
  const brand = await prisma.brandSettings.findFirst();
  const isGstRegistered = Boolean(brand?.taxNumber && brand.taxNumber.trim().length > 0);
  const defaultRate = isGstRegistered ? (brand?.defaultGstRate ?? 5.0) : 0.0;
  let gstRateUsed = data.taxRate !== undefined ? data.taxRate : defaultRate;
  if (!isGstRegistered) gstRateUsed = 0.0;

  const discountNum = Math.min(data.discount || 0, subtotalNum);
  const taxableNum = Math.max(0, subtotalNum - discountNum);
  const taxNum = (taxableNum * gstRateUsed) / 100;
  const totalNum = Math.max(0, taxableNum + taxNum);

  const halfRate = Number((gstRateUsed / 2).toFixed(2));
  const halfTax = Number((taxNum / 2).toFixed(2));

  // 3. Fast generation of order and invoice numbers
  const now = new Date();
  const datePrefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${datePrefix}-${randomSuffix}`;
  const invoiceNumber = `INV-${datePrefix}-${randomSuffix}`;

  // 4. Atomic single transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Create Order
    const order = await tx.order.create({
      data: {
        franchiseId,
        customerId: data.customerId || null,
        orderNumber,
        partyName: data.partyName,
        guestCount: data.guestCount || 1,
        status: OrderStatus.BILLED,
        kotDecision: "COMPLETED",
        subtotal: Number(subtotalNum.toFixed(2)),
        discount: Number(discountNum.toFixed(2)),
        tax: Number(taxNum.toFixed(2)),
        total: Number(totalNum.toFixed(2)),
        items: {
          create: processedItems.map((p) => ({
            menuItemId: p.menuItemId,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: p.totalPrice,
            notes: p.notes,
          })),
        },
      },
    });

    // B. Free Table if selected
    if (data.tableId) {
      await tx.restaurantTable.update({
        where: { id: data.tableId },
        data: { status: TableStatus.AVAILABLE, currentOccupancy: 0 },
      });
      await tx.tableSession.updateMany({
        where: { tableId: data.tableId, endedAt: null },
        data: { endedAt: now },
      });
    }

    // C. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        franchiseId,
        orderId: order.id,
        invoiceNumber,
        subtotal: Number(subtotalNum.toFixed(2)),
        discount: Number(discountNum.toFixed(2)),
        tax: Number(taxNum.toFixed(2)),
        total: Number(totalNum.toFixed(2)),
        taxableAmount: Number(taxableNum.toFixed(2)),
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: halfTax,
        igstRate: 0,
        igstAmount: 0,
        gstin: brand?.taxNumber || null,
        isDormant: false,
        dormantStatus: "ACTIVE",
      },
      include: {
        franchise: { select: { name: true, address: true, phone: true } },
      },
    });

    // D. Create Payment Records
    const paymentRecords: { method: string; amount: number }[] = [];
    if (data.splitPayments && data.splitPayments.length > 0) {
      for (const sp of data.splitPayments) {
        if (sp.amount > 0) {
          await tx.payment.create({
            data: {
              franchiseId,
              invoiceId: invoice.id,
              amount: Number(sp.amount.toFixed(2)),
              method: sp.method,
              status: PaymentStatus.COMPLETED,
            },
          });
          paymentRecords.push({ method: sp.method, amount: sp.amount });
        }
      }
    } else {
      await tx.payment.create({
        data: {
          franchiseId,
          invoiceId: invoice.id,
          amount: Number(totalNum.toFixed(2)),
          method: data.paymentMethod,
          status: PaymentStatus.COMPLETED,
        },
      });
      paymentRecords.push({ method: data.paymentMethod, amount: totalNum });
    }

    return { order, invoice, paymentRecords };
  });

  // 5. Generate formatted thermal receipt string
  const currSym = brand?.currencySymbol || "₹";
  const brandName = brand?.businessName?.trim().toUpperCase() || "MADRASI DOSA";
  const franchiseName = result.invoice.franchise.name.toUpperCase();
  const franchiseAddress = result.invoice.franchise.address?.trim() || "";
  const franchisePhone = result.invoice.franchise.phone?.trim() || "";
  const dateStr = now.toLocaleString();
  const tableStr = data.tableId ? "Dine-In" : "Takeaway";

  const lines = [
    "================================",
    `     ${brandName}     `,
    `--- ${franchiseName} ---`,
  ];
  if (franchiseAddress) lines.push(`  ${franchiseAddress}  `);
  if (franchisePhone) lines.push(`  Phone: ${franchisePhone}  `);
  if (brand?.taxNumber) lines.push(`  GSTIN: ${brand.taxNumber}  `);
  lines.push("================================");
  lines.push(`Invoice: ${result.invoice.invoiceNumber}`);
  lines.push(`Order  : ${result.order.orderNumber}`);
  lines.push(`${tableStr}`);
  lines.push(`Date   : ${dateStr}`);
  lines.push("--------------------------------");
  lines.push("Item             Qty      Price");
  lines.push("--------------------------------");

  for (const item of processedItems) {
    const name = item.name.padEnd(16, " ").substring(0, 16);
    const qty = String(item.quantity).padStart(3, " ");
    const price = `${currSym}${item.totalPrice.toFixed(2)}`.padStart(11, " ");
    lines.push(`${name} ${qty} ${price}`);
  }

  lines.push("--------------------------------");
  lines.push(`Subtotal:             ${currSym}${subtotalNum.toFixed(2)}`);
  if (discountNum > 0) {
    lines.push(`Discount:            -${currSym}${discountNum.toFixed(2)}`);
  }
  lines.push(`Tax:                  ${currSym}${taxNum.toFixed(2)}`);
  lines.push("================================");
  lines.push(`TOTAL:                ${currSym}${totalNum.toFixed(2)}`);
  lines.push("================================");
  lines.push("PAYMENTS:");
  for (const p of result.paymentRecords) {
    lines.push(`  ${p.method.padEnd(8, " ")}: ${currSym}${p.amount.toFixed(2)} [COMPLETED]`);
  }
  lines.push("--------------------------------");
  lines.push("Thanks For Visiting Madrasi Dosa");

  const rawText = lines.join("\n");

  // Asynchronous non-blocking events
  setImmediate(() => {
    emitToFranchise(franchiseId, "order:created", result.order);
    emitToFranchise(franchiseId, "invoice:created", result.invoice);
    if (data.tableId) {
      emitToFranchise(franchiseId, "table:status_changed", {
        tableId: data.tableId,
        status: TableStatus.AVAILABLE,
      });
    }
  });

  return {
    invoice: result.invoice,
    rawText,
    orderId: result.order.id,
  };
}

