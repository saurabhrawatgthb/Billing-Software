import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { getDefaultRoleHome } from "../../components/layout/ProtectedRoute.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectableAccounts, setSelectableAccounts] = useState<any[] | null>(null);

  const handleSelectAccount = async (accountId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        selectedAccountId: accountId,
      });
      const { user, token } = response.data.data;
      login(user, token);
      const targetHome = getDefaultRoleHome(user.role, user.organizationId);
      navigate(targetHome);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const data = response.data.data;

      if (data?.requiresAccountSelection && Array.isArray(data.accounts)) {
        setSelectableAccounts(data.accounts);
        return;
      }

      const { user, token } = data;
      login(user, token);
      const targetHome = getDefaultRoleHome(user.role, user.organizationId);
      navigate(targetHome);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RestoMaster POS</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise Restaurant & Franchise Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {selectableAccounts ? (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Select Account Profile</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This email is linked to multiple roles or outlets. Choose which account you want to access:
                </p>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectableAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleSelectAccount(account.id)}
                    disabled={isLoading}
                    className="w-full p-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500 text-left transition-all cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white group-hover:text-indigo-300">
                          {account.name}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          {account.role.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {account.franchise ? `🏬 ${account.franchise.name} (${account.franchise.code})` : "🌐 Global Admin"}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectableAccounts(null)}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  required
                  variant="dark"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  required
                  variant="dark"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-white transition-colors cursor-pointer p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 font-semibold shadow-lg shadow-indigo-600/20"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
