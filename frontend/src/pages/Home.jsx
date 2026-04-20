import { Link } from "react-router-dom";
import { ArrowRight, Scale, Sparkles, Calculator, Newspaper, Gauge, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api, formatINR } from "../lib/api";
import CarCard from "../components/CarCard";
import { useI18n } from "../lib/i18n";

const tickerItems = [
  "Tata Nexon 5★ Safety",
  "Maruti Brezza — 2 wk wait",
  "Hyundai Creta — 6 wk",
  "Mahindra Thar — 16 wk",
  "Toyota Innova Hycross — 20 wk",
  "Kia Seltos — 7 wk",
  "BharatNCAP: Curvv 5★",
  "Scorpio-N — 12 wk",
  "Grand Vitara Hybrid — 27.9 kmpl",
];

export default function Home() {
  const [cars, setCars] = useState([]);
  const { t } = useI18n();

  useEffect(() => {
    api.get("/cars").then((r) => setCars(r.data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="bg-[#050505] text-white">
      {/* HERO */}
      <section className="relative min-h-[85vh] overflow-hidden hero-grid" data-testid="hero-section">
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="absolute inset-0">
          <div className="w-full h-full" style={{
            background: "radial-gradient(1000px 500px at 70% 30%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(700px 400px at 20% 70%, rgba(59,130,246,0.12), transparent 60%)",
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#050505]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 lg:pt-28 pb-16 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 fade-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-px bg-[#F59E0B]" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">
                India's First Unbiased Car AI
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-light tracking-tighter leading-[0.95] uppercase">
              The <span className="text-[#F59E0B] font-medium">True Verdict</span><br />
              on every car<br />
              in India.
            </h1>

            <p className="mt-8 text-slate-300 text-base md:text-lg max-w-xl leading-relaxed">
              Zero promotions. Zero human bias. Zero waiting. Just an AI engine analysing real data to tell you
              which car actually deserves your money — and which ones don't.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                to="/compare"
                data-testid="hero-cta-compare"
                className="group bg-[#F59E0B] text-black px-7 py-4 font-semibold text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-[#D97706] transition-colors"
              >
                Start AI Comparison <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/recommend"
                data-testid="hero-cta-recommend"
                className="border border-white/20 px-7 py-4 font-semibold text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                Find My Perfect Car
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
              <Metric k="29+" v="cars indexed" />
              <Metric k="0%" v="brand bias" />
              <Metric k="24/7" v="AI expert" />
            </div>
          </div>

          <div className="lg:col-span-4 relative fade-up delay-2">
            <div className="border border-[#262626] bg-[#0D0D0D]/80 backdrop-blur p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Live · Zero-Wait Tracker</span>
                <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              </div>

              <div className="space-y-3">
                {[
                  { m: "Maruti Brezza", w: 2, c: "#10B981" },
                  { m: "Hyundai Creta", w: 6, c: "#F59E0B" },
                  { m: "Mahindra Thar", w: 16, c: "#EF4444" },
                  { m: "Kia Seltos", w: 7, c: "#F59E0B" },
                ].map((x) => (
                  <div key={x.m} className="flex items-center justify-between border-b border-[#1a1a1a] pb-2.5">
                    <span className="text-sm">{x.m}</span>
                    <span className="font-mono text-xs" style={{ color: x.c }}>{x.w} weeks</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs text-slate-500 font-mono">
                $ {t("refresh_label")} <span className="text-[#F59E0B]">daily · 06:00 IST</span>
              </div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 py-3 overflow-hidden bg-black/80 ticker-mask">
          <div className="flex marquee gap-12 whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="font-mono text-xs text-slate-400 uppercase tracking-widest">
                <span className="text-[#F59E0B] mr-3">◆</span>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24" data-testid="features-section">
        <div className="max-w-2xl mb-12">
          <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-4">
            /// the engine room
          </div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight font-light">
            Five AI pillars. <span className="text-[#F59E0B]">One unbiased verdict.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-4">
          <Feature
            to="/compare"
            span="md:col-span-7"
            icon={<Scale size={22} />}
            kicker="01 · AI Comparison"
            title="Two cars enter. One walks out."
            desc="Claude-powered engine analyses safety, mileage, power, space, waiting & real cost-of-ownership — and exposes the cons brands hide."
          />
          <Feature
            to="/recommend"
            span="md:col-span-5"
            icon={<Sparkles size={22} />}
            kicker="02 · AI Recommender"
            title="Your budget. Your need. Our verdict."
            desc="Tell us what you want. Get a ranked top-3 with transparent 'why' and honest watchouts."
          />
          <Feature
            to="/emi"
            span="md:col-span-4"
            icon={<Calculator size={22} />}
            kicker="03 · EMI Studio"
            title="Loan math, demystified."
            desc="Interactive slider. Instant eligibility. Total interest exposed."
          />
          <Feature
            to="/cars"
            span="md:col-span-4"
            icon={<Gauge size={22} />}
            kicker="04 · Zero-Wait DB"
            title="Live availability tracker."
            desc="Waiting weeks across top models, refreshed daily."
          />
          <Feature
            to="/news"
            span="md:col-span-4"
            icon={<Newspaper size={22} />}
            kicker="05 · Daily Intel"
            title="Launches. Price drops. Hidden changes."
            desc="AI-curated feed. No press-release fluff."
          />
        </div>
      </section>

      {/* UNBIASED PLEDGE */}
      <section className="border-y border-[#262626] bg-[#0A0A0A]" data-testid="pledge-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-4">
              /// the unbiased pledge
            </div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight font-light leading-[1.05]">
              No dealership handshake.<br />
              No ad money.<br />
              <span className="text-[#F59E0B]">Just math and truth.</span>
            </h2>
            <p className="mt-6 text-slate-400 leading-relaxed">
              8 years on the dealership floor taught our founder one thing: Indian car buyers deserve better than
              paid reviews. Auto-AI India is built to expose what brands hide.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { t: "Data-first verdicts", d: "Safety stars, mileage, waiting, TCO — not brand love." },
              { t: "Hidden con exposure", d: "The AI surfaces real cons buyers discover 6 months later." },
              { t: "Zero paid placement", d: "Rankings cannot be bought. Ever." },
            ].map((x, i) => (
              <div key={i} className="border border-[#262626] p-5 flex gap-4 hover:border-[#F59E0B] transition-colors">
                <ShieldCheck size={20} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-display text-lg">{x.t}</div>
                  <div className="text-sm text-slate-400 mt-1">{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING CARS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24" data-testid="trending-section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-4">
              /// trending right now
            </div>
            <h2 className="font-display text-4xl tracking-tight font-light">Most searched in India</h2>
          </div>
          <Link to="/cars" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#F59E0B] flex items-center gap-2">
            See all cars <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cars.map((c) => (
            <CarCard key={c.id} car={c} />
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="border border-[#262626] bg-gradient-to-br from-[#0A0A0A] to-black p-12 lg:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-6xl tracking-tighter font-light uppercase max-w-3xl">
              Buying a car in India just got <span className="text-[#F59E0B]">honest.</span>
            </h2>
            <Link
              to="/compare"
              data-testid="footer-cta-compare"
              className="mt-8 inline-flex bg-[#F59E0B] text-black px-7 py-4 font-semibold text-xs uppercase tracking-[0.2em] items-center gap-3 hover:bg-[#D97706] transition-colors"
            >
              Get Your First Verdict <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ k, v }) {
  return (
    <div>
      <div className="font-display text-3xl text-white">{k}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">{v}</div>
    </div>
  );
}

function Feature({ to, span, icon, kicker, title, desc }) {
  return (
    <Link
      to={to}
      data-testid={`feature-${kicker.split("·")[0].trim()}`}
      className={`${span} group relative border border-[#262626] bg-[#0A0A0A] p-8 hover:border-[#F59E0B] transition-all duration-300 overflow-hidden`}
    >
      <div
        className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl"
        style={{ background: "#F59E0B" }}
      />
      <div className="relative">
        <div className="text-[#F59E0B] mb-5">{icon}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono mb-3">{kicker}</div>
        <div className="font-display text-2xl font-medium mb-2 max-w-xs">{title}</div>
        <p className="text-sm text-slate-400 max-w-md">{desc}</p>
        <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#F59E0B]">
          Enter <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
