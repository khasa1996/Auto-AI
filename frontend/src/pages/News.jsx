import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Calendar, Tag } from "lucide-react";

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
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// daily intel</span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase max-w-3xl">
          Launches. Price drops. <span className="text-[#F59E0B]">Real changes.</span>
        </h1>
        <p className="text-slate-400 mt-4 max-w-2xl">AI-curated. Refreshed daily. No press-release fluff.</p>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((n, i) => (
            <article key={n.id} className={`border border-[#262626] bg-[#0D0D0D] overflow-hidden hover:border-[#F59E0B] transition-colors ${i === 0 ? "md:col-span-2 lg:row-span-2" : ""}`} data-testid={`news-${n.id}`}>
              <div className={`bg-black overflow-hidden ${i === 0 ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
                <img src={n.image} alt={n.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
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
