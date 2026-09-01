import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Car, Palette, Play, Rotate3D, Sparkles, Square } from "lucide-react";
import { api } from "../lib/api";
import Premium3DViewer from "../components/Premium3DViewer";
import { normalize3DAsset } from "../lib/threeDAsset";

const PAINTS = [
  { name: "Obsidian", value: "#0A0A0A" },
  { name: "Snow Pearl", value: "#F5F5F4" },
  { name: "Metallic Silver", value: "#94A3B8" },
  { name: "Deep Ocean", value: "#1E3A8A" },
  { name: "British Racing", value: "#14532D" },
  { name: "Sangria Red", value: "#991B1B" },
];

export default function PremiumShowroom3D() {
  const { carId } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paint, setPaint] = useState(PAINTS[0]);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCar() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/cars/${carId}`);
        if (!cancelled) setCar(response.data);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.detail || requestError?.message || "Unable to load this vehicle.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCar();
    return () => { cancelled = true; };
  }, [carId]);

  const asset = useMemo(() => normalize3DAsset(car), [car]);
  const modelUrl = asset.enabled ? asset.modelUrl : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] pt-24 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-sm text-white/50">Loading premium 3D showroom…</div>
      </main>
    );
  }

  if (error || !car) {
    return (
      <main className="min-h-screen bg-[#050505] pt-24 text-white">
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-red-300">Showroom error</div>
          <p className="mt-3 text-white/60">{error || "Vehicle not found."}</p>
          <Link to="/cars" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs uppercase tracking-[0.18em] hover:border-amber-400/60">
            <ArrowLeft size={14} /> Back to cars
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] pt-20 text-white">
      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Link to="/cars" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white">
            <ArrowLeft size={14} /> Exit showroom
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-amber-300">
            <Sparkles size={12} /> Live 3D configurator
          </div>
        </div>

        <div className="grid overflow-hidden rounded-[28px] border border-white/10 bg-[#090909] lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="relative min-h-[560px] bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,0.12),transparent_45%),linear-gradient(180deg,#101010,#050505)]">
            <div className="absolute left-6 top-6 z-10">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Vehicle</div>
              <h1 className="mt-1 text-2xl font-light sm:text-3xl">{car.brand} <span className="text-white/50">{car.model}</span></h1>
            </div>
            <div className="absolute right-6 top-6 z-10 flex gap-2">
              <button
                type="button"
                onClick={() => setAutoRotate((value) => !value)}
                aria-label={autoRotate ? "Stop automatic rotation" : "Start automatic rotation"}
                aria-pressed={autoRotate}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-xl hover:border-amber-400/50 hover:text-white"
              >
                {autoRotate ? <Square size={11} /> : <Play size={11} />}
                {autoRotate ? "Stop spin" : "Auto spin"}
              </button>
            </div>
            <div className="absolute bottom-5 left-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-white/50 backdrop-blur-xl">
              <Rotate3D size={12} className="text-amber-400" /> Drag to orbit · pinch to zoom
            </div>
            <div className="h-[560px] w-full">
              <Premium3DViewer modelUrl={modelUrl} paint={paint.value} autoRotate={autoRotate} />
            </div>
          </div>

          <aside className="border-t border-white/10 bg-[#0b0b0b] p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40"><Car size={13} /> Configuration</div>
            <div className="mt-7">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/70"><Palette size={14} className="text-amber-400" /> Exterior paint</div>
              <div className="grid grid-cols-3 gap-3">
                {PAINTS.map((option) => (
                  <button key={option.name} type="button" onClick={() => setPaint(option)} aria-label={`Select ${option.name}`} aria-pressed={paint.name === option.name} className={`group rounded-xl border p-2 transition ${paint.name === option.name ? "border-amber-400" : "border-white/10 hover:border-white/30"}`}>
                    <span className="mx-auto block h-10 w-10 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: option.value }} />
                    <span className="mt-2 block truncate text-[9px] text-white/50">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">3D asset status</div>
              <div className={`mt-2 text-sm ${modelUrl ? "text-emerald-300" : "text-amber-300"}`}>{modelUrl ? "Verified model URL detected" : "Model asset required"}</div>
              <p className="mt-2 text-xs leading-5 text-white/40">Auto AI India will not substitute a rotating photograph for a real 3D vehicle model.</p>
            </div>
            <Link to={`/book/${car.id}`} className="mt-8 flex w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-amber-300">Configure & continue</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
