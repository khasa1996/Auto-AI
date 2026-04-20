import { Link } from "react-router-dom";
import { Crown, Check, Sparkles, Zap, Headphones, Gift, TrendingUp } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: 0,
    tag: "Always free",
    features: [
      "AI Car Comparison (3 / day)",
      "AI Recommendations",
      "EMI Calculator",
      "Basic chatbot",
      "3-min 360° preview",
    ],
    cta: "Current plan",
    disabled: true,
  },
  {
    name: "Premium",
    price: 199,
    tag: "Most popular",
    featured: true,
    features: [
      "Unlimited AI comparisons",
      "Unlimited 360° Showroom (all 106 cars)",
      "Interior walkthrough + customization",
      "Priority 24×7 AI expert chat",
      "Price-drop & waiting-period alerts",
      "Zero-wait dealer booking priority",
      "Exclusive loan & insurance rates",
    ],
    cta: "Unlock Premium →",
  },
  {
    name: "Dealer / Business",
    price: 999,
    tag: "For dealerships",
    features: [
      "Everything in Premium",
      "Leads dashboard + CRM export",
      "Multi-user accounts (5 seats)",
      "Branded customer reports",
      "API access",
    ],
    cta: "Talk to sales",
  },
];

const PERKS = [
  { icon: Sparkles, title: "Unlimited 360° showroom", desc: "All 106 cars. Every trim. Every color. No timers." },
  { icon: Zap, title: "Priority dealer calls", desc: "Your bookings move to the front of every partner queue." },
  { icon: Headphones, title: "24×7 AI expert", desc: "Deep-dive reports, resale predictions, maintenance forecasts." },
  { icon: TrendingUp, title: "Price drop alerts", desc: "Know the second your shortlist drops in price." },
  { icon: Gift, title: "Member-only discounts", desc: "Discounted loan rates, exclusive insurance bundles." },
];

export default function Premium() {
  return (
    <div className="bg-[#050505] min-h-screen" data-testid="premium-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <Crown size={16} className="text-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// auto-ai premium</span>
        </div>
        <h1 className="font-display text-5xl lg:text-7xl tracking-tighter font-light uppercase max-w-4xl">
          Every car. Every angle. <span className="text-[#F59E0B]">Zero limits.</span>
        </h1>
        <p className="text-slate-400 mt-6 max-w-2xl text-lg">
          Premium unlocks the full AI showroom, priority bookings, and insights normally reserved for dealer insiders.
        </p>

        {/* Plans */}
        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              data-testid={`plan-${p.name.toLowerCase().replace(" / ", "-").replace(" ", "-")}`}
              className={`border p-8 flex flex-col ${p.featured ? "border-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/10 to-transparent" : "border-[#262626] bg-[#0A0A0A]"}`}
            >
              {p.featured && (
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold mb-4 flex items-center gap-2">
                  <Sparkles size={12} /> {p.tag}
                </div>
              )}
              {!p.featured && (
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-4">{p.tag}</div>
              )}
              <div className="font-display text-3xl font-light">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-5xl">₹{p.price}</span>
                {p.price > 0 && <span className="text-sm text-slate-400">/ month</span>}
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-300">
                    <Check size={14} className={`mt-1 flex-shrink-0 ${p.featured ? "text-[#F59E0B]" : "text-[#10B981]"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={p.disabled}
                data-testid={`plan-cta-${p.name.toLowerCase().replace(" / ", "-").replace(" ", "-")}`}
                className={`mt-8 py-3.5 text-xs uppercase tracking-[0.25em] font-bold ${
                  p.disabled
                    ? "border border-[#262626] text-slate-500 cursor-not-allowed"
                    : p.featured
                      ? "bg-[#F59E0B] text-black hover:bg-[#D97706]"
                      : "border border-white/20 text-white hover:bg-white/5"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Perks */}
        <div className="mt-24">
          <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-4">/// why go premium</div>
          <h2 className="font-display text-4xl lg:text-5xl tracking-tight font-light max-w-3xl">
            Insight that used to be <span className="text-[#F59E0B]">dealer-only</span>.
          </h2>
          <div className="mt-10 grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PERKS.map((p) => (
              <div key={p.title} className="border border-[#262626] bg-[#0A0A0A] p-6 hover:border-[#F59E0B] transition-colors">
                <p.icon size={20} className="text-[#F59E0B] mb-4" />
                <div className="font-display text-base font-medium">{p.title}</div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA strip */}
        <div className="mt-20 border border-[#262626] bg-gradient-to-br from-[#0A0A0A] to-black p-10 lg:p-16 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#F59E0B]/15 blur-3xl rounded-full" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="font-display text-3xl md:text-4xl tracking-tight font-light max-w-2xl">
                First 14 days free. <span className="text-[#F59E0B]">Cancel anytime.</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">No card locked at sign-up. Just an honest trial.</p>
            </div>
            <Link to="/cars" data-testid="premium-cta-trial" className="bg-[#F59E0B] text-black px-7 py-4 font-semibold text-xs uppercase tracking-[0.25em] hover:bg-[#D97706]">
              Start Free Trial →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
