import type { Response, NextFunction } from "express";
import { type AuthenticatedRequest, getFranchiseId } from "../../middleware/auth.js";
import {
  getAggregatorSettings,
  updateAggregatorSettings,
  listPendingAggregatorOrders,
  acceptAggregatorOrder,
  rejectAggregatorOrder,
  simulateIncomingAggregatorOrder,
  ingestAggregatorOrder,
} from "./aggregator.service.js";

export async function getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: "Franchise ID is required" });
    }
    const settings = await getAggregatorSettings(franchiseId);
    return res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: "Franchise ID is required" });
    }
    const updated = await updateAggregatorSettings(franchiseId, req.body);
    return res.json({
      success: true,
      data: updated,
      message: `${req.body.platform} integration settings updated`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPendingOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    if (!franchiseId) {
      return res.json({ success: true, data: [] });
    }
    const pending = await listPendingAggregatorOrders(franchiseId);
    return res.json({ success: true, data: pending });
  } catch (error) {
    next(error);
  }
}

export async function acceptOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req) || (req.body.franchiseId as string);
    const orderId = req.params.orderId as string;
    const { prepTimeMinutes } = req.body;

    const accepted = await acceptAggregatorOrder(
      orderId,
      franchiseId,
      prepTimeMinutes ? Number(prepTimeMinutes) : 15,
      req.user?.id
    );

    return res.json({
      success: true,
      data: accepted,
      message: "Order accepted successfully and dispatched to kitchen",
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req) || (req.body.franchiseId as string);
    const orderId = req.params.orderId as string;
    const { reason } = req.body;

    const rejected = await rejectAggregatorOrder(
      orderId,
      franchiseId,
      reason,
      req.user?.id
    );

    return res.json({
      success: true,
      data: rejected,
      message: "Order rejected and aggregator notified",
    });
  } catch (error) {
    next(error);
  }
}

export async function simulateOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req) || (req.body.franchiseId as string);
    const platform = (req.body.platform || "SWIGGY").toUpperCase() as "SWIGGY" | "ZOMATO";

    if (!franchiseId) {
      return res.status(400).json({ success: false, message: "Select a franchise to simulate an order" });
    }

    const order = await simulateIncomingAggregatorOrder(franchiseId, platform);

    return res.status(201).json({
      success: true,
      data: order,
      message: `Simulated incoming order from ${platform} sent to POS!`,
    });
  } catch (error) {
    next(error);
  }
}

export async function webhookIngest(req: any, res: Response, next: NextFunction) {
  try {
    const { platform, franchiseId } = req.params;
    const normPlatform = (platform || "").toUpperCase() as "SWIGGY" | "ZOMATO";

    const body = req.body || {};
    // Extract items format from common webhook structures or direct format
    const items = body.items || body.order_items || [];
    const customer = body.customer || {};
    const delivery = body.delivery_address || body.delivery || {};

    const order = await ingestAggregatorOrder(franchiseId, {
      platform: normPlatform,
      externalOrderId: body.order_id || body.id,
      customerName: customer.name || body.customer_name,
      customerPhone: customer.phone || body.customer_phone,
      deliveryAddress: typeof delivery === "string" ? delivery : delivery.address_line,
      riderName: body.rider_name || body.delivery_partner_name,
      riderPhone: body.rider_phone || body.delivery_partner_phone,
      items: items.map((i: any) => ({
        menuItemId: i.item_id || i.menuItemId,
        itemName: i.item_name || i.title || i.name,
        quantity: i.quantity || 1,
        price: i.price,
        notes: i.instructions || i.notes,
      })),
      prepTimeMinutes: body.prep_time_minutes || 15,
    });

    return res.status(201).json({
      success: true,
      status: "received",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    next(error);
  }
}
