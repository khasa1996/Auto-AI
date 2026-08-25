import { Link } from "react-router-dom";
import { ArrowRight, Scale, Sparkles, Calculator, Newspaper, Gauge, ShieldCheck, Zap, Cpu, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { api, API } from "../lib/api";
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

const HERO_CAR =
  "https://images.unsplash.com/photo-1763165561886-a9391b2132c1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBzaG93cm9vbSUyMGRhcmt8ZW58MHx8fHwxNzc2Njg1NzQzfDA&ixlib=rb-4.1.0&q=85";

// Indian highway / NH-48 style driving reel (Pexels — proxied through backend to avoid hotlink 403)
const HERO_VIDEO_URL =
  "https://videos.pexels.com/video-files/2034115/2034115-hd_1920_1080_30fps.mp4";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  const [cars, setCars] = useState([]);
  const { t } = useI18n();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 100]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  useEffect(() => {
    api.get("/cars").then((r) => setCars(r.data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="bg-[#050505] text-white overflow-hidden">
      {/* ============== HERO ============== */}
      <section className="relative min-h-[100vh] overflow-hidden hero-grid" data-testid="hero-section">
        {/* VIDEO BACKGROUND — Indian highway driving reel */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 z-[0]"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={HERO_CAR}
            data-testid="hero-video"
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          >
            <source src={`${API}/video-proxy?url=${encodeURIComponent(HERO_VIDEO_URL)}`} type="video/mp4" />
          </video>
          {/* darkening + warm tint overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 600px at 78% 30%, rgba(245,158,11,0.28), transparent 55%), radial-gradient(800px 500px at 15% 75%, rgba(197,131,43,0.14), transparent 60%)",
            }}
          />
        </motion.div>

        {/* grain */}
        <div className="absolute inset-0 grain pointer-events-none z-[1]" />

        {/* scanning line */}
        <div className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/40 to-transparent scan-line z-[2]" />

        {/* hero car image — right side, large (overlays on video) */}
        <motion.div
          initial={{ opacity: 0, scale: 1.08, x: 40 }}
          animate={{ opacity: 0.65, scale: 1, x: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[-6%] top-[10%] w-[72%] md:w-[62%] lg:w-[58%] aspect-[16/10] z-[2] pointer-events-none"
        >
          <div
            className="w-full h-full bg-cover bg-center mix-blend-screen"
            style={{
              backgroundImage: `url(${HERO_CAR})`,
              maskImage:
                "radial-gradient(circle at 60% 55%, #000 35%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(circle at 60% 55%, #000 35%, transparent 72%)",
            }}
          />
        </motion.div>

        {/* content */}
        <div className="relative z-[3] max-w-7xl mx-auto px-6 lg:px-10 pt-24 lg:pt-36 pb-24 grid lg:grid-cols-12 gap-10">
          <motion.div
            className="lg:col-span-8"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-8">
              <div className="w-12 h-px bg-[#F59E0B]" />
              <span className="chip">
                <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
                India's First Unbiased Car AI
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-5xl md:text-7xl lg:text-[7.2rem] font-light tracking-tighter leading-[0.92] uppercase"
            >
              The <span className="text-gradient-amber font-semibold italic">True Verdict</span>
              <br />
              on every car
              <br />
              in <span className="relative inline-block">
                India
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 right-0 -bottom-2 h-[3px] bg-[#F59E0B] origin-left"
                />
              </span>.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-10 text-slate-300 text-base md:text-lg max-w-xl leading-relaxed"
            >
              Zero promotions. Zero human bias. Zero waiting. Just an AI engine analysing real data
              to tell you which car actually deserves your money — and which ones don't.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                to="/compare"
                data-testid="hero-cta-compare"
                className="group btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-7 py-4 font-semibold text-xs uppercase tracking-[0.22em] flex items-center gap-3 hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.6)] transition-all"
              >
                Start AI Comparison{" "}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/recommend"
                data-testid="hero-cta-recommend"
                className="group glass border border-white/15 px-7 py-4 font-semibold text-xs uppercase tracking-[0.22em] flex items-center gap-3 hover:border-[#F59E0B]/60 hover:text-[#F59E0B] transition-all"
              >
                <Sparkles size={14} /> Find My Perfect Car
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              <Metric k="106+" v={t("cars_indexed")} />
              <Metric k="0%" v={t("brand_bias")} />
              <Metric k="24/7" v={t("ai_expert")} />
            </motion.div>
          </motion.div>

          {/* side HUD card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-4 relative"
          >
            <div className="relative glass border border-white/10 p-6 corner-notch">
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/60 to-transparent" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Radar size={14} className="text-[#F59E0B]" />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-mono">
                    Live · Zero-Wait Tracker
                  </span>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-[#10B981] opacity-70" />
                  <span className="relative rounded-full h-2 w-2 bg-[#10B981]" />
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { m: "Maruti Brezza", w: 2, c: "#10B981" },
                  { m: "Hyundai Creta", w: 6, c: "#F59E0B" },
                  { m: "Mahindra Thar", w: 16, c: "#EF4444" },
                  { m: "Kia Seltos", w: 7, c: "#F59E0B" },
                ].map((x, i) => (
                  <motion.div
                    key={x.m}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="flex items-center justify-between border-b border-white/10 pb-2.5"
                  >
                    <span className="text-sm text-slate-200">{x.m}</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: x.c }}>
                      {x.w} weeks
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <Cpu size={11} />
                <span>$ {t("refresh_label")}</span>
                <span className="text-[#F59E0B]">daily · 06:00 IST</span>
              </div>
            </div>

            {/* floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="float-up absolute -top-5 -right-5 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black px-4 py-2.5 amber-glow"
            >
              <div className="font-display text-xs font-bold uppercase tracking-[0.2em]">
                <Zap size={12} className="inline mb-0.5 mr-1" strokeWidth={3} />
                AI Live
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ticker */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 py-3 overflow-hidden bg-black/70 backdrop-blur-sm ticker-mask z-[3]">
          <div className="flex marquee gap-12 whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((txt, i) => (
              <span key={i} className="font-mono text-xs text-slate-400 uppercase tracking-widest">
                <span className="text-[#F59E0B] mr-3">◆</span>
                {txt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== BENTO FEATURES ============== */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 py-28" data-testid="features-section">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-14"
        >
          <div className="chip mb-5">{'/// the engine room'}</div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight font-light leading-[1.05]">
            Five AI pillars.
            <br />
            <span className="text-gradient-amber italic font-semibold">One unbiased verdict.</span>
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-12 gap-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <Feature to="/compare" span="md:col-span-7" icon={<Scale size={22} />} kicker="01 · AI Comparison" title="Two cars enter. One walks out." desc="Claude-powered engine analyses safety, mileage, power, space, waiting & real cost-of-ownership — and exposes the cons brands hide." />
          <Feature to="/recommend" span="md:col-span-5" icon={<Sparkles size={22} />} kicker="02 · AI Recommender" title="Your budget. Your need. Our verdict." desc="Tell us what you want. Get a ranked top-3 with transparent 'why' and honest watchouts." />
          <Feature to="/emi" span="md:col-span-4" icon={<Calculator size={22} />} kicker="03 · EMI Studio" title="Loan math, demystified." desc="Interactive slider. Instant eligibility. Total interest exposed." />
          <Feature to="/cars" span="md:col-span-4" icon={<Gauge size={22} />} kicker="04 · Zero-Wait DB" title="Live availability tracker." desc="Waiting weeks across top models, refreshed daily." />
          <Feature to="/news" span="md:col-span-4" icon={<Newspaper size={22} />} kicker="05 · Daily Intel" title="Launches. Price drops. Hidden changes." desc="AI-curated feed. No press-release fluff." />
        </motion.div>
      </section>

      {/* ============== UNBIASED PLEDGE ============== */}
      <section className="relative border-y border-white/5 bg-[#07070A] overflow-hidden" data-testid="pledge-section">
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F59E0B]/8 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 grid md:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="chip mb-5">{'/// the unbiased pledge'}</div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight font-light leading-[1.02]">
              No dealership
              <br />
              handshake.
              <br />
              No ad money.
              <br />
              <span className="text-gradient-amber italic font-semibold">Just math and truth.</span>
            </h2>
            <p className="mt-7 text-slate-400 leading-relaxed max-w-md">
              8 years on the dealership floor taught our founder one thing: Indian car buyers deserve
              better than paid reviews. Auto-AI India is built to expose what brands hide.
            </p>
          </motion.div>

          <motion.div
            className="space-y-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { t: "Data-first verdicts", d: "Safety stars, mileage, waiting, TCO — not brand love." },
              { t: "Hidden con exposure", d: "The AI surfaces real cons buyers discover 6 months later." },
              { t: "Zero paid placement", d: "Rankings cannot be bought. Ever." },
            ].map((x, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="glass border border-white/10 p-6 flex gap-4 hover:border-[#F59E0B]/50 transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-[#F59E0B]/30 bg-[#F59E0B]/5 group-hover:bg-[#F59E0B]/15 transition-colors">
                  <ShieldCheck size={18} className="text-[#F59E0B]" />
                </div>
                <div>
                  <div className="font-display text-lg font-medium">{x.t}</div>
                  <div className="text-sm text-slate-400 mt-1">{x.d}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============== TRENDING CARS ============== */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-28" data-testid="trending-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex items-end justify-between mb-12 flex-wrap gap-4"
        >
          <div>
            <div className="chip mb-5">{'/// trending right now'}</div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight font-light">
              Most searched <span className="text-[#F59E0B]">in India</span>
            </h2>
          </div>
          <Link
            to="/cars"
            className="group text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#F59E0B] flex items-center gap-2 border border-white/10 hover:border-[#F59E0B]/40 px-4 py-2.5 transition-all"
          >
            See all cars{" "}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {cars.map((c, i) => (
            <motion.div key={c.id} variants={fadeUp} custom={i}>
              <CarCard car={c} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============== CTA FINAL (tracing beam) ============== */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="tracing-beam p-12 lg:p-20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#F59E0B]/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C5832B]/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="chip mb-6">{'/// final word'}</div>
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tighter font-light uppercase max-w-4xl leading-[0.95]">
              Buying a car in India
              <br />
              just got{" "}
              <span className="text-gradient-amber italic font-semibold">honest.</span>
            </h2>
            <Link
              to="/compare"
              data-testid="footer-cta-compare"
              className="mt-10 btn-shine inline-flex bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-8 py-4 font-semibold text-xs uppercase tracking-[0.22em] items-center gap-3 hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.6)] transition-all"
            >
              Get Your First Verdict <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function Metric({ k, v }) {
  return (
    <div>
      <div className="font-num text-4xl md:text-5xl text-white leading-none">{k}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2">{v}</div>
    </div>
  );
}

function Feature({ to, span, icon, kicker, title, desc }) {
  return (
    <motion.div variants={fadeUp} className={span}>
      <Link
        to={to}
        data-testid={`feature-${kicker.split("·")[0].trim()}`}
        className="group relative h-full block border border-white/10 bg-[#0A0A0A]/70 backdrop-blur-md p-8 hover:border-[#F59E0B]/60 transition-all duration-500 overflow-hidden tilt-card corner-notch"
      >
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700 blur-3xl"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
        />
        <div className="relative z-[1]">
          <div className="w-12 h-12 flex items-center justify-center border border-[#F59E0B]/30 bg-[#F59E0B]/5 text-[#F59E0B] mb-6 group-hover:bg-[#F59E0B]/15 group-hover:scale-105 transition-all duration-300">
            {icon}
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono mb-3">
            {kicker}
          </div>
          <div className="font-display text-2xl lg:text-3xl font-medium mb-3 max-w-xs leading-[1.15]">
            {title}
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">{desc}</p>
          <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] font-bold">
            Enter{" "}
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
