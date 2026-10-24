import prisma from "../src/lib/prisma.js";

export async function seedSaaSCommercialPlans() {
  console.log("🌱 Seeding Commercial Plans and Founding-10 Campaign...");

  const defaultPlans = [
    {
      slug: "starter",
      name: "Starter Single Outlet",
      description: "Ideal for small cafes, food trucks, and single-location quick-service restaurants.",
      monthlyPrice: 999,
      annualPrice: 7999,
      currency: "INR",
      includedOutlets: 1,
      includedUsers: 3,
      extraOutletPrice: 2999,
      supportTier: "Standard Email Support",
      trialDays: 14,
      isPublic: true,
      isPopular: false,
      displayOrder: 1,
      features: [
        "pos.billing",
        "pos.table_management",
        "pos.basic_kot",
        "pos.receipt_printing",
        "pos.offline_mode",
        "analytics.basic",
      ],
      limits: {
        maxDailyBills: 300,
        maxMenuItems: 150,
      },
    },
    {
      slug: "growth",
      name: "Growth Restaurant",
      description: "Designed for busy dine-in restaurants needing real-time kitchen display and inventory costing.",
      monthlyPrice: 1599,
      annualPrice: 12999,
      currency: "INR",
      includedOutlets: 1,
      includedUsers: 10,
      extraOutletPrice: 2999,
      supportTier: "Priority Chat & Phone Support",
      trialDays: 14,
      isPublic: true,
      isPopular: true,
      displayOrder: 2,
      features: [
        "pos.billing",
        "pos.table_management",
        "pos.basic_kot",
        "pos.kds",
        "pos.receipt_customization",
        "pos.offline_mode",
        "inventory.management",
        "inventory.recipe_costing",
        "staff.attendance",
        "crm.customers",
        "analytics.basic",
        "analytics.advanced",
      ],
      limits: {
        maxDailyBills: 1500,
        maxMenuItems: 500,
      },
    },
    {
      slug: "pro",
      name: "Pro Multi-Outlet Chain",
      description: "For expanding restaurant brands and multi-location franchises requiring central controls.",
      monthlyPrice: 2999,
      annualPrice: 24999,
      currency: "INR",
      includedOutlets: 3,
      includedUsers: 30,
      extraOutletPrice: 2499,
      supportTier: "24/7 Dedicated Account Manager",
      trialDays: 14,
      isPublic: true,
      isPopular: false,
      displayOrder: 3,
      features: [
        "pos.billing",
        "pos.table_management",
        "pos.basic_kot",
        "pos.kds",
        "pos.receipt_customization",
        "pos.offline_mode",
        "inventory.management",
        "inventory.recipe_costing",
        "inventory.purchase_orders",
        "staff.attendance",
        "staff.payroll",
        "crm.customers",
        "crm.campaigns",
        "analytics.basic",
        "analytics.advanced",
        "organization.multi_outlet",
        "organization.central_menu",
      ],
      limits: {
        maxDailyBills: 10000,
        maxMenuItems: 2000,
      },
    },
    {
      slug: "enterprise",
      name: "Enterprise Brand & Franchise",
      description: "Bespoke platform deployment for major food chains with unlimited outlets and custom integrations.",
      monthlyPrice: 5999,
      annualPrice: 49999,
      currency: "INR",
      includedOutlets: 10,
      includedUsers: 100,
      extraOutletPrice: 1999,
      supportTier: "Executive SLA & Dedicated Architect",
      trialDays: 30,
      isPublic: true,
      isPopular: false,
      displayOrder: 4,
      features: [
        "pos.billing",
        "pos.table_management",
        "pos.basic_kot",
        "pos.kds",
        "pos.receipt_customization",
        "pos.offline_mode",
        "inventory.management",
        "inventory.recipe_costing",
        "inventory.purchase_orders",
        "staff.attendance",
        "staff.payroll",
        "crm.customers",
        "crm.campaigns",
        "analytics.basic",
        "analytics.advanced",
        "organization.multi_outlet",
        "organization.central_menu",
        "integrations.webhooks",
        "integrations.advanced",
      ],
    },
  ];

  for (const plan of defaultPlans) {
    await prisma.commercialPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        currency: plan.currency,
        includedOutlets: plan.includedOutlets,
        includedUsers: plan.includedUsers,
        supportTier: plan.supportTier,
        features: plan.features,
        isPublic: plan.isPublic,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
      },
      create: plan,
    });
    console.log(`✓ Plan synced: ${plan.name} (${plan.slug})`);
  }

  // Seed Founding 10 Promotion
  const foundingCoupon = await prisma.coupon.upsert({
    where: { code: "FOUNDING10" },
    update: {
      description: "Founding Partner Offer: 1 Full Year 100% Free Subscription (Strictly Limited to 10 Restaurants)",
      maxRedemptions: 10,
      discountType: "FREE_YEAR",
      discountValue: 100,
      campaignTag: "FOUNDING_10",
      onePerOrganization: true,
      isActive: true,
    },
    create: {
      code: "FOUNDING10",
      description: "Founding Partner Offer: 1 Full Year 100% Free Subscription (Strictly Limited to 10 Restaurants)",
      discountType: "FREE_YEAR",
      discountValue: 100,
      maxRedemptions: 10,
      currentRedemptions: 0,
      campaignTag: "FOUNDING_10",
      onePerOrganization: true,
      isActive: true,
    },
  });
  console.log(`✓ Founding Campaign Coupon Synced: ${foundingCoupon.code} (Capacity: ${foundingCoupon.maxRedemptions})`);

  console.log("✨ Seed completed successfully.");
}

// Allow running standalone via tsx
if (process.argv[1]?.endsWith("seed-saas-plans.ts")) {
  seedSaaSCommercialPlans()
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
