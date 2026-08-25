import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Calendar, Tag, TrendingUp, AlertCircle, Award, IndianRupee } from "lucide-react";

const CATEGORY_STYLE = {
  Launch: { icon: TrendingUp, bg: "linear-gradient(135deg, #0C4A6E 0%, #075985 100%)", accent: "#38BDF8" },
  Price: { icon: IndianRupee, bg: "linear-gradient(135deg, #14532D 0%, #166534 100%)", accent: "#4ADE80" },
  Spy: { icon: AlertCircle, bg: "linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%)", accent: "#A78BFA" },
  Demand: { icon: TrendingUp, bg: "linear-gradient(135deg, #713F12 0%, #854D0E 100%)", accent: "#FCD34D" },
  Waiting: { icon: Calendar, bg: "linear-gradient(135deg, #831843 0%, #9F1239 100%)", accent: "#F472B6" },
  Safety: { icon: Award, bg: "linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)", accent: "#FB923C" },
};

function NewsVisual({ n, tall }) {
  const s = CATEGORY_STYLE[n.category] || CATEGORY_STYLE.Launch;
  const Icon = s.icon;
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: s.bg }}>
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: s.accent }} />
      <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: s.accent }}>
        {n.category}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon size={tall ? 80 : 56} strokeWidth={1.2} style={{ color: s.accent }} className="opacity-60" />
      </div>
      <div className="absolute bottom-4 left-4 right-4 text-[10px] uppercase tracking-[0.25em] text-white/60">
        {n.date}
      </div>
    </div>
  );
}

export default function News() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/news").then((r) => setItems(r.data));
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="news-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-px bg-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">{'/// daily intel'}/span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase max-w-3xl">
          Launches. Price drops. <span className="text-[#F59E0B]">Real changes.</span>
        </h1>
        <p className="text-slate-400 mt-4 max-w-2xl">AI-curated. Refreshed daily. No press-release fluff.</p>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((n, i) => (
            <article
              key={n.id}
              className={`border border-[#262626] bg-[#0D0D0D] overflow-hidden hover:border-[#F59E0B] transition-colors ${
                i === 0 ? "md:col-span-2 lg:row-span-2" : ""
              }`}
              data-testid={`news-${n.id}`}
            >
              <div className={`overflow-hidden ${i === 0 ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
                <NewsVisual n={n} tall={i === 0} />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono mb-3">
                  <span className="flex items-center gap-1"><Tag size={10} />{n.category}</span>
                  <span className="flex items-center gap-1"><Calendar size={10} />{n.date}</span>
                </div>
                <h3 className={`font-display font-medium ${i === 0 ? "text-2xl lg:text-3xl" : "text-lg"}`}>{n.title}</h3>
                <p className="text-sm text-slate-400 mt-3 leading-relaxed">{n.summary}</p>
                <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-bold">{n.source}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
