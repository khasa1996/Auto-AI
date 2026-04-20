import { useState, useEffect } from "react";
import { api, formatINR } from "../lib/api";
import { Briefcase, TrendingUp, Users, IndianRupee, Phone, Car, MapPin, Loader2 } from "lucide-react";

export default function Dealer() {
  const [data, setData] = useState(null);
  const [partnerData, setPartnerData] = useState(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = city ? `?city=${encodeURIComponent(city)}` : "";
    Promise.all([api.get(`/dealer/leads${params}`), api.get("/partners/leads")])
      .then(([d, p]) => { setData(d.data); setPartnerData(p.data); })
      .finally(() => setLoading(false));
  }, [city]);

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-slate-400">
      <Loader2 className="animate-spin text-[#F59E0B]" size={32} />
    </div>;
  }

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="dealer-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="flex items-center gap-3 mb-4">
          <Briefcase size={16} className="text-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// dealer command center</span>
        </div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tighter font-light uppercase">
          Every lead. <span className="text-[#F59E0B]">Live.</span>
        </h1>
        <p className="text-slate-400 mt-4 max-w-xl">Real-time feed of bookings, test-drive requests, loan and insurance leads across your city.</p>

        {/* KPI row */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Users size={16} />} label="Total Leads" value={data?.total_leads || 0} />
          <Kpi icon={<Car size={16} />} label="Test Drives" value={data?.test_drive_requests || 0} />
          <Kpi icon={<TrendingUp size={16} />} label="Loan Interest" value={data?.loan_interest || 0} accent />
          <Kpi icon={<IndianRupee size={16} />} label="Insurance" value={data?.insurance_interest || 0} accent />
        </div>

        {/* Commission earned */}
        <div className="mt-8 border border-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/10 to-transparent p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F59E0B]/15 blur-3xl rounded-full" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-mono">Commission Earned (Lifetime)</div>
              <div className="font-display text-6xl font-light mt-2 text-white tabular-nums" data-testid="total-commission">
                {formatINR(partnerData?.total_commission || 0)}
              </div>
              <div className="text-sm text-slate-400 mt-2">{partnerData?.leads?.length || 0} partner leads auto-assigned</div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-2">By Partner</div>
              {Object.entries(partnerData?.by_partner || {}).slice(0, 6).map(([name, v]) => (
                <div key={name} className="flex items-center justify-between border-b border-[#262626] pb-2">
                  <span className="text-sm text-slate-200">{name}</span>
                  <span className="font-mono text-sm text-[#F59E0B]">{formatINR(v.commission)} <span className="text-xs text-slate-500">· {v.count}</span></span>
                </div>
              ))}
              {!Object.keys(partnerData?.by_partner || {}).length && <div className="text-xs text-slate-500">No leads yet.</div>}
            </div>
          </div>
        </div>

        {/* Top cars & cities */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <TopList title="Top Booked Cars" items={data?.top_cars || []} labelKey="car" icon={<Car size={14} />} />
          <TopList title="Top Cities" items={data?.top_cities || []} labelKey="city" icon={<MapPin size={14} />} />
        </div>

        {/* City filter */}
        <div className="mt-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-2">Filter by City</div>
          <div className="flex flex-wrap gap-2">
            {["", "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai"].map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCity(c)}
                data-testid={`city-filter-${c || "all"}`}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 border transition-colors ${
                  city === c ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "border-[#262626] text-slate-300 hover:border-[#F59E0B]"
                }`}
              >
                {c || "All cities"}
              </button>
            ))}
          </div>
        </div>

        {/* Recent leads table */}
        <div className="mt-6 border border-[#262626] bg-[#0A0A0A]">
          <div className="px-5 py-3 border-b border-[#262626] text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
            Recent Leads
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {(data?.recent || []).map((b) => (
              <div key={b.id} className="px-5 py-4 grid md:grid-cols-6 gap-3 text-sm hover:bg-white/5" data-testid={`lead-row-${b.id.slice(0,8)}`}>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">#{b.id.slice(0, 6).toUpperCase()}</div>
                  <div className="text-slate-200">{b.name}</div>
                </div>
                <div className="text-slate-300 flex items-center gap-1"><Phone size={12} className="text-slate-500" />{b.phone}</div>
                <div className="text-slate-300">{b.car_name}</div>
                <div className="text-slate-300 flex items-center gap-1"><MapPin size={12} className="text-slate-500" />{b.city}</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {b.test_drive && <Pill c="#10B981">Test Drive</Pill>}
                  {b.needs_loan && <Pill c="#F59E0B">Loan</Pill>}
                  {b.needs_insurance && <Pill c="#A78BFA">Insurance</Pill>}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{b.created_at?.slice(0, 16).replace("T", " ")}</div>
              </div>
            ))}
            {!(data?.recent || []).length && <div className="px-5 py-8 text-center text-slate-500 text-sm">No leads yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }) {
  return (
    <div className={`border bg-[#0A0A0A] p-5 ${accent ? "border-[#F59E0B]/40" : "border-[#262626]"}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">
        <span className={accent ? "text-[#F59E0B]" : "text-slate-500"}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-4xl font-light mt-3 tabular-nums">{value}</div>
    </div>
  );
}

function TopList({ title, items, labelKey, icon }) {
  return (
    <div className="border border-[#262626] bg-[#0A0A0A] p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-4">
        <span className="text-[#F59E0B]">{icon}</span>
        {title}
      </div>
      <div className="space-y-2">
        {items.slice(0, 6).map((it, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 w-5">{i + 1}</span>
              <span className="text-sm text-slate-200">{it[labelKey]}</span>
            </div>
            <span className="text-sm font-mono text-[#F59E0B]">{it.count}</span>
          </div>
        ))}
        {!items.length && <div className="text-xs text-slate-500">No data yet.</div>}
      </div>
    </div>
  );
}

function Pill({ children, c }) {
  return (
    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 border font-bold" style={{ color: c, borderColor: c + "50" }}>
      {children}
    </span>
  );
}
