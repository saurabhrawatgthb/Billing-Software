import React, { useState } from "react";
import { Modal } from "../common/Modal.js";
import { Button } from "../common/Button.js";
import { ChefHat, CheckCircle2, Circle, Printer } from "lucide-react";

interface KitchenPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchiseName?: string;
}

interface PrepItem {
  id: string;
  name: string;
  unit: string;
  factor: number; // units per cover
  category: "Batter" | "Curry & Chutney" | "Fillings" | "Beverages";
  notes: string;
}

const PREP_FORMULAS: PrepItem[] = [
  {
    id: "dosa-batter",
    name: "Fermented Dosa Batter",
    unit: "Liters",
    factor: 0.18,
    category: "Batter",
    notes: "Yields ~4-5 crispy dosas per liter. Ensure fermentation is active.",
  },
  {
    id: "idli-batter",
    name: "Steamed Idli Batter",
    unit: "Liters",
    factor: 0.12,
    category: "Batter",
    notes: "Yields ~8-10 soft idlis per liter. Thick consistency.",
  },
  {
    id: "sambar",
    name: "Hot Vegetable Sambar",
    unit: "Liters",
    factor: 0.16,
    category: "Curry & Chutney",
    notes: "Boil drumsticks, pumpkin, and shallots with fresh sambar masala.",
  },
  {
    id: "coconut-chutney",
    name: "Fresh Coconut Chutney (White)",
    unit: "Kg",
    factor: 0.06,
    category: "Curry & Chutney",
    notes: "Keep chilled with mustard & curry leaf tadka.",
  },
  {
    id: "tomato-chutney",
    name: "Spicy Tomato Onion Chutney (Red)",
    unit: "Kg",
    factor: 0.05,
    category: "Curry & Chutney",
    notes: "Roasted shallots, red chilies, garlic, and ripe tomatoes.",
  },
  {
    id: "potato-masala",
    name: "Spiced Potato Masala (Aloo Bhaji)",
    unit: "Kg",
    factor: 0.08,
    category: "Fillings",
    notes: "Boiled mashed potatoes with turmeric, ginger, green chilies, onions.",
  },
  {
    id: "paneer",
    name: "Fresh Diced Paneer / Grated",
    unit: "Kg",
    factor: 0.04,
    category: "Fillings",
    notes: "For Paneer Dosa, Paneer Uttapam, and Gravies.",
  },
  {
    id: "milk",
    name: "Full Cream Milk (Tea & Filter Coffee)",
    unit: "Liters",
    factor: 0.10,
    category: "Beverages",
    notes: "Fresh boiled milk for South Indian Degree Coffee & Masala Chai.",
  },
];

export const KitchenPrepModal: React.FC<KitchenPrepModalProps> = ({
  isOpen,
  onClose,
  franchiseName = "Madrasi Dosa",
}) => {
  const [expectedCovers, setExpectedCovers] = useState<number>(150);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [shift, setShift] = useState<"MORNING" | "EVENING" | "FULL_DAY">("FULL_DAY");
  const [preppedMap, setPreppedMap] = useState<Record<string, boolean>>({});

  const effectiveCovers = Math.round(
    expectedCovers * multiplier * (shift === "FULL_DAY" ? 1.0 : 0.6)
  );

  const togglePrepped = (id: string) => {
    setPreppedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const preppedCount = Object.values(preppedMap).filter(Boolean).length;
  const progressPercent = Math.round((preppedCount / PREP_FORMULAS.length) * 100);

  const handlePrintPrepSheet = () => {
    const printWindow = window.open("", "_blank", "width=600,height=750");
    if (!printWindow) return;

    const todayStr = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const rowsHtml = PREP_FORMULAS.map((item) => {
      const qty = Math.ceil(effectiveCovers * item.factor * 10) / 10;
      const isDone = preppedMap[item.id];
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 6px; font-weight: bold; font-size: 13px;">${item.name}</td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 900; font-size: 14px; font-family: monospace;">
            ${qty} ${item.unit}
          </td>
          <td style="padding: 8px 6px; text-align: center; width: 60px;">
            ${isDone ? "[DONE]" : "[  ]"}
          </td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kitchen Prep Sheet - ${franchiseName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #111; }
          h2 { margin: 0 0 4px 0; font-size: 18px; }
          p { margin: 2px 0 12px 0; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { border-bottom: 2px solid #111; text-align: left; padding: 6px; font-size: 12px; }
          .summary { background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 12px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h2>${franchiseName} — Kitchen Prep Sheet</h2>
        <p>Date: ${todayStr} | Shift: ${shift.replace("_", " ")} | Covers Target: ${effectiveCovers}</p>
        <div class="summary">
          <strong>Prep Guideline:</strong> Ensure all batters and chutneys are stored at < 5 deg C after preparation. Keep sambar steaming hot.
        </div>
        <table>
          <thead>
            <tr>
              <th>Ingredient / Batch</th>
              <th style="text-align: right;">Target Prep Quantity</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-amber-600" />
          <span className="font-extrabold text-base text-gray-900">
            Daily Kitchen Prep & Batter Forecaster
          </span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Controls Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
          {/* Shift & Multiplier */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-700">Shift:</span>
              <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                {(["MORNING", "EVENING", "FULL_DAY"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      shift === s
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {s === "FULL_DAY" ? "Full Day" : s === "MORNING" ? "Morning" : "Evening"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-700">Rush Mode:</span>
              <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                {[
                  { label: "Weekday (1.0x)", val: 1.0 },
                  { label: "Friday (1.2x)", val: 1.2 },
                  { label: "Weekend (1.5x)", val: 1.5 },
                  { label: "Festival (1.8x)", val: 1.8 },
                ].map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setMultiplier(m.val)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      multiplier === m.val
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Expected Covers Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700">
                Expected Customer Footfall / Covers:
              </span>
              <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {effectiveCovers} covers
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={expectedCovers}
                onChange={(e) => setExpectedCovers(Number(e.target.value))}
                className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />
              <div className="flex gap-1">
                {[100, 150, 250, 350].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setExpectedCovers(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      expectedCovers === preset
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>Kitchen Preparation Readiness:</span>
            <span className={progressPercent === 100 ? "text-emerald-600 font-extrabold" : "text-amber-600"}>
              {preppedCount} of {PREP_FORMULAS.length} Prepped ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent === 100 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Prep Ingredients Grid */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {PREP_FORMULAS.map((item) => {
            const qty = Math.ceil(effectiveCovers * item.factor * 10) / 10;
            const isDone = preppedMap[item.id] || false;

            return (
              <div
                key={item.id}
                onClick={() => togglePrepped(item.id)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isDone
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                    : "bg-white border-gray-200 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="cursor-pointer text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-bold leading-tight ${
                          isDone ? "line-through text-emerald-800" : "text-gray-900"
                        }`}
                      >
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.notes}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-base font-black text-gray-900 block">
                    {qty} <span className="text-xs font-bold text-gray-600">{item.unit}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    (~{(item.factor * 100).toFixed(0)}g / cover)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPrepSheet}
            icon={<Printer className="w-4 h-4 text-indigo-600" />}
          >
            Print Prep Sheet
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
