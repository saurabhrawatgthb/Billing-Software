import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  DollarSign,
  Search,
  Clock,
  Phone,
  X,
  Edit,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "../../services/api.js";
import { StatCard } from "../../components/common/StatCard.js";
import { Card } from "../../components/common/Card.js";
import { Button } from "../../components/common/Button.js";
import { LoadingState } from "../../components/common/LoadingState.js";

export const SaaSAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tenants" | "leads">("tenants");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected organization for editing plan / status
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    plan: "PRO",
    subscriptionStatus: "ACTIVE",
    subscriptionEndsAt: "",
    maxOfflineHours: 72,
  });

  // Query: Organizations (Tenants)
  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: async () => {
      const res = await api.get("/saas/organizations");
      return res.data.data;
    },
  });

  // Query: Demo Leads
  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["saas-demo-requests"],
    queryFn: async () => {
      const res = await api.get("/saas/demo-requests");
      return res.data.data;
    },
  });

  // Mutation: Update Organization
  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/saas/organizations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      setEditingOrg(null);
    },
  });

  // Mutation: Update Lead Status
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/saas/demo-requests/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-demo-requests"] });
    },
  });

  const organizations = (orgsData as any[]) || [];
  const leads = (leadsData as any[]) || [];

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    const matchesQuery =
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || org.subscriptionStatus === statusFilter;

    return matchesQuery && matchesStatus;
  });

  // KPI Calculations
  const totalTenants = organizations.length;
  const activeTenants = organizations.filter(
    (o) => o.subscriptionStatus === "ACTIVE" || o.subscriptionStatus === "TRIAL"
  ).length;
  const totalOutlets = organizations.reduce((acc, o) => acc + (o.outletsCount || 1), 0);
  const pendingLeads = leads.filter((l) => l.status === "NEW").length;

  if (isLoadingOrgs && isLoadingLeads) {
    return <LoadingState message="Loading SaaS Control Tower..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Platform Master Console
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2">
            SaaS Control Tower
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your subscribed restaurant brands, active outlets, trial expiry dates, and website demo leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tenants"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Restaurants ({organizations.length})
            </button>
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "leads"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Demo Leads</span>
              {pendingLeads > 0 && (
                <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingLeads}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Brands / Tenants"
          value={totalTenants}
          subtitle={`${activeTenants} Active or in Trial`}
          icon={<Building2 className="w-6 h-6" />}
          color="indigo"
        />
        <StatCard
          title="Total Active Outlets"
          value={totalOutlets}
          subtitle="Physical POS counters connected"
          icon={<UtensilsCrossed className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Estimated Annual ARR"
          value={`₹${(totalTenants * 12999).toLocaleString("en-IN")}`}
          subtitle="Based on active subscriptions"
          icon={<DollarSign className="w-6 h-6" />}
          color="cyan"
        />
        <StatCard
          title="Website Demo Inquiries"
          value={leads.length}
          subtitle={`${pendingLeads} require callback`}
          icon={<Clock className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* =========================================================================
          TAB 1: RESTAURANT TENANTS
      ========================================================================= */}
      {activeTab === "tenants" && (
        <Card
          title="Registered Restaurant Brands"
          subtitle="Overview of all customer accounts, active subscriptions, and connected outlets"
          action={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brand, owner, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-100">
                <tr>
                  <th className="px-6 py-3">Restaurant Brand</th>
                  <th className="px-6 py-3">Owner Contact</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Outlets</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-500">
                      No restaurant tenants found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{org.name}</span>
                          <span className="text-[11px] text-gray-500 font-mono">slug: {org.slug}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-gray-800">{org.ownerName}</span>
                          <span className="text-gray-500">{org.ownerEmail}</span>
                          <span className="text-gray-500 font-mono">{org.ownerPhone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">{org.city || "—"}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            org.plan === "ENTERPRISE"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : org.plan === "PRO"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {org.plan}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            org.subscriptionStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : org.subscriptionStatus === "TRIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {org.subscriptionStatus}
                        </span>
                        {org.trialEndsAt && org.subscriptionStatus === "TRIAL" && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Trial till {new Date(org.trialEndsAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                        {org.outletsCount || 1} Outlets
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setEditingOrg(org);
                            setPlanForm({
                              plan: org.plan,
                              subscriptionStatus: org.subscriptionStatus,
                              subscriptionEndsAt: org.subscriptionEndsAt
                                ? org.subscriptionEndsAt.split("T")[0]
                                : "",
                              maxOfflineHours: org.maxOfflineHours || 72,
                            });
                          }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 2: DEMO LEADS
      ========================================================================= */}
      {activeTab === "leads" && (
        <Card
          title="Incoming Website Demo Requests & Leads"
          subtitle="Prospective restaurant owners who filled out the demo request form"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-100">
                <tr>
                  <th className="px-6 py-3">Restaurant Name</th>
                  <th className="px-6 py-3">Owner Contact</th>
                  <th className="px-6 py-3">City / Type</th>
                  <th className="px-6 py-3">Outlets</th>
                  <th className="px-6 py-3">Received</th>
                  <th className="px-6 py-3">Lead Status</th>
                  <th className="px-6 py-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-500">
                      No demo inquiries yet. Leads from the public website will show up here.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{lead.restaurantName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-gray-800">{lead.ownerName}</span>
                          <span className="text-gray-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" /> {lead.phone}
                          </span>
                          <span className="text-gray-400">{lead.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{lead.city}</span>
                          <span className="text-gray-500 text-[11px]">{lead.outletType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700">{lead.outletCount}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLeadMutation.mutate({ id: lead.id, status: e.target.value })
                          }
                          className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1 font-semibold text-gray-700 focus:outline-none"
                        >
                          <option value="NEW">New Lead</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                          <option value="CONVERTED">Converted (Customer)</option>
                          <option value="REJECTED">Not Interested</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                        >
                          WhatsApp Call
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* =========================================================================
          MODAL: EDIT TENANT SUBSCRIPTION & PLAN
      ========================================================================= */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-950">
                  Manage: {editingOrg.name}
                </h3>
                <p className="text-xs text-gray-500">Owner: {editingOrg.ownerEmail}</p>
              </div>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Assigned Plan</label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900"
                >
                  <option value="STARTER">Starter (QSR / Counter)</option>
                  <option value="PRO">Pro (Dine-In + KDS + Recipes)</option>
                  <option value="ENTERPRISE">Enterprise (Multi-Branch + Aggregators)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Subscription Status
                </label>
                <select
                  value={planForm.subscriptionStatus}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, subscriptionStatus: e.target.value })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900"
                >
                  <option value="TRIAL">Trial Mode</option>
                  <option value="ACTIVE">Active (Paid)</option>
                  <option value="PAST_DUE">Past Due (Grace Period)</option>
                  <option value="EXPIRED">Expired (Suspended)</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Subscription Expiry Date
                </label>
                <input
                  type="date"
                  value={planForm.subscriptionEndsAt}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, subscriptionEndsAt: e.target.value })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Max Offline Grace Hours
                </label>
                <input
                  type="number"
                  min={12}
                  max={720}
                  value={planForm.maxOfflineHours}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, maxOfflineHours: Number(e.target.value) })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setEditingOrg(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={updateOrgMutation.isPending}
                onClick={() => {
                  updateOrgMutation.mutate({
                    id: editingOrg.id,
                    data: planForm,
                  });
                }}
              >
                {updateOrgMutation.isPending ? "Saving Changes..." : "Update Subscription"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
