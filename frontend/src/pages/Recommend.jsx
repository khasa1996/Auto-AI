import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError, formatINR } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { Slider } from "../components/ui/slider";
import CarVisual from "../components/CarVisual";

export default function Recommend() {
  const [budget, setBudget] = useState([800000, 1800000]);
  const [fuel, setFuel] = useState("Any");
  const [seats, setSeats] = useState(5);
  const [usage, setUsage] = useState("city");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const { data } = await api.post("/ai/recommend", {
        budget_min: budget[0],
        budget_max: budget[1],
        fuel,
        seats,
        usage,
        notes,
      });
      setResult(data);
    } catch (err) {
      setError(apiError(err, "Could not fetch recommendations. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="recommend-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-px bg-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">
            /// ai recommender
          </span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase max-w-3xl">
          Your budget. Your need.<br /><span className="text-[#F59E0B]">Our verdict.</span>
        </h1>

        <form onSubmit={run} className="mt-10 grid md:grid-cols-12 gap-6 border border-[#262626] bg-[#0A0A0A] p-8">
          <div className="md:col-span-6">
            <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Budget (Ex-Showroom)</label>
            <div className="mt-3 font-display text-2xl">{formatINR(budget[0])} <span className="text-slate-500">—</span> {formatINR(budget[1])}</div>
            <div className="mt-4">
              <Slider
                value={budget}
                onValueChange={setBudget}
                min={400000}
                max={5000000}
                step={50000}
                data-testid="recommend-budget-slider"
                className="[&>span:first-child]:bg-[#141414] [&_[role=slider]]:bg-[#F59E0B] [&_[role=slider]]:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Fuel</label>
            <select
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              data-testid="recommend-fuel-select"
              className="w-full mt-3 ai-input px-3 py-2.5 text-sm"
            >
              {["Any", "Petrol", "Diesel", "Petrol Hybrid", "Electric"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Seats</label>
            <select
              value={seats}
              onChange={(e) => setSeats(+e.target.value)}
              data-testid="recommend-seats-select"
              className="w-full mt-3 ai-input px-3 py-2.5 text-sm"
            >
              {[4, 5, 6, 7].map((s) => (
                <option key={s} value={s}>{s}+ seats</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Primary Use</label>
            <select
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              data-testid="recommend-usage-select"
              className="w-full mt-3 ai-input px-3 py-2.5 text-sm"
            >
              {["city", "highway", "mixed", "off-road", "family tours"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Anything else (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. safety is #1, must have sunroof, newborn at home"
              data-testid="recommend-notes-input"
              className="w-full mt-3 ai-input px-3 py-2.5 text-sm"
            />
          </div>

          <div className="md:col-span-12">
            <button
              disabled={loading}
              type="submit"
              data-testid="recommend-submit-btn"
              className="bg-[#F59E0B] text-black font-semibold text-xs uppercase tracking-[0.2em] px-7 py-4 disabled:opacity-50 hover:bg-[#D97706] flex items-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />Thinking</> : <><Sparkles size={16} />Get Top 3 Picks</>}
            </button>
          </div>
        </form>

        <ErrorBanner message={error} onRetry={run} className="mt-8" testId="recommend-error" />

        {result && (
          <div className="mt-10 fade-up" data-testid="recommend-result">
            <div className="border border-[#F59E0B] bg-[#0A0A0A] p-6 mb-6">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-mono mb-2">/// ai guidance</div>
              <p className="text-lg text-slate-200">{result.summary}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {(result.top_picks || []).map((p, i) => (
                <div key={i} className="border border-[#262626] bg-[#0D0D0D] overflow-hidden hover:border-[#F59E0B] transition-colors" data-testid={`pick-${i}`}>
                  {p.car && (
                    <CarVisual car={p.car} className="aspect-[16/9]" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[#F59E0B] text-black text-xs font-bold flex items-center justify-center">#{i + 1}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Score {p.score}/100</div>
                    </div>
                    {p.car && (
                      <>
                        <div className="font-display text-xl">{p.car.brand} {p.car.model}</div>
                        <div className="font-display text-[#F59E0B] text-lg mt-1">{formatINR(p.car.price_ex_showroom)}</div>
                      </>
                    )}
                    <p className="text-sm text-slate-300 mt-3 leading-relaxed">{p.why}</p>
                    {p.watchouts && (
                      <div className="mt-3 border-l-2 border-[#EF4444] pl-3 text-xs text-slate-400">
                        <span className="uppercase tracking-[0.2em] text-[10px] text-[#EF4444] font-bold block mb-1">Watchout</span>
                        {p.watchouts}
                      </div>
                    )}
                    {p.car && (
                      <Link
                        to={`/book/${p.car.id}`}
                        data-testid={`pick-book-${i}`}
                        className="mt-4 block border border-[#F59E0B] text-[#F59E0B] text-center text-xs uppercase tracking-[0.25em] font-bold py-2.5 hover:bg-[#F59E0B] hover:text-black transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap size={12} /> Book Now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
