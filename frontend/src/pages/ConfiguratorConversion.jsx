import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { configuratorApi } from "../services/configuratorApi";
import { formatINR } from "../lib/api";

const DEFAULT_RATE = 9.5;
const DEFAULT_TENURE = 60;

function errorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail?.errors)) return detail.errors.join(" · ");
  return error?.message || fallback;
}

export default function ConfiguratorConversion() {
  const [params] = useSearchParams();
  const token = params.get("config");
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);
  const [finance, setFinance] = useState(true);
  const [downPayment, setDownPayment] = useState(0);
  const [tenure, setTenure] = useState(DEFAULT_TENURE);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [insurance, setInsurance] = useState(true);
  const [dealerAction, setDealerAction] = useState("AVAILABILITY");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Open this page from a saved configurator share link.");
      return;
    }
    let cancelled = false;
    configuratorApi.loadConfiguration(token)
      .then((response) => { if (!cancelled) setSaved(response.data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, "Unable to load configuration")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const price = Number(saved?.price_breakdown?.estimated_on_road || saved?.price_snapshot || 0);
  const principal = Math.max(0, price - Number(downPayment || 0));
  const estimatedEmi = useMemo(() => {
    if (!finance || !principal || !tenure) return 0;
    const monthly = Number(rate) / 12 / 100;
    if (!monthly) return Math.round(principal / tenure);
    const factor = (1 + monthly) ** tenure;
    return Math.round(principal * monthly * factor / (factor - 1));
  }, [finance, principal, tenure, rate]);

  async function submit() {
    if (!saved?.configuration?.purchasable || !saved.configuration.purchasable.variant_id) return;
    setSubmitting(true); setError(null); setResult(null);
    try {
      const payload = {
        source: "configurator_conversion",
        variant_id: saved.configuration.purchasable.variant_id,
        configuration: saved.configuration,
        city: saved.city || null,
      };
      const intent = {
        finance_required: finance,
        down_payment: finance ? Number(downPayment || 0) : null,
        tenure_months: finance ? Number(tenure) : null,
        annual_rate: finance ? Number(rate) : null,
        insurance_required: insurance,
        dealer_action: dealerAction,
      };
      const response = await configuratorApi.createConversionHandoff(payload, intent);
      setResult(response.data);
    } catch (err) {
      setError(errorMessage(err, "Unable to submit conversion request"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Shell><div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading saved configuration…</div></Shell>;
  if (error && !saved) return <Shell><div className="mx-auto max-w-lg py-20 text-center"><p className="text-sm text-red-400">{error}</p><Link to="/cars" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white"><ArrowLeft size={14} /> Back to cars</Link></div></Shell>;

  return <Shell>
    <div className="mx-auto max-w-5xl py-10">
      <Link to={`/configurator/${saved.configuration.purchasable.variant_id}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white"><ArrowLeft size={14} /> Back to configurator</Link>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <Card title="Your configured car">
            <div className="font-mono text-3xl text-amber-400">{price ? formatINR(price) : "Price on request"}</div>
            <p className="mt-2 text-xs text-white/40">Server-calculated on-road estimate · {saved.city || "base pricing"}</p>
            <p className="mt-5 text-[10px] uppercase tracking-widest text-white/25">Configuration ID</p>
            <p className="mt-1 font-mono text-xs text-white/60">{saved.config_id || "Shared configuration"}</p>
          </Card>
          <Card title="Finance">
            <Toggle label="I want finance assistance" checked={finance} onChange={setFinance} />
            {finance && <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Down payment" value={downPayment} onChange={setDownPayment} min={0} max={Math.max(0, price)} step={10000} />
              <Field label="Rate % p.a." value={rate} onChange={setRate} min={0} max={40} step={0.05} />
              <Field label="Tenure months" value={tenure} onChange={setTenure} min={12} max={84} step={1} />
            </div>}
            {finance && <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><span className="text-[9px] uppercase tracking-widest text-white/35">Estimated monthly EMI</span><div className="mt-1 font-mono text-2xl text-amber-300">{formatINR(estimatedEmi)}</div><p className="mt-1 text-[9px] text-white/25">Indicative only; final lender terms are subject to approval.</p></div>}
          </Card>
          <Card title="Insurance">
            <Toggle label="I want insurance assistance" checked={insurance} onChange={setInsurance} />
            <p className="mt-3 text-[9px] text-white/25">The configurator price may include an insurance estimate. A partner/dealer can provide the final policy quote.</p>
          </Card>
          <Card title="Dealer handoff">
            <div className="grid gap-2 sm:grid-cols-2">
              {[['AVAILABILITY', 'Check dealer availability'], ['ENQUIRY', 'Send dealer enquiry'], ['TEST_DRIVE', 'Arrange test drive'], ['BOOKING', 'Start booking']].map(([value, label]) => <button key={value} type="button" onClick={() => setDealerAction(value)} className={`rounded-xl border px-4 py-3 text-left text-[10px] uppercase tracking-wider transition ${dealerAction === value ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/10 text-white/50 hover:border-white/30'}`}>{label}</button>)}
            </div>
          </Card>
        </section>
        <aside className="h-fit rounded-2xl border border-amber-400/30 bg-[#0d0d0d] p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 text-amber-300"><ShieldCheck size={15} /><span className="text-[10px] uppercase tracking-widest">Auto AI India handoff</span></div>
          <h1 className="mt-3 text-2xl font-light">Ready to connect.</h1>
          <p className="mt-2 text-xs leading-5 text-white/40">Your configuration stays authoritative. Finance, insurance and dealer intent are attached to the same validated vehicle build.</p>
          <div className="mt-6 space-y-3 text-[10px]">
            <Summary label="Finance" value={finance ? `Requested · ${formatINR(estimatedEmi)}/mo` : "Not requested"} />
            <Summary label="Insurance" value={insurance ? "Assistance requested" : "Not requested"} />
            <Summary label="Dealer" value={dealerAction.replace("_", " ")} />
          </div>
          <button type="button" disabled={submitting} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-amber-300 disabled:opacity-40">{submitting ? "Submitting…" : "Continue with request"}</button>
          {result && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><div className="flex items-center gap-2 text-emerald-300"><Check size={14} /><span className="text-[10px] uppercase tracking-widest">Request created</span></div><p className="mt-2 font-mono text-[9px] text-white/40">Lead {result.lead_id?.slice(0, 8)}</p></div>}
          {error && saved && <p className="mt-4 text-[9px] text-red-400">{error}</p>}
        </aside>
      </div>
    </div>
  </Shell>;
}

function Shell({ children }) { return <main className="min-h-screen bg-[#050505] pt-20 text-white"><div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">{children}</div></main>; }
function Card({ title, children }) { return <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><h2 className="mb-4 text-[10px] uppercase tracking-widest text-white/40">{title}</h2>{children}</div>; }
function Toggle({ label, checked, onChange }) { return <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-xs text-white/70"><span>{label}</span><span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? 'bg-amber-400' : 'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} /></span></button>; }
function Field({ label, value, onChange, min, max, step }) { return <label className="block"><span className="mb-2 block text-[9px] uppercase tracking-widest text-white/30">{label}</span><input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} min={min} max={max} step={step} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" /></label>; }
function Summary({ label, value }) { return <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2"><span className="text-white/25">{label}</span><span className="text-right text-white/65">{value}</span></div>; }
