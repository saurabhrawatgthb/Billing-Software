import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Building2,
  Users,
  TrendingUp,
  Clock,
  Search,
  Phone,
  LogOut,
  ChevronDown,
  ChevronRight,
  Edit,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hourglass,
  UtensilsCrossed,
  BarChart3,
  MessageCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Store,
  IndianRupee,
  Calendar,
  MapPin,
  Mail,
  Wifi,
  Badge,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_PRICE: Record<string, number> = {
  STARTER: 7999,
  PRO: 12999,
  ENTERPRISE: 24999,
};

function statusColor(s: string) {
  switch (s) {
    case "ACTIVE":     return { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" };
    case "TRIAL":      return { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" };
    case "PAST_DUE":   return { bg: "rgba(249,115,22,0.12)", text: "#fb923c", border: "rgba(249,115,22,0.3)" };
    case "EXPIRED":    return { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.3)" };
    case "CANCELLED":  return { bg: "rgba(100,116,139,0.12)",text: "#94a3b8", border: "rgba(100,116,139,0.3)" };
    default:           return { bg: "rgba(100,116,139,0.12)",text: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  }
}

function planColor(p: string) {
  switch (p) {
    case "ENTERPRISE": return { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.35)" };
    case "PRO":        return { bg: "rgba(99,102,241,0.15)", text: "#818cf8", border: "rgba(99,102,241,0.35)" };
    default:           return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)" };
  }
}

function leadStatusColor(s: string) {
  switch (s) {
    case "NEW":            return { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" };
    case "CONTACTED":      return { bg: "rgba(99,102,241,0.12)", text: "#818cf8", border: "rgba(99,102,241,0.3)" };
    case "DEMO_SCHEDULED": return { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" };
    case "CONVERTED":      return { bg: "rgba(16,185,129,0.2)",  text: "#10b981", border: "rgba(16,185,129,0.4)" };
    case "REJECTED":       return { bg: "rgba(100,116,139,0.12)",text: "#64748b", border: "rgba(100,116,139,0.3)" };
    default:               return { bg: "rgba(100,116,139,0.12)",text: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  }
}

function StatusIcon({ s }: { s: string }) {
  if (s === "ACTIVE")   return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (s === "TRIAL")    return <Hourglass className="w-3.5 h-3.5" />;
  if (s === "EXPIRED")  return <XCircle className="w-3.5 h-3.5" />;
  if (s === "PAST_DUE") return <AlertTriangle className="w-3.5 h-3.5" />;
  return <XCircle className="w-3.5 h-3.5" />;
}

function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}
const KPICard: React.FC<KPICardProps> = ({ icon, label, value, sub, accent }) => (
  <div
    className="rounded-2xl p-5 border flex flex-col gap-3"
    style={{
      background: "rgba(15,23,42,0.7)",
      borderColor: `${accent}30`,
      backdropFilter: "blur(12px)",
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>
        {label}
      </span>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
    </div>
    <div>
      <div className="text-3xl font-black text-white">{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{sub}</div>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = "tenants" | "leads" | "analytics";

export const PlatformDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();

  const [tab, setTab] = useState<ActiveTab>("tenants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "PRO", subscriptionStatus: "ACTIVE", subscriptionEndsAt: "", maxOfflineHours: 72 });
  const [savingPlan, setSavingPlan] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: orgsRaw = [], isLoading: loadingOrgs, refetch: refetchOrgs } = useQuery<any[]>({
    queryKey: ["platform-orgs"],
    queryFn: async () => (await api.get("/saas/organizations")).data.data,
    refetchInterval: 60_000,
  });

  const { data: leadsRaw = [], isLoading: loadingLeads, refetch: refetchLeads } = useQuery<any[]>({
    queryKey: ["platform-leads"],
    queryFn: async () => (await api.get("/saas/demo-requests")).data.data,
    refetchInterval: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/saas/demo-requests/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-leads"] }),
  });

  const handleSavePlan = async () => {
    if (!editingOrg) return;
    setSavingPlan(true);
    try {
      await api.patch(`/saas/organizations/${editingOrg.id}`, planForm);
      qc.invalidateQueries({ queryKey: ["platform-orgs"] });
      setEditingOrg(null);
    } finally {
      setSavingPlan(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const orgs: any[] = orgsRaw;
  const leads: any[] = leadsRaw;

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      o.name?.toLowerCase().includes(q) ||
      o.ownerName?.toLowerCase().includes(q) ||
      o.ownerEmail?.toLowerCase().includes(q) ||
      o.city?.toLowerCase().includes(q);
    const matchS = statusFilter === "ALL" || o.subscriptionStatus === statusFilter;
    return matchQ && matchS;
  });

  const totalOutlets = orgs.reduce((a, o) => a + (o.outletsCount || 1), 0);
  const activeOrgs   = orgs.filter((o) => o.subscriptionStatus === "ACTIVE").length;
  const trialOrgs    = orgs.filter((o) => o.subscriptionStatus === "TRIAL").length;
  const pendingLeads = leads.filter((l) => l.status === "NEW").length;
  const arr          = orgs.reduce((a, o) => a + (PLAN_PRICE[o.plan] || 0), 0);

  const handleLogout = () => {
    logout();
    navigate("/platform-login", { replace: true });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #020617 0%, #0f172a 50%, #0a0f1e 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 border-b"
        style={{
          background: "rgba(2,6,23,0.92)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(99,102,241,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
          >
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight">OmniPOS Platform</p>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#6366f1" }}>
              Owner Control Tower
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { refetchOrgs(); refetchLeads(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{ color: "#64748b", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ color: "#818cf8", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Landing Page
          </a>

          <div className="flex items-center gap-2 pl-4" style={{ borderLeft: "1px solid rgba(99,102,241,0.15)" }}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {user?.name?.[0] || "A"}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white">{user?.name || "Admin"}</p>
              <p className="text-[10px]" style={{ color: "#475569" }}>Platform Owner</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 rounded-xl cursor-pointer transition-all"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 sm:p-8 border relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.08) 100%)",
            borderColor: "rgba(99,102,241,0.25)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: "#6366f1" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6366f1" }}>
                Platform Overview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              {orgs.length} restaurant{orgs.length !== 1 ? "s" : ""} are using OmniPOS.
              {trialOrgs > 0 && ` ${trialOrgs} in free trial.`}
              {pendingLeads > 0 && ` ${pendingLeads} new demo lead${pendingLeads > 1 ? "s" : ""} need your attention.`}
            </p>
          </div>
        </div>

        {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={<Building2 className="w-5 h-5" />}
            label="Total Restaurants"
            value={orgs.length}
            sub={`${activeOrgs} active · ${trialOrgs} trial`}
            accent="#6366f1"
          />
          <KPICard
            icon={<Store className="w-5 h-5" />}
            label="Total Outlets"
            value={totalOutlets}
            sub="POS counters running"
            accent="#10b981"
          />
          <KPICard
            icon={<IndianRupee className="w-5 h-5" />}
            label="Est. Annual Revenue"
            value={`₹${arr.toLocaleString("en-IN")}`}
            sub="Based on plan rates"
            accent="#f59e0b"
          />
          <KPICard
            icon={<Users className="w-5 h-5" />}
            label="Total Users"
            value={orgs.reduce((a, o) => a + (o.usersCount || 0), 0)}
            sub="Across all restaurants"
            accent="#8b5cf6"
          />
          <KPICard
            icon={<MessageCircle className="w-5 h-5" />}
            label="Demo Leads"
            value={leads.length}
            sub={`${pendingLeads} need callback`}
            accent="#ec4899"
          />
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 rounded-2xl w-fit" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(99,102,241,0.12)" }}>
          {([
            { id: "tenants",   label: "Restaurants",  icon: <UtensilsCrossed className="w-3.5 h-3.5" />, badge: orgs.length },
            { id: "leads",     label: "Demo Leads",   icon: <MessageCircle className="w-3.5 h-3.5" />,  badge: pendingLeads || undefined },
            { id: "analytics", label: "Analytics",    icon: <BarChart3 className="w-3.5 h-3.5" /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={
                tab === t.id
                  ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }
                  : { color: "#64748b" }
              }
            >
              {t.icon}
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black"
                  style={{ background: tab === t.id ? "rgba(255,255,255,0.25)" : "rgba(239,68,68,0.2)", color: tab === t.id ? "#fff" : "#f87171" }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: TENANTS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "tenants" && (
          <div className="space-y-4">
            {/* Filters */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl border"
              style={{ background: "rgba(15,23,42,0.7)", borderColor: "rgba(99,102,241,0.12)" }}
            >
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#475569" }} />
                <input
                  id="tenant-search"
                  placeholder="Search restaurant, owner, city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none text-white"
                  style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(99,102,241,0.2)", color: "#e2e8f0" }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(99,102,241,0.2)", color: "#e2e8f0" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <span className="text-xs ml-auto" style={{ color: "#475569" }}>
                {filtered.length} of {orgs.length} shown
              </span>
            </div>

            {/* Restaurant cards */}
            {loadingOrgs ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center border"
                style={{ background: "rgba(15,23,42,0.5)", borderColor: "rgba(99,102,241,0.1)" }}
              >
                <UtensilsCrossed className="w-10 h-10 mx-auto mb-3" style={{ color: "#1e293b" }} />
                <p className="text-sm font-semibold" style={{ color: "#475569" }}>No restaurants found</p>
                <p className="text-xs mt-1" style={{ color: "#334155" }}>
                  Share{" "}
                  <a href="/signup" className="text-indigo-400 font-bold" target="_blank" rel="noreferrer">
                    your signup page
                  </a>{" "}
                  to onboard new clients
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((org) => {
                  const sc = statusColor(org.subscriptionStatus);
                  const pc = planColor(org.plan);
                  const isExpanded = expandedOrg === org.id;
                  const daysTillExpiry = org.trialEndsAt
                    ? Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000)
                    : org.subscriptionEndsAt
                    ? Math.ceil((new Date(org.subscriptionEndsAt).getTime() - Date.now()) / 86400000)
                    : null;

                  return (
                    <div
                      key={org.id}
                      className="rounded-2xl border overflow-hidden transition-all"
                      style={{
                        background: "rgba(15,23,42,0.75)",
                        borderColor: isExpanded ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.12)",
                        boxShadow: isExpanded ? "0 0 30px rgba(99,102,241,0.08)" : "none",
                      }}
                    >
                      {/* Row */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Avatar */}
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                        >
                          {org.name?.[0]?.toUpperCase() || "R"}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-white truncate">{org.name}</span>
                            <span
                              className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                              style={{ background: pc.bg, color: pc.text, borderColor: pc.border }}
                            >
                              {org.plan}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                              style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                            >
                              <StatusIcon s={org.subscriptionStatus} />
                              {org.subscriptionStatus}
                            </span>
                            {daysTillExpiry != null && daysTillExpiry <= 7 && daysTillExpiry > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {daysTillExpiry}d left
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            <span className="text-xs" style={{ color: "#64748b" }}>
                              <span style={{ color: "#475569" }}>Owner:</span> {org.ownerName}
                            </span>
                            {org.city && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "#64748b" }}>
                                <MapPin className="w-2.5 h-2.5" /> {org.city}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "#64748b" }}>
                              {org.outletsCount || 1} outlet{(org.outletsCount || 1) !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs" style={{ color: "#64748b" }}>
                              {org.usersCount || 1} user{(org.usersCount || 1) !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs" style={{ color: "#334155" }}>
                              Joined {new Date(org.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingOrg(org);
                              setPlanForm({
                                plan: org.plan,
                                subscriptionStatus: org.subscriptionStatus,
                                subscriptionEndsAt: org.subscriptionEndsAt ? org.subscriptionEndsAt.split("T")[0] : "",
                                maxOfflineHours: org.maxOfflineHours || 72,
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            style={{ color: "#818cf8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                          >
                            <Edit className="w-3 h-3" /> Manage
                          </button>
                          <button
                            onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                            className="p-2 rounded-xl cursor-pointer transition-all"
                            style={{ color: "#475569", background: "rgba(99,102,241,0.06)" }}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded: outlets list */}
                      {isExpanded && (
                        <div
                          className="border-t px-5 py-4 space-y-2"
                          style={{ borderColor: "rgba(99,102,241,0.12)", background: "rgba(2,6,23,0.4)" }}
                        >
                          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#475569" }}>
                            Outlets / Branches
                          </p>
                          {org.franchises?.length > 0 ? (
                            org.franchises.map((f: any) => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                                style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(99,102,241,0.1)" }}
                              >
                                <div className="flex items-center gap-3">
                                  <Store className="w-4 h-4" style={{ color: "#475569" }} />
                                  <div>
                                    <p className="text-xs font-bold text-white">{f.name}</p>
                                    <p className="text-[10px] font-mono" style={{ color: "#475569" }}>Code: {f.code}</p>
                                  </div>
                                </div>
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={
                                    f.isActive
                                      ? { background: "rgba(16,185,129,0.12)", color: "#34d399" }
                                      : { background: "rgba(100,116,139,0.12)", color: "#64748b" }
                                  }
                                >
                                  {f.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs" style={{ color: "#334155" }}>No outlets found for this organization.</p>
                          )}

                          {/* Contact quick actions */}
                          <div className="flex items-center gap-3 pt-2">
                            <a
                              href={`https://wa.me/${org.ownerPhone?.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                              style={{ color: "#34d399", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
                            >
                              <Phone className="w-3 h-3" /> WhatsApp: {org.ownerPhone}
                            </a>
                            <a
                              href={`mailto:${org.ownerEmail}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                              style={{ color: "#818cf8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                            >
                              <Mail className="w-3 h-3" /> {org.ownerEmail}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: DEMO LEADS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "leads" && (
          <div className="space-y-4">
            {loadingLeads ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leads.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center border"
                style={{ background: "rgba(15,23,42,0.5)", borderColor: "rgba(99,102,241,0.1)" }}
              >
                <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#1e293b" }} />
                <p className="text-sm font-semibold" style={{ color: "#475569" }}>No demo requests yet</p>
                <p className="text-xs mt-1" style={{ color: "#334155" }}>
                  Leads from the public landing page will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => {
                  const lc = leadStatusColor(lead.status);
                  return (
                    <div
                      key={lead.id}
                      className="rounded-2xl border p-5"
                      style={{
                        background: "rgba(15,23,42,0.75)",
                        borderColor: lead.status === "NEW" ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.12)",
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-white">{lead.restaurantName}</span>
                            <span
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                              style={{ background: lc.bg, color: lc.text, borderColor: lc.border }}
                            >
                              {lead.status?.replace("_", " ")}
                            </span>
                            {lead.status === "NEW" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 animate-pulse">
                                🔔 New
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#64748b" }}>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {lead.ownerName}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.city}</span>
                            <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {lead.outletType} · {lead.outletCount} outlet(s)</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeAgo(lead.createdAt)}</span>
                          </div>
                          {lead.notes && (
                            <p className="text-xs italic mt-1" style={{ color: "#475569" }}>"{lead.notes}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadMutation.mutate({ id: lead.id, status: e.target.value })}
                            className="text-xs font-semibold px-3 py-2 rounded-xl outline-none cursor-pointer"
                            style={{ background: "rgba(2,6,23,0.8)", color: "#e2e8f0", border: "1px solid rgba(99,102,241,0.2)" }}
                          >
                            <option value="NEW">New Lead</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                            <option value="CONVERTED">Converted ✓</option>
                            <option value="REJECTED">Not Interested</option>
                          </select>

                          <a
                            href={`https://wa.me/91${lead.phone?.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                            style={{ color: "#34d399", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
                          >
                            <Phone className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: ANALYTICS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan breakdown */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "rgba(15,23,42,0.75)", borderColor: "rgba(99,102,241,0.15)" }}
            >
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "#6366f1" }} /> Plan Breakdown
              </h3>
              <div className="space-y-3">
                {(["STARTER", "PRO", "ENTERPRISE"] as const).map((p) => {
                  const count = orgs.filter((o) => o.plan === p).length;
                  const pct = orgs.length ? Math.round((count / orgs.length) * 100) : 0;
                  const pc = planColor(p);
                  return (
                    <div key={p}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: pc.text }} className="font-bold">{p}</span>
                        <span style={{ color: "#64748b" }}>{count} restaurants · ₹{(count * PLAN_PRICE[p]).toLocaleString("en-IN")}/yr</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pc.text }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status breakdown */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "rgba(15,23,42,0.75)", borderColor: "rgba(99,102,241,0.15)" }}
            >
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: "#10b981" }} /> Subscription Health
              </h3>
              <div className="space-y-3">
                {(["ACTIVE", "TRIAL", "PAST_DUE", "EXPIRED", "CANCELLED"] as const).map((s) => {
                  const count = orgs.filter((o) => o.subscriptionStatus === s).length;
                  const pct = orgs.length ? Math.round((count / orgs.length) * 100) : 0;
                  const sc = statusColor(s);
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: sc.text }} className="font-bold flex items-center gap-1">
                          <StatusIcon s={s} /> {s}
                        </span>
                        <span style={{ color: "#64748b" }}>{count} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: sc.text }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue summary */}
            <div
              className="rounded-2xl p-6 border lg:col-span-2"
              style={{ background: "rgba(15,23,42,0.75)", borderColor: "rgba(99,102,241,0.15)" }}
            >
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" style={{ color: "#f59e0b" }} /> Revenue Snapshot
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Annual Recurring Revenue", value: `₹${arr.toLocaleString("en-IN")}`, sub: "If all pay annually" },
                  { label: "Monthly Recurring Revenue", value: `₹${Math.round(arr / 12).toLocaleString("en-IN")}`, sub: "ARR ÷ 12" },
                  { label: "Trial Conversion Needed", value: trialOrgs, sub: "Users in 14-day trial" },
                  { label: "Leads in Pipeline", value: leads.filter((l) => ["NEW","CONTACTED","DEMO_SCHEDULED"].includes(l.status)).length, sub: "Potential new revenue" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4"
                    style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(99,102,241,0.1)" }}
                  >
                    <p className="text-xs" style={{ color: "#475569" }}>{item.label}</p>
                    <p className="text-xl font-black text-white mt-1">{item.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#334155" }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Edit Subscription Plan
      ══════════════════════════════════════════════════════════════════════ */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(12px)" }}>
          <div
            className="w-full max-w-md rounded-3xl p-7 border shadow-2xl space-y-5"
            style={{
              background: "rgba(15,23,42,0.98)",
              borderColor: "rgba(99,102,241,0.3)",
              boxShadow: "0 0 60px rgba(99,102,241,0.15)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-white">{editingOrg.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Manage subscription plan &amp; status</p>
              </div>
              <button onClick={() => setEditingOrg(null)} className="p-2 rounded-xl cursor-pointer" style={{ color: "#475569", background: "rgba(255,255,255,0.04)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#64748b" }}>Plan</label>
                <select value={planForm.plan} onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })} className="w-full px-4 py-2.5 rounded-xl outline-none text-white text-sm" style={{ background: "rgba(2,6,23,0.8)", border: "1px solid rgba(99,102,241,0.3)", color: "#e2e8f0" }}>
                  <option value="STARTER">Starter — ₹7,999/yr (QSR / Counter)</option>
                  <option value="PRO">Pro — ₹12,999/yr (Dine-In + KDS)</option>
                  <option value="ENTERPRISE">Enterprise — ₹24,999/yr (Multi-Branch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#64748b" }}>Subscription Status</label>
                <select value={planForm.subscriptionStatus} onChange={(e) => setPlanForm({ ...planForm, subscriptionStatus: e.target.value })} className="w-full px-4 py-2.5 rounded-xl outline-none text-white text-sm" style={{ background: "rgba(2,6,23,0.8)", border: "1px solid rgba(99,102,241,0.3)", color: "#e2e8f0" }}>
                  <option value="TRIAL">Trial Mode (14 days)</option>
                  <option value="ACTIVE">Active — Paid &amp; Running</option>
                  <option value="PAST_DUE">Past Due — Grace Period</option>
                  <option value="EXPIRED">Expired — Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#64748b" }}>Subscription Expiry Date</label>
                <input type="date" value={planForm.subscriptionEndsAt} onChange={(e) => setPlanForm({ ...planForm, subscriptionEndsAt: e.target.value })} className="w-full px-4 py-2.5 rounded-xl outline-none text-white text-sm" style={{ background: "rgba(2,6,23,0.8)", border: "1px solid rgba(99,102,241,0.3)", color: "#e2e8f0" }} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#64748b" }}>Max Offline Grace Hours</label>
                <input type="number" min={12} max={720} value={planForm.maxOfflineHours} onChange={(e) => setPlanForm({ ...planForm, maxOfflineHours: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl outline-none text-white text-sm" style={{ background: "rgba(2,6,23,0.8)", border: "1px solid rgba(99,102,241,0.3)", color: "#e2e8f0" }} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditingOrg(null)} className="flex-1 py-3 rounded-2xl text-sm font-bold cursor-pointer" style={{ color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white cursor-pointer flex items-center justify-center gap-2"
                style={{ background: savingPlan ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: savingPlan ? "none" : "0 0 20px rgba(99,102,241,0.3)" }}
              >
                {savingPlan ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
