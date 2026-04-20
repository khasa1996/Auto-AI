import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatINR } from "../lib/api";
import {
  ChevronLeft, Lock, Palette, DoorOpen, Lightbulb,
  Package, Zap, Sparkles, Crown, Gauge, RotateCw, Car,
} from "lucide-react";
import CarVisual from "../components/CarVisual";

const COLORS = [
  { name: "Obsidian", hex: "#0A0A0A", ring: "#737373" },
  { name: "Snow Pearl", hex: "#F5F5F4", ring: "#A8A29E" },
  { name: "Brunt Amber", hex: "#B45309", ring: "#F59E0B" },
  { name: "Metallic Silver", hex: "#94A3B8", ring: "#CBD5E1" },
  { name: "Deep Ocean", hex: "#1E3A8A", ring: "#3B82F6" },
  { name: "British Racing", hex: "#14532D", ring: "#22C55E" },
  { name: "Sangria Red", hex: "#991B1B", ring: "#EF4444" },
];

const LUXURY_SEGMENTS = ["Luxury SUV", "Luxury Sedan", "Luxury EV", "Luxury Hatch", "Luxury MPV", "Premium SUV"];

export default function Showroom() {
  const { carId } = useParams();
  const [car, setCar] = useState(null);
  const [angle, setAngle] = useState(0);
  const [autoSpin, setAutoSpin] = useState(true);
  const [color, setColor] = useState(COLORS[0]);
  const [doors, setDoors] = useState(false);
  const [hood, setHood] = useState(false);
  const [boot, setBoot] = useState(false);
  const [lights, setLights] = useState(false);
  const [view, setView] = useState("exterior"); // exterior | interior | top
  const [locked, setLocked] = useState(false);
  const [trialSeconds, setTrialSeconds] = useState(180);
  const dragRef = useRef({ active: false, startX: 0, startAngle: 0 });

  useEffect(() => {
    api.get(`/cars/${carId}`).then((r) => setCar(r.data));
  }, [carId]);

  // Auto-spin
  useEffect(() => {
    if (!autoSpin || locked) return;
    const id = setInterval(() => setAngle((a) => (a + 0.6) % 360), 40);
    return () => clearInterval(id);
  }, [autoSpin, locked]);

  // Free trial countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTrialSeconds((s) => {
        if (s <= 1) { setLocked(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const onMouseDown = (e) => {
    if (locked) return;
    dragRef.current = { active: true, startX: e.clientX, startAngle: angle };
    setAutoSpin(false);
  };
  const onMouseMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    setAngle((dragRef.current.startAngle + dx * 0.8 + 3600) % 360);
  };
  const onMouseUp = () => { dragRef.current.active = false; };

  if (!car) return <div className="min-h-screen bg-black flex items-center justify-center text-slate-400">Loading showroom…</div>;

  const isLuxury = LUXURY_SEGMENTS.some((s) => (car.segment || "").includes(s.split(" ")[0]));

  const trialMin = Math.floor(trialSeconds / 60);
  const trialSec = String(trialSeconds % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="showroom-page">
      {/* HUD header */}
      <div className="border-b border-[#262626] bg-black/70 glass sticky top-16 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link to="/cars" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#F59E0B] flex items-center gap-1" data-testid="showroom-back">
            <ChevronLeft size={14} /> exit showroom
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-mono">
              <Crown size={12} className="text-[#F59E0B]" />
              <span className="text-[#F59E0B]">Premium Preview</span>
              <span className="text-slate-500">·</span>
              <span className={locked ? "text-[#EF4444]" : "text-slate-300"} data-testid="trial-timer">
                {locked ? "EXPIRED" : `${trialMin}:${trialSec} left`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-12 gap-6">
        {/* Viewer */}
        <div className="lg:col-span-8">
          <div
            className="relative border border-[#262626] bg-[#0A0A0A] aspect-[16/10] overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            data-testid="showroom-viewer"
          >
            {/* Studio lighting */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12),transparent_60%)]" />
            <div className="absolute inset-0 hero-grid opacity-40" />
            {lights && <div className="absolute left-[15%] top-[55%] w-24 h-24 rounded-full blur-2xl bg-white/60" />}
            {lights && <div className="absolute right-[15%] top-[55%] w-24 h-24 rounded-full blur-2xl bg-white/60" />}

            {/* Car stage */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1200px" }}>
              <div
                className="w-[85%] transition-transform duration-200"
                style={{
                  transform: view === "top"
                    ? `rotateX(70deg) rotateZ(${angle}deg)`
                    : view === "interior"
                      ? `rotateY(${angle * 0.3}deg) scale(1.25)`
                      : `rotateY(${angle}deg)`,
                  transformStyle: "preserve-3d",
                  filter: locked ? "blur(18px) brightness(0.5)" : `drop-shadow(0 15px 25px ${color.ring}50)`,
                }}
              >
                <CarSVG segment={car.segment} bodyColor={color.hex} accent={color.ring} doors={doors} hood={hood} boot={boot} lights={lights} view={view} />
              </div>
            </div>

            {/* Shadow */}
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[70%] h-6 bg-black/60 blur-2xl rounded-full" />

            {/* Angle indicator */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono bg-black/70 px-3 py-1.5 border border-[#262626]" data-testid="angle-readout">
              <RotateCw size={11} className="text-[#F59E0B]" />
              {Math.round(angle)}°
            </div>

            {/* View chips */}
            <div className="absolute top-4 right-4 flex gap-2">
              {[
                { k: "exterior", l: "Exterior" },
                { k: "interior", l: "Interior" },
                { k: "top", l: "Top" },
              ].map((v) => (
                <button
                  key={v.k}
                  disabled={locked}
                  data-testid={`view-${v.k}-btn`}
                  onClick={() => setView(v.k)}
                  className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 border transition-colors ${
                    view === v.k ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "bg-black/60 text-slate-300 border-[#262626] hover:border-[#F59E0B]"
                  }`}
                >
                  {v.l}
                </button>
              ))}
            </div>

            {/* Lock overlay */}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10" data-testid="showroom-lock-overlay">
                <div className="text-center max-w-md p-8">
                  <Lock size={48} className="text-[#F59E0B] mx-auto mb-4" />
                  <div className="font-display text-3xl font-light">Preview Expired</div>
                  <p className="text-slate-400 mt-2 text-sm">
                    Unlock unlimited 360° showroom access for every car, full customization, and exclusive AI insights.
                  </p>
                  <Link to="/premium" className="mt-6 inline-block bg-[#F59E0B] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] font-bold hover:bg-[#D97706]" data-testid="upgrade-cta-lock">
                    Unlock Premium →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Drag hint */}
          <div className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono">
            {locked ? "· preview ended ·" : "· drag to rotate · scroll for angles · release to auto-spin ·"}
          </div>
        </div>

        {/* Control panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Car info */}
          <div className="border border-[#262626] bg-[#0D0D0D] p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">{car.brand}</div>
            <div className="font-display text-3xl font-medium mt-1">{car.model}</div>
            <div className="text-sm text-slate-400 mt-0.5">{car.variant} · {car.segment}</div>
            <div className="font-display text-2xl text-[#F59E0B] mt-3">{formatINR(car.price_ex_showroom)}</div>
            {isLuxury && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] border border-[#F59E0B]/40 px-2 py-1">
                <Crown size={10} /> Luxury Segment
              </div>
            )}
          </div>

          {/* Colors */}
          <Panel icon={<Palette size={14} />} title="Paint" disabled={locked}>
            <div className="grid grid-cols-7 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  disabled={locked}
                  onClick={() => setColor(c)}
                  data-testid={`color-${c.name.toLowerCase().replace(" ", "-")}`}
                  title={c.name}
                  className={`w-full aspect-square border-2 transition-all ${color.name === c.name ? "scale-110" : "opacity-80 hover:opacity-100"}`}
                  style={{ background: c.hex, borderColor: color.name === c.name ? c.ring : "#262626" }}
                />
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-2">{color.name}</div>
          </Panel>

          {/* States */}
          <Panel icon={<Zap size={14} />} title="Live States" disabled={locked}>
            <div className="grid grid-cols-2 gap-2">
              <Toggle active={doors} onClick={() => setDoors(!doors)} icon={<DoorOpen size={12} />} label="Doors" tid="toggle-doors" disabled={locked} />
              <Toggle active={hood} onClick={() => setHood(!hood)} icon={<Package size={12} />} label="Hood" tid="toggle-hood" disabled={locked} />
              <Toggle active={boot} onClick={() => setBoot(!boot)} icon={<Car size={12} />} label="Boot" tid="toggle-boot" disabled={locked} />
              <Toggle active={lights} onClick={() => setLights(!lights)} icon={<Lightbulb size={12} />} label="Headlights" tid="toggle-lights" disabled={locked} />
            </div>
          </Panel>

          {/* Rotation */}
          <Panel icon={<Gauge size={14} />} title="Rotation" disabled={locked}>
            <div className="flex items-center gap-2">
              <button
                disabled={locked}
                onClick={() => setAutoSpin((s) => !s)}
                data-testid="toggle-autospin"
                className={`flex-1 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border transition-colors ${
                  autoSpin ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "text-slate-300 border-[#262626]"
                }`}
              >
                {autoSpin ? "Auto-spin ON" : "Paused"}
              </button>
              <button
                disabled={locked}
                onClick={() => setAngle(0)}
                data-testid="reset-angle"
                className="py-2 px-3 border border-[#262626] text-slate-300 hover:border-[#F59E0B]"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </Panel>

          {/* Subscribe CTA */}
          <div className="border border-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/10 to-transparent p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#F59E0B]" />
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">Loving it?</div>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed mb-4">
              Unlock unlimited showroom time, all 106 cars, and exclusive AI perks.
            </div>
            <Link to="/premium" data-testid="upgrade-cta-panel" className="block bg-[#F59E0B] text-black text-center text-xs uppercase tracking-[0.25em] font-bold py-3 hover:bg-[#D97706]">
              Go Premium →
            </Link>
          </div>

          {/* Book */}
          <Link
            to={`/book/${car.id}`}
            data-testid="showroom-book-btn"
            className="block border border-white/15 text-center text-xs uppercase tracking-[0.25em] font-bold py-3 text-slate-200 hover:border-[#F59E0B] hover:text-[#F59E0B]"
          >
            Book a test drive →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Panel({ icon, title, children, disabled }) {
  return (
    <div className={`border border-[#262626] bg-[#0D0D0D] p-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
        <span className="text-[#F59E0B]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ active, onClick, icon, label, tid, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={tid}
      className={`flex items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold border transition-colors ${
        active ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "text-slate-300 border-[#262626] hover:border-[#F59E0B]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ---------- Detailed car SVG with door/hood/boot/lights states ----------
function CarSVG({ segment, bodyColor, accent, doors, hood, boot, lights, view }) {
  if (view === "interior") return <InteriorSVG accent={accent} />;

  const s = (segment || "").toLowerCase();
  const isSUV = s.includes("suv") || s.includes("crossover") || s.includes("lifestyle");
  const isMPV = s.includes("mpv");
  const isSedan = s.includes("sedan");

  const roofY = isSUV ? 14 : isMPV ? 10 : isSedan ? 18 : 16;
  const hoodOpenY = hood ? -8 : 0;
  const bootOpenY = boot ? -10 : 0;
  const doorOpen = doors ? 20 : 0;

  return (
    <svg viewBox="0 0 280 120" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Main body */}
      <g>
        {/* Lower body */}
        <path
          d={`M25 85 L25 60 Q28 40 60 34 L90 ${roofY + 6} L190 ${roofY + 6} Q220 36 245 44 L258 50 Q266 60 260 85 Z`}
          fill={bodyColor}
          stroke={accent}
          strokeWidth="0.8"
        />
        {/* Roof */}
        <path
          d={`M60 34 L90 ${roofY} L190 ${roofY} L220 36`}
          fill="none"
          stroke={accent}
          strokeWidth="1"
          opacity="0.7"
        />
        {/* Windows band */}
        <path
          d={`M70 36 L95 ${roofY + 2} L188 ${roofY + 2} L215 38 Z`}
          fill="#0B1220"
          stroke={accent}
          strokeWidth="0.5"
          opacity="0.8"
        />
        {/* Window divider */}
        <line x1="140" y1={roofY + 2} x2="140" y2="38" stroke={accent} strokeWidth="0.3" opacity="0.6" />

        {/* Hood (with open state) */}
        <path
          d={`M25 60 Q28 40 60 34 L85 34 L85 ${40 + hoodOpenY} L30 ${50 + hoodOpenY} Z`}
          fill={bodyColor}
          stroke={accent}
          strokeWidth="0.6"
          opacity={hood ? 0.9 : 0.4}
        />

        {/* Boot/Tailgate (with open state) */}
        <path
          d={`M215 36 L245 44 L258 50 Q265 55 258 ${62 + bootOpenY} L215 ${52 + bootOpenY} Z`}
          fill={bodyColor}
          stroke={accent}
          strokeWidth="0.6"
          opacity={boot ? 0.9 : 0.4}
        />

        {/* Front door (open) */}
        {doors && (
          <path
            d={`M90 40 L90 ${85 - 5} L ${110 + doorOpen} ${85 + doorOpen * 0.5} L ${110 + doorOpen} ${40 + doorOpen * 0.3} Z`}
            fill={bodyColor}
            stroke={accent}
            strokeWidth="0.8"
            opacity="0.85"
          />
        )}
        {/* Rear door (open) */}
        {doors && (
          <path
            d={`M150 40 L150 ${85 - 5} L ${170 + doorOpen} ${85 + doorOpen * 0.5} L ${170 + doorOpen} ${40 + doorOpen * 0.3} Z`}
            fill={bodyColor}
            stroke={accent}
            strokeWidth="0.8"
            opacity="0.85"
          />
        )}
        {/* Door lines when closed */}
        {!doors && (
          <>
            <line x1="90" y1="40" x2="90" y2="80" stroke={accent} strokeWidth="0.4" opacity="0.5" />
            <line x1="140" y1="40" x2="140" y2="80" stroke={accent} strokeWidth="0.4" opacity="0.5" />
            <line x1="175" y1="40" x2="175" y2="78" stroke={accent} strokeWidth="0.4" opacity="0.5" />
          </>
        )}

        {/* Headlight */}
        <ellipse cx="33" cy="58" rx="6" ry="4" fill={lights ? "#FFF5C0" : "#1F2937"} stroke={accent} strokeWidth="0.5" />
        {lights && <ellipse cx="33" cy="58" rx="14" ry="8" fill="#FFFFFF" opacity="0.35" />}
        {/* Tail light */}
        <rect x="248" y="58" width="10" height="5" fill={lights ? "#FCA5A5" : "#7F1D1D"} rx="1" />

        {/* Grille */}
        <rect x="26" y="66" width="10" height="10" fill="#0A0A0A" stroke={accent} strokeWidth="0.3" />

        {/* Side vent */}
        <rect x="245" y="72" width="8" height="2" fill="#0A0A0A" stroke={accent} strokeWidth="0.3" />

        {/* Door handles */}
        <rect x="108" y="62" width="6" height="1.8" fill={accent} opacity="0.7" />
        <rect x="168" y="62" width="6" height="1.8" fill={accent} opacity="0.7" />

        {/* Wheels */}
        <g>
          <circle cx="68" cy="88" r="14" fill="#0A0A0A" stroke={accent} strokeWidth="1" />
          <circle cx="68" cy="88" r="7" fill="none" stroke={accent} strokeWidth="0.8" />
          <circle cx="68" cy="88" r="2.5" fill={accent} />
        </g>
        <g>
          <circle cx="218" cy="88" r="14" fill="#0A0A0A" stroke={accent} strokeWidth="1" />
          <circle cx="218" cy="88" r="7" fill="none" stroke={accent} strokeWidth="0.8" />
          <circle cx="218" cy="88" r="2.5" fill={accent} />
        </g>
      </g>
    </svg>
  );
}

function InteriorSVG({ accent }) {
  return (
    <svg viewBox="0 0 280 160" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Cabin wrap */}
      <path d="M20 130 Q20 40 140 20 Q260 40 260 130 Z" fill="#0D0D0D" stroke={accent} strokeWidth="0.8" />
      {/* Dashboard */}
      <path d="M40 90 L240 90 L230 115 L50 115 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
      {/* Steering wheel */}
      <circle cx="90" cy="100" r="18" fill="none" stroke={accent} strokeWidth="1.2" />
      <circle cx="90" cy="100" r="8" fill={accent} opacity="0.2" />
      <rect x="82" y="98" width="16" height="4" fill={accent} opacity="0.5" />
      {/* Infotainment */}
      <rect x="130" y="78" width="50" height="28" fill="#050505" stroke={accent} strokeWidth="0.6" />
      <rect x="134" y="82" width="42" height="3" fill={accent} opacity="0.4" />
      <rect x="134" y="88" width="32" height="3" fill={accent} opacity="0.3" />
      <rect x="134" y="94" width="38" height="3" fill={accent} opacity="0.3" />
      {/* AC vents */}
      <rect x="50" y="80" width="18" height="5" fill="#050505" stroke={accent} strokeWidth="0.4" />
      <rect x="200" y="80" width="18" height="5" fill="#050505" stroke={accent} strokeWidth="0.4" />
      {/* Seats */}
      <path d="M60 130 L80 130 L82 150 L58 150 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
      <path d="M180 130 L200 130 L202 150 L178 150 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
      {/* Console */}
      <rect x="125" y="115" width="30" height="20" fill="#0A0A0A" stroke={accent} strokeWidth="0.4" />
      <circle cx="140" cy="125" r="3" fill={accent} opacity="0.6" />
      {/* Label */}
      <text x="140" y="45" fontSize="8" fill={accent} textAnchor="middle" letterSpacing="3">INTERIOR</text>
    </svg>
  );
}
