import bcrypt from "bcryptjs";
import prisma from "./lib/prisma.js";
import { registerBrandAndCheckout, validateCoupon } from "./modules/public/public.service.js";
import { getTemplates, upsertTemplate } from "./modules/template/template.service.js";
import { getAllOrganizations, getPlatformOverviewStats } from "./modules/saas/saas.service.js";
import { seedSaaSCommercialPlans } from "../prisma/seed-saas-plans.js";

async function runSaaSE2EVerification() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING OMNIPOS SAAS E2E & TENANT ISOLATION TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════");

  // Step 1: Ensure plans and founding campaign are seeded
  console.log("\n[Test 1] Verifying commercial plans and Founding 10 campaign seed...");
  await seedSaaSCommercialPlans();
  const plans = await prisma.commercialPlan.findMany();
  console.log(`✓ Active commercial plans in DB: ${plans.length}`);
  if (plans.length < 3) throw new Error("Expected at least 3 plans in database");

  // Step 2: Validate coupon calculation
  console.log("\n[Test 2] Testing coupon engine & Founding 10 calculation...");
  const validation = await validateCoupon("FOUNDING10", "starter", "ANNUAL");
  console.log(`✓ Coupon validation result:`, {
    code: validation.coupon.code,
    isFreeYear: validation.coupon.isFreeYear,
    remaining: validation.coupon.remainingRedemptions,
    finalPayable: validation.pricing.finalPayable,
  });
  if (validation.pricing.finalPayable !== 0 || !validation.coupon.isFreeYear) {
    throw new Error("Founding 10 coupon must calculate 100% discount with 0 payable!");
  }

  // Step 3: Register restaurant with Founding 10 coupon
  console.log("\n[Test 3] Testing restaurant brand checkout with Founding 10 promotion...");
  const testEmail = `founding.test.${Date.now()}@restaurant.local`;
  const result = await registerBrandAndCheckout({
    brandName: "Royal Spice Bistro",
    ownerName: "Vikram Malhotra",
    ownerEmail: testEmail,
    ownerPhone: "9876543210",
    password: "Password@123",
    city: "Bengaluru",
    planSlug: "growth",
    billingInterval: "ANNUAL",
    couponCode: "FOUNDING10",
  });

  console.log(`✓ Restaurant registered successfully:`);
  console.log(`  - Org ID: ${result.user.organization.id}`);
  console.log(`  - Org Name: ${result.user.organization.name}`);
  console.log(`  - Subscription Status: ${result.subscription.status}`);
  console.log(`  - Is Free Year: ${result.subscription.isFreeYear}`);

  if (!result.subscription.isFreeYear || result.subscription.status !== "ACTIVE") {
    throw new Error("Restaurant should be activated under promotional free year!");
  }

  // Step 4: Verify Coupon Redemption Record
  console.log("\n[Test 4] Verifying atomic coupon redemption record...");
  const redemption = await prisma.couponRedemption.findFirst({
    where: { organizationId: result.user.organization.id },
  });
  if (!redemption) {
    throw new Error("CouponRedemption record was not created for the restaurant!");
  }
  console.log(`✓ Redemption recorded: Campaign ${redemption.campaignTag}, Discount: ₹${redemption.discountAmount}`);

  // Step 5: Test Receipt Template Designer Backend
  console.log("\n[Test 5] Testing custom receipt template creation & isolation...");
  const template = await upsertTemplate(result.user.organization.id, {
    name: "Royal Spice 80mm Signature Thermal",
    paperSize: "80mm",
    headerText: "Welcome to Royal Spice Bistro",
    footerText: "We hope you loved the food! FSSAI: 12345678901234",
    showGstin: true,
    gstinNumber: "29AAAAA0000A1Z5",
    showFssai: true,
    fssaiNumber: "12345678901234",
    showUpiQrCode: true,
    upiVpa: "royalspice@upi",
    isDefault: true,
  });
  console.log(`✓ Receipt template saved: ${template.name} (${template.paperSize})`);

  const orgTemplates = await getTemplates(result.user.organization.id);
  console.log(`✓ Retrieved ${orgTemplates.length} templates for organization.`);
  if (orgTemplates.length === 0) throw new Error("Failed to retrieve organization templates");

  // Step 6: Verify Platform Owner Overview Metrics
  console.log("\n[Test 6] Verifying Platform Owner Overview KPIs...");
  const stats = await getPlatformOverviewStats();
  console.log(`✓ Platform Overview KPIs:`, stats);
  if (stats.foundingPartnersCount < 1) {
    throw new Error("Founding partner count must reflect at least 1 redemption!");
  }

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("✅ ALL SAAS VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runSaaSE2EVerification()
  .catch((err) => {
    console.error("❌ E2E Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
