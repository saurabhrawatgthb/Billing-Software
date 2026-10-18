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

  // CSS for exact paper dimensions and zero wastage
  const is58mm = paperSize === "58mm";
  const contentWidth = is58mm ? "50mm" : "74mm";
  const fontSize = is58mm ? "10.5px" : "12px";
  const bodyPadding = is58mm ? "1mm 1.5mm" : "2mm 3mm";

  const printStyles = `
    @page {
      size: ${paperSize} auto;
      margin: 0mm;
    }
    html, body {
      width: ${paperSize};
      height: auto !important;
      min-height: 0 !important;
      max-height: max-content !important;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      overflow: visible !important;
    }
    .thermal-receipt {
      width: ${contentWidth};
      max-width: ${contentWidth};
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: ${fontSize};
      line-height: 1.28;
      font-weight: 600;
      margin: ${bodyPadding};
      padding: 0;
      white-space: pre-wrap;
      word-break: break-word;
      page-break-after: avoid;
      break-after: avoid;
    }
  `;

  // Use a hidden zero-size iframe for direct spooling
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback popup if iframe execution is restricted
    const win = window.open("", "_blank", `width=${is58mm ? 300 : 380},height=500`);
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style>${printStyles}</style>
          </head>
          <body>
            <div class="thermal-receipt">${escapeHtml(cleanedText)}</div>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    }
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="thermal-receipt">${escapeHtml(cleanedText)}</div>
      </body>
    </html>
  `);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    setTimeout(() => {
      try {
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
