import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Zap,
  WifiOff,
  Printer,
  Layers,
  ChefHat,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Grid3X3,
  Calendar,
  MessageCircle,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../../services/api.js";

export const LandingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [activeTab, setActiveTab] = useState<"pos" | "kds" | "tables" | "inventory" | "reports">("pos");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    restaurantName: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    outletType: "CAFE",
    outletCount: 1,
    notes: "",
  });
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDemo(true);
    setDemoError(null);
    try {
      await api.post("/public/demo", demoForm);
      setDemoSubmitted(true);
    } catch (err: any) {
      setDemoError(err.response?.data?.message || "Failed to submit demo request. Please try again.");
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* =========================================================================
          TOP NAVIGATION BAR
      ========================================================================= */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                OmniPOS <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">SaaS</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wide">Restaurant Operating Platform</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#offline" className="hover:text-white transition-colors">Offline Tech</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hidden sm:inline-flex text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all cursor-pointer"
            >
              Book Live Demo
            </button>
            <Link
              to="/signup"
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================================================================
          HERO SECTION
      ========================================================================= */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold backdrop-blur-sm shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>The Modern Alternative to Clunky Desktop POS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
            The Lightning-Fast Restaurant POS That{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
              Never Stops Working
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            Ultra-fast counter checkout, kitchen tickets, table layout, recipe food costing, and WhatsApp receipts. Zero cumbersome desktop installations—works reliably on any PC, iPad, or tablet even when your internet drops.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Schedule 15-Min Live Demo</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 flex items-center justify-center gap-4 pt-2">
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ Setup in 10 minutes</span>
            <span>•</span>
            <span>✓ Cancel anytime</span>
          </p>

          {/* Core Feature Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">3-Sec Checkout</h4>
                <p className="text-[11px] text-slate-400">Numpad & Code lookup</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">100% Offline Mode</h4>
                <p className="text-[11px] text-slate-400">Bills without internet</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Silent 1-Click Print</h4>
                <p className="text-[11px] text-slate-400">ESC/POS Thermal & USB</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">WhatsApp Invoices</h4>
                <p className="text-[11px] text-slate-400">Customer marketing CRM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE PRODUCT TOUR (TABS)
      ========================================================================= */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Complete Restaurant Suite</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Everything your food business needs to scale</h3>
          <p className="text-sm text-slate-400">Switch tabs below to see how each module accelerates your operations.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-3xl mx-auto mb-10">
          {[
            { id: "pos", label: "Counter Billing POS", icon: Zap },
            { id: "kds", label: "Kitchen Display (KDS)", icon: ChefHat },
            { id: "tables", label: "Table & Floor Layout", icon: Grid3X3 },
            { id: "inventory", label: "Recipes & Food Cost", icon: Layers },
            { id: "reports", label: "Owner Live Cockpit", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          {activeTab === "pos" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                  <Zap className="w-3.5 h-3.5" /> High-Volume Counter Speed
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Punch orders and collect cash in under 3 seconds.
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Engineered specifically for peak rush hours. Quick numeric item codes, fuzzy search, one-click takeaway toggles, parcel charges, dynamic QR codes on screen, and instant auto-cut thermal receipts.
                </p>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Single-keypress code billing (`101`, `Enter`)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Works with all 80mm and 58mm thermal ESC/POS printers</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Split payments: Cash + UPI QR + Card on single bill</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-xs space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-indigo-400 font-bold uppercase">Terminal #01 (Active)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">ONLINE</span>
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between"><span>[101] Masala Dosa x 2</span><span>₹180.00</span></div>
                  <div className="flex justify-between"><span>[204] Filter Coffee x 2</span><span>₹60.00</span></div>
                  <div className="flex justify-between text-slate-400"><span>Packaging / Parcel</span><span>₹10.00</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white text-sm">
                    <span>TOTAL AMOUNT</span><span className="text-emerald-400">₹250.00</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <div className="flex-1 bg-indigo-600/20 text-indigo-300 p-2 text-center rounded border border-indigo-500/30 font-bold">
                    [F1] Quick Cash
                  </div>
                  <div className="flex-1 bg-emerald-600/20 text-emerald-300 p-2 text-center rounded border border-emerald-500/30 font-bold">
                    [F2] Dynamic UPI QR
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "kds" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                  <ChefHat className="w-3.5 h-3.5" /> Paperless Kitchen Display
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Zero lost orders, zero kitchen miscommunication.
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Mount any inexpensive Android tablet or monitor in your kitchen. Orders punched at the counter or tables show up instantly with color-coded countdown timers, acoustic chimes, and preparation station routing (e.g. Bar vs Tandoor vs Main Kitchen).
                </p>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-time color status: Preparing (Yellow) → Ready (Green) → Delayed (Red)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Morning Prep Forecaster: Predicts required dough, sauces, and gravies</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-amber-400">
                    <span>TICK-104 (Table 3)</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 04:12</span>
                  </div>
                  <p className="text-xs font-bold text-white">2x Butter Paneer Dosa</p>
                  <p className="text-[11px] text-amber-200/80">Spicy, Less Oil</p>
                </div>
                <div className="p-3 bg-emerald-950/40 border border-emerald-600/50 rounded-xl space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-emerald-400">
                    <span>TICK-103 (Takeaway)</span>
                    <span>READY</span>
                  </div>
                  <p className="text-xs font-bold text-white">1x Chhole Bhature</p>
                  <p className="text-[11px] text-emerald-200/80">Packed & Token #42</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tables" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/20">
                  <Grid3X3 className="w-3.5 h-3.5" /> Floor & Table Management
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Visual table map for full-service dining.
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  See table occupancy in real time: Available (Green), Occupied (Red), and Billing in Progress (Yellow). Merge tables for large parties, transfer running orders between tables, and track running table subtotals seamlessly.
                </p>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Captain / Waiter mobile app support for order taking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automatic table release upon bill payment</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-center space-y-1">
                  <span className="text-xs font-black text-red-400">Table T1</span>
                  <p className="text-[10px] text-slate-400">Occupied (4p)</p>
                  <span className="text-xs font-bold text-white">₹840</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
                  <span className="text-xs font-black text-emerald-400">Table T2</span>
                  <p className="text-[10px] text-slate-400">Vacant</p>
                  <span className="text-xs font-bold text-slate-500">-</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center space-y-1">
                  <span className="text-xs font-black text-amber-400">Table T3</span>
                  <p className="text-[10px] text-slate-400">Billing Requested</p>
                  <span className="text-xs font-bold text-white">₹1,250</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                  <Layers className="w-3.5 h-3.5" /> Recipe & Stock Control
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Stop kitchen pilferage and control your food costs.
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Link raw ingredients to menu items. When a dish is billed, ingredients (butter, cheese, paneer, flour) automatically deduct from inventory. Get low-stock alerts before items run out during peak dinner rush.
                </p>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exact gross margin & ingredient cost calculation per plate</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Vendor purchase orders & wastage audit logs</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300 border-b border-slate-800 pb-2">
                  <span className="font-bold text-white">Amul Butter (500g)</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">LOW STOCK (1.2 kg)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 border-b border-slate-800 pb-2">
                  <span className="font-bold text-white">Paneer / Cottage Cheese</span>
                  <span className="text-slate-400">8.5 kg in stock</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-white">Dosa Batter Batch #4</span>
                  <span className="text-emerald-400 font-bold">14 kg ready</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  <BarChart3 className="w-3.5 h-3.5" /> Real-time Business Analytics
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Know your daily sales from anywhere in the world.
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Log in from your mobile phone or laptop. Check real-time hourly revenue, cash drawer reconciliation, cashier void logs (anti-theft), and automated end-of-day sales summaries sent straight to your WhatsApp at 11 PM.
                </p>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cash vs UPI vs Card breakdown to prevent cash drawer theft</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-outlet comparative charts for expanding restaurant brands</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Today's Revenue</p>
                    <p className="text-xl font-black text-emerald-400">₹42,850</p>
                    <p className="text-[10px] text-slate-500">148 Bills generated</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Cash in Drawer</p>
                    <p className="text-xl font-black text-indigo-400">₹14,200</p>
                    <p className="text-[10px] text-slate-500">Match verified</p>
                  </div>
                </div>
                <div className="p-3 bg-indigo-950/40 border border-indigo-700/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-indigo-300">
                    <span>📱 11:00 PM WhatsApp Digest</span>
                    <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-400">Automated</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sent to Owner: "Today's sales ₹42,850. UPI: 68%, Cash: 32%. Top Item: Masala Dosa (74 orders)."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          THE OFFLINE-FIRST ADVANTAGE (WHY WE WIN OVER COMPETITORS)
      ========================================================================= */}
      <section id="offline" className="py-20 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <WifiOff className="w-3.5 h-3.5" /> Zero Reliance on Internet
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                When the WiFi drops, your competitors halt. You keep billing.
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Most cloud POS systems freeze or throw error screens when the router blinks. OmniPOS uses persistent local browser storage and Service Worker caching. Your cashiers punch bills, fire kitchen tickets, and print receipts uninterrupted.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">1</div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Local Queue & Auto-Retry</h4>
                    <p className="text-xs text-slate-400">Every offline bill is stored in persistent local IndexedDB and assigned an offline receipt sequence.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">2</div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Background Auto-Sync</h4>
                    <p className="text-xs text-slate-400">The moment internet returns, orders push to the cloud silently without double-billing or duplicates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">3</div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Cryptographic Lease Protection</h4>
                    <p className="text-xs text-slate-400">Built-in anti-tampering clock verification safeguards your revenue from manipulation.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-3xl border border-indigo-800/40 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-indigo-900/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-amber-300">WiFi Disconnected (Simulation)</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-2.5 py-1 rounded-full border border-indigo-700/40">
                  OFFLINE RESILIENCE ACTIVE
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex justify-between items-center">
                  <span>Bill #OFF-0042 (2 items)</span>
                  <span className="text-emerald-400 font-bold">PRINTED TO ESC/POS ✓</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex justify-between items-center">
                  <span>Bill #OFF-0043 (4 items)</span>
                  <span className="text-emerald-400 font-bold">PRINTED TO ESC/POS ✓</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-600/40 text-indigo-200 flex justify-between items-center">
                  <span>Pending Cloud Sync</span>
                  <span className="font-bold">2 Bills in Local Queue</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-600/40 text-xs text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Zero customer waiting. Cash collected. Receipts printed. Cloud syncs automatically when connection restores.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SOLUTIONS BY OUTLET TYPE
      ========================================================================= */}
      <section id="solutions" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Tailored For Your Food Outlet</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Customized for every type of food business</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-600/50 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">QSR & Cafes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for speed. Numpad shortcuts, code-based billing, fast parcel options, dynamic counter QR displays, and pick-up token numbers.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li>✓ Token number displays</li>
              <li>✓ Fast cash settlement</li>
              <li>✓ Single cashier handover register</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-indigo-600/40 bg-gradient-to-b from-indigo-950/20 to-slate-900/60 transition-all space-y-4 relative">
            <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-3 py-1 rounded-full shadow-md">
              Most Popular
            </span>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">Fine Dine & Family Restaurants</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full table layout map, Captain/waiter tablet ordering, station-wise KOT routing, split bills, and guest loyalty discounts.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li>✓ Floor & Section management</li>
              <li>✓ Waiter mobile ordering</li>
              <li>✓ Course-wise KOT printing</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-600/50 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">Cloud Kitchens & Bakeries</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct Swiggy & Zomato order handling, batch production tracking, recipe ingredient depletion, and multi-brand packaging management.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li>✓ Aggregator order synchronization</li>
              <li>✓ Batch expiry & inventory costing</li>
              <li>✓ Rider dispatch status</li>
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TRANSPARENT PRICING PLANS
      ========================================================================= */}
      <section id="pricing" className="py-24 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Transparent Pricing</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Simple, predictable pricing with zero hidden fees</h3>
            <p className="text-sm text-slate-400">No surprise add-on charges. Everything included in one clean plan.</p>

            {/* Annual vs Monthly Billing Toggle */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <span className={`text-xs font-bold ${!isAnnual ? "text-white" : "text-slate-400"}`}>Billed Monthly</span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${
                  isAnnual ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    isAnnual ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isAnnual ? "text-white" : "text-slate-400"}`}>
                <span>Billed Annually</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </span>
            </div>

            {/* Founding Partner 100% Free Banner */}
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 max-w-2xl mx-auto shadow-lg shadow-amber-500/10">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <span className="text-left">
                  <strong className="text-amber-300 font-black">🔥 FOUNDING PARTNER PROMOTION:</strong> First 10 restaurants get 1 Full Year 100% Free!
                </span>
              </div>
              <Link
                to="/signup?coupon=FOUNDING10"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-md shadow-amber-500/30"
              >
                Claim Free Year (Code: FOUNDING10) →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter Plan */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter Plan</span>
                <h4 className="text-xl font-bold text-white">QSR & Takeaway</h4>
                <p className="text-xs text-slate-400">For cafes, food trucks, and quick-service takeaway counters.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-white">{isAnnual ? "₹7,999" : "₹799"}</span>
                  <span className="text-xs text-slate-400 font-medium">{isAnnual ? " / year" : " / month"}</span>
                </div>
                <div className="border-t border-slate-800 pt-4 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 POS Billing Counter Terminal</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>100% Offline Mode (No Internet Needed)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Thermal Receipt & KOT Printing</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Daily Cash Drawer Reconciliation</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Free Menu Upload Assistance</span>
                  </div>
                </div>
              </div>

              <Link
                to="/signup?plan=STARTER"
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition-all cursor-pointer block"
              >
                Choose Starter Plan
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-950/60 to-slate-900 border-2 border-indigo-600 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-indigo-600/20">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-1 rounded-full shadow-lg">
                Recommended Choice
              </span>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Pro Plan</span>
                <h4 className="text-xl font-bold text-white">Full-Service Restaurant</h4>
                <p className="text-xs text-slate-400">For dine-in restaurants, bars, multi-station kitchens, and bakeries.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-white">{isAnnual ? "₹12,999" : "₹1,299"}</span>
                  <span className="text-xs text-slate-400 font-medium">{isAnnual ? " / year" : " / month"}</span>
                </div>
                <div className="border-t border-indigo-900/60 pt-4 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center gap-2.5 font-semibold text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Everything in Starter, plus:</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Visual Table & Floor Layout Manager</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Paperless Kitchen Display System (KDS)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Recipe Ingredient Costing & Low-Stock Alerts</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated 11 PM WhatsApp Sales Digest</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 3 Waiter / Captain Tablets</span>
                  </div>
                </div>
              </div>

              <Link
                to="/signup?plan=PRO"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs text-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer block"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise Plan</span>
                <h4 className="text-xl font-bold text-white">Multi-Outlet Chains</h4>
                <p className="text-xs text-slate-400">For multi-branch restaurant brands, franchises, and cloud chains.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-white">{isAnnual ? "₹24,999" : "₹2,499"}</span>
                  <span className="text-xs text-slate-400 font-medium">{isAnnual ? " / year" : " / month"}</span>
                </div>
                <div className="border-t border-slate-800 pt-4 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5 font-semibold text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Everything in Pro, plus:</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Centralized Multi-Branch Menu Sync</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Swiggy & Zomato Aggregator Integrations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cross-Branch Comparative Financial Reports</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>24/7 Dedicated Account Manager</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition-all cursor-pointer block"
              >
                Contact Enterprise Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION
      ========================================================================= */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Got Questions?</h2>
          <h3 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-4 pt-4">
          {[
            {
              q: "Can I use my existing thermal printers and computers?",
              a: "Yes! OmniPOS runs smoothly on any existing computer—Windows laptop, all-in-one touch PC, iPad, or Android tablet. It works with standard 80mm and 58mm thermal printers (Epson, TVS, NGX, Posiflex) via USB, LAN, or Bluetooth.",
            },
            {
              q: "How will my menu get uploaded?",
              a: "We provide 100% free white-glove menu setup. Just take a photo or send a PDF of your paper menu on WhatsApp to our onboarding team, and we will format and seed your entire menu into your account within 1 hour.",
            },
            {
              q: "What happens if our restaurant WiFi disconnects?",
              a: "Nothing stops! Your cashiers continue punching bills, taking cash/card payments, and printing thermal receipts normally. The system stores everything in local persistent memory and synchronizes with your cloud account automatically when the connection is restored.",
            },
            {
              q: "Can I monitor daily sales from my phone when I am not at the restaurant?",
              a: "Yes. As the owner, you can open the dashboard from your smartphone anywhere in the world to see real-time revenue, cash drawer status, and occupied tables. You also receive an automatic 11 PM WhatsApp report every night.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-indigo-400">Q:</span> {item.q}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          BOTTOM CALL TO ACTION
      ========================================================================= */}
      <section className="py-20 border-t border-slate-800 bg-gradient-to-b from-slate-950 to-indigo-950/40 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h3 className="text-3xl sm:text-5xl font-black text-white">
            Ready to upgrade your restaurant billing?
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Join modern restaurants and cafes switching to OmniPOS. Zero setup fees, 14-day free trial, instant setup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Start 14-Day Free Trial
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-all cursor-pointer"
            >
              Request WhatsApp Callback
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
      ========================================================================= */}
      <footer className="border-t border-slate-900 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              O
            </div>
            <span className="font-bold text-slate-400">OmniPOS Technologies</span>
            <span>•</span>
            <span>Cloud &amp; Offline Restaurant POS</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link to="/login" className="hover:text-white">Staff Login</Link>
            <Link to="/signup" className="hover:text-white">New Restaurant Signup</Link>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/platform-login" className="hover:text-indigo-400 flex items-center gap-1 text-slate-500 hover:text-indigo-300 transition-colors">
              Platform Admin
            </Link>
          </div>

          <p>© {new Date().getFullYear()} OmniPOS. All rights reserved.</p>
        </div>
      </footer>

      {/* =========================================================================
          LIVE DEMO / CALLBACK MODAL
      ========================================================================= */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6">
            <button
              onClick={() => {
                setIsDemoModalOpen(false);
                setDemoSubmitted(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {demoSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Demo Request Received!</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Thank you! Our restaurant onboarding specialist will contact you on WhatsApp / Phone within 15 minutes to schedule your live walkthrough.
                </p>
                <button
                  onClick={() => {
                    setIsDemoModalOpen(false);
                    setDemoSubmitted(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">Schedule 15-Min Live Demo</h3>
                  <p className="text-xs text-slate-400">
                    See how OmniPOS streamlines billing and kitchen workflow in your outlet.
                  </p>
                </div>

                {demoError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs">
                    {demoError}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Restaurant / Brand Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Spice Cafe"
                      value={demoForm.restaurantName}
                      onChange={(e) => setDemoForm({ ...demoForm, restaurantName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Owner name"
                        value={demoForm.ownerName}
                        onChange={(e) => setDemoForm({ ...demoForm, ownerName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">City</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi, Bangalore"
                        value={demoForm.city}
                        onChange={(e) => setDemoForm({ ...demoForm, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Phone</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@gmail.com"
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Outlet Type</label>
                      <select
                        value={demoForm.outletType}
                        onChange={(e) => setDemoForm({ ...demoForm, outletType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="CAFE">Cafe / Coffee Shop</option>
                        <option value="QSR">Fast Food / QSR</option>
                        <option value="DINE_IN">Full-Service Restaurant</option>
                        <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                        <option value="BAKERY">Bakery / Sweet Shop</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Number of Outlets</label>
                      <input
                        type="number"
                        min={1}
                        value={demoForm.outletCount}
                        onChange={(e) => setDemoForm({ ...demoForm, outletCount: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingDemo}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDemo ? "Submitting Demo Request..." : "Request Instant WhatsApp Callback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
