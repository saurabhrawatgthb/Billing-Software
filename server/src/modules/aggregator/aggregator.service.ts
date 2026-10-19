import { OrderStatus, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";
import { emitToFranchise } from "../../lib/socket.js";
import { generateKOTsForOrder } from "../kot/kot.service.js";

export interface AggregatorItemInput {
  menuItemId?: string;
  itemName?: string;
  quantity: number;
  price?: number;
  notes?: string | null;
}

export interface IngestAggregatorOrderInput {
  platform: "SWIGGY" | "ZOMATO";
  externalOrderId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  riderName?: string;
  riderPhone?: string;
  items: AggregatorItemInput[];
  prepTimeMinutes?: number;
}

export async function getAggregatorSettings(franchiseId: string) {
  const existing = await prisma.aggregatorIntegration.findMany({
    where: { franchiseId },
  });

  const platforms: ("SWIGGY" | "ZOMATO")[] = ["SWIGGY", "ZOMATO"];
  const result = [];

  for (const p of platforms) {
    let match = existing.find((item) => item.platform === p);
    if (!match) {
      match = await prisma.aggregatorIntegration.create({
        data: {
          franchiseId,
          platform: p,
          isEnabled: false,
          restaurantId: "",
          apiKey: `key_${p.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`,
          autoAccept: false,
          prepTimeMinutes: 15,
          webhookUrl: `/api/aggregators/webhook/${p}/${franchiseId}`,
        },
      });
    }
    result.push(match);
  }

  return result;
}

export async function updateAggregatorSettings(
  franchiseId: string,
  data: {
    platform: "SWIGGY" | "ZOMATO";
    isEnabled: boolean;
    restaurantId?: string;
    apiKey?: string;
    autoAccept?: boolean;
    prepTimeMinutes?: number;
  }
) {
  const integration = await prisma.aggregatorIntegration.upsert({
    where: {
      franchiseId_platform: {
        franchiseId,
        platform: data.platform,
      },
    },
    update: {
      isEnabled: data.isEnabled,
      restaurantId: data.restaurantId,
      apiKey: data.apiKey,
      autoAccept: data.autoAccept ?? false,
      prepTimeMinutes: data.prepTimeMinutes ?? 15,
      webhookUrl: `/api/aggregators/webhook/${data.platform}/${franchiseId}`,
    },
    create: {
      franchiseId,
      platform: data.platform,
      isEnabled: data.isEnabled,
      restaurantId: data.restaurantId || "",
      apiKey: data.apiKey || `key_${data.platform.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`,
      autoAccept: data.autoAccept ?? false,
      prepTimeMinutes: data.prepTimeMinutes ?? 15,
      webhookUrl: `/api/aggregators/webhook/${data.platform}/${franchiseId}`,
    },
  });

  emitToFranchise(franchiseId, "aggregator:settings_updated", integration);
  return integration;
}

export async function listPendingAggregatorOrders(franchiseId: string) {
  return prisma.order.findMany({
    where: {
      franchiseId,
      orderSource: { in: ["SWIGGY", "ZOMATO"] },
      aggregatorStatus: "PENDING_ACCEPTANCE",
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.BILLED] },
    },
    include: {
      items: {
        include: {
          menuItem: {
            include: { category: true, station: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function ingestAggregatorOrder(
  franchiseId: string,
  input: IngestAggregatorOrderInput
) {
  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
  });
  if (!franchise) {
    throw new AppError("Franchise not found", 404);
  }

  // Brand tax rate
  const brand = await prisma.brandSettings.findFirst();
  const taxRate = brand?.defaultGstRate ?? 5.0;

  // Fetch all menu items for the franchise to match items
  const menuItems = await prisma.menuItem.findMany({
    where: { franchiseId, isAvailable: true },
  });

  if (menuItems.length === 0) {
    throw new AppError("Franchise has no available menu items to fulfill online orders", 400);
  }

  const orderItemsData: {
    menuItemId: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes?: string | null;
  }[] = [];

  let orderSubtotal = 0;

  for (const itemInput of input.items) {
    let match = menuItems.find((m) => m.id === itemInput.menuItemId);
    if (!match && itemInput.itemName) {
      match = menuItems.find(
        (m) => m.name.toLowerCase() === itemInput.itemName?.toLowerCase().trim()
      );
    }
    // Fallback to first menu item if external name was not matched
    if (!match) {
      match = menuItems[0];
    }

    const price = itemInput.price !== undefined && itemInput.price > 0 ? itemInput.price : Number(match.price);
    const quantity = Math.max(1, itemInput.quantity || 1);
    const subtotal = Number((price * quantity).toFixed(2));

    orderSubtotal += subtotal;
    orderItemsData.push({
      menuItemId: match.id,
      quantity,
      price,
      subtotal,
      notes: itemInput.notes || null,
    });
  }

  const tax = Number(((orderSubtotal * taxRate) / 100).toFixed(2));
  const total = Number((orderSubtotal + tax).toFixed(2));

  // Generate unique order number
  const prefix = input.platform === "SWIGGY" ? "SWIG" : "ZOM";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const countToday = await prisma.order.count({ where: { franchiseId } });
  const orderNumber = `${prefix}-${countToday + 1}-${randomSuffix}`;
  const externalOrderId = input.externalOrderId || `${prefix}#${Date.now().toString().slice(-6)}`;

  // Create order
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        franchiseId,
        orderNumber,
        orderSource: input.platform,
        aggregatorOrderId: externalOrderId,
        aggregatorStatus: "PENDING_ACCEPTANCE",
        status: OrderStatus.OPEN,
        partyName: input.customerName ? `${input.platform}: ${input.customerName}` : `${input.platform} Online Order`,
        customerDeliveryName: input.customerName || "Online Guest",
        customerDeliveryPhone: input.customerPhone || "+91 98765 00000",
        deliveryAddress: input.deliveryAddress || "Sector 14, Urban Estate, Express Delivery",
        riderName: input.riderName || "Pending Partner Assignment",
        riderPhone: input.riderPhone || null,
        subtotal: orderSubtotal,
        discount: 0,
        tax,
        total,
        items: {
          create: orderItemsData.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.subtotal,
            notes: i.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: { category: true, station: true },
            },
          },
        },
        franchise: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return newOrder;
  });

  // Emit real-time event to POS screens
  emitToFranchise(franchiseId, "aggregator:new_order", order);
  emitToFranchise(franchiseId, "order:created", order);

  // Check if auto-accept is enabled
  const integration = await prisma.aggregatorIntegration.findUnique({
    where: {
      franchiseId_platform: {
        franchiseId,
        platform: input.platform,
      },
    },
  });

  if (integration?.isEnabled && integration?.autoAccept) {
    try {
      await acceptAggregatorOrder(order.id, franchiseId, integration.prepTimeMinutes, "AUTO_ACCEPT");
    } catch (e) {
      console.error("Auto-accept aggregator order error:", e);
    }
  }

  return order;
}

export async function acceptAggregatorOrder(
  orderId: string,
  franchiseId: string,
  prepTimeMinutes: number = 15,
  currentUserId?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.franchiseId !== franchiseId) {
    throw new AppError("Aggregator order not found", 404);
  }

  if (order.aggregatorStatus !== "PENDING_ACCEPTANCE" && order.status !== OrderStatus.OPEN) {
    throw new AppError(`Order is already ${order.aggregatorStatus || order.status}`, 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      aggregatorStatus: "ACCEPTED",
      status: OrderStatus.CONFIRMED,
      kotDecision: "SENT",
      kotSentAt: new Date(),
    },
    include: {
      items: {
        include: {
          menuItem: { include: { station: true, category: true } },
        },
      },
    },
  });

  // Automatically generate KOT and dispatch to kitchen
  try {
    await generateKOTsForOrder(orderId, franchiseId, undefined, currentUserId);
  } catch (kotErr) {
    console.error("KOT auto-generation for aggregator order error:", kotErr);
  }

  emitToFranchise(franchiseId, "aggregator:order_accepted", {
    orderId,
    order: updatedOrder,
    prepTimeMinutes,
  });
  emitToFranchise(franchiseId, "order:status_changed", {
    orderId,
    status: OrderStatus.CONFIRMED,
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "ACCEPT_AGGREGATOR_ORDER",
    entity: "Order",
    entityId: orderId,
    newData: { status: "ACCEPTED", prepTimeMinutes },
  });

  return updatedOrder;
}

