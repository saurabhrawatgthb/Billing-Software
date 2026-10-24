import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.js";
import { ProtectedRoute, PlatformRoute } from "../components/layout/ProtectedRoute.js";

// Lazy-loaded Pages (Code-splitting for instant startup & ultra-fast module navigation)
const LoginPage = React.lazy(() => import("../pages/auth/LoginPage.js").then((m) => ({ default: m.LoginPage })));
const PlatformLoginPage = React.lazy(() => import("../pages/platform/PlatformLoginPage.js").then((m) => ({ default: m.PlatformLoginPage })));
const PlatformDashboardPage = React.lazy(() => import("../pages/platform/PlatformDashboardPage.js").then((m) => ({ default: m.PlatformDashboardPage })));
const DashboardPage = React.lazy(() => import("../pages/dashboard/DashboardPage.js").then((m) => ({ default: m.DashboardPage })));
const FranchisesPage = React.lazy(() => import("../pages/franchise/FranchisesPage.js").then((m) => ({ default: m.FranchisesPage })));
const UsersPage = React.lazy(() => import("../pages/users/UsersPage.js").then((m) => ({ default: m.UsersPage })));
const EmployeesPage = React.lazy(() => import("../pages/employees/EmployeesPage.js").then((m) => ({ default: m.EmployeesPage })));
const AttendancePage = React.lazy(() => import("../pages/attendance/AttendancePage.js").then((m) => ({ default: m.AttendancePage })));
const LeavePage = React.lazy(() => import("../pages/leave/LeavePage.js").then((m) => ({ default: m.LeavePage })));
const PayrollPage = React.lazy(() => import("../pages/payroll/PayrollPage.js").then((m) => ({ default: m.PayrollPage })));
const MenuPage = React.lazy(() => import("../pages/menu/MenuPage.js").then((m) => ({ default: m.MenuPage })));
const TablesPage = React.lazy(() => import("../pages/tables/TablesPage.js").then((m) => ({ default: m.TablesPage })));
const POSPage = React.lazy(() => import("../pages/pos/POSPage.js").then((m) => ({ default: m.POSPage })));
const OrdersPage = React.lazy(() => import("../pages/orders/OrdersPage.js").then((m) => ({ default: m.OrdersPage })));
const KitchenPage = React.lazy(() => import("../pages/kitchen/KitchenPage.js").then((m) => ({ default: m.KitchenPage })));
const BillingPage = React.lazy(() => import("../pages/billing/BillingPage.js").then((m) => ({ default: m.BillingPage })));
const PrintersPage = React.lazy(() => import("../pages/printers/PrintersPage.js").then((m) => ({ default: m.PrintersPage })));
const ReportsPage = React.lazy(() => import("../pages/reports/ReportsPage.js").then((m) => ({ default: m.ReportsPage })));
const AuditLogsPage = React.lazy(() => import("../pages/audit/AuditLogsPage.js").then((m) => ({ default: m.AuditLogsPage })));
const InventoryPage = React.lazy(() => import("../pages/inventory/InventoryPage.js").then((m) => ({ default: m.InventoryPage })));
const RecipesPage = React.lazy(() => import("../pages/recipes/RecipesPage.js").then((m) => ({ default: m.RecipesPage })));
const ExpensesPage = React.lazy(() => import("../pages/expenses/ExpensesPage.js").then((m) => ({ default: m.ExpensesPage })));
const AdvancesPage = React.lazy(() => import("../pages/advances/AdvancesPage.js").then((m) => ({ default: m.AdvancesPage })));
const CRMPage = React.lazy(() => import("../pages/crm/CRMPage.js").then((m) => ({ default: m.CRMPage })));
const BrandSettingsPage = React.lazy(() => import("../pages/settings/BrandSettingsPage.js").then((m) => ({ default: m.BrandSettingsPage })));
const LandingPage = React.lazy(() => import("../pages/public/LandingPage.js").then((m) => ({ default: m.LandingPage })));
const SignupPage = React.lazy(() => import("../pages/public/SignupPage.js").then((m) => ({ default: m.SignupPage })));
const SaaSAdminPage = React.lazy(() => import("../pages/saas/SaaSAdminPage.js").then((m) => ({ default: m.SaaSAdminPage })));

const ModuleLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[350px]">
    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-bold text-gray-500 mt-3 animate-pulse">Loading module...</span>
  </div>
);


// Preload the most-frequently-used restaurant operation modules in background idle time
const preloadOperationalModules = () => {
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 800));
  idle(() => {
    import("../pages/pos/POSPage.js").catch(() => {});
    import("../pages/tables/TablesPage.js").catch(() => {});
    import("../pages/orders/OrdersPage.js").catch(() => {});
    import("../pages/billing/BillingPage.js").catch(() => {});
    import("../pages/dashboard/DashboardPage.js").catch(() => {});
    import("../pages/kitchen/KitchenPage.js").catch(() => {});
  });
};

export const AppRoutes: React.FC = () => {
  React.useEffect(() => {
    preloadOperationalModules();
  }, []);

  return (
    <Suspense fallback={<ModuleLoadingFallback />}>
      <Routes>
        {/* Public SaaS commercial portal routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pricing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* OmniPOS Platform Owner / Commercial Control Tower */}
        <Route path="/platform-login" element={<PlatformLoginPage />} />
        <Route
          path="/platform"
          element={
            <PlatformRoute>
              <PlatformDashboardPage />
            </PlatformRoute>
          }
        />

        {/* Protected Routes enclosed in AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER"]}>
                <POSPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tables"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER", "CHEF"]}>
                <TablesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER", "CHEF", "ACCOUNTANT"]}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CHEF", "CASHIER"]}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "ACCOUNTANT"]}>
                <BillingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CHEF"]}>
                <MenuPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CHEF", "ACCOUNTANT"]}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipes"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CHEF"]}>
                <RecipesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "ACCOUNTANT"]}>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/advances"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "HR", "ACCOUNTANT"]}>
                <AdvancesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/franchises"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <FranchisesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "HR", "ACCOUNTANT"]}>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE_MANAGER", "HR"]}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leave"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE_MANAGER", "HR"]}>
                <LeavePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payroll"
            element={
              <ProtectedRoute allowedRoles={["FRANCHISE_MANAGER", "HR", "ACCOUNTANT"]}>
                <PayrollPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/printers"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER"]}>
                <PrintersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER", "ACCOUNTANT"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER"]}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "FRANCHISE_MANAGER"]}>
                <CRMPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <BrandSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/saas-admin"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <SaaSAdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
