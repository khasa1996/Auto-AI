/**
 * CarVisual — a premium, brand-themed "designed" car card that replaces photos.
 * Each brand has its own gradient palette. A segment-based car silhouette SVG
 * is layered on top. Inspired by CRED's illustrated car cards.
 */

const BRAND_THEMES = {
  "Maruti Suzuki": { bg: "linear-gradient(135deg, #0B2545 0%, #13315C 100%)", accent: "#EFF6FF", glow: "#3B82F6" },
  "Hyundai":      { bg: "linear-gradient(135deg, #002C5F 0%, #00457C 100%)", accent: "#BFDBFE", glow: "#60A5FA" },
  "Tata":         { bg: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)", accent: "#DDD6FE", glow: "#A78BFA" },
  "Mahindra":     { bg: "linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)", accent: "#FED7AA", glow: "#FB923C" },
  "Kia":          { bg: "linear-gradient(135deg, #1C1917 0%, #292524 100%)", accent: "#F87171", glow: "#EF4444" },
  "Toyota":       { bg: "linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%)", accent: "#FECACA", glow: "#F87171" },
  "Honda":        { bg: "linear-gradient(135deg, #0C4A6E 0%, #075985 100%)", accent: "#BAE6FD", glow: "#38BDF8" },
  "MG":           { bg: "linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%)", accent: "#DDD6FE", glow: "#A78BFA" },
  "Renault":      { bg: "linear-gradient(135deg, #713F12 0%, #854D0E 100%)", accent: "#FEF3C7", glow: "#FCD34D" },
  "Nissan":       { bg: "linear-gradient(135deg, #1F2937 0%, #111827 100%)", accent: "#D1D5DB", glow: "#F87171" },
  "Skoda":        { bg: "linear-gradient(135deg, #14532D 0%, #166534 100%)", accent: "#BBF7D0", glow: "#4ADE80" },
  "Volkswagen":   { bg: "linear-gradient(135deg, #0C4A6E 0%, #164E63 100%)", accent: "#A5F3FC", glow: "#22D3EE" },
  "Citroen":      { bg: "linear-gradient(135deg, #831843 0%, #9F1239 100%)", accent: "#FBCFE8", glow: "#F472B6" },
  "Jeep":         { bg: "linear-gradient(135deg, #365314 0%, #3F6212 100%)", accent: "#D9F99D", glow: "#A3E635" },
  "BMW":          { bg: "linear-gradient(135deg, #0C2B5A 0%, #1E3A8A 100%)", accent: "#DBEAFE", glow: "#60A5FA" },
  "Mercedes-Benz":{ bg: "linear-gradient(135deg, #18181B 0%, #27272A 100%)", accent: "#E4E4E7", glow: "#D4D4D8" },
  "Audi":         { bg: "linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%)", accent: "#FEE2E2", glow: "#EF4444" },
  "Volvo":        { bg: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", accent: "#CBD5E1", glow: "#94A3B8" },
  "MINI":         { bg: "linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)", accent: "#FED7AA", glow: "#FB923C" },
};

const DEFAULT_THEME = { bg: "linear-gradient(135deg, #1C1917 0%, #292524 100%)", accent: "#FCD34D", glow: "#F59E0B" };

// Segment -> approximate SVG silhouette
function Silhouette({ segment, color }) {
  const common = { fill: color, stroke: color, strokeWidth: 0.5, opacity: 0.95 };
  const s = (segment || "").toLowerCase();

  if (s.includes("hatch")) {
    return (
      <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path {...common} d="M20 55 Q18 35 45 28 Q55 15 90 13 L125 13 Q150 15 160 28 L178 32 Q185 38 180 55 L165 55 A12 12 0 0 0 141 55 L59 55 A12 12 0 0 0 35 55 Z" />
        <circle cx="47" cy="58" r="10" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
        <circle cx="153" cy="58" r="10" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (s.includes("sedan")) {
    return (
      <svg viewBox="0 0 220 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path {...common} d="M15 55 Q12 38 40 32 Q55 16 95 13 L140 13 Q175 16 195 32 L205 38 Q210 46 205 55 L182 55 A12 12 0 0 0 158 55 L62 55 A12 12 0 0 0 38 55 Z" />
        <circle cx="50" cy="58" r="10" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
        <circle cx="170" cy="58" r="10" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (s.includes("suv") || s.includes("crossover")) {
    return (
      <svg viewBox="0 0 210 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path {...common} d="M15 55 L15 38 Q18 22 45 18 L90 10 L150 10 Q175 12 190 22 L200 28 Q206 36 200 55 L175 55 A13 13 0 0 0 149 55 L61 55 A13 13 0 0 0 35 55 Z" />
        <rect x="50" y="22" width="120" height="16" fill="#0A0A0A" opacity="0.4" rx="2" />
        <circle cx="48" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
        <circle cx="162" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (s.includes("mpv")) {
    return (
      <svg viewBox="0 0 220 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path {...common} d="M15 55 L15 28 Q18 14 45 10 L170 10 Q195 12 205 22 L210 30 Q214 42 210 55 L185 55 A13 13 0 0 0 159 55 L61 55 A13 13 0 0 0 35 55 Z" />
        <rect x="45" y="18" width="145" height="20" fill="#0A0A0A" opacity="0.4" rx="2" />
        <circle cx="48" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
        <circle cx="172" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (s.includes("pickup") || s.includes("truck")) {
    return (
      <svg viewBox="0 0 220 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path {...common} d="M15 55 L15 32 Q18 18 45 14 L95 12 L105 22 L205 22 L210 30 L210 55 L185 55 A13 13 0 0 0 159 55 L61 55 A13 13 0 0 0 35 55 Z" />
        <circle cx="48" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
        <circle cx="172" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  // Default: generic SUV
  return (
    <svg viewBox="0 0 210 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <path {...common} d="M15 55 Q18 30 45 22 L90 13 L150 13 Q180 18 195 30 Q206 40 200 55 L175 55 A13 13 0 0 0 149 55 L61 55 A13 13 0 0 0 35 55 Z" />
      <circle cx="48" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
      <circle cx="162" cy="58" r="11" fill="#0A0A0A" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function CarVisual({ car, className = "", showLabel = true, tall = false }) {
  const theme = BRAND_THEMES[car.brand] || DEFAULT_THEME;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: theme.bg }}
      data-testid={`car-visual-${car.id}`}
    >
      {/* Grid accent */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Glow */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40"
        style={{ background: theme.glow }}
      />
      {/* Brand corner */}
      {showLabel && (
        <div className="absolute top-3 left-4 z-10">
          <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: theme.accent }}>
            {car.brand}
          </div>
        </div>
      )}
      {/* Model name - large */}
      {showLabel && (
        <div className="absolute bottom-3 left-4 right-4 z-10">
          <div
            className="font-display font-medium leading-none"
            style={{ color: theme.accent, fontSize: tall ? "2rem" : "1.3rem" }}
          >
            {car.model}
          </div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-white/50 mt-1">
            {car.variant} · {car.segment}
          </div>
        </div>
      )}
      {/* Silhouette */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className={tall ? "w-4/5" : "w-3/4"}>
          <Silhouette segment={car.segment} color={theme.accent} />
        </div>
      </div>
      {/* Fuel badge */}
      <div className="absolute top-3 right-3 z-10 text-[9px] uppercase tracking-[0.25em] font-bold px-2 py-0.5 border"
           style={{ color: theme.accent, borderColor: theme.accent + "40" }}>
        {car.fuel}
      </div>
    </div>
  );
}
