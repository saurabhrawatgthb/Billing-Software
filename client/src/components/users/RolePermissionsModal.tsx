import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Building,
  Save,
  Percent,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import type { Franchise } from "../../types/index.js";
import { Modal } from "../common/Modal.js";
import { Button } from "../common/Button.js";

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchises: Franchise[];
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  franchises,
}) => {
  const queryClient = useQueryClient();
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [permissions, setPermissions] = useState({
    canEditMenu: true,
    canEditPrices: true,
    canVoidBills: false,
    canManageInventory: true,
    canManageEmployees: true,
    canViewReports: true,
    canManageCRM: true,
    canManagePrinters: true,
    canManageTables: true,
    canApplyDiscounts: true,
    maxDiscountPercent: 20,
  });

  // Query permissions for selected franchise
  const { data: permissionData } = useQuery({
    queryKey: ["role-permissions", selectedFranchiseId],
    queryFn: async () => {
      const url = selectedFranchiseId
        ? `/permissions?franchiseId=${selectedFranchiseId}`
        : "/permissions";
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (permissionData) {
      setPermissions({
        canEditMenu: permissionData.canEditMenu ?? true,
        canEditPrices: permissionData.canEditPrices ?? true,
        canVoidBills: permissionData.canVoidBills ?? false,
        canManageInventory: permissionData.canManageInventory ?? true,
        canManageEmployees: permissionData.canManageEmployees ?? true,
        canViewReports: permissionData.canViewReports ?? true,
        canManageCRM: permissionData.canManageCRM ?? true,
        canManagePrinters: permissionData.canManagePrinters ?? true,
        canManageTables: permissionData.canManageTables ?? true,
        canApplyDiscounts: permissionData.canApplyDiscounts ?? true,
        maxDiscountPercent: permissionData.maxDiscountPercent ?? 20,
      });
    }
  }, [permissionData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        franchiseId: selectedFranchiseId || null,
        role: "FRANCHISE_MANAGER",
        ...permissions,
      };
      const res = await api.put("/permissions", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setSuccessMessage("Franchise Manager permissions saved successfully!");
      setFormError(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err));
    },
  });

  const PERMISSION_TOGGLES: {
    key: keyof typeof permissions;
    label: string;
    description: string;
    danger?: boolean;
  }[] = [
    {
      key: "canEditMenu",
      label: "Edit Menu & Categories",
      description: "Allow adding, updating, or deleting dishes, recipes, and categories.",
    },
    {
      key: "canEditPrices",
      label: "Modify Dish Prices",
      description: "Allow modifying prices of menu items specifically for this franchise branch.",
    },
    {
      key: "canVoidBills",
      label: "Void & Make Bills Dormant",
      description: "Allow putting generated bills in dormant status (Super Admin must still audit).",
      danger: true,
    },
    {
      key: "canApplyDiscounts",
      label: "Apply Bill Discounts",
      description: "Allow applying percentage or flat discounts at POS terminal.",
    },
    {
      key: "canManageInventory",
      label: "Manage Inventory & Stock",
      description: "Allow receiving stock, logging wastage, and adjusting raw materials.",
    },
    {
      key: "canManageTables",
      label: "Create & Manage Dining Tables",
      description: "Allow creating new dining tables and changing floor capacity.",
    },
    {
      key: "canManageEmployees",
      label: "Manage Staff & Attendance",
      description: "Allow adding employees, marking daily attendance, and approving leaves.",
    },
    {
      key: "canViewReports",
      label: "View Revenue & Financial Reports",
      description: "Allow viewing sales figures, average order value, and profit analytics.",
    },
    {
      key: "canManageCRM",
      label: "Customer CRM & Loyalty",
      description: "Allow managing customer phone numbers, loyalty points, and promos.",
    },
    {
      key: "canManagePrinters",
      label: "Configure Thermal Printers",
      description: "Allow changing network IP and paper widths for KOT and bill printers.",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Franchise Manager Permission Control"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Banner */}
        <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-indigo-950">Super Admin Governance Matrix</p>
            <p className="text-indigo-700 mt-0.5">
              Control what actions Franchise Managers are authorized to perform. You can configure
              global system defaults or customize permissions individually for specific branches.
            </p>
          </div>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Target Franchise Scope Selector */}
        <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Target Branch Scope:
            </span>
          </div>

          <select
            value={selectedFranchiseId}
            onChange={(e) => setSelectedFranchiseId(e.target.value)}
            className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">🌐 Global Default (All Franchise Branches)</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                🏬 {f.name} ({f.code})
              </option>
            ))}
          </select>
        </div>

        {/* Permissions Toggle Grid */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {PERMISSION_TOGGLES.map((t) => {
            const isChecked = Boolean(permissions[t.key as keyof typeof permissions]);

            return (
              <div
                key={t.key}
                onClick={() =>
                  setPermissions({
                    ...permissions,
                    [t.key]: !isChecked,
                  })
                }
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isChecked
                    ? t.danger
                      ? "bg-rose-50/60 border-rose-200"
                      : "bg-indigo-50/40 border-indigo-200 shadow-2xs"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{t.label}</span>
                    {t.danger && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                        High Risk
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>
                </div>

                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                />
              </div>
            );
          })}

          {/* Max Discount Limit */}
          <div className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                Maximum POS Discount Limit
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Managers cannot apply discounts higher than this percentage without Super Admin approval
              </p>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={permissions.maxDiscountPercent}
                onChange={(e) =>
                  setPermissions({
                    ...permissions,
                    maxDiscountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
                className="w-16 px-2 py-1 text-xs font-bold text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-600">%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {saveMutation.isPending ? "Saving..." : "Save Permission Matrix"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
