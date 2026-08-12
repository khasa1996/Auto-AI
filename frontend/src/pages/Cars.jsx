import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiError } from "../lib/api";
import CarCard from "../components/CarCard";
import ErrorBanner from "../components/ErrorBanner";
import { Search } from "lucide-react";

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("All");
  const [fuel, setFuel] = useState("All");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/cars");
      setCars(data);
    } catch (err) {
      setError(apiError(err, "Could not load the car database."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const segments = useMemo(() => ["All", ...new Set(cars.map((c) => c.segment))], [cars]);
  const fuels = useMemo(() => ["All", ...new Set(cars.map((c) => c.fuel))], [cars]);

  const filtered = cars.filter((c) => {
    if (segment !== "All" && c.segment !== segment) return false;
    if (fuel !== "All" && c.fuel !== fuel) return false;
    if (q && !`${c.brand} ${c.model}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="cars-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-px bg-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">
            /// car intelligence database
          </span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase">
          Every car. <span className="text-[#F59E0B]">Zero fluff.</span>
        </h1>

        <div className="mt-10 grid md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search brand or model…"
              data-testid="cars-search-input"
              className="w-full ai-input pl-10 pr-3 py-3 text-sm"
            />
          </div>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} data-testid="cars-segment-filter" className="md:col-span-3 ai-input px-3 py-3 text-sm">
            {segments.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)} data-testid="cars-fuel-filter" className="md:col-span-3 ai-input px-3 py-3 text-sm">
            {fuels.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <ErrorBanner message={error} onRetry={load} className="mt-6" testId="cars-error" />

        <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500 font-mono">
          <span className="text-[#F59E0B]">{filtered.length}</span> cars · live
        </div>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      </div>
    </div>
  );
}
