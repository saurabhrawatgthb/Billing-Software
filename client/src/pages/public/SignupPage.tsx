import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UtensilsCrossed,
  ArrowRight,
  Building,
  User,
  Sparkles,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPlan = (searchParams.get("plan") as any) || "PRO";

  const [formData, setFormData] = useState({
    brandName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    password: "",
    city: "",
    outletType: "CAFE",
    plan: defaultPlan as "STARTER" | "PRO" | "ENTERPRISE",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/public/register", formData);
      const { token, user } = res.data.data;

      // Save token and initialize session in store
      localStorage.setItem("rms_token", token);
      localStorage.setItem("rms_user", JSON.stringify(user));
      if (user.franchiseId) {
        localStorage.setItem("rms_selected_franchise_id", user.franchiseId);
      }

      useAuthStore.setState({
        token,
        user,
        isAuthenticated: true,
        selectedFranchiseId: user.franchiseId || null,
      });

      // Navigate to POS or Dashboard
      navigate("/pos", { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to register restaurant. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">OmniPOS</span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Start Your 14-Day Free Trial
        </h2>
        <p className="text-xs text-slate-400">
          Set up your restaurant brand workspace in 60 seconds. No credit card required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl backdrop-blur-md space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Step 1: Restaurant Info */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> 1. Restaurant Brand Details
              </span>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Restaurant / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Belgian Waffle Co, Chaat Junction"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Outlet City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore, Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Outlet Type</label>
                  <select
                    value={formData.outletType}
                    onChange={(e) => setFormData({ ...formData, outletType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="CAFE">Cafe / Coffee House</option>
                    <option value="QSR">Fast Food / QSR Counter</option>
                    <option value="DINE_IN">Full-Service Restaurant</option>
                    <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                    <option value="BAKERY">Bakery &amp; Confectionery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Owner Contact */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> 2. Owner Account &amp; Access
              </span>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@restaurant.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Set Account Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Step 3: Plan Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 3. Select Initial Plan (Free for 14 Days)
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "STARTER", name: "Starter", price: "₹7,999/yr", desc: "QSR & Counter" },
                  { id: "PRO", name: "Pro", price: "₹12,999/yr", desc: "Tables + KDS" },
                  { id: "ENTERPRISE", name: "Enterprise", price: "₹24,999/yr", desc: "Multi-branch" },
                ].map((p) => {
                  const isSelected = formData.plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, plan: p.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className={`font-bold text-xs ${isSelected ? "text-indigo-300" : "text-white"}`}>
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              <span>{loading ? "Provisioning Restaurant Workspace..." : "Create Account & Launch POS"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 border-t border-slate-800/80 pt-4">
            Already have an active account?{" "}
            <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
