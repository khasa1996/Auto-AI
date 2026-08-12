import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError, formatINR } from "../lib/api";
import { Scale, Check, X, Loader2, Trophy, Zap } from "lucide-react";
import CarVisual from "../components/CarVisual";

export default function Compare() {
  const [carA, setCarA] = useState("");
  const [carB, setCarB] = useState("");
  const [need, setNeed] = useState("daily family driving in a metro city");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (e) => {
    e?.preventDefault();
    if (!carA.trim() || !carB.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/ai/compare", { car_a: carA, car_b: carB, user_need: need });
      setResult(data);
    } catch (err) {
      setError(apiError(err, "Comparison failed. Please check the car names."));
    } finally {
      setLoading(false);
    }
  };

  const samples = [
    ["Hyundai Creta", "Kia Seltos"],
    ["Tata Nexon", "Maruti Brezza"],
    ["Mahindra Thar", "Mahindra Scorpio-N"],
    ["Toyota Innova Hycross", "Kia Carens"],
  ];

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="compare-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-px bg-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">
            /// ai comparison engine
          </span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase max-w-3xl">
          Two cars enter.<br />One <span className="text-[#F59E0B]">true verdict</span>.
        </h1>
        <p className="text-slate-400 mt-4 max-w-2xl">
          Our Claude-powered AI analyses real specs, waiting periods, safety ratings & total cost. No promotions. No hidden sponsorship.
        </p>

        <form onSubmit={run} className="mt-10 grid md:grid-cols-12 gap-3">
          <input
            value={carA}
            onChange={(e) => setCarA(e.target.value)}
            placeholder="e.g. Hyundai Creta"
            data-testid="compare-car-a-input"
            className="md:col-span-4 ai-input px-4 py-4 text-base"
          />
          <div className="md:col-span-1 flex items-center justify-center text-[#F59E0B] font-display text-xl">vs</div>
          <input
            value={carB}
            onChange={(e) => setCarB(e.target.value)}
            placeholder="e.g. Kia Seltos"
            data-testid="compare-car-b-input"
            className="md:col-span-4 ai-input px-4 py-4 text-base"
          />
          <button
            type="submit"
            disabled={loading}
            data-testid="compare-submit-btn"
            className="md:col-span-3 bg-[#F59E0B] text-black font-semibold text-xs uppercase tracking-[0.2em] disabled:opacity-50 hover:bg-[#D97706] flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />Analysing</> : <><Scale size={16} />Run AI Verdict</>}
          </button>
          <input
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="Your use-case (e.g. highway trips, city, off-road)"
            data-testid="compare-need-input"
            className="md:col-span-12 ai-input px-4 py-3 text-sm"
          />
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {samples.map((s, i) => (
            <button
              key={i}
              onClick={() => { setCarA(s[0]); setCarB(s[1]); }}
              data-testid={`sample-compare-${i}`}
              className="text-[10px] uppercase tracking-[0.2em] text-slate-400 border border-[#262626] px-3 py-1.5 hover:border-[#F59E0B] hover:text-[#F59E0B]"
            >
              {s[0]} vs {s[1]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 border border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444] p-4 text-sm" data-testid="compare-error">
            {error}
          </div>
        )}

        {result && <Verdict result={result} />}
      </div>
    </div>
  );
}

function Verdict({ result }) {
  const { car_a, car_b, analysis } = result;
  const winnerIsA = analysis.winner && car_a.model && analysis.winner.toLowerCase().includes(car_a.model.toLowerCase());

  return (
    <div className="mt-12 fade-up" data-testid="compare-result">
      <div className="border border-[#F59E0B] bg-[#0A0A0A] p-8 mb-6 relative" style={{ boxShadow: "0 0 30px rgba(245,158,11,0.2)" }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
            <Trophy size={22} className="text-black" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold font-mono mb-1">AI VERDICT</div>
            <div className="font-display text-3xl lg:text-4xl tracking-tight">
              Winner: <span className="text-[#F59E0B]">{analysis.winner}</span>
            </div>
            <p className="text-slate-300 mt-3 text-lg max-w-3xl">{analysis.headline}</p>
            <p className="text-slate-400 mt-4 max-w-3xl leading-relaxed">{analysis.verdict}</p>
            {analysis.best_for && (
              <div className="mt-4 inline-block border border-[#262626] px-3 py-1.5 text-xs text-slate-300">
                <span className="text-slate-500 uppercase tracking-[0.2em] text-[10px] mr-2">Best for</span>
                {analysis.best_for}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CarPanel car={car_a} pros={analysis.pros_a} cons={analysis.cons_a} isWinner={winnerIsA} side="A" />
        <CarPanel car={car_b} pros={analysis.pros_b} cons={analysis.cons_b} isWinner={!winnerIsA} side="B" />
      </div>

      <div className="mt-6 border border-[#262626] bg-[#0A0A0A] p-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono mb-4">/// score breakdown</div>
        <div className="grid md:grid-cols-5 gap-6">
          {Object.entries(analysis.scores || {}).map(([k, v]) => (
            <ScoreBar key={k} label={k} a={v.a} b={v.b} aLabel={car_a.model} bLabel={car_b.model} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CarPanel({ car, pros, cons, isWinner, side }) {
  return (
    <div className={`border bg-[#0D0D0D] overflow-hidden ${isWinner ? "border-[#F59E0B]" : "border-[#262626]"}`} data-testid={`verdict-panel-${side}`}>
      <div className="relative">
        <CarVisual car={car} className="aspect-[16/9]" />
        {isWinner && (
          <div className="absolute top-3 left-3 bg-[#F59E0B] text-black text-[10px] uppercase tracking-[0.25em] font-bold px-2 py-1 z-20">
            Winner
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{car.brand}</div>
        <div className="font-display text-2xl font-medium mt-1">{car.model}</div>
        <div className="text-xs text-slate-400 mt-1">{car.variant}</div>
        <div className="font-display text-xl text-[#F59E0B] mt-2">{formatINR(car.price_ex_showroom)}</div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#10B981] font-bold mb-2">Pros</div>
          {pros?.map((p, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 py-1">
              <Check size={14} className="text-[#10B981] mt-1 flex-shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#EF4444] font-bold mb-2">Cons (the honest ones)</div>
          {cons?.map((c, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 py-1">
              <X size={14} className="text-[#EF4444] mt-1 flex-shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>

        <Link
          to={`/book/${car.id}`}
          data-testid={`verdict-book-${side}`}
          className="mt-5 block border border-[#F59E0B] text-[#F59E0B] text-center text-xs uppercase tracking-[0.25em] font-bold py-2.5 hover:bg-[#F59E0B] hover:text-black transition-colors flex items-center justify-center gap-2"
        >
          <Zap size={12} /> Book Zero-Wait Test Drive
        </Link>
      </div>
    </div>
  );
}

function ScoreBar({ label, a, b, aLabel, bLabel }) {
  const max = Math.max(a, b, 1);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</div>
      <div className="space-y-2">
        <Bar label={aLabel} val={a} max={max} winner={a >= b} />
        <Bar label={bLabel} val={b} max={max} winner={b > a} />
      </div>
    </div>
  );
}

function Bar({ label, val, max, winner }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
        <span className="truncate max-w-[80px]">{label}</span>
        <span className={winner ? "text-[#F59E0B]" : ""}>{val}/10</span>
      </div>
      <div className="h-1 bg-[#141414]">
        <div className="h-full transition-all" style={{ width: `${(val / max) * 100}%`, background: winner ? "#F59E0B" : "#475569" }} />
      </div>
    </div>
  );
}
