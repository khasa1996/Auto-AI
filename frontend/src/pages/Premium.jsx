import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api, USER_TOKEN_KEY, createIdempotencyKey } from "../lib/api";
import { Crown, Check, Sparkles, Zap, Headphones, Gift, TrendingUp, Loader2, CheckCircle2, XCircle } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tag: "Always free",
    features: ["AI Comparison (3 / day)", "AI Recommendations", "EMI Calculator", "Basic chatbot", "3-min 360° preview"],
    disabled: true,
  },
  {
    id: "premium",
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
  },
  {
    id: "dealer",
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
  },
];

const PERKS = [
  { icon: Sparkles, title: "Unlimited 360° showroom", desc: "All 106 cars. Every trim. Every color. No timers." },
  { icon: Zap, title: "Priority dealer calls", desc: "Your bookings move to the front of every partner queue." },
  { icon: Headphones, title: "24×7 AI expert", desc: "Deep-dive reports, resale predictions, maintenance forecasts." },
  { icon: TrendingUp, title: "Price drop alerts", desc: "Know the second your shortlist drops in price." },
  { icon: Gift, title: "Member-only discounts", desc: "Discounted loan rates, exclusive insurance bundles." },
];

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[data-razorpay="checkout"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "checkout";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded"));
    document.body.appendChild(script);
  });
}

export default function Premium() {
  const [checkoutIdempotencyKey] = useState(() => createIdempotencyKey());
  const [buyingId, setBuyingId] = useState(null);
  const [paymentState, setPaymentState] = useState(null); // pending | paid | failed
  const [params] = useSearchParams();
  const nav = useNavigate();

  useEffect(() => {
    if (params.get("payment") === "success") setPaymentState("paid");
    if (params.get("payment") === "failed") setPaymentState("failed");
  }, [params]);

  const subscribe = async (planId) => {
    if (!localStorage.getItem(USER_TOKEN_KEY)) { nav("/login"); return; }
    setBuyingId(planId);
    setPaymentState(null);

    try {
      await loadRazorpayScript();
      const { data: order } = await api.post("/checkout/order", { plan_id: planId, idempotency_key: checkoutIdempotencyKey });

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Auto-AI India",
        description: `${order.plan_name} — one-time access`,
        order_id: order.order_id,
        prefill: {
          contact: order.customer_phone || "",
        },
        theme: { color: "#F59E0B" },
        modal: {
          ondismiss: () => setBuyingId(null),
        },
        handler: async (response) => {
          setPaymentState("pending");
          try {
            await api.post("/checkout/verify", {
              plan_id: planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentState("paid");
          } catch (error) {
            console.error("Razorpay verification failed", error);
            setPaymentState("failed");
          } finally {
            setBuyingId(null);
          }
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        setPaymentState("failed");
        setBuyingId(null);
      });
      checkout.open();
    } catch (error) {
      console.error("Could not start Razorpay checkout", error);
      setPaymentState("failed");
      setBuyingId(null);
      alert("Could not start payment. Please try again.");
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen relative" data-testid="premium-page">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F59E0B]/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-[#C5832B]/8 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="flex items-center gap-3 mb-5">
            <Crown size={16} className="text-[#F59E0B]" />
            <span className="chip">{'/// auto-ai premium'}/span>
          </div>
          <h1 className="font-display text-5xl lg:text-7xl tracking-tighter font-light uppercase max-w-4xl leading-[0.95]">
            Every car. Every angle.{" "}
            <span className="text-gradient-amber italic font-semibold">Zero limits.</span>
          </h1>
          <p className="text-slate-400 mt-7 max-w-2xl text-lg leading-relaxed">
            Premium unlocks the full AI showroom, priority bookings, and insights normally reserved for dealer insiders.
          </p>
        </motion.div>

        {paymentState === "pending" && (
          <div className="mt-10 border border-[#F59E0B] bg-[#F59E0B]/10 p-5 flex items-center gap-3" data-testid="payment-pending-banner">
            <Loader2 size={18} className="text-[#F59E0B] animate-spin" />
            <span className="text-slate-200">Verifying your payment securely…</span>
          </div>
        )}
        {paymentState === "paid" && (
          <div className="mt-10 border border-[#10B981] bg-[#10B981]/10 p-5 flex items-center gap-3" data-testid="payment-success-banner">
            <CheckCircle2 size={18} className="text-[#10B981]" />
            <span className="text-slate-200"><strong className="text-[#10B981]">Payment successful.</strong> Your access is now active.</span>
          </div>
        )}
        {paymentState === "failed" && (
          <div className="mt-10 border border-[#EF4444] bg-[#EF4444]/10 p-5 flex items-center gap-3" data-testid="payment-failed-banner">
            <XCircle size={18} className="text-[#EF4444]" />
            <span className="text-slate-200">Payment could not be completed or verified. Please try again.</span>
          </div>
        )}

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {PLANS.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              data-testid={`plan-${p.id}`}
              className={`relative p-8 flex flex-col ${p.featured ? "tracing-beam" : "border border-white/10 bg-[#0A0A0A] hover:border-white/20 transition-colors"}`}
            >
              {p.featured && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-black text-[9px] uppercase tracking-[0.3em] font-bold px-3 py-1 amber-glow z-[2]">
                  Most Popular
                </div>
              )}
              <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-4 ${p.featured ? "text-[#F59E0B]" : "text-slate-500"} flex items-center gap-2`}>
                {p.featured && <Sparkles size={12} />} {p.tag}
              </div>
              <div className="font-display text-3xl font-light">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-num text-6xl text-white leading-none">₹{p.price}</span>
                {p.price > 0 && <span className="text-sm text-slate-400">one time</span>}
              </div>
              <ul className="mt-7 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-300">
                    <Check size={14} className={`mt-1 flex-shrink-0 ${p.featured ? "text-[#F59E0B]" : "text-[#10B981]"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={p.disabled || buyingId === p.id}
                onClick={() => !p.disabled && subscribe(p.id)}
                data-testid={`plan-cta-${p.id}`}
                className={`mt-8 py-3.5 text-xs uppercase tracking-[0.25em] font-bold flex items-center justify-center gap-2 transition-all ${p.disabled ? "border border-white/10 text-slate-500 cursor-not-allowed" : p.featured ? "btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black hover:shadow-[0_0_30px_-4px_rgba(245,158,11,0.7)]" : "border border-white/20 text-white hover:bg-white/5 hover:border-[#F59E0B]/40"}`}
              >
                {buyingId === p.id ? <><Loader2 size={14} className="animate-spin" />Opening secure checkout</> : p.disabled ? "Current plan" : `Pay ₹${p.price} once →`}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-24">
          <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-4">{'/// why go premium'}/div>
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

        <div className="mt-20 border border-[#262626] bg-gradient-to-br from-[#0A0A0A] to-black p-10 lg:p-16 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#F59E0B]/15 blur-3xl rounded-full" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="font-display text-3xl md:text-4xl tracking-tight font-light max-w-2xl">
                Secure one-time payments. <span className="text-[#F59E0B]">No recurring subscription.</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">Powered by Razorpay · UPI, cards and supported payment methods · Server-side signature verification</p>
            </div>
            <Link to="/cars" data-testid="premium-cta-trial" className="bg-[#F59E0B] text-black px-7 py-4 font-semibold text-xs uppercase tracking-[0.25em] hover:bg-[#D97706]">
              Browse Cars →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
