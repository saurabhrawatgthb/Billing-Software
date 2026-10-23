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

export function getDefaultRoleHome(role?: string): string {
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

  // Super Admin has master authority to view and operate all terminals and modules
  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleHome = getDefaultRoleHome(user.role);
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
};
