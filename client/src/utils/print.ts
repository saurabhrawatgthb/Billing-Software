/**
 * Direct Thermal Receipt & KOT Printing Utility
 * Sends raw text, Madrasi Dosa brand logo, and Kitchen Order Tickets (KOT)
 * directly to the system/browser print spooler formatted for 58mm (2-inch) or 80mm (3-inch)
 * thermal POS printers with zero latency and robust browser spooling.
 */

export type ThermalPaperSize = "58mm" | "80mm";

const PAPER_STORAGE_KEY = "pos_thermal_paper_size";

export function getSavedPaperSize(): ThermalPaperSize {
  if (typeof window === "undefined") return "80mm";
  const saved = localStorage.getItem(PAPER_STORAGE_KEY);
  return saved === "58mm" ? "58mm" : "80mm";
}

export function setSavedPaperSize(size: ThermalPaperSize): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAPER_STORAGE_KEY, size);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Mathematically centers a single line of text within a fixed column width (default 32 chars).
 * If the string exceeds the width (e.g. lengthy branch addresses or unspaced tokens),
 * it iteratively word-wraps, splits oversized words, and centers each sub-line with zero recursion.
 */
export function centerLine(text: string, width = 32): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (width <= 0) return trimmed;

  // If text contains newline characters, center each line independently
  if (trimmed.includes("\n")) {
    return trimmed
      .split("\n")
      .map((line) => centerLine(line, width))
      .join("\n");
  }

  // If text fits completely within width, pad symmetrically
  if (trimmed.length <= width) {
    const totalPad = width - trimmed.length;
    const leftPad = Math.floor(totalPad / 2);
    return " ".repeat(leftPad) + trimmed;
  }

  // Word wrap iteratively (zero recursion to prevent call stack overflow on long words/addresses)
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let word of words) {
    // If a single word or unspaced token is longer than width, chunk it
    while (word.length > width) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }

    if (!word) continue;

    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= width) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Center each wrapped line
  return lines
    .map((l) => {
      const pad = Math.max(0, width - l.length);
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + l;
    })
    .join("\n");
}

