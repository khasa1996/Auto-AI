import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { STORAGE_KEYS, getStored, removeStored, setStored } from "../lib/storage";
import { ShieldCheck, Check, X, Loader2, Users, Clock, AlertTriangle, Lock, LogOut, Phone, MapPin, IndianRupee } from "lucide-react";

export default function Admin() {
  const [pin, setPin] = useState(() => getStored(STORAGE_KEYS.adminPin, ""));
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [acting, setActing] = useState(null);

  const tryAuth = useCallback(async (p) => {
    setLoading(true); setLoginError("");
    try {
      await api.post("/admin/verify", { pin: p });
      setPin(p);
      setStored(STORAGE_KEYS.adminPin, p);
      setAuthed(true);
    } catch {
      setLoginError("Invalid PIN");
      removeStored(STORAGE_KEYS.adminPin);
      setPin("");
    } finally { setLoading(false); }
  }, []);

  // Auto-auth on mount if PIN was previously stored.
  // (Intentional effect-based auth check on first render.)
  useEffect(() => {
    if (pin && !authed) tryAuth(pin);
  }, []); // eslint-disable-line

  const load = useCallback(async () => {
    if (!pin) return;
    const params = new URLSearchParams({ pin });
    if (filter !== "all") params.set("status", filter === "pending" ? "pending_verification" : filter);
    const { data: resp } = await api.get(`/admin/dealers?${params.toString()}`);
    setData(resp);
  }, [pin, filter]);

  // Reload dealer list when auth state changes or filter is updated.
  useEffect(() => {
    if (authed) load();
  }, [authed, load]); // eslint-disable-line

  const act = async (dealerId, action) => {
    setActing(dealerId);
    try {
      await api.post(`/admin/dealers/${dealerId}/${action}`, { pin });
      await load();
    } finally { setActing(null); }
  };

  const logout = () => {
    removeStored(STORAGE_KEYS.adminPin);
    setAuthed(false); setPin("");
  };

  // --- Auth gate ---
  if (!authed) {
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center px-6" data-testid="admin-login">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={16} className="text-[#F59E0B]" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// admin access</span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light uppercase">
            Owner <span className="text-[#F59E0B]">console</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm">Enter your admin PIN to continue.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); tryAuth(pinInput); }}
            className="mt-8 border border-[#262626] bg-[#0A0A0A] p-6 space-y-4"
          >
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Admin PIN"
              data-testid="admin-pin-input"
              className="w-full ai-input px-3 py-3 text-center text-lg tracking-[0.3em] font-mono"
            />
            {loginError && <div className="text-xs text-[#EF4444]" data-testid="admin-login-error">{loginError}</div>}
            <button
              type="submit"
              disabled={loading || !pinInput}
              data-testid="admin-login-btn"
              className="w-full bg-[#F59E0B] text-black text-xs uppercase tracking-[0.25em] font-bold py-3 disabled:opacity-50 hover:bg-[#D97706]"
            >
              {loading ? "Verifying…" : "Enter Console"}
            </button>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono text-center">
              Demo PIN: 108108
            </div>
          </form>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, avg_bid: 0 };

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={16} className="text-[#F59E0B]" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">/// owner admin console</span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light uppercase">
              Dealer <span className="text-[#F59E0B]">applications</span>
            </h1>
          </div>
          <button onClick={logout} data-testid="admin-logout-btn" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#EF4444] flex items-center gap-1">
            <LogOut size={14} /> Lock
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<Users size={14} />} label="Total" value={stats.total} />
          <StatCard icon={<Clock size={14} />} label="Pending" value={stats.pending} color="#F59E0B" />
          <StatCard icon={<Check size={14} />} label="Approved" value={stats.approved} color="#10B981" />
          <StatCard icon={<X size={14} />} label="Rejected" value={stats.rejected} color="#EF4444" />
          <StatCard icon={<IndianRupee size={14} />} label="Avg Bid" value={`₹${stats.avg_bid}`} />
        </div>

        {/* Filter */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            { k: "all", l: "All" },
            { k: "pending", l: "Pending" },
            { k: "approved", l: "Approved" },
            { k: "rejected", l: "Rejected" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              data-testid={`filter-${f.k}`}
              className={`text-[10px] uppercase tracking-[0.25em] px-4 py-2 border transition-colors ${
                filter === f.k ? "bg-[#F59E0B] text-black border-[#F59E0B]" : "border-[#262626] text-slate-300 hover:border-[#F59E0B]"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-6 space-y-3">
          {(data?.dealers || []).map((d) => (
            <DealerRow key={d.id} dealer={d} onApprove={() => act(d.id, "approve")} onReject={() => act(d.id, "reject")} busy={acting === d.id} />
          ))}
          {data && (data.dealers || []).length === 0 && (
            <div className="border border-[#262626] bg-[#0A0A0A] p-12 text-center">
              <AlertTriangle size={32} className="text-slate-600 mx-auto mb-3" />
              <div className="text-sm text-slate-400">No dealer applications match this filter.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "#F59E0B" }) {
  return (
    <div className="border border-[#262626] bg-[#0A0A0A] p-4" data-testid={`stat-${label.toLowerCase()}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-3xl font-light mt-2 tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function DealerRow({ dealer, onApprove, onReject, busy }) {
  const isPending = dealer.status === "pending_verification";
  const isApproved = dealer.status === "approved";
  const isRejected = dealer.status === "rejected";

  const statusColor = isPending ? "#F59E0B" : isApproved ? "#10B981" : "#EF4444";

  return (
    <div className="border border-[#262626] bg-[#0D0D0D] p-5 hover:border-[#F59E0B] transition-colors" data-testid={`dealer-row-${dealer.id.slice(0,8)}`}>
      <div className="grid md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">#{dealer.id.slice(0, 6).toUpperCase()}</div>
          <div className="font-display text-xl font-medium mt-1">{dealer.business_name}</div>
          <div className="text-xs text-slate-400 mt-1">{dealer.owner_name}</div>
        </div>
        <div className="md:col-span-3 text-sm text-slate-300 space-y-1">
          <div className="flex items-center gap-2"><Phone size={11} className="text-slate-500" />{dealer.phone}</div>
          <div className="flex items-center gap-2"><MapPin size={11} className="text-slate-500" />{dealer.city}</div>
        </div>
        <div className="md:col-span-2">
          <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">Bid / Lead</div>
          <div className="font-display text-xl text-[#F59E0B]">₹{dealer.bid_per_lead}</div>
          <div className="text-[10px] text-slate-500 mt-1">{(dealer.brands || []).length} brands</div>
        </div>
        <div className="md:col-span-3 flex items-center justify-end gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold px-2 py-1 border" style={{ color: statusColor, borderColor: statusColor + "50" }}>
            {dealer.status.replace("_", " ")}
          </span>
          {isPending && (
            <div className="flex gap-1">
              <button
                onClick={onReject}
                disabled={busy}
                data-testid={`reject-${dealer.id.slice(0,8)}`}
                className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-2 border border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444] hover:text-white disabled:opacity-50"
              >
                <X size={12} />
              </button>
              <button
                onClick={onApprove}
                disabled={busy}
                data-testid={`approve-${dealer.id.slice(0,8)}`}
                className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-2 bg-[#10B981] text-black hover:bg-[#059669] disabled:opacity-50 flex items-center gap-1"
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />} Approve
              </button>
            </div>
          )}
        </div>
      </div>
      {(dealer.brands || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-1">
          {dealer.brands.map((b) => (
            <span key={b} className="text-[9px] uppercase tracking-wider text-slate-400 border border-[#262626] px-2 py-0.5">{b}</span>
          ))}
        </div>
      )}
    </div>
  );
}
