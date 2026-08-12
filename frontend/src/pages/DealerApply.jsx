import { useState } from "react";
import { api } from "../lib/api";
import { Briefcase, Loader2, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { Field } from "../components/Primitives";

const BRAND_OPTIONS = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", "Honda",
  "MG", "Skoda", "Volkswagen", "Renault", "Nissan", "Citroen", "Jeep",
  "BMW", "Mercedes-Benz", "Audi", "Volvo", "MINI",
];

const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh"];

export default function DealerApply() {
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    phone: "",
    email: "",
    city: "Mumbai",
    brands: [],
    bid_per_lead: 500,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleBrand = (b) => {
    setForm((f) => {
      const has = f.brands.includes(b);
      return { ...f, brands: has ? f.brands.filter((x) => x !== b) : [...f.brands, b] };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.owner_name || !form.phone || !form.city) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/dealers/apply", form);
      setResult(data);
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-[#050505] min-h-screen" data-testid="dealer-apply-success">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
          <div className="border border-[#10B981] bg-[#0A0A0A] p-10">
            <CheckCircle2 size={48} className="text-[#10B981] mb-6" />
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#10B981] font-mono mb-2">Application Received</div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light">
              Welcome, <span className="text-[#F59E0B]">{result.business_name}</span>
            </h1>
            <p className="text-slate-300 mt-4 text-lg">
              Your dealer application is <span className="text-[#F59E0B]">pending verification</span>. Our team will review and activate you within 24 hours.
            </p>
            <div className="mt-8 grid md:grid-cols-2 gap-4 text-sm">
              <Info label="Application ID" value={result.id.slice(0, 8).toUpperCase()} />
              <Info label="City" value={result.city} />
              <Info label="Bid per Lead" value={`₹${result.bid_per_lead}`} />
              <Info label="Status" value={result.status} />
            </div>
            <a href="/dealer" className="mt-8 inline-flex bg-[#F59E0B] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] font-bold hover:bg-[#D97706]">
              Go to Dealer Command Center →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="dealer-apply-page">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <Briefcase size={16} className="text-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// partner with auto-ai india</span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase leading-[0.95]">
          Stop buying ads.<br />Start buying <span className="text-[#F59E0B]">leads.</span>
        </h1>
        <p className="text-slate-400 mt-4 max-w-2xl text-lg">
          Only pay when a qualified buyer books a test drive in your city. No monthly fee. No wasted marketing spend.
        </p>

        {/* Value props */}
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, title: "Pay-per-lead", desc: "Only pay when an AI-qualified buyer requests YOUR dealership." },
            { icon: Sparkles, title: "Auction-based", desc: "Higher bid = priority placement in your city." },
            { icon: CheckCircle2, title: "Zero monthly cost", desc: "No subscription. No setup fees. Verified in 24hrs." },
          ].map((v, i) => (
            <div key={i} className="border border-[#262626] bg-[#0A0A0A] p-5">
              <v.icon size={18} className="text-[#F59E0B] mb-3" />
              <div className="font-display text-lg font-medium">{v.title}</div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-10 border border-[#262626] bg-[#0A0A0A] p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Business Name *">
              <input required value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Sai Motors Pvt Ltd" data-testid="dealer-business-input" className="w-full ai-input px-3 py-2.5" />
            </Field>
            <Field label="Owner / Contact Name *">
              <input required value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} data-testid="dealer-owner-input" className="w-full ai-input px-3 py-2.5" />
            </Field>
            <Field label="Phone *">
              <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9XXXX XXXXX" data-testid="dealer-phone-input" className="w-full ai-input px-3 py-2.5" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} data-testid="dealer-email-input" className="w-full ai-input px-3 py-2.5" />
            </Field>
            <Field label="City *">
              <select value={form.city} onChange={(e) => update("city", e.target.value)} data-testid="dealer-city-select" className="w-full ai-input px-3 py-2.5">
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Bid per Lead (₹)">
              <input type="number" value={form.bid_per_lead} onChange={(e) => update("bid_per_lead", +e.target.value)} min={100} max={10000} step={50} data-testid="dealer-bid-input" className="w-full ai-input px-3 py-2.5" />
            </Field>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-3">Brands you sell *</div>
            <div className="flex flex-wrap gap-2">
              {BRAND_OPTIONS.map((b) => {
                const active = form.brands.includes(b);
                return (
                  <button
                    type="button"
                    key={b}
                    onClick={() => toggleBrand(b)}
                    data-testid={`brand-chip-${b.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 border transition-colors ${
                      active ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "text-slate-300 border-[#262626] hover:border-[#F59E0B]"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 text-xs text-slate-300">
            <strong className="text-[#F59E0B]">Bid strategy:</strong> Dealers with higher bids receive priority placement in their city. Typical bids are ₹300-₹1,500 per qualified test-drive booking.
          </div>

          <button
            disabled={submitting || !form.brands.length}
            type="submit"
            data-testid="dealer-submit-btn"
            className="w-full bg-[#F59E0B] text-black font-semibold text-xs uppercase tracking-[0.25em] py-4 disabled:opacity-50 hover:bg-[#D97706] flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" />Submitting</> : <>Apply to Partner →</>}
          </button>
        </form>
      </div>
    </div>
  );
}


function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">{label}</div>
      <div className="font-mono text-sm text-slate-200 mt-1">{value}</div>
    </div>
  );
}