export const MADRASI_DOSA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 140" width="100%">
  <defs>
    <style>
      .brand-title { font-family: 'Arial Black', Impact, 'Segoe UI', system-ui, sans-serif; font-size: 26px; font-weight: 900; letter-spacing: 2.5px; fill: #000; text-anchor: middle; }
      .brand-sub { font-family: 'Nirmala UI', 'Segoe UI', 'Courier New', Courier, monospace, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; fill: #000; text-anchor: middle; }
      .brand-badge { font-family: Arial, sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: 1.5px; fill: #000; text-anchor: middle; }
    </style>
  </defs>
  <line x1="20" y1="12" x2="130" y2="12" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="145" cy="12" r="2.5" fill="#000"/>
  <polygon points="170,7 172.5,12 178,12 173.5,15.5 175.5,21 170,17.5 164.5,21 166.5,15.5 162,12 167.5,12" fill="#000"/>
  <circle cx="195" cy="12" r="2.5" fill="#000"/>
  <line x1="210" y1="12" x2="320" y2="12" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  <g transform="translate(170, 48)">
    <path d="M-85,14 Q-40,6 0,6 Q40,6 85,14 Q50,22 0,22 Q-50,22 -85,14 Z" fill="#000000"/>
    <line x1="-80" y1="14" x2="80" y2="14" stroke="#ffffff" stroke-width="1" stroke-dasharray="3,2"/>
    <ellipse cx="-60" cy="5" rx="14" ry="7" fill="#000000"/>
    <ellipse cx="-60" cy="4" rx="12" ry="5.5" fill="#ffffff" stroke="#000000" stroke-width="1"/>
    <circle cx="-60" cy="4" r="2" fill="#000000"/>
    <ellipse cx="60" cy="5" rx="14" ry="7" fill="#000000"/>
    <ellipse cx="60" cy="4" rx="12" ry="5.5" fill="#ffffff" stroke="#000000" stroke-width="1"/>
    <circle cx="60" cy="4" r="2" fill="#000000"/>
    <path d="M-65,3 C-65,-10 65,-10 65,3 C65,11 -65,11 -65,3 Z" fill="#000000"/>
    <path d="M-63,2 C-63,-8 63,-8 63,2 C63,9 -63,9 -63,2 Z" fill="#ffffff" stroke="#000000" stroke-width="2.2"/>
    <path d="M-45,-4 Q-43,3 -45,7" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
    <path d="M-25,-6 Q-23,2 -25,8" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-5,-7 Q-3,1 -5,8" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M15,-6 Q17,2 15,8" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M35,-4 Q37,3 35,7" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="61" cy="2.5" rx="4" ry="6" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
    <ellipse cx="61" cy="2.5" rx="1.8" ry="3" fill="#000000"/>
    <path d="M-20,-12 Q-17,-19 -22,-24 Q-27,-29 -22,-34" fill="none" stroke="#000000" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M0,-13 Q4,-20 -1,-26 Q-6,-32 0,-38" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20,-12 Q23,-19 18,-24 Q13,-29 18,-34" fill="none" stroke="#000000" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <text x="170" y="102" class="brand-title">MADRASI DOSA</text>
  <text x="170" y="118" class="brand-sub">मद्रासी डोसा • AUTHENTIC TASTE</text>
  <line x1="20" y1="128" x2="135" y2="128" stroke="#000" stroke-width="1.5"/>
  <circle cx="145" cy="128" r="2" fill="#000"/>
  <text x="170" y="131" class="brand-badge">ESTD 2024</text>
  <circle cx="195" cy="128" r="2" fill="#000"/>
  <line x1="205" y1="128" x2="320" y2="128" stroke="#000" stroke-width="1.5"/>
</svg>`;

export interface PrintReceiptOptions {
  title?: string;
  paperSize?: ThermalPaperSize;
  logoUrl?: string | null;
  showLogo?: boolean;
}

export interface BuildReceiptItem {
  name: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

export interface BuildReceiptParams {
  brandName?: string;
  franchiseName?: string;
  franchiseAddress?: string;
  franchisePhone?: string;
  gstin?: string;
  fssaiNumber?: string;
  invoiceNumber: string;
  orderNumber?: string;
  orderType?: string;
  date?: string;
  items: BuildReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  currencySymbol?: string;
  payments: Array<{
    method: string;
    amount: number;
    status?: string;
  }>;
  instagramId?: string;
  footerMessage?: string;
}

export interface BuildKOTItem {
  name: string;
  quantity: number;
  selectedSize?: string | null;
  notes?: string | null;
}

export interface BuildKOTParams {
  tableNumber?: string | number | null;
  orderNumber?: string;
  orderType?: string;
  date?: string;
  items: BuildKOTItem[];
  instructions?: string | null;
}

/**
 * Builds minimal, clean KOT raw text containing strictly Table Number and Items (with Quantities & Notes).
 * NO prices, NO subtotal, NO tax, NO payments.
 */
export function buildKOTReceiptText(data: BuildKOTParams, _paperSize: ThermalPaperSize = "80mm"): string {
  const divider = "================================";
  const thinDivider = "--------------------------------";
  const lines: string[] = [];

  lines.push(divider);
  lines.push(centerLine("किचन ऑर्डर टिकट • KOT", 32));
  lines.push(divider);

  const tableLabel = data.tableNumber
    ? `मेज / TABLE: ${String(data.tableNumber).toUpperCase().startsWith("TABLE") ? data.tableNumber : `Table ${data.tableNumber}`}`
    : `पार्सल / ORDER: ${data.orderType || "TAKEAWAY / COUNTER"}`;
  lines.push(tableLabel);

  if (data.orderNumber) {
    lines.push(`टोकन / Token: ${data.orderNumber}`);
  }
  lines.push(`समय / Time  : ${data.date || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  lines.push(thinDivider);
  lines.push("व्यंजन / Item                Qty");
  lines.push(thinDivider);

  for (const item of data.items) {
    const displayName = item.selectedSize ? `${item.name} (${item.selectedSize})` : item.name;
    const qtyStr = String(item.quantity).padStart(3, " ");

    if (displayName.length > 28) {
      lines.push(displayName);
      lines.push(`${"".padEnd(28, " ")} ${qtyStr}`);
    } else {
      lines.push(`${displayName.padEnd(28, " ")} ${qtyStr}`);
    }

    if (item.notes && item.notes.trim()) {
      lines.push(`  * Note: ${item.notes.trim()}`);
    }
  }

  if (data.instructions && data.instructions.trim()) {
    lines.push(thinDivider);
    lines.push(`निर्देश: ${data.instructions.trim()}`);
  }

  lines.push(divider);
  lines.push(centerLine("*** रसोई प्रति • KITCHEN COPY ***", 32));
  lines.push(divider);

  return lines.join("\n");
}

/**
 * Builds formatted thermal receipt raw text locally on the client with zero network latency.
 * All header items (Brand name, Franchise name, Address, Phone, GSTIN) and Footer are strictly center-aligned.
 * Includes authentic Hindi greetings and labels, and Instagram handle.
 */
export function buildThermalReceiptText(data: BuildReceiptParams, _paperSize: ThermalPaperSize = "80mm"): string {
  const currSym = data.currencySymbol || "₹";
  const brandName = (data.brandName || "MADRASI DOSA").trim().toUpperCase();
  const franchiseName = (data.franchiseName || "").trim().toUpperCase();
  const divider = "================================";
  const thinDivider = "--------------------------------";

  const lines: string[] = [];
  lines.push(divider);
  lines.push(centerLine("|| श्री गणेशाय नमः ||", 32));
  lines.push(centerLine(brandName, 32));
  lines.push(centerLine("मद्रासी डोसा • असली दक्षिण भारतीय स्वाद", 32));

  if (franchiseName) {
    const branchLabel = franchiseName.startsWith("---") ? franchiseName : `--- ${franchiseName} ---`;
    lines.push(centerLine(branchLabel, 32));
  }
  if (data.franchiseAddress) {
    lines.push(centerLine(data.franchiseAddress, 32));
  }
  if (data.franchisePhone) {
    lines.push(centerLine(`दूरभाष / Phone: ${data.franchisePhone.trim()}`, 32));
  }
  if (data.gstin) {
    lines.push(centerLine(`GSTIN: ${data.gstin.trim()}`, 32));
  }
  if (data.fssaiNumber) {
    lines.push(centerLine(`FSSAI: ${data.fssaiNumber.trim()}`, 32));
  }
  lines.push(divider);
  lines.push(`बिल / Tax Invoice: ${data.invoiceNumber}`);
  if (data.orderNumber) {
    lines.push(`आर्डर / Order   : ${data.orderNumber}`);
  }
  const typeStr = data.orderType || "Takeaway";
  const isDineIn = typeStr.toLowerCase().includes("dine") || typeStr.toLowerCase().includes("table");
  const hindiType = isDineIn ? `डाइन-इन / ${typeStr}` : `पार्सल / ${typeStr}`;
  lines.push(hindiType);
  lines.push(`दिनांक / Date   : ${data.date || new Date().toLocaleString()}`);
  lines.push(thinDivider);
  lines.push("व्यंजन / Item    मात्रा/Qty   मूल्य");
  lines.push(thinDivider);

  for (const item of data.items) {
    const itemTotal = item.totalPrice !== undefined ? item.totalPrice : item.price * item.quantity;
    const qty = String(item.quantity).padStart(3, " ");
    const price = `${currSym}${itemTotal.toFixed(2)}`.padStart(11, " ");
    if (item.name.length > 16) {
      lines.push(item.name);
      lines.push(`${"".padEnd(16, " ")} ${qty} ${price}`);
    } else {
      const name = item.name.padEnd(16, " ");
      lines.push(`${name} ${qty} ${price}`);
    }
  }

  lines.push(thinDivider);
  lines.push(`उपयोग / Subtotal:     ${currSym}${data.subtotal.toFixed(2)}`);
  if (data.discount && data.discount > 0) {
    lines.push(`छूट / Discount:      -${currSym}${data.discount.toFixed(2)}`);
  }
  lines.push(`कर / Tax (GST):       ${currSym}${(data.tax || 0).toFixed(2)}`);
  lines.push(divider);
  lines.push(`कुल देय / TOTAL:      ${currSym}${data.total.toFixed(2)}`);
  lines.push(divider);
  lines.push("भुगतान विवरण / PAYMENTS:");
  for (const p of data.payments) {
    const pMethodUpper = (p.method || "").toUpperCase();
    const methodHindi = pMethodUpper.includes("CASH")
      ? "नकद / CASH"
      : pMethodUpper.includes("UPI")
      ? "यूपीआई / UPI"
      : pMethodUpper.includes("CARD")
      ? "कार्ड / CARD"
      : p.method;
    lines.push(`  ${methodHindi.padEnd(14, " ")}: ${currSym}${p.amount.toFixed(2)} [${p.status || "COMPLETED"}]`);
  }
  lines.push(thinDivider);
  lines.push(centerLine("धन्यवाद! पुनः पधारें", 32));
  lines.push(centerLine(data.footerMessage || "Thank You! Please Visit Again", 32));

  // Instagram Handle
  const rawInsta = (data.instagramId || "madrasidosaoffical").replace(/^@/, "");
  lines.push(centerLine("Follow Us On Instagram:", 32));
  lines.push(centerLine(`📸 @${rawInsta}`, 32));
  lines.push(divider);

  return lines.join("\n");
}

function parseReceiptSections(text: string) {
  const rawLines = text.split("\n");
  let firstDiv = -1;
  let secondDiv = -1;
  let lastDiv = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim();
    if (/^[=\-]{16,}$/.test(t)) {
      if (firstDiv === -1) {
        firstDiv = i;
      } else if (secondDiv === -1) {
        secondDiv = i;
      }
      lastDiv = i;
    }
  }

  if (firstDiv !== -1 && secondDiv > firstDiv) {
    const headerLines = rawLines.slice(firstDiv + 1, secondDiv).map((l) => l.trim()).filter(Boolean);
    const bodyLines = rawLines.slice(secondDiv + 1, lastDiv > secondDiv ? lastDiv : undefined);
    const footerLines = lastDiv > secondDiv ? rawLines.slice(lastDiv + 1).map((l) => l.trim()).filter(Boolean) : [];

    return {
      hasStructure: true,
      topDivider: rawLines[firstDiv],
      headerLines,
      midDivider: rawLines[secondDiv],
      bodyLines,
      bottomDivider: lastDiv > secondDiv ? rawLines[lastDiv] : "--------------------------------",
      footerLines,
    };
  }

  return {
    hasStructure: false,
    rawText: text,
  };
}

/**
 * Formats body lines into styled HTML elements:
 * - Items header and item rows (Item Name, Qty, Price) are rendered BOLD (font-weight: 800)
 * - Grand TOTAL line is rendered EXTRA BOLD (font-weight: 900) and slightly larger
 * - Metadata and summary rows have clean proportional sizing
 * - Supports authentic Hindi/English bilingual receipt formatting
 */
function formatReceiptBodyHtml(bodyLines: string[]): string {
  let inItemsTable = false;

  return bodyLines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      if (/^(Item\s+Qty\s+Price|व्यंजन\s*\/)/i.test(trimmed)) {
        inItemsTable = true;
        return `<div class="receipt-items-header">${escapeHtml(line)}</div>`;
      }

      if (inItemsTable) {
        if (/^[=\-]{16,}$/.test(trimmed)) {
          inItemsTable = false;
          return `<div class="receipt-divider-line">${escapeHtml(line)}</div>`;
        }
        return `<div class="receipt-item-row">${escapeHtml(line)}</div>`;
      }

      if (/^(TOTAL:|कुल\s*देय)/i.test(trimmed)) {
        return `<div class="receipt-total-row">${escapeHtml(line)}</div>`;
      }

      if (/^(Subtotal|Tax|Discount|उपयोग|उप-योग|छूट|कर):/i.test(trimmed)) {
        return `<div class="receipt-summary-row">${escapeHtml(line)}</div>`;
      }

      if (/^[=\-]{16,}$/.test(trimmed)) {
        return `<div class="receipt-divider-line">${escapeHtml(line)}</div>`;
      }

      if (/^(Invoice|Order|Date|Dine-In|Takeaway|Table|बिल|आर्डर|दिनांक|डाइन-इन|पार्सल|मेज)/i.test(trimmed)) {
        return `<div class="receipt-meta-row">${escapeHtml(line)}</div>`;
      }

      if (/^(भुगतान|PAYMENTS|नकद|यूपीआई|कार्ड)/i.test(trimmed)) {
        return `<div class="receipt-summary-row">${escapeHtml(line)}</div>`;
      }

      return `<div class="receipt-default-row">${escapeHtml(line)}</div>`;
    })
    .join("");
}

