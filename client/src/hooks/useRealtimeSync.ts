import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, joinFranchiseRoom } from "../services/socket.js";
import { useAuthStore } from "../store/authStore.js";

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { selectedFranchiseId, user } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();

    const currentFranchise = selectedFranchiseId || user?.franchiseId;
    if (currentFranchise) {
      joinFranchiseRoom(currentFranchise);
    }
    if (user?.role === "SUPER_ADMIN") {
      socket.emit("join-super-admin");
    }

    const handleOrderEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kots"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["current-register"] });
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
    };

    const handleKotEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["kots"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };

    const handleTableEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    };

    const handleInvoiceEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["gst-audit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["report-sales"] });
      queryClient.invalidateQueries({ queryKey: ["report-payments"] });
      queryClient.invalidateQueries({ queryKey: ["daily-register"] });
      queryClient.invalidateQueries({ queryKey: ["current-register"] });
    };

    const handleMenuEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items-for-recipes"] });
    };

    const handleRecipeEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items-for-recipes"] });
    };

    const handleInventoryEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items-for-recipes"] });
    };

    const handlePermissionsEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    };

    const handleRegisterEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["current-register"] });
      queryClient.invalidateQueries({ queryKey: ["daily-register"] });
    };

    const handleCrmEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["crm-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["crm-customers"] });
      queryClient.invalidateQueries({ queryKey: ["crm-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["crm-logs"] });
    };

    const handleEmployeeEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    };

    const handleUserEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    // Orders
    socket.on("order:created", handleOrderEvent);
    socket.on("order:updated", handleOrderEvent);
    socket.on("order:status_changed", handleOrderEvent);

    // KOTs
    socket.on("kot:new", handleKotEvent);
    socket.on("kot:status_changed", handleKotEvent);

    // Tables
    socket.on("table:status_changed", handleTableEvent);
    socket.on("table:updated", handleTableEvent);

    // Invoices & Billing
    socket.on("invoice:created", handleInvoiceEvent);
    socket.on("invoice:voided", handleInvoiceEvent);
    socket.on("payment:completed", handleInvoiceEvent);

    // Menu & Recipes
    socket.on("menu:updated", handleMenuEvent);
    socket.on("recipe:updated", handleRecipeEvent);

    // Inventory
    socket.on("inventory:stock_updated", handleInventoryEvent);
    socket.on("inventory:updated", handleInventoryEvent);
    socket.on("inventory:low_stock", handleInventoryEvent);

    // Permissions
    socket.on("permissions:updated", handlePermissionsEvent);

    // Registers
    socket.on("register:opened", handleRegisterEvent);
    socket.on("register:closed", handleRegisterEvent);

    // CRM
    socket.on("crm:updated", handleCrmEvent);

    // Employees & Users
    socket.on("employee:updated", handleEmployeeEvent);
    socket.on("user:updated", handleUserEvent);

    return () => {
      socket.off("order:created", handleOrderEvent);
      socket.off("order:updated", handleOrderEvent);
      socket.off("order:status_changed", handleOrderEvent);
      socket.off("kot:new", handleKotEvent);
      socket.off("kot:status_changed", handleKotEvent);
      socket.off("table:status_changed", handleTableEvent);
      socket.off("table:updated", handleTableEvent);
      socket.off("invoice:created", handleInvoiceEvent);
      socket.off("invoice:voided", handleInvoiceEvent);
      socket.off("payment:completed", handleInvoiceEvent);
      socket.off("menu:updated", handleMenuEvent);
      socket.off("recipe:updated", handleRecipeEvent);
      socket.off("inventory:stock_updated", handleInventoryEvent);
      socket.off("inventory:updated", handleInventoryEvent);
      socket.off("inventory:low_stock", handleInventoryEvent);
      socket.off("permissions:updated", handlePermissionsEvent);
      socket.off("register:opened", handleRegisterEvent);
      socket.off("register:closed", handleRegisterEvent);
      socket.off("crm:updated", handleCrmEvent);
      socket.off("employee:updated", handleEmployeeEvent);
      socket.off("user:updated", handleUserEvent);
    };
  }, [selectedFranchiseId, user?.franchiseId, user?.role, queryClient]);
}
