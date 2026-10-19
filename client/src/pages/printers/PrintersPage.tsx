import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer as PrinterIcon, Trash2, Edit2, Play, Search, Cpu } from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import type { Printer, PrinterType, PreparationStation } from "../../types/index.js";
import {
  printReceiptDirectly,
  getSavedPaperSize,
  setSavedPaperSize,
  type ThermalPaperSize,
} from "../../utils/print.js";
import {
  detectSerialPrinter,
  detectUsbPrinter,
  getLastDetectedPrinter,
  type DetectedPrinterInfo,
} from "../../utils/printerPortDetector.js";
import { Card } from "../../components/common/Card.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";
import { Select } from "../../components/common/Select.js";
import { Modal } from "../../components/common/Modal.js";
import { Badge, getStatusBadgeVariant } from "../../components/common/Badge.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { EmptyState } from "../../components/common/EmptyState.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const PRINTER_TYPES: { value: PrinterType; label: string }[] = [
  { value: "RECEIPT", label: "🧾 Receipt Thermal Printer" },
  { value: "KOT", label: "🍳 Kitchen Order Ticket (KOT)" },
  { value: "BAR", label: "🍹 Bar / Beverage Counter" },
  { value: "KITCHEN", label: "🥘 Main Kitchen Line" },
  { value: "DESSERT", label: "🍰 Dessert & Bakery Station" },
  { value: "OTHER", label: "General Purpose Printer" },
];