/**
 * Formats KOT items into a bold, high-contrast slip for the kitchen.
 */
function formatKOTBodyHtml(kotData: BuildKOTParams, _is58mm?: boolean): string {
  const tableStr = kotData.tableNumber
    ? String(kotData.tableNumber).toUpperCase().startsWith("TABLE") || String(kotData.tableNumber).startsWith("मेज")
      ? String(kotData.tableNumber)
      : `मेज / TABLE ${kotData.tableNumber}`
    : `पार्सल / ${(kotData.orderType || "TAKEAWAY / COUNTER").toUpperCase()}`;

  const itemsHtml = kotData.items
    .map((item) => {
      const displayName = item.selectedSize ? `${item.name} (${item.selectedSize})` : item.name;
      return `
        <div class="kot-item-row">
          <span class="kot-item-name">${escapeHtml(displayName)}</span>
          <span class="kot-item-qty">x${escapeHtml(String(item.quantity))}</span>
        </div>
        ${item.notes && item.notes.trim() ? `<div class="kot-item-notes">↳ * ${escapeHtml(item.notes.trim())}</div>` : ""}
      `;
    })
    .join("");

  return `
    <div class="kot-container">
      <div class="kot-header-badge">किचन ऑर्डर टिकट • KITCHEN TICKET (KOT)</div>
      <div class="kot-table-banner">${escapeHtml(tableStr)}</div>
      <div class="kot-meta-row">
        ${kotData.orderNumber ? `<span>टोकन/Token: ${escapeHtml(kotData.orderNumber)}</span>` : ""}
        <span>समय/Time: ${escapeHtml(kotData.date || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</span>
      </div>
      <div class="kot-divider">================================</div>
      <div class="kot-table-head">
        <span>व्यंजन (ITEM)</span>
        <span>मात्रा (QTY)</span>
      </div>
      <div class="kot-divider">--------------------------------</div>
      <div class="kot-items-list">
        ${itemsHtml}
      </div>
      ${
        kotData.instructions && kotData.instructions.trim()
          ? `<div class="kot-divider">--------------------------------</div>
             <div class="kot-special-note">विशेष निर्देश / Special: ${escapeHtml(kotData.instructions.trim())}</div>`
          : ""
      }
      <div class="kot-divider">================================</div>
      <div class="kot-footer">*** रसोई प्रति • KITCHEN COPY ***</div>
    </div>
  `;
}

