import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import type { RestaurantTable } from "../../types/index.js";
import { Button } from "../common/Button.js";

interface TableLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTableId?: string | null;
  onSelectTable: (table: RestaurantTable | null) => void;
  mode?: "POS" | "BILLING";
  onSettleBillForTable?: (table: RestaurantTable) => void;
  franchiseId?: string | null;
}

export const TableLayoutModal: React.FC<TableLayoutModalProps> = ({
  isOpen,
  onClose,
  selectedTableId,
  onSelectTable,
  mode = "POS",
  onSettleBillForTable,
  franchiseId,
}) => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [addError, setAddError] = useState<string | null>(null);

  const { data: tables = [], isLoading, isFetching } = useQuery<RestaurantTable[]>({
    queryKey: ["tables", franchiseId],
    queryFn: async () => {
      const res = await api.get("/tables");
      return res.data.data;
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  const createTableMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/tables", {
        tableNumber: newTableNumber.trim(),
        capacity: Number(newCapacity),
      });
      return res.data.data;
    },
    onSuccess: (newTable) => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setIsAddingTable(false);
      setNewTableNumber("");
      setNewCapacity(4);
      setAddError(null);
      onSelectTable(newTable);
      onClose();
    },
    onError: (err) => {
      setAddError(extractErrorMessage(err));
    },
  });

  if (!isOpen) return null;

  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const billingTables = tables.filter((t) => t.status === "BILLING").length;

  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "ALL" ? true : table.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      setAddError("Table number or name is required");
      return;
    }
    setAddError(null);
    createTableMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {mode === "BILLING" ? "Dine-In Billing Floor Plan" : "Dine-In Table Structure & Floor Plan"}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === "BILLING"
                  ? "Select an occupied dining table to view active order and settle bill"
                  : "Click any table card to seat guests and link current POS order"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["tables"] })}
              title="Refresh live table occupancy"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/80 hover:text-rose-200 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Floor KPI Chips & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* KPI Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                All Tables ({totalTables})
              </button>
              <button
                onClick={() => setFilterStatus("AVAILABLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                🟢 Available ({availableTables})
              </button>
              <button
                onClick={() => setFilterStatus("OCCUPIED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "OCCUPIED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                🔴 Occupied ({occupiedTables})
              </button>
              <button
                onClick={() => setFilterStatus("BILLING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "BILLING"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                🔵 Billing / Settling ({billingTables})
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Find table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Takeaway / Counter Option */}
              <button
                onClick={() => {
                  onSelectTable(null);
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  !selectedTableId
                    ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🛍️ Takeaway / Walk-In
              </button>

              <button
                onClick={() => setIsAddingTable(!isAddingTable)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Table</span>
              </button>
            </div>
          </div>

          {/* Quick Add Inline Form */}
          {isAddingTable && (
            <form
              onSubmit={handleQuickAddSubmit}
              className="p-3 bg-white rounded-xl border border-indigo-200 shadow-sm flex flex-wrap items-center gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Table #</span>
                <input
                  type="text"
                  placeholder="e.g. T-12, A4, Outdoor-1"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Capacity</span>
                <select
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold bg-white cursor-pointer"
                >
                  {[2, 4, 6, 8, 10, 12, 16].map((num) => (
                    <option key={num} value={num}>
                      {num} Seats
                    </option>
                  ))}
                </select>
              </div>

              {addError && <span className="text-xs text-rose-600 font-medium">{addError}</span>}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsAddingTable(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {createTableMutation.isPending ? "Creating..." : "Save & Seat"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Visual Dine-In Floor Grid */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <p className="text-sm font-semibold text-gray-600">Loading dining floor layout...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-base font-bold text-gray-800">No tables match current filter</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Add new dining tables for your restaurant floor or clear your search/status filter.
              </p>
              <button
                onClick={() => {
                  setFilterStatus("ALL");
                  setSearchTerm("");
                }}
                className="mt-4 px-4 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTables.map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === "AVAILABLE";
                const isOccupied = table.status === "OCCUPIED";
                const isBilling = table.status === "BILLING";

                // Border & background based on status
                let cardStyle =
                  "bg-white border-gray-200 text-gray-800 hover:border-gray-400 hover:shadow-md";
                let statusBadge = "bg-gray-100 text-gray-700";

                if (isAvailable) {
                  cardStyle =
                    "bg-emerald-50/60 border-emerald-300 text-emerald-950 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-emerald-100";
                  statusBadge = "bg-emerald-100 text-emerald-800 border border-emerald-300";
                } else if (isOccupied) {
                  cardStyle =
                    "bg-rose-50/70 border-rose-300 text-rose-950 hover:bg-rose-50 hover:border-rose-500 hover:shadow-rose-100";
                  statusBadge = "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse";
                } else if (isBilling) {
                  cardStyle =
                    "bg-indigo-50/70 border-indigo-300 text-indigo-950 hover:bg-indigo-50 hover:border-indigo-500 hover:shadow-indigo-100";
                  statusBadge = "bg-indigo-100 text-indigo-800 border border-indigo-300";
                }

                if (isSelected) {
                  cardStyle += " ring-3 ring-indigo-600 shadow-lg scale-102";
                }

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      if (mode === "BILLING" && onSettleBillForTable) {
                        onSettleBillForTable(table);
                      } else {
                        onSelectTable(table);
                      }
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${cardStyle}`}
                  >
                    {/* Top Row: Table Name & Capacity */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-black tracking-tight flex items-center gap-1.5">
                          <span>🪑</span>
                          <span>T-{table.tableNumber}</span>
                        </span>

                        {isSelected && (
                          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">
                            <Check className="w-3 h-3 stroke-3" />
                          </span>
                        )}
                      </div>

                      {/* Capacity visual */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold mb-3">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {table.currentOccupancy || 0} / {table.capacity} Seated
                        </span>
                      </div>
                    </div>

                    {/* Middle: Seat Dots Visual */}
                    <div className="py-2 flex items-center justify-center gap-1.5 mb-3 bg-white/70 rounded-xl py-2 border border-black/5">
                      {Array.from({ length: Math.min(table.capacity, 10) }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-2.5 h-2.5 rounded-full ${
                            idx < (table.currentOccupancy || 0)
                              ? isOccupied
                                ? "bg-rose-500"
                                : "bg-indigo-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Bottom Status Badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[11px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${statusBadge}`}>
                        {table.status}
                      </span>

                      <span className="text-gray-500 group-hover:text-indigo-600 transition-colors">
                        {mode === "BILLING" ? "Settle →" : isSelected ? "Active" : "Select"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Occupied (Active Order)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Billing / Payment</span>
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
