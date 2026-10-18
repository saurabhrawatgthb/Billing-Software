/**
 * Thermal Printer Hardware Port Analyzer & Detector
 * Inspects Web Serial API & WebUSB API connected ports
 * to identify USB / COM thermal receipt printers and configurations.
 */

export interface DetectedPrinterInfo {
  type: "SERIAL" | "USB" | "NETWORK";
  portName?: string;
  vendorId?: string;
  productId?: string;
  manufacturer?: string;
  deviceName: string;
  recommendedBaudRate?: number;
  status: "CONNECTED" | "READY" | "DISCONNECTED";
}

// Common POS Thermal Printer Vendor IDs
const KNOWN_POS_VENDORS: Record<string, string> = {
  "04b8": "Epson POS Printer",
  "0fe6": "Xprinter / HPRT Thermal Printer",
  "0416": "Winbond / POS58 POS80 ESC-POS Printer",
  "1fc9": "NXP POS Thermal Controller",
  "0525": "Prolific PL2303 Serial POS Printer",
  "1a86": "WCH CH340 USB-Serial Thermal POS",
  "10c4": "Silicon Labs CP210x POS Controller",
  "0403": "FTDI USB POS Receipt Printer",
  "20d1": "Citizen Thermal POS Printer",
  "0519": "Star Micronics Thermal Printer",
  "0dd4": "Custom Engineering Thermal Printer",
  "28e9": "Gprinter Thermal POS",
  "154f": "SNBC / Orient Thermal Receipt Printer",
};

/**
 * Scan & Request Connected Serial / COM Port for Thermal Printers
 */
export async function detectSerialPrinter(): Promise<DetectedPrinterInfo> {
  if (typeof window === "undefined" || !("serial" in navigator)) {
    throw new Error("Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.");
  }

  try {
    // Request port access from user
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    const info = port.getInfo();

    const vendorHex = info.usbVendorId ? info.usbVendorId.toString(16).padStart(4, "0").toLowerCase() : "";
    const productHex = info.usbProductId ? info.usbProductId.toString(16).padStart(4, "0").toLowerCase() : "";
    const vendorName = KNOWN_POS_VENDORS[vendorHex] || "Generic Thermal POS Printer";

    const detected: DetectedPrinterInfo = {
      type: "SERIAL",
      vendorId: vendorHex ? `0x${vendorHex}` : undefined,
      productId: productHex ? `0x${productHex}` : undefined,
      manufacturer: vendorName,
      deviceName: `${vendorName} (Vendor: 0x${vendorHex || "USB"}, Product: 0x${productHex || "POS"})`,
      recommendedBaudRate: 9600,
      status: "CONNECTED",
    };

    // Save detected device to localStorage for fast re-use
    localStorage.setItem("pos_detected_printer", JSON.stringify(detected));
    return detected;
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      throw new Error("No COM or USB printer port was selected.");
    }
    throw err;
  }
}

/**
 * Scan & Request Connected USB Device for Thermal Printers
 */
export async function detectUsbPrinter(): Promise<DetectedPrinterInfo> {
  if (typeof window === "undefined" || !("usb" in navigator)) {
    throw new Error("WebUSB API is not supported in this browser. Please use Chrome, Edge, or Opera.");
  }

  try {
    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [] });

    const vendorHex = device.vendorId ? device.vendorId.toString(16).padStart(4, "0").toLowerCase() : "";
    const productHex = device.productId ? device.productId.toString(16).padStart(4, "0").toLowerCase() : "";
    const vendorName = KNOWN_POS_VENDORS[vendorHex] || device.manufacturerName || "USB Thermal POS Printer";

    const detected: DetectedPrinterInfo = {
      type: "USB",
      vendorId: `0x${vendorHex}`,
      productId: `0x${productHex}`,
      manufacturer: device.manufacturerName || vendorName,
      deviceName: `${device.productName || vendorName} (0x${vendorHex}:0x${productHex})`,
      status: "CONNECTED",
    };

    localStorage.setItem("pos_detected_printer", JSON.stringify(detected));
    return detected;
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      throw new Error("No USB printer device was selected.");
    }
    throw err;
  }
}

/**
 * Retrieve last detected printer configuration from storage
 */
export function getLastDetectedPrinter(): DetectedPrinterInfo | null {
  try {
    const saved = localStorage.getItem("pos_detected_printer");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
