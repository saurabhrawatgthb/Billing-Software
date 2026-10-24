import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UtensilsCrossed,
  ArrowRight,
  Building,
  User,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Gift,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPlan = (searchParams.get("plan") as any) || "STARTER";
  const initialCoupon = searchParams.get("coupon") || "";

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

  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCode = async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post("/public/coupons/validate", {
        code: codeToTest.trim(),
        planSlug: formData.plan.toLowerCase(),
        billingInterval: "ANNUAL",
      });
      setAppliedCoupon(res.data.data);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.message || "Invalid or expired coupon code.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  useEffect(() => {
    if (initialCoupon) {
      validateCode(initialCoupon);
    }
  }, [initialCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        brandName: formData.brandName,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        password: formData.password,
        city: formData.city,
        outletType: formData.outletType,
        planSlug: formData.plan.toLowerCase(),
        billingInterval: "ANNUAL",
        couponCode: appliedCoupon ? couponCode.trim().toUpperCase() : undefined,
      };

      const res = await api.post("/public/checkout", payload);
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-stone-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-xl shadow-amber-500/25">
            <UtensilsCrossed className="w-6 h-6 text-stone-950" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">OmniPOS</span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Create Your Restaurant Account
        </h2>
        <p className="text-xs text-stone-400">
          Launch your cloud billing terminal in 60 seconds. Full hardware printing &amp; offline sync ready.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-stone-900/90 border border-stone-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl backdrop-blur-md space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Step 1: Restaurant Info */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> 1. Restaurant Brand Details
              </span>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Brand / Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madrasi Dosa, Burger Hub"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">City / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, New Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Outlet Format</label>
                  <select
                    value={formData.outletType}
                    onChange={(e) => setFormData({ ...formData, outletType: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="CAFE">Cafe / Bakery</option>
                    <option value="QSR">Fast Food / QSR</option>
                    <option value="FINE_DINE">Full-Service Restaurant</option>
                    <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Owner Contact */}
            <div className="space-y-3 pt-2 border-t border-stone-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> 2. Owner Administrator Account
              </span>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@restaurant.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Set Account Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Step 3: Subscription Plan Choice */}
            <div className="space-y-3 pt-2 border-t border-stone-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 3. Select Initial Plan (Annual 20% Discount)
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "STARTER", name: "Starter", price: "₹7,999/yr", desc: "1 POS Terminal" },
                  { id: "PRO", name: "Pro", price: "₹12,999/yr", desc: "Table + KDS" },
                  { id: "ENTERPRISE", name: "Chain", price: "₹24,999/yr", desc: "Multi-Outlet" },
                ].map((p) => {
                  const isSelected = formData.plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, plan: p.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                      }`}
                    >
                      <span className="block font-black text-sm text-white">{p.price}</span>
                      <p className={`font-bold text-xs ${isSelected ? "text-amber-300" : "text-white"}`}>
                        {p.name}
                      </p>
                      <p className="text-[10px] text-stone-400">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Promotional Coupon */}
            <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> 4. Promo Coupon Code (Optional)
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo coupon code if available"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => validateCode(couponCode)}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-bold text-xs cursor-pointer disabled:opacity-50 transition-all"
                >
                  {validatingCoupon ? "Checking..." : "Apply"}
                </button>
              </div>

              {couponError && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                </p>
              )}

              {appliedCoupon && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-stone-900 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Coupon Applied: {appliedCoupon.coupon.code}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">{appliedCoupon.coupon.description}</p>
                  
                  {appliedCoupon.coupon.isFreeYear ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs">
                      <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>FOUNDING PARTNER REWARD: 100% OFF for 12 Months (₹0 Due Today)</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-emerald-500/20">
                      <span>Discount: -₹{appliedCoupon.pricing.discountAmount}</span>
                      <span className="text-white font-bold">Total: ₹{appliedCoupon.pricing.finalPayable}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              <span>
                {loading
                  ? "Provisioning Restaurant Workspace..."
                  : appliedCoupon?.coupon?.isFreeYear
                  ? "Claim 1-Year Free & Launch POS"
                  : "Create Account & Launch POS"}
              </span>
              <ArrowRight className="w-4 h-4 text-stone-950" />
            </button>
          </form>

          <div className="text-center text-xs text-stone-400 pt-2 border-t border-stone-800">
            <span>Already have an account? </span>
            <Link to="/login" className="font-bold text-amber-400 hover:underline">
              Sign In to Your Restaurant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
