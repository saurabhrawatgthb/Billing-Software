import type { Request, Response, NextFunction } from "express";
import { registerNewBrand, createDemoRequest } from "./public.service.js";

export async function handleRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandName, ownerName, ownerEmail, ownerPhone, password, city, plan, outletType } = req.body;

    if (!brandName || !ownerName || !ownerEmail || !ownerPhone || !password) {
      return res.status(400).json({
        success: false,
        message: "Brand name, owner name, email, phone number, and password are required.",
      });
    }

    const result = await registerNewBrand({
      brandName,
      ownerName,
      ownerEmail,
      ownerPhone,
      password,
      city,
      plan,
      outletType,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: "Restaurant brand and workspace provisioned successfully! Welcome to OmniPOS.",
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

export async function getPricingPlans(_req: Request, res: Response) {
  return res.json({
    success: true,
    data: [
      {
        id: "STARTER",
        name: "Starter (QSR & Cafe)",
        tagline: "Ideal for quick-service food trucks, cafes & takeaway joints",
        monthlyPrice: 799,
        annualPrice: 7999,
        features: [
          "1 Billing Terminal (Touch & PC)",
          "100% Offline Billing Mode",
          "Thermal Receipt & KOT Printing",
          "Daily Cash Register & Shift End",
          "Live Sales & Analytics Dashboard",
          "Free CSV Menu Upload Support",
        ],
        highlight: false,
        badge: "Most Affordable",
      },
      {
        id: "PRO",
        name: "Pro (Dine-In Restaurant)",
        tagline: "Complete system for full-service restaurants, bars & bakeries",
        monthlyPrice: 1299,
        annualPrice: 12999,
        features: [
          "Everything in Starter, plus:",
          "Interactive Floor & Table Layout",
          "Paperless Kitchen Display System (KDS)",
          "Inventory & Ingredient Recipe Costing",
          "WhatsApp Digital Receipt Sharing",
          "Customer Retention CRM & Birthday Alerts",
          "Up to 3 Waiter / Captain Tablets",
        ],
        highlight: true,
        badge: "Most Popular",
      },
      {
        id: "ENTERPRISE",
        name: "Enterprise (Multi-Outlet Chain)",
        tagline: "Central control for restaurant brands with multiple branches",
        monthlyPrice: 2499,
        annualPrice: 24999,
        features: [
          "Everything in Pro, plus:",
          "Multi-Outlet Centralized Menu Sync",
          "Cross-Branch Comparative Reports",
          "Swiggy & Zomato Aggregator Order Sync",
          "Fine-Grained Role Permissions & Audit Logs",
          "Dedicated 24/7 Priority Support Manager",
        ],
        highlight: false,
        badge: "For Chains",
      },
    ],
  });
}