/**
 * Shared printer styles generator for consistent 58mm / 80mm roll layout
 */
function getThermalPrinterStyles(rollWidth: string, contentWidth: string, is58mm: boolean, lineHeight: string): string {
  return `
    @page {
      size: ${rollWidth} auto;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${rollWidth} !important;
        max-width: ${rollWidth} !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .thermal-printable-wrapper {
        width: ${contentWidth} !important;
        max-width: ${contentWidth} !important;
        box-sizing: border-box;
        margin: 0 auto;
        padding: 0.5mm 0 1.5mm 0;
        text-align: center !important;
      }
      .kot-page-section {
        width: 100% !important;
        page-break-after: always;
        break-after: page;
        padding-bottom: 2mm;
      }
      .bill-page-section {
        width: 100% !important;
        page-break-before: always;
        break-before: page;
        padding-top: 1mm;
      }
      .tear-separator-block {
        text-align: center !important;
        margin: 4mm 0 !important;
        padding: 1.5mm 0 !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: ${is58mm ? "9px" : "11px"} !important;
        font-weight: 800 !important;
        letter-spacing: 0.5px !important;
        border-top: 1.5px dashed #000 !important;
        border-bottom: 1.5px dashed #000 !important;
      }
    }
    html, body {
      width: ${rollWidth};
      max-width: ${rollWidth};
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
    }
    .thermal-printable-wrapper {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      margin: 0 auto;
      padding: 0.5mm 0 1.5mm 0;
      text-align: center;
    }
    /* KOT Styling */
    .kot-container {
      width: 100%;
      text-align: center;
      margin: 0 auto;
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
    }
    .kot-header-badge {
      font-size: ${is58mm ? "10px" : "12px"};
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 0.5mm 0;
    }
    .kot-table-banner {
      font-size: ${is58mm ? "15px" : "18px"};
      font-weight: 900;
      letter-spacing: 1px;
      padding: 1.5mm 0;
      margin: 0.5mm 0;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
    }
    .kot-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "8.5px" : "10px"};
      font-weight: 700;
      padding: 1mm 0;
    }
    .kot-table-head {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "10px" : "12px"};
      font-weight: 900;
      padding: 0.5mm 0;
    }
    .kot-items-list {
      text-align: left;
    }
    .kot-item-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1mm 0;
      font-size: ${is58mm ? "11px" : "13.5px"};
      font-weight: 900;
      line-height: 1.25;
    }
    .kot-item-name {
      text-align: left;
      flex: 1;
      padding-right: 2mm;
      word-break: break-word;
    }
    .kot-item-qty {
      text-align: right;
      font-size: ${is58mm ? "13px" : "16px"};
      font-weight: 900;
    }
    .kot-item-notes {
      font-size: ${is58mm ? "9px" : "10.5px"};
      font-weight: 700;
      font-style: italic;
      padding-left: 2mm;
      padding-bottom: 0.5mm;
    }
    .kot-special-note {
      font-size: ${is58mm ? "9.5px" : "11px"};
      font-weight: 800;
      text-align: left;
      padding: 1mm 0;
    }
    .kot-divider {
      font-size: ${is58mm ? "8px" : "9.5px"};
      font-weight: 700;
      line-height: 1.1;
      white-space: pre;
    }
    .kot-footer {
      font-size: ${is58mm ? "9.5px" : "11px"};
      font-weight: 800;
      padding: 1mm 0;
    }
    .tear-separator-block {
      text-align: center;
      margin: 4mm 0;
      padding: 1.5mm 0;
      font-family: 'Nirmala UI', 'Segoe UI', 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "9px" : "11px"};
      font-weight: 800;
      letter-spacing: 0.5px;
      border-top: 1.5px dashed #000;
      border-bottom: 1.5px dashed #000;
    }
    /* Bill Styling */
    .receipt-logo-wrap {
      text-align: center;
      margin: 0 auto 0.5mm auto;
      padding: 0;
      display: block;
      width: 100%;
    }
    .receipt-logo-wrap svg,
    .receipt-logo-wrap img {
      width: ${is58mm ? "13mm" : "16mm"};
      max-width: ${is58mm ? "13mm" : "16mm"};
      height: auto;
      margin: 0 auto;
      display: block;
      filter: grayscale(100%) contrast(250%);
      -webkit-filter: grayscale(100%) contrast(250%);
    }
    .receipt-header-block {
      text-align: center;
      width: 100%;
      margin: 0 auto;
    }
    .receipt-header-line {
      text-align: center;
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "8px" : "9.5px"};
      line-height: 1.25;
      font-weight: 700;
      letter-spacing: -0.1px;
      word-break: break-word;
    }
    .receipt-divider {
      text-align: center;
      font-family: 'Nirmala UI', 'Segoe UI', 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "8px" : "9.5px"};
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.2px;
    }
    .thermal-receipt-body-wrap {
      text-align: center;
      width: 100%;
      margin: 0 auto;
    }
    .thermal-receipt-body {
      text-align: left;
      display: inline-block;
      margin: 0 auto;
    }
    .receipt-items-header {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "9.5px" : "11.5px"};
      font-weight: 800;
      line-height: ${lineHeight};
      white-space: pre;
      letter-spacing: -0.1px;
    }
    .receipt-item-row {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "9.5px" : "11.5px"};
      font-weight: 800;
      line-height: ${lineHeight};
      white-space: pre;
      letter-spacing: -0.1px;
    }
    .receipt-total-row {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "11px" : "13.5px"};
      font-weight: 900;
      line-height: 1.35;
      white-space: pre;
      letter-spacing: 0.1px;
    }
    .receipt-summary-row {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "9px" : "10.5px"};
      font-weight: 700;
      line-height: ${lineHeight};
      white-space: pre;
      letter-spacing: -0.1px;
    }
    .receipt-meta-row {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "8.5px" : "10px"};
      font-weight: 700;
      line-height: 1.25;
      white-space: pre;
      letter-spacing: -0.1px;
    }
    .receipt-divider-line {
      font-family: 'Nirmala UI', 'Segoe UI', 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "8.5px" : "10px"};
      font-weight: 700;
      line-height: 1.1;
      white-space: pre;
    }
    .receipt-default-row {
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "9px" : "10.5px"};
      font-weight: 600;
      line-height: ${lineHeight};
      white-space: pre;
      letter-spacing: -0.1px;
    }
    .receipt-footer-block {
      text-align: center;
      width: 100%;
      margin: 0.5mm auto 0 auto;
    }
    .receipt-footer-line {
      text-align: center;
      font-family: 'Nirmala UI', 'Segoe UI', 'Arial Unicode MS', Mangal, 'Courier New', Courier, monospace;
      font-size: ${is58mm ? "8.5px" : "10px"};
      line-height: 1.25;
      font-weight: 700;
      letter-spacing: -0.1px;
    }
  `;
}

