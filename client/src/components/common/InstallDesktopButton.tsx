import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, X, Laptop } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';

interface InstallDesktopButtonProps {
  variant?: 'navbar' | 'pos' | 'banner';
  className?: string;
}

export const InstallDesktopButton: React.FC<InstallDesktopButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chrome' | 'edge'>('chrome');

  const handleInstallClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        return;
      }
      if (outcome === 'manual') {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  // If already installed in standalone window, optionally show a subtle badge or nothing
  if (isInstalled && variant === 'banner') {
    return null;
  }

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          type="button"
          title={isInstalled ? "Desktop App Installed" : "Download & Install Webpage to Desktop"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isInstalled
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 animate-pulse"
          } ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Desktop App</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Install Desktop App</span>
            </>
          )}
        </button>
      )}

      {variant === 'pos' && (
        <button
          onClick={handleInstallClick}
          type="button"
          title={isInstalled ? "Desktop App Active" : "Install Madrasi Dosa as Desktop Application"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            isInstalled
              ? "bg-slate-800 text-emerald-400 border-emerald-500/30"
              : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 hover:shadow-indigo-500/20"
          } ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Installed</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Install to Desktop</span>
            </>
          )}
        </button>
      )}

      {variant === 'banner' && !isInstalled && (
        <div className={`bg-gradient-to-r from-indigo-900 to-indigo-950 text-white p-3 rounded-2xl flex items-center justify-between border border-indigo-700/50 shadow-md ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Download Madrasi Dosa to Desktop</p>
              <p className="text-[11px] text-indigo-200">
                Launch directly from your Windows Desktop with fast rush-hour billing and full-screen POS mode.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-900 text-xs font-black hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap ml-3"
          >
            Download Now
          </button>
        </div>
      )}

      {/* Instructional Modal when clicked */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl relative text-gray-900 space-y-5">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-950">Install Desktop Application</h3>
                <p className="text-xs text-gray-500">Run Madrasi Dosa as a native desktop program</p>
              </div>
            </div>

            {/* Direct prompt trigger if browser allows */}
            {canInstall && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">1-Click Install Ready!</p>
                  <p className="text-[11px] text-emerald-700">Your browser is ready to install the desktop app immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await promptInstall();
                    if (res === 'accepted') setIsModalOpen(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Install Now
                </button>
              </div>
            )}

            {/* Browser Specific Instructions */}
            <div className="space-y-3">
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('chrome')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'chrome'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Google Chrome / Brave
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edge')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'edge'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Microsoft Edge
                </button>
              </div>

              {activeTab === 'chrome' ? (
                <div className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Look at the <strong>right side of your browser's address bar</strong> at the top. You will see an <strong>Install icon</strong> (🖥️ or ⊕ <strong>"Install Madrasi Dosa"</strong>).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Click it, or click the <strong>three dots menu (⋮)</strong> at top right ➔ <strong>Save and share</strong> ➔ <strong>Install Madrasi Dosa...</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Click <strong>Install</strong>. A desktop shortcut will be automatically created on your Windows Desktop!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Look at the <strong>right side of your address bar</strong> for the <strong>App Available (⊞)</strong> icon.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Click it, or click the <strong>three dots (...)</strong> at top right ➔ <strong>Apps</strong> ➔ <strong>Install Madrasi Dosa</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Check <strong>"Create Desktop shortcut"</strong> and click <strong>Install</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
