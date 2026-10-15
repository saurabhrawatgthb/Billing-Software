import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ArrowRight, CheckCircle2, AlertCircle, Percent, Sparkles } from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import type { Franchise } from "../../types/index.js";
import { Modal } from "../common/Modal.js";
import { Button } from "../common/Button.js";

interface CloneMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchises: Franchise[];
  initialSourceId?: string;
  initialTargetId?: string;
  onSuccess?: (result: {
    sourceFranchiseName: string;
    targetFranchiseName: string;
    categoriesCount: number;
    itemsCreated: number;
    itemsUpdated: number;
    totalItems: number;
    targetFranchiseId: string;
  }) => void;
}

export const CloneMenuModal: React.FC<CloneMenuModalProps> = ({
  isOpen,
  onClose,
  franchises,
  initialSourceId,
  initialTargetId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [sourceId, setSourceId] = useState<string>(initialSourceId || "");
  const [targetId, setTargetId] = useState<string>(initialTargetId || "");
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  const [copyStations, setCopyStations] = useState<boolean>(true);
  const [mode, setMode] = useState<"MERGE" | "REPLACE">("MERGE");
  const [formError, setFormError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSourceId(initialSourceId || (franchises[0]?.id !== initialTargetId ? franchises[0]?.id : franchises[1]?.id) || "");
      setTargetId(initialTargetId || (franchises[1]?.id !== initialSourceId ? franchises[1]?.id : franchises[0]?.id) || "");
      setPriceAdjustment(0);
      setCopyStations(true);
      setMode("MERGE");
      setFormError(null);
      setCloneSuccess(null);
    }
  }, [isOpen, initialSourceId, initialTargetId, franchises]);

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sourceFranchiseId: sourceId,
        targetFranchiseId: targetId,
        mode,
        priceAdjustmentPercent: priceAdjustment,
        copyStations,
      };
      const res = await api.post("/menu/clone", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      
      setCloneSuccess(
        `Successfully cloned ${data.totalItems} dishes & ${data.categoriesCount} categories to ${data.targetFranchiseName}!`
      );

      if (onSuccess) {
        onSuccess({
          ...data,
          targetFranchiseId: targetId,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err));
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clone / Copy Menu Between Branches"
      maxWidth="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          setCloneSuccess(null);
          if (!sourceId || !targetId) {
            setFormError("Please select both source and target branches");
            return;
          }
          if (sourceId === targetId) {
            setFormError("Source and target franchise outlets cannot be the same");
            return;
          }
          cloneMutation.mutate();
        }}
        className="space-y-5"
      >
        {/* Explanatory Banner */}
        <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Independent Cloned Records</p>
            <p className="text-indigo-700 mt-0.5">
              All categories and dishes will be duplicated specifically for the target branch. Once copied, the target branch can freely customize prices, codes, recipes, and availability without affecting the original branch.
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {cloneSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{cloneSuccess}</span>
          </div>
        )}

        {/* Source & Target Branch Selectors */}
        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Source Branch (Copy From) *
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full text-sm font-medium bg-white border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              required
            >
              <option value="">-- Select Source Franchise Outlet --</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id} disabled={f.id === targetId}>
                  🏬 {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center my-1 text-gray-400">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
              <span>Copying Dishes & Categories</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Target Branch (Copy Into) *
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-sm font-medium bg-white border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              required
            >
              <option value="">-- Select Target Franchise Outlet --</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id} disabled={f.id === sourceId}>
                  🏬 {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price Adjustment */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
            Price Adjustment for Target Branch (Optional)
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[0, 5, 10, 15].map((pct) => (
              <button
                type="button"
                key={pct}
                onClick={() => setPriceAdjustment(pct)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  priceAdjustment === pct
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {pct === 0 ? "Same Price (0%)" : `+${pct}% Markup`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 whitespace-nowrap">Custom % adjustment:</span>
            <input
              type="number"
              step="1"
              value={priceAdjustment}
              onChange={(e) => setPriceAdjustment(Number(e.target.value))}
              placeholder="0"
              className="w-24 text-sm font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500">
              {priceAdjustment > 0
                ? `Prices will be increased by ${priceAdjustment}%`
                : priceAdjustment < 0
                ? `Prices will be discounted by ${Math.abs(priceAdjustment)}%`
                : "Exact same prices as source branch"}
            </span>
          </div>
        </div>

        {/* Copy Options */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={copyStations}
              onChange={(e) => setCopyStations(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Copy Kitchen Prep Stations (Tandoor, Main Kitchen, Bar, etc.)</span>
          </label>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
              <input
                type="radio"
                name="cloneMode"
                value="MERGE"
                checked={mode === "MERGE"}
                onChange={() => setMode("MERGE")}
                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Merge / Add Missing (Safe - keeps any existing target dishes)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
              <input
                type="radio"
                name="cloneMode"
                value="REPLACE"
                checked={mode === "REPLACE"}
                onChange={() => setMode("REPLACE")}
                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Replace Target Menu</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={cloneMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={<Copy className="w-4 h-4" />}
            isLoading={cloneMutation.isPending}
            disabled={!sourceId || !targetId || sourceId === targetId}
          >
            {cloneMutation.isPending ? "Cloning Menu..." : "Clone Menu & Switch Outlet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
