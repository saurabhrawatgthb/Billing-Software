import prisma from "../lib/prisma.js";
import fs from "fs";
import path from "path";

async function generateCheatSheet() {
  const brand = await prisma.brandSettings.findFirst();
  const franchise = await prisma.franchise.findFirst();
  const storeName = brand?.businessName || franchise?.name || "MADRASI DOSA";

  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    include: { category: true },
  });

  // Sort sequentially by numeric code (1, 2, ... 85, WTR10, WTR20)
  const sequentialItems = items.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.code.localeCompare(b.code);
  });

  // Group strictly by category, preserving sequential order of items inside each category
  // Order categories logically by their primary starting code:
  const categoryOrder = [
    "South Indian",          // 1 - 9
    "Chinese",               // 10 - 19
    "Pav Bhaji",             // 20
    "Cold Drink",            // 21 - 25
    "Kulhad",                // 27, 67
    "Ice Cream",             // 28 - 35
    "Pizza",                 // 36 - 50
    "Single Topping Pizza",  // 51 - 54
    "Double Topping Pizza",  // 55 - 57
    "Burger",                // 58 - 62
    "Sandwich",              // 63 - 66
    "Beverages",             // 26, 68 - 74, WTR
    "Side Order",            // 75 - 85
  ];

  const categoryMap = new Map();
  for (const item of sequentialItems) {
    const catName = item.category?.name || "Other";
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, []);
    }
    categoryMap.get(catName).push(item);
  }

  // Build sorted categories
  const sortedCategories = [];
  for (const catName of categoryOrder) {
    if (categoryMap.has(catName)) {
      sortedCategories.push({
        name: catName,
        items: categoryMap.get(catName),
      });
      categoryMap.delete(catName);
    }
  }
  // Append any remaining categories
  for (const [name, catItems] of categoryMap.entries()) {
    sortedCategories.push({ name, items: catItems });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName} - Counter Menu Item Codes</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
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
      background: #f1f5f9;
      color: #0f172a;
      padding: 16px;
      line-height: 1.3;
    }

    /* Top control bar (hidden when printed) */
    .no-print-bar {
      max-width: 900px;
      margin: 0 auto 16px auto;
      padding: 12px 18px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .no-print-title {
      font-size: 15px;
      font-weight: 700;
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-success { background: #16a34a; color: #fff; }
    .btn-success:hover { background: #15803d; }
    .btn-dark { background: #334155; color: #fff; }
    .btn-dark:hover { background: #475569; }

    /* Main Cheat Sheet Container */
    .sheet {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px 28px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    /* Header */
    .header {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 2px solid #0f172a;
    }
    .store-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-top: 3px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .instructions {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    /* 3-Column Clean Sequential Layout */
    .columns-container {
      column-count: 3;
      column-gap: 20px;
      column-rule: 1px solid #e2e8f0;
    }

    /* Category Block */
    .category-block {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 14px;
    }

    .category-title {
      font-size: 12px;
      font-weight: 900;
      color: #ffffff;
      background: #1e293b;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-count {
      font-size: 10px;
      font-weight: 700;
      opacity: 0.85;
    }

    /* Clean Uniform Item Rows */
    .item-list {
      list-style: none;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .item-row {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-row:nth-child(even) {
      background: #f8fafc;
    }

    .item-code {
      width: 44px;
      min-width: 44px;
      font-weight: 900;
      font-size: 13px;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .item-name {
      flex: 1;
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Footer */
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .category-title {
        background: #0f172a !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .item-code {
        color: #000000 !important;
      }
      .item-row:nth-child(even) {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div class="no-print-title">📋 Counter Menu Quick Codes (Paste Next to POS)</div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print Cheat Sheet</button>
      <button class="btn btn-success" onclick="downloadHTML()">📥 Download HTML</button>
      <button class="btn btn-dark" onclick="downloadCSV()">📊 Download CSV</button>
    </div>
  </div>

  <div class="sheet">
    <div class="header">
      <div class="store-name">🍽️ ${storeName}</div>
      <div class="subtitle">BILLING COUNTER ITEM CODES CHEAT SHEET</div>
      <div class="instructions">Type the Item Code on the POS keypad to quickly add dishes without searching</div>
    </div>

    <div class="columns-container">
      ${sortedCategories
        .map((cat) => {
          return `
      <div class="category-block">
        <div class="category-title">
          <span>${cat.name}</span>
          <span class="category-count">${cat.items.length}</span>
        </div>
        <ul class="item-list">
          ${cat.items
            .map(
              (item: any) => `
          <li class="item-row">
            <span class="item-code">${item.code}</span>
            <span class="item-name">${item.name}</span>
          </li>`
            )
            .join("")}
        </ul>
      </div>`;
        })
        .join("")}
    </div>

    <div class="footer">
      Total Items: ${sequentialItems.length} &nbsp;|&nbsp; Fast POS Entry: Just enter code and press enter
    </div>
  </div>

  <script>
    function downloadHTML() {
      const htmlContent = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Counter_Menu_Codes.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function downloadCSV() {
      const rows = [["Category", "Code", "Item Name"]];
      ${JSON.stringify(
        sortedCategories.flatMap((c: any) =>
          c.items.map((i: any) => [c.name, i.code, i.name])
        )
      )}.forEach((r: any) => rows.push(r));

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(",")).join("\\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Counter_Menu_Codes.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>`;

  // Write to client public for web app
  const clientPublicPath = path.resolve("../client/public/menu-counter-reference.html");
  fs.writeFileSync(clientPublicPath, html, "utf-8");
  console.log("✓ Saved to client/public:", clientPublicPath);

  // Write to workspace root
  const rootPath = path.resolve("../MENU_COUNTER_CHEAT_SHEET.html");
  fs.writeFileSync(rootPath, html, "utf-8");
  console.log("✓ Saved to root:", rootPath);

  // Write clean CSV with NO prices
  const csvRows = [["Category", "Item Code", "Item Name"]];
  for (const cat of sortedCategories) {
    for (const item of cat.items) {
      csvRows.push([cat.name, item.code, item.name]);
    }
  }
  const csvContent = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const rootCsvPath = path.resolve("../MENU_ITEMS_CODES.csv");
  fs.writeFileSync(rootCsvPath, csvContent, "utf-8");
  console.log("✓ Saved CSV to root:", rootCsvPath);

  fs.writeFileSync(path.resolve("../client/public/MENU_ITEMS_CODES.csv"), csvContent, "utf-8");
  console.log("✓ Saved CSV to client/public");
}

generateCheatSheet()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