/**
 * Dispatches an HTML document directly to the printer using an off-screen iframe.
 * Never sets visibility: hidden (which causes Chromium to suppress window.print()).
 * Accepts an optional onDone callback when printing completes (or times out).
 */
function dispatchDirectPrint(
  fullHtml: string,
  rollWidth: string,
  onDone?: () => void
): void {
  if (typeof window === "undefined") return;

  let hasNotified = false;
  const triggerDone = () => {
    if (!hasNotified) {
      hasNotified = true;
      if (onDone) {
        setTimeout(onDone, 300);
      }
    }
  };

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = rollWidth;
  iframe.style.height = "500mm";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const winFallback = window.open("", "_blank", "width=380,height=600");
    if (winFallback) {
      winFallback.document.write(fullHtml);
      winFallback.document.close();
      winFallback.focus();
      setTimeout(() => {
        try {
          winFallback.print();
        } catch {}
        triggerDone();
      }, 80);
    } else {
      triggerDone();
    }
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.addEventListener("afterprint", () => {
      triggerDone();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    });

    // Fallback if afterprint doesn't trigger within 60 seconds (prevents premature job overlapping)
    setTimeout(() => {
      triggerDone();
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 60000);

    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (err) {
        console.error("Direct thermal print error:", err);
        try {
          const winFallback = window.open("", "_blank", "width=380,height=600");
          if (winFallback) {
            winFallback.document.write(fullHtml);
            winFallback.document.close();
            winFallback.focus();
            winFallback.print();
          }
        } catch (fbErr) {
          console.error("Popup fallback print error:", fbErr);
        }
        triggerDone();
      }
    }, 70);
  } else {
    triggerDone();
  }
}

