/**
 * Direct Thermal Receipt & Invoice Printing Utility
 * Sends raw text and Madrasi Dosa brand logo directly to the system/browser print spooler
 * formatted for 58mm (2-inch) or 80mm (3-inch) thermal POS printers without modal friction.
 *
 * Designed with dynamic continuous roll height so short bills ONLY print
 * their exact height and never spit out extra blank paper.
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
 * If the string exceeds the width (e.g. lengthy branch addresses), it word-wraps and centers each sub-line.
 */
export function centerLine(text: string, width = 32): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length >= width) {
    const words = trimmed.split(/\s+/);
    const sublines: string[] = [];
    let current = "";
    for (const w of words) {
      if ((current + (current ? " " : "") + w).length <= width) {
        current += (current ? " " : "") + w;
      } else {
        if (current) sublines.push(centerLine(current, width));
        current = w;
      }
    }
    if (current) sublines.push(centerLine(current, width));
    return sublines.join("\n");
  }
  const totalPad = width - trimmed.length;
  const leftPad = Math.floor(totalPad / 2);
  return " ".repeat(leftPad) + trimmed;
}

export const MADRASI_DOSA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 140" width="100%">
  <defs>
    <style>
      .brand-title { font-family: 'Arial Black', Impact, 'Segoe UI', system-ui, sans-serif; font-size: 26px; font-weight: 900; letter-spacing: 2.5px; fill: #000; text-anchor: middle; }
      .brand-sub { font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; fill: #000; text-anchor: middle; }
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
  <text x="170" y="118" class="brand-sub">AUTHENTIC SOUTH INDIAN TASTE</text>
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
  footerMessage?: string;
}

/**
 * Builds formatted thermal receipt raw text locally on the client with zero network latency.
 * All header items (Brand name, Franchise name, Address, Phone, GSTIN) and Footer are strictly center-aligned.
 */
export function buildThermalReceiptText(data: BuildReceiptParams, _paperSize: ThermalPaperSize = "80mm"): string {
  const currSym = data.currencySymbol || "₹";
  const brandName = (data.brandName || "MADRASI DOSA").trim().toUpperCase();
  const franchiseName = (data.franchiseName || "").trim().toUpperCase();
  const divider = "================================";
  const thinDivider = "--------------------------------";

  const lines: string[] = [];
  lines.push(divider);
  lines.push(centerLine(brandName, 32));
  if (franchiseName) {
    const branchLabel = franchiseName.startsWith("---") ? franchiseName : `--- ${franchiseName} ---`;
    lines.push(centerLine(branchLabel, 32));
  }
  if (data.franchiseAddress) {
    lines.push(centerLine(data.franchiseAddress, 32));
  }
  if (data.franchisePhone) {
    lines.push(centerLine(`Phone: ${data.franchisePhone.trim()}`, 32));
  }
  if (data.gstin) {
    lines.push(centerLine(`GSTIN: ${data.gstin.trim()}`, 32));
  }
  if (data.fssaiNumber) {
    lines.push(centerLine(`FSSAI: ${data.fssaiNumber.trim()}`, 32));
  }
  lines.push(divider);
  lines.push(`Invoice: ${data.invoiceNumber}`);
  if (data.orderNumber) {
    lines.push(`Order  : ${data.orderNumber}`);
  }
  lines.push(`${data.orderType || "Takeaway"}`);
  lines.push(`Date   : ${data.date || new Date().toLocaleString()}`);
  lines.push(thinDivider);
  lines.push("Item             Qty      Price");
  lines.push(thinDivider);

  for (const item of data.items) {
    const itemTotal = item.totalPrice !== undefined ? item.totalPrice : item.price * item.quantity;
    const name = item.name.padEnd(16, " ").substring(0, 16);
    const qty = String(item.quantity).padStart(3, " ");
    const price = `${currSym}${itemTotal.toFixed(2)}`.padStart(11, " ");
    lines.push(`${name} ${qty} ${price}`);
  }

  lines.push(thinDivider);
  lines.push(`Subtotal:             ${currSym}${data.subtotal.toFixed(2)}`);
  if (data.discount && data.discount > 0) {
    lines.push(`Discount:            -${currSym}${data.discount.toFixed(2)}`);
  }
  lines.push(`Tax:                  ${currSym}${(data.tax || 0).toFixed(2)}`);
  lines.push(divider);
  lines.push(`TOTAL:                ${currSym}${data.total.toFixed(2)}`);
  lines.push(divider);
  lines.push("PAYMENTS:");
  for (const p of data.payments) {
    lines.push(`  ${p.method.padEnd(8, " ")}: ${currSym}${p.amount.toFixed(2)} [${p.status || "COMPLETED"}]`);
  }
  lines.push(thinDivider);
  lines.push(centerLine(data.footerMessage || "Thanks For Visiting Madrasi Dosa", 32));

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
      bodyText: bodyLines.join("\n"),
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
 * Direct thermal printer spooler
 * Dispatches the receipt directly to the printer in <50ms with a compact Madrasi Dosa Logo header
 * and mathematically center-aligned store branding, address, phone number, and footer.
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

  // Strip excess trailing blank newlines so continuous thermal paper feeds stop immediately after the footer
  const cleanedText = rawText.replace(/\n{3,}$/, "\n").trimEnd();

  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const contentWidth = is58mm ? "48mm" : "72mm";
  const fontSize = is58mm ? "9.5px" : "12px";
  const lineHeight = is58mm ? "1.22" : "1.28";

  // Compute exact physical height needed: line count * line height + compact logo + padding
  const lines = cleanedText.split("\n");
  const lineCount = lines.length;
  const mmPerLine = is58mm ? 3.8 : 4.3;
  // Compact logo height: 11mm for 80mm roll, 8.5mm for 58mm roll to easily fit on a page
  const logoHeightMm = showLogo ? (is58mm ? 8.5 : 11) : 0;
  const dynamicHeightMm = Math.max(45, Math.ceil(lineCount * mmPerLine + logoHeightMm + 10));

  const printStyles = `
    @page {
      size: ${rollWidth} ${dynamicHeightMm}mm;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${rollWidth} !important;
        max-width: ${rollWidth} !important;
        height: ${dynamicHeightMm}mm !important;
        max-height: ${dynamicHeightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .thermal-receipt-container {
        width: ${contentWidth} !important;
        max-width: ${contentWidth} !important;
        box-sizing: border-box;
        margin: 0 auto;
        padding: 1mm 0 1.5mm 0;
        text-align: center !important;
        page-break-after: avoid;
        break-after: avoid;
      }
      .receipt-logo-wrap {
        text-align: center !important;
        margin: 0 auto 1mm auto !important;
        padding: 0 !important;
        display: block !important;
        width: 100% !important;
      }
      .receipt-logo-wrap svg,
      .receipt-logo-wrap img {
        width: ${is58mm ? "20mm" : "26mm"} !important;
        max-width: ${is58mm ? "20mm" : "26mm"} !important;
        height: auto !important;
        margin: 0 auto !important;
        display: block !important;
        filter: grayscale(100%) contrast(250%);
        -webkit-filter: grayscale(100%) contrast(250%);
      }
      .receipt-header-block {
        text-align: center !important;
        width: 100% !important;
        margin: 0 auto !important;
      }
      .receipt-header-line {
        text-align: center !important;
        font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
        font-size: ${fontSize} !important;
        line-height: ${lineHeight} !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
        word-break: break-word !important;
      }
      .receipt-divider {
        text-align: center !important;
        font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
        font-size: ${fontSize} !important;
        line-height: ${lineHeight} !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
      }
      .thermal-receipt-body-wrap {
        text-align: center !important;
        width: 100% !important;
        margin: 0 auto !important;
      }
      .thermal-receipt-body {
        text-align: left !important;
        display: inline-block !important;
        margin: 0 auto !important;
        font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
        font-size: ${fontSize} !important;
        line-height: ${lineHeight} !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
        white-space: pre !important;
        word-break: normal !important;
      }
      .receipt-footer-block {
        text-align: center !important;
        width: 100% !important;
        margin: 0 auto !important;
      }
      .receipt-footer-line {
        text-align: center !important;
        font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
        font-size: ${fontSize} !important;
        line-height: ${lineHeight} !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
      }
      .thermal-receipt-text {
        font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
        font-size: ${fontSize} !important;
        line-height: ${lineHeight} !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
        white-space: pre !important;
        word-break: normal !important;
        margin: 0 !important;
        padding: 0 !important;
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
    .thermal-receipt-container {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      margin: 0 auto;
      padding: 1mm 0 1.5mm 0;
      text-align: center;
      page-break-after: avoid;
      break-after: avoid;
    }
    .receipt-logo-wrap {
      text-align: center;
      margin: 0 auto 1mm auto;
      padding: 0;
      display: block;
      width: 100%;
    }
    .receipt-logo-wrap svg,
    .receipt-logo-wrap img {
      width: ${is58mm ? "20mm" : "26mm"};
      max-width: ${is58mm ? "20mm" : "26mm"};
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
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: 700;
      letter-spacing: -0.2px;
      word-break: break-word;
    }
    .receipt-divider {
      text-align: center;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
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
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: 700;
      letter-spacing: -0.2px;
      white-space: pre;
      word-break: normal;
    }
    .receipt-footer-block {
      text-align: center;
      width: 100%;
      margin: 0 auto;
    }
    .receipt-footer-line {
      text-align: center;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: 700;
      letter-spacing: -0.2px;
    }
    .thermal-receipt-text {
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: 700;
      letter-spacing: -0.2px;
      white-space: pre;
      word-break: normal;
      margin: 0;
      padding: 0;
    }
  `;

  const logoMarkup = showLogo
    ? logoUrl && logoUrl.trim()
      ? `<div class="receipt-logo-wrap"><img src="${escapeHtml(logoUrl.trim())}" alt="Madrasi Dosa Logo" /></div>`
      : `<div class="receipt-logo-wrap">${MADRASI_DOSA_LOGO_SVG}</div>`
    : "";

  const parsed = parseReceiptSections(cleanedText);

  let innerContentHtml = "";
  if (parsed.hasStructure && parsed.headerLines) {
    innerContentHtml = `
      <div class="receipt-header-block">
        <div class="receipt-divider">${escapeHtml(parsed.topDivider || "================================")}</div>
        ${parsed.headerLines.map((l) => `<div class="receipt-header-line">${escapeHtml(l)}</div>`).join("")}
        <div class="receipt-divider">${escapeHtml(parsed.midDivider || "================================")}</div>
      </div>
      <div class="thermal-receipt-body-wrap">
        <div class="thermal-receipt-body">${escapeHtml(parsed.bodyText || "")}</div>
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
    innerContentHtml = `<div class="thermal-receipt-text">${escapeHtml(cleanedText)}</div>`;
  }

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style id="thermal-print-styles">${printStyles}</style>
      </head>
      <body>
        <div id="receipt-container" class="thermal-receipt-container">
          ${logoMarkup}
          ${innerContentHtml}
        </div>
      </body>
    </html>
  `;

  // Use a hidden iframe with matching viewport for accurate layout calculation
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = rollWidth;
  iframe.style.height = `${dynamicHeightMm}mm`;
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback popup if iframe execution is restricted
    const win = window.open("", "_blank", `width=${is58mm ? 300 : 380},height=${dynamicHeightMm * 4}`);
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch {}
      }, 50);
    }
    return;
  }

  doc.open();
  doc.write(receiptHtml);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    // Fast print trigger: 50ms ensures synchronous SVG DOM parsing without latency
    setTimeout(() => {
      try {
        // Measure real DOM height for ultra-precise @page dimension
        const el = doc.getElementById("receipt-container");
        if (el) {
          const actualHeightPx = el.scrollHeight || el.offsetHeight;
          if (actualHeightPx > 0) {
            const measuredMm = Math.ceil((actualHeightPx * 25.4) / 96) + 3;
            const styleTag = doc.getElementById("thermal-print-styles");
            if (styleTag && measuredMm > 0) {
              styleTag.innerHTML = `
                @page {
                  size: ${rollWidth} ${measuredMm}mm;
                  margin: 0mm;
                }
                @media print {
                  html, body {
                    width: ${rollWidth} !important;
                    max-width: ${rollWidth} !important;
                    height: ${measuredMm}mm !important;
                    max-height: ${measuredMm}mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    overflow: hidden !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .thermal-receipt-container {
                    width: ${contentWidth} !important;
                    max-width: ${contentWidth} !important;
                    box-sizing: border-box;
                    margin: 0 auto;
                    padding: 1mm 0 1.5mm 0;
                    text-align: center !important;
                    page-break-after: avoid;
                    break-after: avoid;
                  }
                  .receipt-logo-wrap {
                    text-align: center !important;
                    margin: 0 auto 1mm auto !important;
                    padding: 0 !important;
                    display: block !important;
                    width: 100% !important;
                  }
                  .receipt-logo-wrap svg,
                  .receipt-logo-wrap img {
                    width: ${is58mm ? "20mm" : "26mm"} !important;
                    max-width: ${is58mm ? "20mm" : "26mm"} !important;
                    height: auto !important;
                    margin: 0 auto !important;
                    display: block !important;
                    filter: grayscale(100%) contrast(250%);
                    -webkit-filter: grayscale(100%) contrast(250%);
                  }
                  .receipt-header-block {
                    text-align: center !important;
                    width: 100% !important;
                    margin: 0 auto !important;
                  }
                  .receipt-header-line {
                    text-align: center !important;
                    font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
                    font-size: ${fontSize} !important;
                    line-height: ${lineHeight} !important;
                    font-weight: 700 !important;
                    letter-spacing: -0.2px !important;
                    word-break: break-word !important;
                  }
                  .receipt-divider {
                    text-align: center !important;
                    font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
                    font-size: ${fontSize} !important;
                    line-height: ${lineHeight} !important;
                    font-weight: 700 !important;
                    letter-spacing: -0.2px !important;
                  }
                  .thermal-receipt-body-wrap {
                    text-align: center !important;
                    width: 100% !important;
                    margin: 0 auto !important;
                  }
                  .thermal-receipt-body {
                    text-align: left !important;
                    display: inline-block !important;
                    margin: 0 auto !important;
                    font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
                    font-size: ${fontSize} !important;
                    line-height: ${lineHeight} !important;
                    font-weight: 700 !important;
                    letter-spacing: -0.2px !important;
                    white-space: pre !important;
                    word-break: normal !important;
                  }
                  .receipt-footer-block {
                    text-align: center !important;
                    width: 100% !important;
                    margin: 0 auto !important;
                  }
                  .receipt-footer-line {
                    text-align: center !important;
                    font-family: 'Courier New', Courier, monospace, 'Lucida Console' !important;
                    font-size: ${fontSize} !important;
                    line-height: ${lineHeight} !important;
                    font-weight: 700 !important;
                    letter-spacing: -0.2px !important;
                  }
                }
              `;
            }
          }
        }
        win.print();
      } catch (err) {
        console.error("Direct thermal print error:", err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1200);
      }
    }, 50);
  }
}
