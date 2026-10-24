import type { Request, Response, NextFunction } from "express";
import {
  registerBrandAndCheckout,
  createDemoRequest,
  getCommercialPricingPlans,
  validateCoupon,
} from "./public.service.js";

export async function handleRegisterAndCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      brandName,
      ownerName,
      ownerEmail,
      ownerPhone,
      password,
      city,
      planSlug,
      billingInterval,
      couponCode,
      outletCount,
      outletType,
    } = req.body;

    if (!brandName || !ownerName || !ownerEmail || !ownerPhone || !password) {
      return res.status(400).json({
        success: false,
        message: "Brand name, owner name, email, phone number, and password are required.",
      });
    }

    const result = await registerBrandAndCheckout({
      brandName,
      ownerName,
      ownerEmail,
      ownerPhone,
      password,
      city,
      planSlug: planSlug || "starter",
      billingInterval: billingInterval || "ANNUAL",
      couponCode,
      outletCount,
      outletType,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: result.subscription.isFreeYear
        ? "Congratulations! You have claimed one of the Founding Partner 1-Year Free Subscriptions. Welcome to OmniPOS!"
        : "Restaurant brand provisioned successfully! Welcome to your OmniPOS workspace.",
    });
  } catch (error) {
    next(error);
  }
}

export async function handleValidateCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, planSlug, billingInterval } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required.",
      });
    }

    const validation = await validateCoupon(code, planSlug, billingInterval);

    return res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDemoRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantName, ownerName, phone, email, city, outletType, outletCount, notes } = req.body;

    if (!restaurantName || !ownerName || !phone || !email || !city) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name, owner name, phone, email, and city are required.",
      });
    }

    const lead = await createDemoRequest({
      restaurantName,
      ownerName,
      phone,
      email,
      city,
      outletType,
      outletCount,
      notes,
    });

    return res.status(201).json({
      success: true,
      data: lead,
      message: "Thank you! Our restaurant specialist will call you on WhatsApp/Phone within 15 minutes.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getPricingPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await getCommercialPricingPlans();
    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
}
