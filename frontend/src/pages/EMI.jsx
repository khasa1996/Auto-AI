import { useEffect, useMemo, useState } from "react";
import { api, formatINR } from "../lib/api";
import { Slider } from "../components/ui/slider";
import { Calculator } from "lucide-react";

const computeEMI = (P, annualRate, n) => {
  const r = annualRate / 12 / 100;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total_payment = emi * n;
  return { emi, total_payment, total_interest: total_payment - P, principal: P, tenure_months: n };
};

export default function EMI() {
  const [principal, setPrincipal] = useState([800000]);
  const [rate, setRate] = useState([9.5]);
  const [tenure, setTenure] = useState([60]);
  const [result, setResult] = useState(() => computeEMI(800000, 9.5, 60));

  useEffect(() => {
    setResult(computeEMI(principal[0], rate[0], tenure[0]));
    const t = setTimeout(() => {
      api.post("/emi/calculate", {
        principal: principal[0],
        annual_rate: rate[0],
        tenure_months: tenure[0],
      }).then((r) => setResult(r.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [principal, rate, tenure]);

  const pie = useMemo(() => {
    if (!result) return { p: 0, i: 0 };
    const total = result.principal + result.total_interest;
    return { p: (result.principal / total) * 100, i: (result.total_interest / total) * 100 };
  }, [result]);

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="emi-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-px bg-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">{'/// emi studio'}/span>
        </div>
        <h1 className="font-display text-5xl lg:text-6xl tracking-tighter font-light uppercase">
          Loan math, <span className="text-[#F59E0B]">demystified.</span>
        </h1>

        <div className="mt-12 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 border border-[#262626] bg-[#0A0A0A] p-8 space-y-10">
            <Field label="Loan Amount" value={formatINR(principal[0])}>
              <Slider
                value={principal}
                onValueChange={setPrincipal}
                min={100000}
                max={5000000}
                step={10000}
                data-testid="emi-principal-slider"
                className="[&>span:first-child]:bg-[#141414] [&_[role=slider]]:bg-[#F59E0B] [&_[role=slider]]:border-[#F59E0B]"
              />
            </Field>
            <Field label="Interest Rate" value={`${rate[0].toFixed(2)}% p.a.`}>
              <Slider
                value={rate}
                onValueChange={setRate}
                min={6}
                max={16}
                step={0.05}
                data-testid="emi-rate-slider"
                className="[&>span:first-child]:bg-[#141414] [&_[role=slider]]:bg-[#F59E0B] [&_[role=slider]]:border-[#F59E0B]"
              />
            </Field>
            <Field label="Tenure" value={`${tenure[0]} months · ${(tenure[0]/12).toFixed(1)} yrs`}>
              <Slider
                value={tenure}
                onValueChange={setTenure}
                min={12}
                max={84}
                step={1}
                data-testid="emi-tenure-slider"
                className="[&>span:first-child]:bg-[#141414] [&_[role=slider]]:bg-[#F59E0B] [&_[role=slider]]:border-[#F59E0B]"
              />
            </Field>
          </div>

          <div className="lg:col-span-5 border border-[#F59E0B] bg-[#0A0A0A] p-8 relative">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={16} className="text-[#F59E0B]" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold font-mono">Monthly EMI</span>
            </div>
            <div className="font-display text-6xl font-light text-white tabular-nums" data-testid="emi-result">
              {result ? formatINR(Math.round(result.emi)) : "—"}
            </div>
            <div className="text-sm text-slate-400 mt-2">per month</div>

            <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-[#262626]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Total Interest</div>
                <div className="font-display text-2xl text-[#EF4444] mt-1">{result ? formatINR(Math.round(result.total_interest)) : "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Total Payment</div>
                <div className="font-display text-2xl text-white mt-1">{result ? formatINR(Math.round(result.total_payment)) : "—"}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">Principal vs Interest</div>
              <div className="flex h-3">
                <div className="bg-[#F59E0B]" style={{ width: `${pie.p}%` }} />
                <div className="bg-[#EF4444]" style={{ width: `${pie.i}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-mono">
                <span>Principal {pie.p.toFixed(0)}%</span>
                <span>Interest {pie.i.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-4">
        <label className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">{label}</label>
        <span className="font-display text-xl text-[#F59E0B] tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}
