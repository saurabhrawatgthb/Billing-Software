import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";
import { getJwtSecret } from "../../config/auth.config.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface RegisterBrandInput {
  brandName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  password: string;
  city?: string;
  planSlug?: string;
  billingInterval?: "MONTHLY" | "ANNUAL";
  couponCode?: string;
  outletCount?: number;
  outletType?: string;
}

/**
 * Fetch database-driven commercial plans published on the public site
 */
export async function getCommercialPricingPlans() {
  const plans = await prisma.commercialPlan.findMany({
    where: { isPublic: true },
    orderBy: { displayOrder: "asc" },
  });

  if (plans.length > 0) {
    return plans;
  }

  // Fallback defaults if database has not yet been seeded
  return [
    {
      slug: "starter",
      name: "Starter (QSR & Cafe)",
      description: "Ideal for quick-service food trucks, cafes & takeaway joints",
      monthlyPrice: 999,
      annualPrice: 7999,
      currency: "INR",
      includedOutlets: 1,
      includedUsers: 3,
      features: [
        "1 Billing Terminal (Touch & PC)",
        "100% Offline Billing Mode",
        "Thermal Receipt & KOT Printing",
        "Daily Cash Register & Shift End",
        "Live Sales & Analytics Dashboard",
        "Free CSV Menu Upload Support",
      ],
      isPopular: false,
    },
    {
      slug: "growth",
      name: "Growth (Dine-In Restaurant)",
      description: "Complete system for full-service restaurants, bars & bakeries",
      monthlyPrice: 1599,
      annualPrice: 12999,
      currency: "INR",
      includedOutlets: 1,
      includedUsers: 10,
      features: [
        "Interactive Floor & Table Layout",
        "Paperless Kitchen Display System (KDS)",
        "Inventory & Recipe Food Costing",
        "WhatsApp Digital Receipt Sharing",
        "Customer Retention CRM & Birthday Alerts",
        "Up to 3 Waiter / Captain Tablets",
      ],
      isPopular: true,
    },
    {
      slug: "pro",
      name: "Pro (Multi-Outlet Chain)",
      description: "Central control for restaurant brands with multiple branches",
      monthlyPrice: 2999,
      annualPrice: 24999,
      currency: "INR",
      includedOutlets: 3,
      includedUsers: 30,
      features: [
        "Multi-Outlet Centralized Menu Sync",
        "Cross-Branch Comparative Reports",
        "Staff Attendance & Payroll Ledger",
        "Fine-Grained Role Permissions & Audit Logs",
        "Dedicated Priority Support",
      ],
      isPopular: false,
    },
  ];
}

/**
 * Validates a coupon code server-side against expiration, plan eligibility, and max capacity.
 */
export async function validateCoupon(code: string, planSlug = "starter", billingInterval = "ANNUAL") {
  const cleanCode = code.toUpperCase().trim();

  const coupon = await prisma.coupon.findUnique({
    where: { code: cleanCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError("Invalid or inactive coupon code.", 400);
  }

  if (coupon.validUntil && new Date() > coupon.validUntil) {
    throw new AppError("This coupon code has expired.", 400);
  }

  if (coupon.currentRedemptions >= coupon.maxRedemptions) {
    throw new AppError(
      `This promotional campaign has reached its redemption limit (${coupon.maxRedemptions}/${coupon.maxRedemptions} claimed).`,
      400
    );
  }

  // Calculate discount breakdown based on plan
  const plan = await prisma.commercialPlan.findUnique({
    where: { slug: planSlug.toLowerCase() },
  });

  const basePrice = plan
    ? billingInterval === "MONTHLY"
      ? plan.monthlyPrice
      : plan.annualPrice
    : billingInterval === "MONTHLY"
      ? 999
      : 7999;

  let discountAmount = 0;
  let isFreeYear = false;

  if (coupon.discountType === "FREE_YEAR") {
    discountAmount = basePrice;
    isFreeYear = true;
  } else if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (basePrice * coupon.discountValue) / 100;
  } else if (coupon.discountType === "FIXED_AMOUNT") {
    discountAmount = Math.min(basePrice, coupon.discountValue);
  }

  const finalPayable = Math.max(0, basePrice - discountAmount);

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      campaignTag: coupon.campaignTag,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      remainingRedemptions: Math.max(0, coupon.maxRedemptions - coupon.currentRedemptions),
      isFreeYear,
    },
    pricing: {
      basePrice,
      discountAmount,
      finalPayable,
      currency: "INR",
      billingInterval,
    },
  };
}

/**
 * Registers a new restaurant brand and activates subscription (with atomic coupon redemption for the Founding 10)
 */
