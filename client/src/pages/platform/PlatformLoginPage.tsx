import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

export const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data.data;

      if (data?.requiresAccountSelection) {
        setError("This account is linked to a restaurant. Use /login instead.");
        return;
      }

      const { user, token } = data;

      if (user.role !== "SUPER_ADMIN") {
        setError("Access denied. This portal is for OmniPOS platform administrators only.");
        return;
      }

      login(user, token);
      navigate("/platform", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 80%, #020617 100%)",
      }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent)",
          top: "-10%",
          left: "-10%",
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #8b5cf6, transparent)",
          bottom: "5%",
          right: "5%",
          animation: "pulse 10s ease-in-out infinite reverse",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4"
        style={{ zIndex: 10 }}
      >
        {/* Header badge */}
        <div className="text-center mb-8 space-y-4">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-2xl mx-auto"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            }}
          >
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              OmniPOS Platform
            </h1>
            <p className="text-sm text-indigo-300 font-medium mt-1">
              Owner Control Tower
            </p>
          </div>

          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-300 border border-indigo-500/30"
            style={{ background: "rgba(99,102,241,0.08)" }}
          >
            <Lock className="w-3 h-3" />
            Platform Administrator Access Only
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-3xl p-8 border space-y-6"
          style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(24px)",
            borderColor: "rgba(99,102,241,0.25)",
            boxShadow: "0 0 60px rgba(99,102,241,0.1), 0 25px 50px rgba(0,0,0,0.5)",
          }}
        >
          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl border text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                borderColor: "rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6366f1" }} />
                <input
                  id="platform-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@omnipos.local"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{
                    background: "rgba(30,27,75,0.6)",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6366f1" }} />
                <input
                  id="platform-password"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{
                    background: "rgba(30,27,75,0.6)",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "#64748b" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="platform-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              style={{
                background: loading
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: loading ? "none" : "0 0 30px rgba(99,102,241,0.4)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Access Platform Dashboard
                </>
              )}
            </button>
          </form>

          {/* Divider hint */}
          <div className="text-center pt-2">
            <p className="text-xs" style={{ color: "#475569" }}>
              Restaurant owner?{" "}
              <a
                href="/login"
                className="font-semibold transition-colors"
                style={{ color: "#818cf8" }}
              >
                Sign in to your restaurant →
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#334155" }}>
          OmniPOS SaaS Platform &nbsp;·&nbsp; Secured by JWT &nbsp;·&nbsp; Role-gated access
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
};