/**
 * Builds HTML for the Bill portion
 */
function buildBillHtml(
  rawText: string,
  showLogo: boolean,
  logoUrl?: string | null
): string {
  const cleanedText = rawText.replace(/\n{3,}$/, "\n").trimEnd();
  const parsed = parseReceiptSections(cleanedText);
  const lines = cleanedText.split("\n");

  const logoMarkup = showLogo
    ? logoUrl && logoUrl.trim()
      ? `<div class="receipt-logo-wrap"><img src="${escapeHtml(logoUrl.trim())}" alt="Madrasi Dosa Logo" /></div>`
      : `<div class="receipt-logo-wrap">${MADRASI_DOSA_LOGO_SVG}</div>`
    : "";

  let innerContentHtml = "";
  if (parsed.hasStructure && parsed.headerLines) {
    innerContentHtml = `
      <div class="receipt-header-block">
        <div class="receipt-divider">${escapeHtml(parsed.topDivider || "================================")}</div>
        ${parsed.headerLines.map((l) => `<div class="receipt-header-line">${escapeHtml(l)}</div>`).join("")}
        <div class="receipt-divider">${escapeHtml(parsed.midDivider || "================================")}</div>
      </div>
      <div class="thermal-receipt-body-wrap">
        <div class="thermal-receipt-body">${formatReceiptBodyHtml(parsed.bodyLines || [])}</div>
      </div>
      ${
        parsed.footerLines && parsed.footerLines.length > 0
          ? `
        <div class="receipt-footer-block">
          <div class="receipt-divider">${escapeHtml(parsed.bottomDivider || "--------------------------------")}</div>
          ${parsed.footerLines.map((l) => `<div class="receipt-footer-line">${escapeHtml(l)}</div>`).join("")}
        </div>`
          : ""
      }
    `;
  } else {
    innerContentHtml = `<div class="thermal-receipt-body-wrap"><div class="thermal-receipt-body">${formatReceiptBodyHtml(lines)}</div></div>`;
  }

  return `
    <div class="thermal-receipt-container">
      ${logoMarkup}
      ${innerContentHtml}
    </div>
  `;
}

