import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";

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
      _count: {
        select: { users: true, franchises: true },
      },
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    ownerName: org.ownerName,
    ownerEmail: org.ownerEmail,
    ownerPhone: org.ownerPhone,
    city: org.city,
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt,
    subscriptionEndsAt: org.subscriptionEndsAt,
    maxOfflineHours: org.maxOfflineHours,
    featureFlags: org.featureFlags,
    outletsCount: org._count.franchises,
    usersCount: org._count.users,
    franchises: org.franchises,
    brandSettings: org.brandSettings,
    createdAt: org.createdAt,
  }));
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
  }
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) {
    throw new AppError("Organization not found", 404);
  }

  return await prisma.organization.update({
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
