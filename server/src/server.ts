import http from "http";
import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import authRoutes from "./modules/auth/auth.routes.js";
import franchiseRoutes from "./modules/franchise/franchise.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import employeeRoutes from "./modules/employee/employee.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import payrollRoutes from "./modules/payroll/payroll.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import tableRoutes from "./modules/table/table.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import kotRoutes from "./modules/kot/kot.routes.js";
import billingRoutes from "./modules/billing/billing.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import printerRoutes from "./modules/printer/printer.routes.js";
import reportRoutes from "./modules/report/report.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import recipeRoutes from "./modules/recipe/recipe.routes.js";
import expenseRoutes from "./modules/expense/expense.routes.js";
import advanceRoutes from "./modules/advance/advance.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import crmRoutes from "./modules/crm/crm.routes.js";
import brandRoutes from "./modules/brand/brand.routes.js";
import aggregatorRoutes from "./modules/aggregator/aggregator.routes.js";
import permissionRoutes from "./modules/permission/permission.routes.js";
import registerRoutes from "./modules/register/register.routes.js";

import { initSocket } from "./lib/socket.js";
import { errorHandler } from "./middleware/error.js";
import prisma from "./lib/prisma.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health & diagnostics
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Restaurant Management & POS API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db-test", async (_req: Request, res: Response) => {
  try {
    const franchiseCount = await prisma.franchise.count();
    res.json({
      success: true,
      message: "Database connection successful",
      franchiseCount,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Register all API Modules
app.use("/api/auth", authRoutes);
app.use("/api/franchises", franchiseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/kot", kotRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/printers", printerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/advances", advanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/brand-settings", brandRoutes);
app.use("/api/aggregators", aggregatorRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/registers", registerRoutes);

// SPA Static Asset Serving & Wildcard Fallback Route
const clientDist = fs.existsSync(path.resolve(process.cwd(), "../client/dist"))
  ? path.resolve(process.cwd(), "../client/dist")
  : path.resolve(process.cwd(), "client/dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const indexPath = path.join(clientDist, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export { app, server };
export default app;