/**
 * Direct thermal printer spooler for single receipt/bill
 */
export function printReceiptDirectly(
  rawText: string,
  titleOrOptions: string | PrintReceiptOptions = "Madrasi Dosa Bill Receipt",
  paperSizeOverride?: ThermalPaperSize,
  customLogoUrl?: string | null
): void {
  if (typeof window === "undefined" || !rawText) return;

  let title = "Madrasi Dosa Bill Receipt";
  let paperSize: ThermalPaperSize = getSavedPaperSize();
  let logoUrl: string | null = null;
  let showLogo = true;

  if (typeof titleOrOptions === "object" && titleOrOptions !== null) {
    if (titleOrOptions.title) title = titleOrOptions.title;
    if (titleOrOptions.paperSize) paperSize = titleOrOptions.paperSize;
    if (titleOrOptions.logoUrl !== undefined) logoUrl = titleOrOptions.logoUrl;
    if (titleOrOptions.showLogo !== undefined) showLogo = titleOrOptions.showLogo;
  } else {
    if (typeof titleOrOptions === "string") title = titleOrOptions;
    if (paperSizeOverride) paperSize = paperSizeOverride;
    if (customLogoUrl !== undefined) logoUrl = customLogoUrl;
  }

  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const contentWidth = is58mm ? "48mm" : "72mm";
  const lineHeight = is58mm ? "1.2" : "1.25";

  const printStyles = getThermalPrinterStyles(rollWidth, contentWidth, is58mm, lineHeight);
  const billHtml = buildBillHtml(rawText, showLogo, logoUrl);

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="thermal-printable-wrapper">
          ${billHtml}
        </div>
      </body>
    </html>
  `;

  dispatchDirectPrint(receiptHtml, rollWidth);
}

/**
 * Direct thermal printer spooler for standalone KOT
 */
export function printKOTDirectly(
  kotData: BuildKOTParams,
  options?: { paperSize?: ThermalPaperSize; title?: string }
): void {
  if (typeof window === "undefined") return;

  const paperSize: ThermalPaperSize = options?.paperSize || getSavedPaperSize();
  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const contentWidth = is58mm ? "48mm" : "72mm";
  const lineHeight = is58mm ? "1.2" : "1.25";

  const printStyles = getThermalPrinterStyles(rollWidth, contentWidth, is58mm, lineHeight);
  const kotHtml = formatKOTBodyHtml(kotData, is58mm);

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(options?.title || "Kitchen Order Ticket (KOT)")}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="thermal-printable-wrapper">
          ${kotHtml}
        </div>
      </body>
    </html>
  `;

  dispatchDirectPrint(fullHtml, rollWidth);
}

