import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";

export async function getAllOrganizations() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      franchises: {
        select: { id: true, name: true, code: true, isActive: true },
      },
      brandSettings: {
        select: { businessName: true, logoUrl: true, phone: true },
      },
      commercialPlan: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      couponRedemptions: {
        include: { coupon: true },
      },
      _count: {
        select: { users: true, franchises: true, invoices: true },
      },
    },
  });

  return orgs.map((org) => {
    const activeSub = org.subscriptions[0] || null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerName: org.ownerName,
      ownerEmail: org.ownerEmail,
      ownerPhone: org.ownerPhone,
      city: org.city,
      plan: org.commercialPlan ? org.commercialPlan.name : org.plan,
      planSlug: org.commercialPlan?.slug || org.plan.toLowerCase(),
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      subscriptionEndsAt: org.subscriptionEndsAt,
      maxOfflineHours: org.maxOfflineHours,
      featureFlags: org.featureFlags,
      outletsCount: org._count.franchises,
      usersCount: org._count.users,
      invoicesCount: org._count.invoices,
      franchises: org.franchises,
      brandSettings: org.brandSettings,
      activeSubscription: activeSub,
      couponRedemptions: org.couponRedemptions,
      isFoundingPartner: org.couponRedemptions.some((r) => r.campaignTag === "FOUNDING_10"),
      createdAt: org.createdAt,
    };
  });
}

export async function getPlatformOverviewStats() {
  const [
    totalOrgs,
    activeOrgs,
    trialOrgs,
    foundingRedemptions,
    totalOutlets,
    totalUsers,
    invoices,
    demoRequests,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "TRIAL" } }),
    prisma.couponRedemption.count({ where: { campaignTag: "FOUNDING_10" } }),
    prisma.franchise.count(),
    prisma.user.count(),
    prisma.subscriptionInvoice.findMany({
      where: { status: "PAID" },
      select: { totalAmount: true },
    }),
    prisma.demoRequest.count({ where: { status: "NEW" } }),
  ]);

  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  return {
    totalOrganizations: totalOrgs,
    activeSubscriptions: activeOrgs,
    trialSubscriptions: trialOrgs,
    foundingPartnersCount: foundingRedemptions,
    foundingPartnersRemaining: Math.max(0, 10 - foundingRedemptions),
    totalOutlets,
    totalUsers,
    totalRevenue,
    pendingLeads: demoRequests,
  };
}

export async function updateOrganizationPlan(
  organizationId: string,
  data: {
    plan?: "STARTER" | "PRO" | "ENTERPRISE";
    subscriptionStatus?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELLED";
    subscriptionEndsAt?: Date | string | null;
    trialEndsAt?: Date | string | null;
    featureFlags?: any;
    maxOfflineHours?: number;
    suspensionReason?: string;
  },
  adminUserId?: string
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) {
    throw new AppError("Organization not found", 404);
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan: data.plan || undefined,
      subscriptionStatus: data.subscriptionStatus || undefined,
      subscriptionEndsAt: data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : undefined,
      trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : undefined,
      featureFlags: data.featureFlags !== undefined ? data.featureFlags : undefined,
      maxOfflineHours: data.maxOfflineHours !== undefined ? Number(data.maxOfflineHours) : undefined,
    },
  });

  if (adminUserId) {
    await logAudit({
      userId: adminUserId,
      action: data.subscriptionStatus === "CANCELLED" ? "ORGANIZATION_SUSPENDED" : "SUBSCRIPTION_UPDATED",
      entity: "Organization",
      entityId: organizationId,
    });
  }

  return updated;
}

export async function getAllCoupons() {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { redemptions: true } },
    },
  });
}

export async function createCoupon(data: {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_MONTHS" | "FREE_YEAR";
  discountValue: number;
  maxRedemptions?: number;
  campaignTag?: string;
  validUntil?: Date | string | null;
}) {
  const cleanCode = data.code.toUpperCase().trim();

  const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
  if (existing) {
    throw new AppError("A coupon with this code already exists.", 409);
  }

  return await prisma.coupon.create({
    data: {
      code: cleanCode,
      description: data.description,
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      maxRedemptions: Number(data.maxRedemptions) || 100,
      campaignTag: data.campaignTag?.toUpperCase().trim() || "GENERAL",
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      isActive: true,
    },
  });
}

export async function getAllDemoRequests() {
  return await prisma.demoRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function updateDemoRequestStatus(
  id: string,
  status: "NEW" | "CONTACTED" | "DEMO_SCHEDULED" | "CONVERTED" | "REJECTED",
  notes?: string
) {
  return await prisma.demoRequest.update({
    where: { id },
    data: {
      status,
      notes: notes !== undefined ? notes : undefined,
    },
  });
}
