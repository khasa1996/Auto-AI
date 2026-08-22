import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, formatINR, API } from "../lib/api";
import {
  ChevronLeft, Lock, Palette, DoorOpen, Lightbulb,
  Package, Zap, Sparkles, Crown, Gauge, RotateCw, Car, Eye,
} from "lucide-react";
import { getCarImage } from "../lib/carImages";

const COLORS = [
  { name: "Obsidian", hex: "#0A0A0A", ring: "#737373", tint: "rgba(10,10,10,0.0)" },
  { name: "Snow Pearl", hex: "#F5F5F4", ring: "#A8A29E", tint: "rgba(245,245,244,0.25)" },
  { name: "Brunt Amber", hex: "#B45309", ring: "#F59E0B", tint: "rgba(180,83,9,0.35)" },
  { name: "Metallic Silver", hex: "#94A3B8", ring: "#CBD5E1", tint: "rgba(148,163,184,0.3)" },
  { name: "Deep Ocean", hex: "#1E3A8A", ring: "#3B82F6", tint: "rgba(30,58,138,0.4)" },
  { name: "British Racing", hex: "#14532D", ring: "#22C55E", tint: "rgba(20,83,45,0.4)" },
  { name: "Sangria Red", hex: "#991B1B", ring: "#EF4444", tint: "rgba(153,27,27,0.4)" },
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
  const [view, setView] = useState("exterior");
  const [locked, setLocked] = useState(false);
  const [trialSeconds, setTrialSeconds] = useState(180);
  const dragRef = useRef({ active: false, startX: 0, startAngle: 0 });

  useEffect(() => {
    api.get(`/cars/${carId}`).then((r) => setCar(r.data));
  }, [carId]);

  useEffect(() => {
    if (!autoSpin || locked) return;
    const id = setInterval(() => setAngle((a) => (a + 0.8) % 360), 40);
    return () => clearInterval(id);
  }, [autoSpin, locked]);

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

  // touch
  const onTouchStart = (e) => {
    if (locked) return;
    dragRef.current = { active: true, startX: e.touches[0].clientX, startAngle: angle };
    setAutoSpin(false);
  };
  const onTouchMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.touches[0].clientX - dragRef.current.startX;
    setAngle((dragRef.current.startAngle + dx * 0.8 + 3600) % 360);
  };
  const onTouchEnd = () => { dragRef.current.active = false; };

  if (!car) return <div className="min-h-screen bg-black flex items-center justify-center text-slate-400">Loading showroom…</div>;

  const isLuxury = LUXURY_SEGMENTS.some((s) => (car.segment || "").includes(s.split(" ")[0]));
  const trialMin = Math.floor(trialSeconds / 60);
  const trialSec = String(trialSeconds % 60).padStart(2, "0");

  // Real OEM image via backend proxy
  const realUrl = getCarImage(car.id);
  const proxiedUrl = realUrl ? `${API}/image-proxy?url=${encodeURIComponent(realUrl)}` : null;

  // 3D sway effect based on angle — creates the illusion of rotation
  // Angle 0-180 = normal; 180-360 = mirrored (as if we rotated to back, showing reverse)
  const normAngle = angle % 360;
  const isBack = normAngle > 90 && normAngle < 270;
  const swayDeg = Math.sin((angle * Math.PI) / 180) * 18; // ±18deg rotation
  const swayX = Math.sin((angle * Math.PI) / 180) * 30; // ±30px translate

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="showroom-page">
      {/* HUD header */}
      <div className="border-b border-white/10 glass-strong sticky top-16 z-30">
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
            className="relative border border-white/10 bg-gradient-to-b from-[#0A0A0A] to-[#050505] aspect-[16/10] overflow-hidden select-none cursor-grab active:cursor-grabbing corner-notch"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            data-testid="showroom-viewer"
          >
            {/* Studio spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.14),transparent_65%)] pointer-events-none" />
            <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
            {lights && (
              <>
                <div className="absolute left-[20%] top-[50%] w-32 h-32 rounded-full blur-3xl bg-white/50 pointer-events-none animate-pulse" />
                <div className="absolute right-[20%] top-[50%] w-32 h-32 rounded-full blur-3xl bg-white/50 pointer-events-none animate-pulse" />
              </>
            )}

            {/* Stage floor reflection ring */}
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[75%] h-[14%] pointer-events-none">
              <div className="w-full h-full rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25),rgba(0,0,0,0.8)_70%)] blur-xl opacity-70" />
            </div>

            {/* THE ACTUAL CAR IMAGE — 3D sway */}
            <div className="absolute inset-0 flex items-center justify-center p-8" style={{ perspective: "1400px" }}>
              {view === "interior" ? (
                <InteriorView accent={color.ring} locked={locked} />
              ) : (
                <motion.div
                  className="relative w-[92%] h-[80%] transition-filter duration-300"
                  animate={{
                    rotateY: swayDeg,
                    x: swayX,
                    scale: view === "top" ? 0.85 : 1,
                    rotateX: view === "top" ? 55 : 0,
                  }}
                  transition={{ type: "tween", duration: 0.05, ease: "linear" }}
                  style={{
                    transformStyle: "preserve-3d",
                    filter: locked ? "blur(18px) brightness(0.5)" : `drop-shadow(0 30px 40px ${color.ring}70)`,
                  }}
                >
                  {proxiedUrl ? (
                    <>
                      <img
                        src={proxiedUrl}
                        alt={`${car.brand} ${car.model}`}
                        className="w-full h-full object-contain"
                        style={{
                          transform: isBack ? "scaleX(-1)" : "scaleX(1)",
                          transition: "transform 0.3s ease",
                        }}
                        draggable={false}
                      />
                      {/* Color tint overlay — paint customization */}
                      <div
                        className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-500"
                        style={{ backgroundColor: color.tint, opacity: color.name === "Obsidian" ? 0 : 0.75 }}
                      />
                      {/* Additional color wash for stronger paint feel on non-default */}
                      {color.name !== "Obsidian" && (
                        <div
                          className="absolute inset-0 pointer-events-none mix-blend-soft-light transition-opacity duration-500"
                          style={{ backgroundColor: color.hex, opacity: 0.55 }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                      No photo available
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* State overlay chips (top-left) */}
            {view !== "interior" && (doors || hood || boot || lights) && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[50%] z-[5]">
                {doors && <StateChip icon={<DoorOpen size={10} />} label="Doors Open" />}
                {hood && <StateChip icon={<Package size={10} />} label="Hood Up" />}
                {boot && <StateChip icon={<Car size={10} />} label="Boot Open" />}
                {lights && <StateChip icon={<Lightbulb size={10} />} label="Lights ON" />}
              </div>
            )}

            {/* Angle indicator */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-300 font-mono glass border border-white/10 px-3 py-1.5" data-testid="angle-readout">
              <RotateCw size={11} className="text-[#F59E0B]" />
              {Math.round(angle)}°
              <span className="text-slate-600">·</span>
              <span className="text-[#F59E0B]">{isBack ? "REAR" : "FRONT"}</span>
            </div>

            {/* Paint readout */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-300 font-mono glass border border-white/10 px-3 py-1.5">
              <Palette size={11} style={{ color: color.ring }} />
              {color.name}
            </div>

            {/* View chips */}
            <div className="absolute top-4 right-4 flex gap-2">
              {[
                { k: "exterior", l: "Exterior", icon: Car },
                { k: "interior", l: "Interior", icon: Eye },
                { k: "top", l: "Top", icon: Gauge },
              ].map((v) => (
                <button
                  key={v.k}
                  disabled={locked}
                  data-testid={`view-${v.k}-btn`}
                  onClick={() => setView(v.k)}
                  className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 border transition-all ${
                    view === v.k ? "bg-[#F59E0B] text-black border-[#F59E0B] amber-glow" : "glass text-slate-300 border-white/10 hover:border-[#F59E0B]/60"
                  }`}
                >
                  <v.icon size={10} /> {v.l}
                </button>
              ))}
            </div>

            {/* Lock overlay */}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-10" data-testid="showroom-lock-overlay">
                <div className="text-center max-w-md p-8">
                  <Lock size={48} className="text-[#F59E0B] mx-auto mb-4" />
                  <div className="font-display text-3xl font-light">Preview Expired</div>
                  <p className="text-slate-400 mt-2 text-sm">
                    Unlock unlimited 360° showroom access for every car, full customization, and exclusive AI insights.
                  </p>
                  <Link to="/premium" className="mt-6 inline-block btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] font-bold" data-testid="upgrade-cta-lock">
                    Unlock Premium →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Drag hint + angle slider */}
          <div className="mt-3 flex flex-col gap-2">
            <div className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono">
              {locked ? "· preview ended ·" : "· drag image to rotate · swipe on mobile ·"}
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={Math.round(angle)}
              onChange={(e) => { setAutoSpin(false); setAngle(Number(e.target.value)); }}
              disabled={locked}
              data-testid="angle-slider"
              className="w-full accent-[#F59E0B]"
            />
          </div>
        </div>

        {/* Control panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Car info */}
          <div className="border border-white/10 bg-[#0D0D0D] p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold font-mono">{car.brand}</div>
            <div className="font-display text-3xl font-medium mt-1">{car.model}</div>
            <div className="text-sm text-slate-400 mt-0.5">{car.variant} · {car.segment}</div>
            <div className="font-num text-4xl text-[#F59E0B] mt-3">{formatINR(car.price_ex_showroom)}</div>
            {isLuxury && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] border border-[#F59E0B]/40 px-2 py-1">
                <Crown size={10} /> Luxury Segment
              </div>
            )}
          </div>

          <Panel icon={<Palette size={14} />} title="Paint" disabled={locked}>
            <div className="grid grid-cols-7 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  disabled={locked}
                  onClick={() => setColor(c)}
                  data-testid={`color-${c.name.toLowerCase().replace(" ", "-")}`}
                  title={c.name}
                  className={`w-full aspect-square border-2 transition-all rounded-sm ${color.name === c.name ? "scale-110 ring-2 ring-offset-2 ring-offset-[#0D0D0D]" : "opacity-80 hover:opacity-100"}`}
                  style={{ background: c.hex, borderColor: color.name === c.name ? c.ring : "#262626", "--tw-ring-color": c.ring }}
                />
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-3">{color.name}</div>
          </Panel>

          <Panel icon={<Zap size={14} />} title="Live States" disabled={locked}>
            <div className="grid grid-cols-2 gap-2">
              <Toggle active={doors} onClick={() => setDoors(!doors)} icon={<DoorOpen size={12} />} label="Doors" tid="toggle-doors" disabled={locked} />
              <Toggle active={hood} onClick={() => setHood(!hood)} icon={<Package size={12} />} label="Hood" tid="toggle-hood" disabled={locked} />
              <Toggle active={boot} onClick={() => setBoot(!boot)} icon={<Car size={12} />} label="Boot" tid="toggle-boot" disabled={locked} />
              <Toggle active={lights} onClick={() => setLights(!lights)} icon={<Lightbulb size={12} />} label="Headlights" tid="toggle-lights" disabled={locked} />
            </div>
          </Panel>

          <Panel icon={<Gauge size={14} />} title="Rotation" disabled={locked}>
            <div className="flex items-center gap-2">
              <button
                disabled={locked}
                onClick={() => setAutoSpin((s) => !s)}
                data-testid="toggle-autospin"
                className={`flex-1 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border transition-colors ${
                  autoSpin ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "text-slate-300 border-white/15"
                }`}
              >
                {autoSpin ? "Auto-spin ON" : "Paused"}
              </button>
              <button
                disabled={locked}
                onClick={() => setAngle(0)}
                data-testid="reset-angle"
                className="py-2 px-3 border border-white/15 text-slate-300 hover:border-[#F59E0B]"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </Panel>

          <div className="relative tracing-beam p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#F59E0B]" />
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold font-mono">Loving it?</div>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed mb-4">
              Unlock unlimited showroom time, all 106 cars, and exclusive AI perks.
            </div>
            <Link to="/premium" data-testid="upgrade-cta-panel" className="block btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black text-center text-xs uppercase tracking-[0.25em] font-bold py-3">
              Go Premium →
            </Link>
          </div>

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

function StateChip({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 glass border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-[#F59E0B] font-bold">
      {icon}
      {label}
    </div>
  );
}

function Panel({ icon, title, children, disabled }) {
  return (
    <div className={`border border-white/10 bg-[#0D0D0D] p-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
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
      className={`flex items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold border transition-all ${
        active ? "bg-[#F59E0B] text-black border-[#F59E0B] amber-glow" : "text-slate-300 border-white/15 hover:border-[#F59E0B]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function InteriorView({ accent, locked }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ filter: locked ? "blur(18px) brightness(0.5)" : "none" }}>
      <svg viewBox="0 0 280 160" className="w-full h-full max-w-[600px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cabin" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#141414" />
            <stop offset="1" stopColor="#050505" />
          </linearGradient>
        </defs>
        <path d="M20 130 Q20 40 140 20 Q260 40 260 130 Z" fill="url(#cabin)" stroke={accent} strokeWidth="0.8" />
        <path d="M40 90 L240 90 L230 115 L50 115 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
        <circle cx="90" cy="100" r="18" fill="none" stroke={accent} strokeWidth="1.2" />
        <circle cx="90" cy="100" r="8" fill={accent} opacity="0.2" />
        <rect x="82" y="98" width="16" height="4" fill={accent} opacity="0.5" />
        <rect x="130" y="78" width="50" height="28" fill="#050505" stroke={accent} strokeWidth="0.6" />
        <rect x="134" y="82" width="42" height="3" fill={accent} opacity="0.4" />
        <rect x="134" y="88" width="32" height="3" fill={accent} opacity="0.3" />
        <rect x="134" y="94" width="38" height="3" fill={accent} opacity="0.3" />
        <rect x="50" y="80" width="18" height="5" fill="#050505" stroke={accent} strokeWidth="0.4" />
        <rect x="200" y="80" width="18" height="5" fill="#050505" stroke={accent} strokeWidth="0.4" />
        <path d="M60 130 L80 130 L82 150 L58 150 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
        <path d="M180 130 L200 130 L202 150 L178 150 Z" fill="#1A1A1A" stroke={accent} strokeWidth="0.5" />
        <rect x="125" y="115" width="30" height="20" fill="#0A0A0A" stroke={accent} strokeWidth="0.4" />
        <circle cx="140" cy="125" r="3" fill={accent} opacity="0.6" />
        <text x="140" y="45" fontSize="6" fill={accent} textAnchor="middle" letterSpacing="3" fontFamily="monospace">INTERIOR · PREMIUM</text>
      </svg>
    </div>
  );
}
