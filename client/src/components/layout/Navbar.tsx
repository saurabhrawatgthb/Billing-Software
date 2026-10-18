import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Globe,
  Wifi,
  RefreshCw,
  Clock,
  ChevronDown,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { api, extractErrorMessage } from "../../services/api.js";
import type { Franchise } from "../../types/index.js";
import { Badge } from "../common/Badge.js";
import { DailyRegisterModal } from "../register/DailyRegisterModal.js";
import { getDefaultRoleHome } from "./ProtectedRoute.js";

export const Navbar: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isFetchingCount = useIsFetching();
  const isSyncing = isFetchingCount > 0;
  const { user, selectedFranchiseId, setSelectedFranchise, login, logout } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch franchises list for Super Admin dropdown
  const { data: franchises } = useQuery<Franchise[]>({
    queryKey: ["navbar-franchises"],
    queryFn: async () => {
      const res = await api.get("/franchises");
      return res.data.data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch Current Register Session for the active franchise
  const activeFranchiseId = selectedFranchiseId || user?.franchiseId;
  const { data: currentRegister } = useQuery({
    queryKey: ["current-register", activeFranchiseId],
    queryFn: async () => {
      if (!activeFranchiseId) return null;
      const res = await api.get(`/registers/current?franchiseId=${activeFranchiseId}`);
      return res.data.data;
    },
    enabled: !!activeFranchiseId,
    refetchInterval: 10000,
  });

  const isRegisterOpen = currentRegister?.status === "OPEN";

  // Fetch Linked Accounts for this user's email
  const { data: linkedAccounts = [] } = useQuery({
    queryKey: ["my-linked-accounts"],
    queryFn: async () => {
      const res = await api.get("/auth/my-accounts");
      return res.data.data;
    },
  });

  // Switch Account Mutation
  const switchAccountMutation = useMutation({
    mutationFn: async (targetAccountId: string) => {
      const res = await api.post("/auth/switch-account", { targetAccountId });
      return res.data.data;
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      setIsProfileDropdownOpen(false);
      queryClient.clear();
      const targetHome = getDefaultRoleHome(data.user.role);
      navigate(targetHome);
    },
    onError: (err) => {
      alert(extractErrorMessage(err));
    },
  });

  // If selected franchise was deactivated or removed, reset scope to Global View
  useEffect(() => {
    if (isSuperAdmin && selectedFranchiseId && franchises) {
      const match = franchises.find((f) => f.id === selectedFranchiseId);
      if (!match || !match.isActive) {
        setSelectedFranchise(null);
      }
    }
  }, [isSuperAdmin, franchises, selectedFranchiseId, setSelectedFranchise]);

  const activeFranchiseName = isSuperAdmin
    ? franchises?.find((f) => f.id === selectedFranchiseId)?.name || "All Franchises (Global)"
    : user?.franchise?.name || "My Franchise";

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
      {/* Left: Franchise context */}
      <div className="flex items-center gap-3">
        {isSuperAdmin ? (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tenant Scope:
            </span>
            <select
              value={selectedFranchiseId || ""}
              onChange={(e) => setSelectedFranchise(e.target.value || null)}
              className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">🌐 All Franchises (Global View)</option>
              {franchises
                ?.filter((f) => f.isActive)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    🏬 {f.name} ({f.code})
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">
              {activeFranchiseName}
            </span>
            {user?.franchise?.code && (
              <Badge variant="gray" size="sm">
                {user.franchise.code}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Right: Status, Role & Profile */}
      <div className="flex items-center gap-3">
        {/* Daily Register Day Open / Day Close Button */}
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          title="Daily register, cash float, and closing Z-Report"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isRegisterOpen
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              : "bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 animate-pulse"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isRegisterOpen ? "🟢 Day Open" : "🔴 Day Closed"}</span>
        </button>

        {/* Global Instant Refresh & Sync Button */}
        <button
          onClick={() => {
            queryClient.invalidateQueries();
          }}
          disabled={isSyncing}
          title="Force refresh & sync all data across modules"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Refresh"}</span>
        </button>

        {/* Real-time sync badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-[11px] font-semibold text-emerald-700">
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Live</span>
        </div>

        {/* User Role Badge */}
        <Badge variant="primary" size="md">
          {user?.role.replace("_", " ")}
        </Badge>

        {/* User Profile & Account Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 pl-3 border-l border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-sm font-semibold text-gray-800 block leading-tight">
                {user?.name}
              </span>
              <span className="text-[10px] text-gray-400 block leading-tight font-mono">
                {user?.email}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                <p className="text-[11px] text-gray-500 font-mono truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                  <Shield className="w-3 h-3" />
                  <span>{user?.role.replace("_", " ")}</span>
                  {user?.franchise && (
                    <span className="text-gray-400">• {user.franchise.name}</span>
                  )}
                </div>
              </div>

              {/* Multi-Account Switching Section */}
              {linkedAccounts.filter((a: any) => a.id !== user?.id).length > 0 && (
                <div className="p-2 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block mb-1">
                    Switch Active Profile
                  </span>
                  <div className="space-y-1">
                    {linkedAccounts
                      .filter((a: any) => a.id !== user?.id)
                      .map((account: any) => (
                        <button
                          key={account.id}
                          onClick={() => switchAccountMutation.mutate(account.id)}
                          disabled={switchAccountMutation.isPending}
                          className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <span className="text-xs font-bold text-gray-800 block group-hover:text-indigo-900">
                              {account.role.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-gray-500 block truncate">
                              {account.franchise ? account.franchise.name : "Global Admin"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            Switch →
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Logout Option */}
              <div className="p-1">
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    logout();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Register Modal */}
      <DailyRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        franchiseId={activeFranchiseId}
      />
    </header>
  );
};
