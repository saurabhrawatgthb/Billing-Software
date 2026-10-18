/**
 * Direct Thermal Receipt & Invoice Printing Utility
 * Sends raw text directly to the system/browser print spooler
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

export function printReceiptDirectly(
  rawText: string,
  title = "Madrasi Dosa Bill Receipt",
  paperSizeOverride?: ThermalPaperSize
): void {
  if (typeof window === "undefined" || !rawText) return;

  const paperSize = paperSizeOverride || getSavedPaperSize();

  // Strip excess trailing blank newlines so continuous thermal paper feeds stop immediately after the footer
  const cleanedText = rawText.replace(/\n{3,}$/, "\n").trimEnd();

  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const contentWidth = is58mm ? "48mm" : "72mm";
  const fontSize = is58mm ? "9.5px" : "12.5px";
  const lineHeight = is58mm ? "1.22" : "1.28";

  // Compute exact physical height needed: line count * line height + padding
  const lines = cleanedText.split("\n");
  const lineCount = lines.length;
  const mmPerLine = is58mm ? 3.8 : 4.4;
  const dynamicHeightMm = Math.max(50, Math.ceil(lineCount * mmPerLine + 12));

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
      .thermal-receipt {
        width: ${contentWidth} !important;
        max-width: ${contentWidth} !important;
        box-sizing: border-box;
        font-family: 'Courier New', Courier, monospace, 'Lucida Console';
        font-size: ${fontSize};
        line-height: ${lineHeight};
        font-weight: 700;
        letter-spacing: -0.2px;
        margin: 0 auto;
        padding: 2mm 0;
        white-space: pre;
        word-break: normal;
        page-break-after: avoid;
        break-after: avoid;
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
    .thermal-receipt {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: 700;
      letter-spacing: -0.2px;
      margin: 0 auto;
      padding: 2mm 0;
      white-space: pre;
      word-break: normal;
      page-break-after: avoid;
      break-after: avoid;
    }
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
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style id="thermal-print-styles">${printStyles}</style>
          </head>
          <body>
            <div id="receipt-container" class="thermal-receipt">${escapeHtml(cleanedText)}</div>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch {}
      }, 150);
    }
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style id="thermal-print-styles">${printStyles}</style>
      </head>
      <body>
        <div id="receipt-container" class="thermal-receipt">${escapeHtml(cleanedText)}</div>
      </body>
    </html>
  `);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    setTimeout(() => {
      try {
        // Measure real DOM height for ultra-precise @page dimension
        const el = doc.getElementById("receipt-container");
        if (el) {
          const actualHeightPx = el.scrollHeight || el.offsetHeight;
          if (actualHeightPx > 0) {
            const measuredMm = Math.ceil((actualHeightPx * 25.4) / 96) + 4;
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
                  .thermal-receipt {
                    width: ${contentWidth} !important;
                    max-width: ${contentWidth} !important;
                    box-sizing: border-box;
                    font-family: 'Courier New', Courier, monospace, 'Lucida Console';
                    font-size: ${fontSize};
                    line-height: ${lineHeight};
                    font-weight: 700;
                    letter-spacing: -0.2px;
                    margin: 0 auto;
                    padding: 2mm 0;
                    white-space: pre;
                    word-break: normal;
                    page-break-after: avoid;
                    break-after: avoid;
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
    }, 180);
  }
}
