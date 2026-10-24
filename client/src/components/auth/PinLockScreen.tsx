import React, { useState, useEffect, useCallback } from "react";
import { Lock, User as UserIcon, LogOut, Delete } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { usePinLockStore } from "../../store/pinLockStore.js";

interface PinLockScreenProps {
  onUnlock?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const { user, logout } = useAuthStore();
  const { verifyPin, unlock } = usePinLockStore();

  const [enteredPin, setEnteredPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (enteredPin.length >= 4 || isVerifying) return;
      setErrorMsg(null);
      setEnteredPin((prev) => prev + digit);
    },
    [enteredPin, isVerifying]
  );

  const handleDelete = useCallback(() => {
    if (isVerifying) return;
    setErrorMsg(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  }, [isVerifying]);

  const handleClear = useCallback(() => {
    if (isVerifying) return;
    setErrorMsg(null);
    setEnteredPin("");
  }, [isVerifying]);

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (enteredPin.length === 4 && user?.id && !isVerifying) {
      setIsVerifying(true);
      verifyPin(user.id, enteredPin).then((isValid) => {
        setIsVerifying(false);
        if (isValid) {
          unlock();
          if (onUnlock) onUnlock();
        } else {
          setIsShaking(true);
          setErrorMsg("Incorrect PIN. Please try again.");
          setTimeout(() => {
            setEnteredPin("");
            setIsShaking(false);
          }, 600);
        }
      });
    }
  }, [enteredPin, user, isVerifying, verifyPin, unlock, onUnlock]);

  // Global Keyboard listener for physical keyboard & numpad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, handleClear]);

  const handleSwitchAccount = () => {
    unlock();
    logout();
    window.location.href = "/login";
  };

  const roleLabel = (user?.role || "STAFF").replace(/_/g, " ");

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center text-center transition-transform ${
          isShaking ? "animate-bounce" : ""
        }`}
      >
        {/* Shield Icon & Brand Header */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-inner mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-gray-950 tracking-tight">
          Security PIN Lock
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Enter 4-digit PIN to access terminal
        </p>

        {/* User Card Badge */}
        <div className="my-4 w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-gray-900 truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold mt-0.5">
              <span className="text-indigo-600 font-bold uppercase text-[10px] tracking-wider bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                {roleLabel}
              </span>
              {user?.franchise?.name && (
                <span className="truncate">• {user.franchise.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* 4 PIN Dots Indicator */}
        <div className="flex items-center justify-center gap-4 my-3">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? "bg-indigo-600 scale-125 shadow-md shadow-indigo-600/30"
                    : "border-2 border-gray-300 bg-gray-100"
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-5 my-1">
          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 animate-in fade-in slide-in-from-top-1">
              {errorMsg}
            </p>
          )}
        </div>

        {/* On-Screen Touch Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] my-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-13 rounded-2xl bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 border border-slate-200/90 text-gray-900 font-black text-xl flex items-center justify-center shadow-2xs hover:border-indigo-300 transition-all cursor-pointer active:scale-95"
            >
              {num}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/90 text-gray-500 font-bold text-xs uppercase flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Clear (Esc)"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 border border-slate-200/90 text-gray-900 font-black text-xl flex items-center justify-center shadow-2xs hover:border-indigo-300 transition-all cursor-pointer active:scale-95"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 border border-slate-200/90 text-gray-700 hover:text-rose-700 font-bold text-sm flex items-center justify-center shadow-2xs hover:border-rose-300 transition-all cursor-pointer active:scale-95"
            title="Backspace (⌫)"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback to Password Login */}
        <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-between text-xs text-gray-500 font-semibold">
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Login with Password</span>
          </button>

          <span className="text-[10px] text-gray-400 font-mono">
            OmniPOS Terminal
          </span>
        </div>
      </div>
    </div>
  );
};