export async function rejectAggregatorOrder(
  orderId: string,
  franchiseId: string,
  reason: string,
  currentUserId?: string
) {
  if (!reason || !reason.trim()) {
    throw new AppError("A rejection reason is required for Swiggy/Zomato orders", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.franchiseId !== franchiseId) {
    throw new AppError("Aggregator order not found", 404);
  }

  if (order.aggregatorStatus === "ACCEPTED" || order.status === OrderStatus.BILLED) {
    throw new AppError("Cannot reject an already accepted or billed order", 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      aggregatorStatus: "REJECTED",
      aggregatorRejectReason: reason.trim(),
      status: OrderStatus.CANCELLED,
    },
  });

  emitToFranchise(franchiseId, "aggregator:order_rejected", {
    orderId,
    order: updatedOrder,
    reason: reason.trim(),
  });
  emitToFranchise(franchiseId, "order:status_changed", {
    orderId,
    status: OrderStatus.CANCELLED,
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "REJECT_AGGREGATOR_ORDER",
    entity: "Order",
    entityId: orderId,
    newData: { status: "REJECTED", reason: reason.trim() },
  });

  return updatedOrder;
}

export async function simulateIncomingAggregatorOrder(
  franchiseId: string,
  platform: "SWIGGY" | "ZOMATO"
) {
  const menuItems = await prisma.menuItem.findMany({
    where: { franchiseId, isAvailable: true },
    take: 5,
  });

  if (menuItems.length === 0) {
    throw new AppError("Please add at least 1 menu item to this franchise before simulating online orders", 400);
  }

  const randomCustomers = [
    { name: "Rahul Sharma", phone: "+91 98101 23456", addr: "Tower B, Flat 402, DLF Phase 5" },
    { name: "Priya Patel", phone: "+91 97234 56789", addr: "Villa 12, Palm Meadows, Outer Ring Road" },
    { name: "Ananya Deshmukh", phone: "+91 99887 65432", addr: "House 204, Sector 17-C, Near Central Park" },
    { name: "Aditya Verma", phone: "+91 98765 43210", addr: "B-22, Golf Course Ext Road, Skyline Heights" },
  ];

  const randomRiders = [
    { name: "Delivery Hero Ramesh K.", phone: "+91 91234 11223" },
    { name: "Delivery Partner Sunil M.", phone: "+91 92345 22334" },
    { name: "Delivery Partner Jaspreet S.", phone: "+91 93456 33445" },
  ];

  const cust = randomCustomers[Math.floor(Math.random() * randomCustomers.length)];
  const rider = randomRiders[Math.floor(Math.random() * randomRiders.length)];

  // Pick 1 to 3 items
  const count = Math.min(menuItems.length, Math.floor(Math.random() * 2) + 1);
  const selectedItems: AggregatorItemInput[] = [];

  for (let i = 0; i < count; i++) {
    const item = menuItems[i % menuItems.length];
    const qty = Math.floor(Math.random() * 2) + 1;
    selectedItems.push({
      menuItemId: item.id,
      itemName: item.name,
      quantity: qty,
      price: Number(item.price),
      notes: i === 0 ? "Extra spicy, no cutlery needed" : null,
    });
  }

  const extId = platform === "SWIGGY" ? `SWG-${Math.floor(100000 + Math.random() * 900000)}` : `ZOM-${Math.floor(100000 + Math.random() * 900000)}`;

  return ingestAggregatorOrder(franchiseId, {
    platform,
    externalOrderId: extId,
    customerName: cust.name,
    customerPhone: cust.phone,
    deliveryAddress: cust.addr,
    riderName: rider.name,
    riderPhone: rider.phone,
    items: selectedItems,
    prepTimeMinutes: 15,
  });
}