export const PrintersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedFranchiseId, user } = useAuthStore();
  const { isSuperAdmin, canManagePrinters } = usePermissions();
  const canManage = isSuperAdmin || canManagePrinters;
  const effectiveFranchiseId = selectedFranchiseId || user?.franchiseId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [testPrintOutput, setTestPrintOutput] = useState<string | null>(null);

  const [paperSize, setPaperSize] = useState<ThermalPaperSize>(getSavedPaperSize());
  const [detectedPrinter, setDetectedPrinter] = useState<DetectedPrinterInfo | null>(getLastDetectedPrinter());
  const [isDetectingPrinter, setIsDetectingPrinter] = useState(false);
  const [printerDetectMsg, setPrinterDetectMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "RECEIPT" as PrinterType,
    ipAddress: "192.168.1.200",
    port: 9100,
    stationId: "",
    isActive: true,
  });

  // Fetch Printers
  const { data: printers = [], isLoading } = useQuery<Printer[]>({
    queryKey: ["printers", effectiveFranchiseId],
    queryFn: async () => {
      const url = effectiveFranchiseId ? `/printers?franchiseId=${effectiveFranchiseId}` : "/printers";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Fetch Stations
  const { data: stations = [] } = useQuery<PreparationStation[]>({
    queryKey: ["stations", effectiveFranchiseId],
    queryFn: async () => {
      const url = effectiveFranchiseId ? `/menu/stations?franchiseId=${effectiveFranchiseId}` : "/menu/stations";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Create / Edit Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        franchiseId: effectiveFranchiseId || undefined,
        name: data.name,
        type: data.type,
        ipAddress: data.ipAddress || null,
        port: Number(data.port) || 9100,
        stationId: data.stationId || null,
        isActive: data.isActive,
      };

      if (editingPrinter) {
        return api.put(`/printers/${editingPrinter.id}`, payload);
      }
      return api.post("/printers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      setIsModalOpen(false);
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/printers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["printers"] }),
  });

  const handleOpenCreate = () => {
    setEditingPrinter(null);
    setFormData({
      name: "Cashier Thermal 80mm",
      type: "RECEIPT",
      ipAddress: "192.168.1.101",
      port: 9100,
      stationId: stations[0]?.id || "",
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Printer) => {
    setEditingPrinter(p);
    setFormData({
      name: p.name,
      type: p.type,
      ipAddress: p.ipAddress || "",
      port: p.port || 9100,
      stationId: p.stationId || "",
      isActive: p.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleTestPrint = (p: Printer) => {
    const raw = `================================
     MADRASI DOSA
--- THERMAL PRINTER TEST ---
================================
Printer : ${p.name}
Function: ${p.type}
Endpoint: ${p.ipAddress || "Local USB/COM Spooler"}:${p.port || 9100}
Status  : READY / ONLINE OK
Paper   : ${paperSize}
Time    : ${new Date().toLocaleString()}
--------------------------------
Item             Qty      Price
--------------------------------
Masala Dosa        1     ₹100.00
Fanta              1      ₹30.00
--------------------------------
TOTAL:                   ₹130.00
================================
PAYMENTS:
  CASH    : ₹130.00 [COMPLETED]
--------------------------------
Thanks For Visiting Madrasi Dosa`;
    printReceiptDirectly(raw, `ESC-POS Test Print - ${p.name}`, paperSize);
    setTestPrintOutput(raw);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Thermal & Network Printers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure ESC/POS thermal printers, USB/Serial port scanning, and continuous receipt paper sizing
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Printer Device
          </Button>
        )}
      </div>

      {/* Hardware Port Scanner & Paper Size Controls Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Thermal Paper Roll Size & Port Detection</h3>
              <p className="text-xs text-gray-500">Auto-detect connected USB/Serial printers and enforce continuous dynamic length</p>
            </div>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Paper Width:</span>
            <div className="flex items-center gap-1.5">
              {(["58mm", "80mm"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPaperSize(s);
                    setSavedPaperSize(s);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paperSize === s
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "58mm" ? "58mm (Small 2\" Roll)" : "80mm (Standard 3\" Roll)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Port Analysis Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {detectedPrinter ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-gray-800">Detected:</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {detectedPrinter.deviceName}
              </span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                READY
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              Plug in your thermal receipt printer via USB or Serial port, then click Scan.
            </span>
          )}

          <button
            type="button"
            disabled={isDetectingPrinter}
            onClick={async () => {
              setIsDetectingPrinter(true);
              setPrinterDetectMsg(null);
              try {
                const dev = await detectSerialPrinter();
                setDetectedPrinter(dev);
                setPrinterDetectMsg({ text: `Detected: ${dev.deviceName}`, type: "success" });
              } catch (err: any) {
                try {
                  const usbDev = await detectUsbPrinter();
                  setDetectedPrinter(usbDev);
                  setPrinterDetectMsg({ text: `Detected: ${usbDev.deviceName}`, type: "success" });
                } catch (e2: any) {
                  setPrinterDetectMsg({ text: extractErrorMessage(err) || extractErrorMessage(e2), type: "error" });
                }
              } finally {
                setIsDetectingPrinter(false);
              }
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isDetectingPrinter ? "Scanning..." : "Scan & Identify Printer Port"}</span>
          </button>
        </div>

        {printerDetectMsg && (
          <p className={`text-xs font-semibold ${printerDetectMsg.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>
            {printerDetectMsg.text}
          </p>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <LoadingState message="Loading printer network devices..." />
      ) : printers.length === 0 ? (
        <EmptyState
          title="No Printers Configured"
          description="Add ESC/POS thermal network printers or local print spoolers for KOT and customer receipts."
          actionLabel="Add Printer"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {printers.map((printer) => (
            <Card
              key={printer.id}
              className="hover:shadow-md transition-shadow"
              title={
                <div className="flex items-center gap-2">
                  <PrinterIcon className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-gray-900">{printer.name}</span>
                </div>
              }
              action={
                <Badge variant={getStatusBadgeVariant(printer.isActive ? "ACTIVE" : "INACTIVE")} dot>
                  {printer.isActive ? "Active" : "Disabled"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                  <span className="text-gray-400">Type:</span>
                  <Badge variant="primary">{printer.type}</Badge>
                </div>

                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network IP:</span>
                    <span className="font-bold text-gray-900">{printer.ipAddress || "127.0.0.1"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Port:</span>
                    <span>{printer.port || 9100}</span>
                  </div>
                  {printer.station && (
                    <div className="flex justify-between font-sans pt-1 border-t border-gray-200">
                      <span className="text-gray-400">Station:</span>
                      <span className="font-semibold text-indigo-600">{printer.station.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestPrint(printer)}
                    icon={<Play className="w-3 h-3 text-emerald-600" />}
                  >
                    Test Print
                  </Button>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(printer)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete printer "${printer.name}"?`)) {
                            deleteMutation.mutate(printer.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Printer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPrinter ? "Edit Printer Device" : "Add Thermal Printer"}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            saveMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Printer Name *"
            required
            placeholder="e.g. Counter Thermal 80mm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Select
            label="Printer Function / Type *"
            options={PRINTER_TYPES}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as PrinterType })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Network IP Address"
              placeholder="192.168.1.100"
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
            />
            <Input
              label="Port (default: 9100)"
              type="number"
              placeholder="9100"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Assigned Preparation Station"
            options={[
              { value: "", label: "General Cashier / All Stations" },
              ...stations.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={formData.stationId}
            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saveMutation.isPending}>
              {editingPrinter ? "Save Printer" : "Add Printer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Print Modal */}
      <Modal
        isOpen={!!testPrintOutput}
        onClose={() => setTestPrintOutput(null)}
        title="ESC/POS Test Print Output"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs whitespace-pre-wrap leading-tight shadow-inner">
            {testPrintOutput}
          </pre>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTestPrintOutput(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
