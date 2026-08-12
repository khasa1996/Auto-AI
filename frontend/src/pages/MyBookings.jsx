import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatINR } from "../lib/api";
import { STORAGE_KEYS, getStored, removeStored } from "../lib/storage";
import { Phone, LogOut, Car, Clock, CheckCircle2 } from "lucide-react";
import CarVisual from "../components/CarVisual";
import { Pill } from "../components/Primitives";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const phone = getStored(STORAGE_KEYS.phone);

  useEffect(() => {
    if (!phone) { nav("/login"); return; }
    api.get(`/me/bookings?phone=${encodeURIComponent(phone)}`)
      .then((r) => setBookings(r.data))
      .finally(() => setLoading(false));
  }, [phone, nav]);

  const logout = () => {
    removeStored(STORAGE_KEYS.token, STORAGE_KEYS.phone);
    nav("/login");
  };

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="my-bookings-page">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono mb-2">/// your dashboard</div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light uppercase">My Bookings</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
              <Phone size={12} /> +91 {phone}
            </div>
          </div>
          <button onClick={logout} data-testid="logout-btn" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#EF4444] flex items-center gap-1">
            <LogOut size={14} /> Logout
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="border border-[#262626] bg-[#0A0A0A] p-16 text-center">
            <Car size={40} className="text-slate-600 mx-auto mb-4" />
            <div className="font-display text-2xl">No bookings yet</div>
            <p className="text-sm text-slate-400 mt-2">Ready to find your perfect ride?</p>
            <Link to="/cars" className="mt-6 inline-flex bg-[#F59E0B] text-black px-6 py-3 text-xs uppercase tracking-[0.25em] font-bold hover:bg-[#D97706]">
              Browse Cars →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="border border-[#262626] bg-[#0D0D0D] overflow-hidden hover:border-[#F59E0B] transition-colors" data-testid={`my-booking-${b.id.slice(0,8)}`}>
                <div className="grid md:grid-cols-12 gap-0">
                  <div className="md:col-span-3">
                    <CarVisual car={{ id: b.car_id, brand: b.car_name.split(" ")[0], model: b.car_name.split(" ").slice(1).join(" "), variant: "", segment: "SUV", fuel: "", image: "" }} className="aspect-[16/11]" showLabel={false} />
                  </div>
                  <div className="md:col-span-9 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Booking #{b.id.slice(0, 8).toUpperCase()}</div>
                        <div className="font-display text-2xl font-medium mt-1">{b.car_name}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#10B981]">
                        <CheckCircle2 size={12} /> {b.status.split("—")[0].trim()}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Dealer</div>
                        <div className="text-slate-200">{b.dealer}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">City</div>
                        <div className="text-slate-200">{b.city}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Preferred Date</div>
                        <div className="text-slate-200">{b.preferred_date || "Flexible"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Callback ETA</div>
                        <div className="text-slate-200 flex items-center gap-1"><Clock size={11} />{b.eta_call_minutes} min</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {b.test_drive && <Pill c="#10B981">Test Drive</Pill>}
                      {b.needs_loan && <Pill c="#F59E0B">Loan</Pill>}
                      {b.needs_insurance && <Pill c="#A78BFA">Insurance</Pill>}
                      {b.exchange_car && <Pill c="#22D3EE">Exchange</Pill>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

