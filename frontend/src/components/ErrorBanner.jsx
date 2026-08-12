import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Inline error banner used across pages so failed API calls are always visible
 * to the user instead of leaving an empty screen.
 */
export default function ErrorBanner({ message, onRetry, className = "", testId = "error-banner" }) {
  if (!message) return null;
  return (
    <div
      className={`border border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444] p-4 text-sm flex items-start gap-3 ${className}`}
      data-testid={testId}
      role="alert"
    >
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          data-testid={`${testId}-retry`}
          className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-white"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
