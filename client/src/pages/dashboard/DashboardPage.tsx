import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  Users,
  Grid3X3,
  ChefHat,
  Banknote,
  TrendingUp,
  ArrowRight,
  Clock,
  Plus,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { StatCard } from "../../components/common/StatCard.js";
import { Card } from "../../components/common/Card.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { Button } from "../../components/common/Button.js";

export const DashboardPage: React.FC = () => {
  const { user, selectedFranchiseId } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN" && !selectedFranchiseId;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedFranchiseId],
    queryFn: async () => {
      const res = await api.get("/reports/dashboard");
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: globalReport } = useQuery({
    queryKey: ["global-report"],
    queryFn: async () => {
      const res = await api.get("/reports/global");
      return res.data.data;
    },
    enabled: isSuperAdmin,
  });

  if (isLoading) {
    return <LoadingState message="Loading live operational metrics..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-950/50">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name} 👋
          </h2>
          <p className="text-indigo-200 text-sm mt-1">
            {isSuperAdmin
              ? "Centralized Global Franchise Overview & Business Health"
              : `Operational Control Dashboard for ${user?.franchise?.name || "Your Franchise"}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isSuperAdmin && (
            <Link to="/pos">
              <Button variant="primary" size="md" icon={<ShoppingCart className="w-4 h-4" />}>
                Open POS Terminal
              </Button>
            </Link>
          )}
          <Link to="/reports">
            <Button variant="secondary" size="md" icon={<TrendingUp className="w-4 h-4" />}>
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Franchises"
            value={stats?.totalFranchises || 0}
            subtitle={`${stats?.activeFranchises || 0} Active Units`}
            icon={<Building2 className="w-6 h-6" />}
            color="indigo"
          />
          <StatCard
            title="Today's Revenue"
            value={`₹${(stats?.todayRevenue || 0).toLocaleString("en-IN")}`}
            subtitle={`${stats?.todayOrdersCount || 0} Orders Today`}
            icon={<DollarSign className="w-6 h-6" />}
            color="emerald"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${(stats?.monthlyRevenue || 0).toLocaleString("en-IN")}`}
            subtitle={`${stats?.monthlyOrdersCount || 0} Monthly Orders`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="cyan"
          />
          <StatCard
            title="Total Staff"
            value={stats?.totalEmployees || 0}
            subtitle={`${stats?.pendingPayrollCount || 0} Draft Payrolls`}
            icon={<Users className="w-6 h-6" />}
            color="purple"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Today's Revenue"
            value={`₹${(stats?.todayRevenue || 0).toLocaleString("en-IN")}`}
            subtitle={`${stats?.todayOrdersCount || 0} Orders Placed`}
            icon={<DollarSign className="w-6 h-6" />}
            color="emerald"
          />
          <StatCard
            title="Active Tables"
            value={`${stats?.occupiedTables || 0} / ${stats?.totalTables || 0}`}
            subtitle={`${stats?.availableTables || 0} Tables Available`}
            icon={<Grid3X3 className="w-6 h-6" />}
            color="indigo"
          />
          <StatCard
            title="Kitchen Tickets"
            value={stats?.activeKOTsCount || 0}
            subtitle="Tickets in Preparation"
            icon={<ChefHat className="w-6 h-6" />}
            color="amber"
          />
          <StatCard
            title="Staff on Shift"
            value={`${stats?.presentStaffCount || 0} / ${stats?.totalEmployees || 0}`}
            subtitle="Present Today"
            icon={<Users className="w-6 h-6" />}
            color="purple"
          />
        </div>
      )}

      {/* Global Franchises Performance Table (Super Admin only) */}
      {isSuperAdmin && globalReport && (
        <Card
          title="Franchise Performance Overview"
          subtitle="Real-time performance ranking across all operational franchises"
          action={
            <Link to="/franchises">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                Manage All Franchises
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-100">
                <tr>
                  <th className="px-6 py-3">Franchise</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Franchise Manager</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Orders</th>
                  <th className="px-6 py-3">Revenue</th>
                  <th className="px-6 py-3">Avg Order Value</th>
                  <th className="px-6 py-3">Staff / Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {globalReport.franchises?.map((f: any) => (
                  <tr key={f.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{f.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{f.code}</td>
                    <td className="px-6 py-4">
                      {f.managers && f.managers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {f.managers.map((m: any) => (
                            <div key={m.id} className="flex flex-col">
                              <span className="font-semibold text-gray-900 text-xs">{m.name}</span>
                              <span className="text-[11px] text-gray-500 font-mono">{m.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                          No Manager Assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          f.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {f.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{f.ordersCount}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">
                      ₹{f.revenue.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ₹{Math.round(f.averageOrderValue).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {f.employeesCount} Staff • {f.usersCount || 0} Logins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick Access Grid for Franchise Operations */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="Fast Operations"
            subtitle="Quick jump to key operational screens"
          >
            <div className="grid grid-cols-2 gap-3">
              <Link to="/pos">
                <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs flex flex-col items-center justify-center text-center transition-all cursor-pointer">
                  <ShoppingCart className="w-5 h-5 mb-1.5" />
                  <span>POS Billing</span>
                </div>
              </Link>
              <Link to="/kitchen">
                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 text-amber-700 font-semibold text-xs flex flex-col items-center justify-center text-center transition-all cursor-pointer">
                  <ChefHat className="w-5 h-5 mb-1.5" />
                  <span>Kitchen (KDS)</span>
                </div>
              </Link>
              <Link to="/inventory">
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs flex flex-col items-center justify-center text-center transition-all cursor-pointer">
                  <Grid3X3 className="w-5 h-5 mb-1.5" />
                  <span>Inventory</span>
                </div>
              </Link>
              <Link to="/expenses">
                <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-semibold text-xs flex flex-col items-center justify-center text-center transition-all cursor-pointer">
                  <Banknote className="w-5 h-5 mb-1.5" />
                  <span>Expenses</span>
                </div>
              </Link>
            </div>
          </Card>

          {/* Franchise Staff & Team Section */}
          <Card
            title="Franchise Staff & Active Team"
            subtitle={`Showing registered employees and staff in ${user?.franchise?.name || "your outlet"}`}
            className="md:col-span-2"
            action={
              <div className="flex items-center gap-2">
                <Link to="/attendance">
                  <Button variant="outline" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
                    Attendance Sheet
                  </Button>
                </Link>
                <Link to="/employees">
                  <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Manage Staff
                  </Button>
                </Link>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Shift Attendance Snapshot Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {stats?.presentStaffCount || 0} of {stats?.totalEmployees || 0} Staff Present Today
                    </p>
                    <p className="text-xs text-gray-500">
                      Total {stats?.totalEmployees || 0} registered employees • {stats?.activeUsersCount || 0} active login accounts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/advances">
                    <Button variant="secondary" size="sm">
                      Advances
                    </Button>
                  </Link>
                  <Link to="/attendance">
                    <Button variant="primary" size="sm">
                      Mark Attendance
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Employees Table */}
              {!stats?.employees || stats.employees.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-400" />
                  <p className="text-sm font-semibold text-gray-600">No employees registered yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Add staff members to track attendance and manage salary advances.
                  </p>
                  <Link to="/employees" className="mt-3 inline-block">
                    <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                      Add Employee
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2.5">Employee</th>
                        <th className="px-4 py-2.5">Code</th>
                        <th className="px-4 py-2.5">Designation</th>
                        <th className="px-4 py-2.5">Contact</th>
                        <th className="px-4 py-2.5">Today's Shift</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.employees.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.name?.charAt(0)?.toUpperCase() || "E"}
                              </div>
                              <span className="font-semibold text-gray-900 text-xs">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-xs text-indigo-600">
                            {emp.employeeCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-xs text-gray-700">
                            {emp.designation || "Staff"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {emp.phone || emp.email || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                emp.todayAttendance === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : emp.todayAttendance === "HALF_DAY"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {emp.todayAttendance === "PRESENT"
                                ? "✓ Present Today"
                                : emp.todayAttendance === "HALF_DAY"
                                ? "Half Day"
                                : "Not Marked Yet"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                emp.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Login Accounts Row */}
              {stats?.users && stats.users.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Franchise System Accounts ({stats.users.length})
                    </span>
                    <Link to="/users" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                      Manage Logins →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stats.users.map((u: any) => (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-lg border border-gray-200/80 bg-white flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{u.email}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
