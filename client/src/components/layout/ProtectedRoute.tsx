import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { usePinLockStore } from "../../store/pinLockStore.js";
import { PinLockScreen } from "../auth/PinLockScreen.js";
import type { UserRole } from "../../types/index.js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function getDefaultRoleHome(role?: string, organizationId?: string | null): string {
  if (role === "SUPER_ADMIN" && !organizationId) {
    return "/platform";
  }
  switch (role) {
    case "SUPER_ADMIN":
    case "FRANCHISE_MANAGER":
    case "CASHIER":
      return "/dashboard";
    case "CHEF":
      return "/kitchen";
    case "WAITER":
      return "/tables";
    case "HR":
      return "/employees";
    case "ACCOUNTANT":
      return "/billing";
    default:
      return "/login";
  }
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const { isLocked, hasPin } = usePinLockStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If terminal / device is locked with a PIN, require PIN entry to proceed
  if (isLocked && hasPin(user.id)) {
    return <PinLockScreen />;
  }

  // If user is a platform admin (no organization), redirect them to the Platform Control Tower
  if (user.role === "SUPER_ADMIN" && !user.organizationId) {
    return <Navigate to="/platform" replace />;
  }

  // Super Admin has master authority to view and operate all terminals and modules
  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleHome = getDefaultRoleHome(user.role, user.organizationId);
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
};

export const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/platform-login" state={{ from: location }} replace />;
  }

  // Only platform admin (SUPER_ADMIN without an organizationId) is allowed
  if (user.role !== "SUPER_ADMIN" || user.organizationId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
