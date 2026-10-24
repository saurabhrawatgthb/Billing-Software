import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "development-secret";
}

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
  plan?: "STARTER" | "PRO" | "ENTERPRISE";
  outletType?: string;
}

export async function registerNewBrand(input: RegisterBrandInput) {
  const email = input.ownerEmail.toLowerCase().trim();
  const brandName = input.brandName.trim();
  const ownerName = input.ownerName.trim();

  // Validate existing email
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });
  if (existingUser) {
    throw new AppError("An account with this email address already exists. Please login instead.", 409);
  }

  // Create unique slug
  let baseSlug = slugify(brandName);
  if (!baseSlug) baseSlug = "restaurant";
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // 14-day free trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Default feature flags based on plan
  const plan = input.plan || "PRO";
  const featureFlags = {
    hasDineIn: plan !== "STARTER",
    hasKitchenDisplay: plan !== "STARTER",
    hasAggregators: plan === "ENTERPRISE",
    hasInventory: plan !== "STARTER",
    hasCRM: true,
    hasWhatsAppReceipts: true,
  };

  // 1. Create Organization
  const organization = await prisma.organization.create({
    data: {
      name: brandName,
      slug,
      ownerName,
      ownerEmail: email,
      ownerPhone: input.ownerPhone.trim(),
      city: input.city?.trim() || null,
      plan,
      subscriptionStatus: "TRIAL",
      trialEndsAt,
      maxOfflineHours: 72,
      featureFlags,
    },
  });

  // 2. Create Brand Settings
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

  // 3. Create Default Main Outlet (Franchise)
  const outletCode = `${slug.substring(0, 4).toUpperCase()}-01`;
  const franchise = await prisma.franchise.create({
    data: {
      organizationId: organization.id,
      name: `${brandName} - Main Outlet`,
      code: outletCode,
      address: input.city ? `${input.city}` : "Main Branch",
      phone: input.ownerPhone.trim(),
      email,
      isActive: true,
    },
  });

  // 4. Create Owner Admin User
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

  // 5. Seed Starter Menu Categories & Tables for immediate demo experience
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

  // Seed 4 sample tables
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

  // Generate JWT token
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
      },
      franchise: {
        id: franchise.id,
        name: franchise.name,
        code: franchise.code,
      },
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
