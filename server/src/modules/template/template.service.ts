import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";

export async function getTemplates(organizationId: string) {
  return await prisma.billTemplate.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDefaultTemplate(organizationId: string) {
  const defaultTmpl = await prisma.billTemplate.findFirst({
    where: { organizationId, isDefault: true },
  });

  if (defaultTmpl) return defaultTmpl;

  // Fallback to any template or create default
  const anyTmpl = await prisma.billTemplate.findFirst({
    where: { organizationId },
  });

  if (anyTmpl) return anyTmpl;

  // Auto-generate default 80mm template
  return await prisma.billTemplate.create({
    data: {
      organizationId,
      name: "Standard 80mm Thermal Receipt",
      paperSize: "80mm",
      showLogo: true,
      headerText: "Welcome!",
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
}

export async function upsertTemplate(
  organizationId: string,
  data: {
    id?: string;
    name: string;
    paperSize?: string;
    showLogo?: boolean;
    logoUrl?: string | null;
    headerText?: string | null;
    footerText?: string | null;
    showGstin?: boolean;
    gstinNumber?: string | null;
    showFssai?: boolean;
    fssaiNumber?: string | null;
    showCustomerInfo?: boolean;
    showCashierName?: boolean;
    showTableNumber?: boolean;
    showItemCode?: boolean;
    showBarcode?: boolean;
    showUpiQrCode?: boolean;
    upiVpa?: string | null;
    upiPayeeName?: string | null;
    fontScale?: string;
    isDefault?: boolean;
  }
) {
  if (data.isDefault) {
    // Unset existing defaults
    await prisma.billTemplate.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  if (data.id) {
    const existing = await prisma.billTemplate.findUnique({
      where: { id: data.id },
    });
    if (!existing || existing.organizationId !== organizationId) {
      throw new AppError("Receipt template not found or unauthorized", 404);
    }

    return await prisma.billTemplate.update({
      where: { id: data.id },
      data: {
        name: data.name,
        paperSize: data.paperSize || "80mm",
        showLogo: data.showLogo !== undefined ? data.showLogo : true,
        logoUrl: data.logoUrl,
        headerText: data.headerText,
        footerText: data.footerText,
        showGstin: data.showGstin !== undefined ? data.showGstin : true,
        gstinNumber: data.gstinNumber,
        showFssai: data.showFssai !== undefined ? data.showFssai : true,
        fssaiNumber: data.fssaiNumber,
        showCustomerInfo: data.showCustomerInfo !== undefined ? data.showCustomerInfo : true,
        showCashierName: data.showCashierName !== undefined ? data.showCashierName : true,
        showTableNumber: data.showTableNumber !== undefined ? data.showTableNumber : true,
        showItemCode: data.showItemCode !== undefined ? data.showItemCode : false,
        showBarcode: data.showBarcode !== undefined ? data.showBarcode : false,
        showUpiQrCode: data.showUpiQrCode !== undefined ? data.showUpiQrCode : true,
        upiVpa: data.upiVpa,
        upiPayeeName: data.upiPayeeName,
        fontScale: data.fontScale || "normal",
        isDefault: data.isDefault !== undefined ? data.isDefault : false,
      },
    });
  }

  return await prisma.billTemplate.create({
    data: {
      organizationId,
      name: data.name,
      paperSize: data.paperSize || "80mm",
      showLogo: data.showLogo !== undefined ? data.showLogo : true,
      logoUrl: data.logoUrl,
      headerText: data.headerText,
      footerText: data.footerText,
      showGstin: data.showGstin !== undefined ? data.showGstin : true,
      gstinNumber: data.gstinNumber,
      showFssai: data.showFssai !== undefined ? data.showFssai : true,
      fssaiNumber: data.fssaiNumber,
      showCustomerInfo: data.showCustomerInfo !== undefined ? data.showCustomerInfo : true,
      showCashierName: data.showCashierName !== undefined ? data.showCashierName : true,
      showTableNumber: data.showTableNumber !== undefined ? data.showTableNumber : true,
      showItemCode: data.showItemCode !== undefined ? data.showItemCode : false,
      showBarcode: data.showBarcode !== undefined ? data.showBarcode : false,
      showUpiQrCode: data.showUpiQrCode !== undefined ? data.showUpiQrCode : true,
      upiVpa: data.upiVpa,
      upiPayeeName: data.upiPayeeName,
      fontScale: data.fontScale || "normal",
      isDefault: data.isDefault !== undefined ? data.isDefault : true,
    },
  });
}