export interface PrintCombinedOptions {
  kotParams: BuildKOTParams;
  billParams: BuildReceiptParams;
  paperSize?: ThermalPaperSize;
  logoUrl?: string | null;
}

/**
/**
 * Spools KOT (Kitchen Order Ticket) and Customer Bill in a SINGLE print job
 * separated by a CSS page-break (`page-break-after: always; break-after: page;`).
 *
 * This ensures:
 * 1. The browser NEVER asks for printer, copies, or destination a second time (only 1 single print job is spooled).
 * 2. Thermal printers execute hardware auto-cut between Page 1 (KOT) and Page 2 (Bill).
 * 3. With Chrome/Edge `--kiosk-printing`, printing is 100% silent and instantaneous with zero dialogs.
 */
export function printKOTThenBillSequentially(options: PrintCombinedOptions): void {
  if (typeof window === "undefined") return;

  const paperSize: ThermalPaperSize = options.paperSize || getSavedPaperSize();
  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const contentWidth = is58mm ? "48mm" : "72mm";
  const lineHeight = is58mm ? "1.2" : "1.25";

  const printStyles = getThermalPrinterStyles(rollWidth, contentWidth, is58mm, lineHeight);

  // 1. Kitchen Order Ticket (KOT)
  const kotHtml = formatKOTBodyHtml(options.kotParams, is58mm);

  // 2. Customer Bill (Madrasi Dosa Branding, Invoice details, Totals)
  const billRawText = buildThermalReceiptText(options.billParams, paperSize);
  const billHtml = buildBillHtml(billRawText, true, options.logoUrl);

  const combinedDocHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>KOT & Invoice #${escapeHtml(options.billParams.invoiceNumber)}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="thermal-printable-wrapper">
          <div class="kot-page-section">
            ${kotHtml}
          </div>
          <div class="bill-page-section">
            ${billHtml}
          </div>
        </div>
      </body>
    </html>
  `;

  // Dispatch single combined print job - NO SECOND DIALOG POPUP
  dispatchDirectPrint(combinedDocHtml, rollWidth);
}

/**
 * Backward compatibility alias for printKOTThenBillSequentially.
 * Routes directly to sequential printing to trigger hardware auto-cutting.
 */
export function printCombinedKOTAndBillDirectly(options: PrintCombinedOptions): void {
  printKOTThenBillSequentially(options);
}
