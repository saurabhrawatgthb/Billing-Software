import React, { useState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";
import { Modal } from "../common/Modal.js";
import { Button } from "../common/Button.js";
import { useAuthStore } from "../../store/authStore.js";
import { usePinLockStore } from "../../store/pinLockStore.js";

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { hasPin, setPin, removePin } = usePinLockStore();

  const isConfigured = user?.id ? hasPin(user.id) : false;

  const [pin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user?.id) {
      setErrorMsg("User session not found.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg("PIN must be exactly 4 digits (0-9).");
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg("Confirmation PIN does not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await setPin(user.id, pin);
      setSuccessMsg("Quick PIN set successfully! You can now unlock your terminal in 1 second.");
      setNewPin("");
      setConfirmPin("");
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = () => {
    if (!user?.id) return;
    if (window.confirm("Are you sure you want to disable Quick PIN lock on this PC?")) {
      removePin(user.id);
      setSuccessMsg("Quick PIN has been removed.");
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isConfigured ? "Manage Quick Access PIN" : "Setup Quick Access PIN"}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Feature Explainer */}
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
          <KeyRound className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-bold block">1-Click Desktop App Login:</span>
            Instead of entering your full email and password every morning, enter this 4-digit PIN to immediately access your terminal on this computer.
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSavePin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isConfigured ? "Enter New 4-Digit PIN" : "Choose 4-Digit PIN"}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Confirm 4-Digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            {isConfigured ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Disable PIN
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={pin.length !== 4 || confirmPin.length !== 4}
              >
                Save PIN
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
