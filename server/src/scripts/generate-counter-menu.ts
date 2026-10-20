import prisma from "../lib/prisma.js";
import fs from "fs";
import path from "path";

async function generateCounterMenuDoc() {
  const brand = await prisma.brandSettings.findFirst();
  const franchise = await prisma.franchise.findFirst();
  const storeName = brand?.restaurantName || franchise?.name || "MADRASI DOSA";

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: [{ code: "asc" }, { name: "asc" }],
      },
    },
  });

  // Filter out categories with 0 items if any
  const populatedCategories = categories.filter((c) => c.menuItems.length > 0);

  const totalItems = populatedCategories.reduce((acc, c) => acc + c.menuItems.length, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName} - Quick Counter Reference Menu</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 16px;
    }
    .no-print-bar {
      max-width: 1200px;
      margin: 0 auto 16px auto;
      padding: 14px 20px;
      background: #1e293b;
      color: #fff;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .no-print-bar h2 {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-success {
      background: #16a34a;
      color: white;
    }
    .btn-success:hover {
      background: #15803d;
    }
    .btn-light {
      background: #475569;
      color: white;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      text-align: center;
      padding-bottom: 14px;
      margin-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      position: relative;
    }
    .store-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .store-sub {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }
    .meta-pills {
      margin-top: 8px;
      display: flex;
      justify-content: center;
      gap: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .meta-pill {
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 9999px;
      color: #334155;
    }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    @media (min-width: 1024px) {
      .categories-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .cat-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .cat-header {
      background: #0f172a;
      color: white;
      padding: 7px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .cat-badge {
      background: #334155;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 700;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .item-table tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .item-table tr:last-child {
      border-bottom: none;
    }
    .item-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-code {
      width: 58px;
      padding: 6px 6px 6px 10px;
      font-weight: 800;
      color: #0284c7;
      text-align: left;
      white-space: nowrap;
    }
    .code-pill {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid #bae6fd;
    }
    .col-name {
      padding: 6px 8px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.25;
    }
    .col-price {
      width: 75px;
      padding: 6px 10px 6px 6px;
      font-weight: 800;
      color: #0f172a;
      text-align: right;
      white-space: nowrap;
    }
    .size-badge {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-top: 1px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .categories-grid {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 10px;
      }
      .cat-card {
        border: 1px solid #94a3b8;
      }
      .cat-header {
        background: #1e293b !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .code-pill {
        background: #e0f2fe !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <h2>📋 Counter Menu Quick Reference Card (Paste Next to POS)</h2>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print Document</button>
      <button class="btn btn-success" onclick="downloadHTML()">📥 Download HTML File</button>
      <button class="btn btn-light" onclick="downloadCSV()">📊 Download CSV (Excel)</button>
    </div>
  </div>

  <div class="container" id="printable-sheet">
    <div class="header">
      <div class="store-title">🍽️ ${storeName}</div>
      <div class="store-sub">BILLING COUNTER QUICK ITEM CODE REFERENCE SHEET</div>
      <div class="meta-pills">
        <span class="meta-pill">Total Items: <strong>${totalItems}</strong></span>
        <span class="meta-pill">Categories: <strong>${populatedCategories.length}</strong></span>
        <span class="meta-pill">Generated: <strong>${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span>
        <span class="meta-pill">⚡ Type item code in POS for instant billing</span>
      </div>
    </div>

    <div class="categories-grid">
      ${populatedCategories
        .map((cat) => {
          return `
      <div class="cat-card">
        <div class="cat-header">
          <span>${cat.name}</span>
          <span class="cat-badge">${cat.menuItems.length} items</span>
        </div>
        <table class="item-table">
          <tbody>
            ${cat.menuItems
              .map((item) => {
                let priceDisplay = `₹${item.price}`;
                if (item.hasSizes) {
                  const parts = [];
                  if (item.priceSmall != null) parts.push(`S:₹${item.priceSmall}`);
                  if (item.priceMedium != null) parts.push(`M:₹${item.priceMedium}`);
                  if (item.priceLarge != null) parts.push(`L:₹${item.priceLarge}`);
                  if (parts.length > 0) {
                    priceDisplay = `₹${item.price}<span class="size-badge">${parts.join(" | ")}</span>`;
                  }
                }
                return `
            <tr>
              <td class="col-code"><span class="code-pill">${item.code || "-"}</span></td>
              <td class="col-name">${item.name}</td>
              <td class="col-price">${priceDisplay}</td>
            </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`;
        })
        .join("")}
    </div>

    <div class="footer">
      Tip: Type the <strong>Code</strong> into the POS search or press number keys to quickly add items without touching the mouse.
    </div>
  </div>

  <script>
    function downloadHTML() {
      const htmlContent = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Counter_Menu_Codes_Reference_${new Date().toISOString().split("T")[0]}.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function downloadCSV() {
      const rows = [["Category", "Item Code", "Item Name", "Price (₹)", "Sizes / Variants"]];
      ${JSON.stringify(
        populatedCategories.flatMap((c) =>
          c.menuItems.map((i) => {
            let sizes = "-";
            if (i.hasSizes) {
              const p = [];
              if (i.priceSmall != null) p.push(`S: ₹${i.priceSmall}`);
              if (i.priceMedium != null) p.push(`M: ₹${i.priceMedium}`);
              if (i.priceLarge != null) p.push(`L: ₹${i.priceLarge}`);
              sizes = p.join(" / ");
            }
            return [c.name, i.code || "", i.name, i.price, sizes];
          })
        )
      )}.forEach(row => rows.push(row));

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(",")).join("\\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Counter_Menu_Codes_${new Date().toISOString().split("T")[0]}.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>`;

  // Write to client public folder so it's live on the web app!
  const clientPublicPath = path.resolve("../client/public/menu-counter-reference.html");
  fs.writeFileSync(clientPublicPath, html, "utf-8");
  console.log("✓ Saved to client/public:", clientPublicPath);

  // Write to workspace root for direct desktop offline open
  const rootPath = path.resolve("../MENU_COUNTER_CHEAT_SHEET.html");
  fs.writeFileSync(rootPath, html, "utf-8");
  console.log("✓ Saved to workspace root:", rootPath);

  // Generate a clean CSV file as well in the root
  const csvRows = [["Category", "Item Code", "Item Name", "Base Price (INR)", "Sizes/Notes"]];
  for (const cat of populatedCategories) {
    for (const item of cat.menuItems) {
      let sizeStr = "";
      if (item.hasSizes) {
        const parts = [];
        if (item.priceSmall != null) parts.push(`Small: ${item.priceSmall}`);
        if (item.priceMedium != null) parts.push(`Medium: ${item.priceMedium}`);
        if (item.priceLarge != null) parts.push(`Large: ${item.priceLarge}`);
        sizeStr = parts.join(", ");
      }
      csvRows.push([cat.name, item.code, item.name, String(item.price), sizeStr]);
    }
  }
  const csvContent = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const rootCsvPath = path.resolve("../MENU_ITEMS_CODES.csv");
  fs.writeFileSync(rootCsvPath, csvContent, "utf-8");
  console.log("✓ Saved CSV to workspace root:", rootCsvPath);

  // Also write to client public for web download
  fs.writeFileSync(path.resolve("../client/public/MENU_ITEMS_CODES.csv"), csvContent, "utf-8");
  console.log("✓ Saved CSV to client/public");
}

generateCounterMenuDoc()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
