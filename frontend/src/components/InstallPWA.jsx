import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

/**
 * PWA Install Prompt — shows an "Add to Home Screen" banner on first visit.
 * Works on Android/Chrome via beforeinstallprompt event and shows manual instructions on iOS.
 */
export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("autoai_pwa_dismissed")) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((err) => console.error("[pwa] service worker registration failed", err));
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire the event; show manual prompt after 6s
    if (ios) {
      const t = setTimeout(() => setShow(true), 6000);
      return () => clearTimeout(t);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const install = async () => {
    if (deferred) {
      try {
        deferred.prompt();
        await deferred.userChoice;
      } catch (err) {
        console.error("[pwa] install prompt failed", err);
      }
      setDeferred(null);
    }
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem("autoai_pwa_dismissed", "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 border border-[#F59E0B] bg-[#0A0A0A] shadow-2xl p-4 flex items-start gap-3" data-testid="pwa-install-banner">
      <div className="w-10 h-10 bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
        <Smartphone size={18} className="text-black" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] font-bold">/// install the app</div>
        <div className="font-display text-base mt-1">Auto-AI India on your home screen</div>
        <p className="text-xs text-slate-400 mt-1">
          {isIOS
            ? "Tap the Share icon in Safari → 'Add to Home Screen' to install."
            : "Instant launch, offline browsing, push alerts. No Play Store needed."}
        </p>
        <div className="flex gap-2 mt-3">
          {!isIOS && (
            <button onClick={install} data-testid="pwa-install-btn" className="bg-[#F59E0B] text-black text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-2 flex items-center gap-1.5 hover:bg-[#D97706]">
              <Download size={12} /> Install
            </button>
          )}
          <button onClick={dismiss} data-testid="pwa-dismiss-btn" className="text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-white px-2">
            Later
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-slate-500 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