export async function registerBrandAndCheckout(input: RegisterBrandInput) {
  const email = input.ownerEmail.toLowerCase().trim();
  const brandName = input.brandName.trim();
  const ownerName = input.ownerName.trim();
  const planSlug = (input.planSlug || "starter").toLowerCase();
  const billingInterval = input.billingInterval || "ANNUAL";

  // Check email collision
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });
  if (existingUser) {
    throw new AppError("An account with this email address already exists. Please login instead.", 409);
  }

  // Find or link plan
  const commercialPlan = await prisma.commercialPlan.findUnique({
    where: { slug: planSlug },
  });

  // Unique organization slug
  let baseSlug = slugify(brandName);
  if (!baseSlug) baseSlug = "restaurant";
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Handle coupon redemption if provided
  let redeemedCoupon: any = null;
  let isFreeYearPromotional = false;

  if (input.couponCode) {
    const cleanCode = input.couponCode.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({ where: { code: cleanCode } });

    if (!coupon || !coupon.isActive) {
      throw new AppError("The provided coupon code is invalid or inactive.", 400);
    }

    if (coupon.currentRedemptions >= coupon.maxRedemptions) {
      throw new AppError("This promotional campaign has reached its redemption capacity.", 400);
    }

    // Atomic increment to prevent concurrent 11th redemption
    const updateResult = await prisma.coupon.updateMany({
      where: {
        id: coupon.id,
        currentRedemptions: { lt: coupon.maxRedemptions },
      },
      data: {
        currentRedemptions: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      throw new AppError("All promotional spots for this campaign were just claimed. Please select standard checkout.", 409);
    }

    redeemedCoupon = coupon;
    if (coupon.discountType === "FREE_YEAR") {
      isFreeYearPromotional = true;
    }
  }

  // Subscription duration
  const now = new Date();
  const subscriptionEndsAt = new Date(now);
  if (isFreeYearPromotional || billingInterval === "ANNUAL") {
    subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
  } else {
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
  }

  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Map enum
  const planEnum = planSlug === "enterprise" ? "ENTERPRISE" : planSlug === "growth" || planSlug === "pro" ? "PRO" : "STARTER";
  const subscriptionStatus = isFreeYearPromotional ? "ACTIVE" : "TRIAL";

  // 1. Create Organization
  const organization = await prisma.organization.create({
    data: {
      name: brandName,
      slug,
      ownerName,
      ownerEmail: email,
      ownerPhone: input.ownerPhone.trim(),
      city: input.city?.trim() || null,
      plan: planEnum,
      commercialPlanId: commercialPlan?.id || null,
      subscriptionStatus: subscriptionStatus as any,
      trialEndsAt: isFreeYearPromotional ? null : trialEndsAt,
      subscriptionEndsAt,
      maxOfflineHours: 72,
      featureFlags: commercialPlan ? { features: commercialPlan.features } : null,
    },
  });

  // 2. Record Coupon Redemption if applied
  if (redeemedCoupon) {
    await prisma.couponRedemption.create({
      data: {
        couponId: redeemedCoupon.id,
        organizationId: organization.id,
        ownerEmail: email,
        campaignTag: redeemedCoupon.campaignTag,
        discountAmount: commercialPlan ? (billingInterval === "ANNUAL" ? commercialPlan.annualPrice : commercialPlan.monthlyPrice) : 7999,
      },
    });
  }

  // 3. Create Subscription Record
  if (commercialPlan) {
    await prisma.subscriptionRecord.create({
      data: {
        organizationId: organization.id,
        planId: commercialPlan.id,
        status: isFreeYearPromotional ? "ACTIVE" : "TRIAL",
        billingInterval: billingInterval as any,
        currentPeriodStart: now,
        currentPeriodEnd: subscriptionEndsAt,
        isPromotionalFree: isFreeYearPromotional,
        promotionalMonths: isFreeYearPromotional ? 12 : 0,
        outletsSubscribed: Math.max(1, Number(input.outletCount) || 1),
        amountPaid: isFreeYearPromotional ? 0 : 0, // In trial or promo, 0
      },
    });
  }

  // 4. Create Initial Subscription Invoice
  const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const baseCost = commercialPlan ? (billingInterval === "ANNUAL" ? commercialPlan.annualPrice : commercialPlan.monthlyPrice) : 7999;
  const discountCost = isFreeYearPromotional ? baseCost : 0;
  const finalCost = baseCost - discountCost;

  await prisma.subscriptionInvoice.create({
    data: {
      organizationId: organization.id,
      invoiceNumber,
      billingName: brandName,
      billingEmail: email,
      billingAddress: input.city || null,
      subtotal: baseCost,
      discountAmount: discountCost,
      couponCode: input.couponCode ? input.couponCode.toUpperCase().trim() : null,
      taxAmount: 0,
      totalAmount: finalCost,
      amountPaid: isFreeYearPromotional ? 0 : 0,
      status: isFreeYearPromotional ? "PAID" : "ISSUED",
      periodStart: now,
      periodEnd: subscriptionEndsAt,
      notes: isFreeYearPromotional ? "Founding Partner Promotional Offer (1 Year 100% Free)" : "14-Day Free Trial",
    },
  });

  // 5. Create Brand Settings
  await prisma.brandSettings.create({
    data: {
      organizationId: organization.id,
      businessName: brandName,
      phone: input.ownerPhone.trim(),
      email,
      address: input.city ? `${input.city}` : null,
      currencySymbol: "₹",
      currencyCode: "INR",
      defaultGstRate: 5.0,
      vipDiscountPercent: 20.0,
      loyalDiscountPercent: 15.0,
      regularDiscountPercent: 10.0,
    },
  });

  // 6. Create Default Receipt Bill Template (80mm & 58mm compatible)
  await prisma.billTemplate.create({
    data: {
      organizationId: organization.id,
      name: `${brandName} Standard Receipt`,
      paperSize: "80mm",
      showLogo: true,
      headerText: `Welcome to ${brandName}!`,
      footerText: "Thank you for dining with us! Please visit again.",
      showGstin: true,
      showFssai: true,
      showTableNumber: true,
      showCashierName: true,
      showUpiQrCode: true,
      fontScale: "normal",
      isDefault: true,
    },
  });

  // 7. Create Primary Outlet (Franchise) with collision-safe code
  let baseCode = slug.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
  if (!baseCode || baseCode.length < 2) baseCode = "OUTL";
  let outletCode = `${baseCode}-01`;
  let attempt = 1;
  while (await prisma.franchise.findUnique({ where: { code: outletCode } })) {
    attempt++;
    outletCode = `${baseCode}-${String(attempt).padStart(2, "0")}`;
    if (attempt > 99) {
      outletCode = `${baseCode}-${Date.now().toString().slice(-4)}`;
      break;
    }
  }

  const franchise = await prisma.franchise.create({
    data: {
      organizationId: organization.id,
      name: `${brandName} - Main Outlet`,
      code: outletCode,
      address: input.city ? `${input.city}` : "Main Outlet",
      phone: input.ownerPhone.trim(),
      email,
      isActive: true,
    },
  });

  // 8. Create Owner User
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      franchiseId: franchise.id,
      name: ownerName,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // 9. Seed Starter Menu Categories and Sample Tables
  const defaultCategories = ["Beverages", "Starters & Snacks", "Main Course", "Desserts"];
  for (const catName of defaultCategories) {
    await prisma.category.create({
      data: {
        franchiseId: franchise.id,
        name: catName,
        isActive: true,
      },
    });
  }

  const defaultTables = [
    { tableNumber: "T1", capacity: 2 },
    { tableNumber: "T2", capacity: 4 },
    { tableNumber: "T3", capacity: 4 },
    { tableNumber: "T4", capacity: 6 },
  ];
  for (const t of defaultTables) {
    await prisma.restaurantTable.create({
      data: {
        franchiseId: franchise.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: "AVAILABLE",
      },
    });
  }

  // 10. Generate Authenticated Token
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      franchiseId: franchise.id,
      organizationId: organization.id,
      name: user.name,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  await logAudit({
    franchiseId: franchise.id,
    userId: user.id,
    action: "ORGANIZATION_REGISTERED",
    entity: "Organization",
    entityId: organization.id,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      franchiseId: franchise.id,
      organizationId: organization.id,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        subscriptionStatus: organization.subscriptionStatus,
        trialEndsAt: organization.trialEndsAt,
        subscriptionEndsAt: organization.subscriptionEndsAt,
        isPromotionalFree: isFreeYearPromotional,
      },
      franchise: {
        id: franchise.id,
        name: franchise.name,
        code: franchise.code,
      },
    },
    subscription: {
      plan: commercialPlan ? commercialPlan.name : planSlug,
      billingInterval,
      status: organization.subscriptionStatus,
      isFreeYear: isFreeYearPromotional,
      subscriptionEndsAt,
    },
  };
}

export interface DemoRequestInput {
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  outletType?: string;
  outletCount?: number;
  notes?: string;
}

export async function createDemoRequest(input: DemoRequestInput) {
  return await prisma.demoRequest.create({
    data: {
      restaurantName: input.restaurantName.trim(),
      ownerName: input.ownerName.trim(),
      phone: input.phone.trim(),
      email: input.email.toLowerCase().trim(),
      city: input.city.trim(),
      outletType: input.outletType?.trim() || "CAFE",
      outletCount: Number(input.outletCount) || 1,
      notes: input.notes?.trim() || null,
      status: "NEW",
    },
  });
}
