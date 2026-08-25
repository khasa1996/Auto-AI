import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatINR, createIdempotencyKey } from "../lib/api";
import { Check, ChevronLeft, Loader2, Phone, CheckCircle2 } from "lucide-react";
import { useI18n } from "../lib/i18n";
import CarVisual from "../components/CarVisual";

const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh"];

export default function BookCar() {
  const bookingIdempotencyKey = useRef(createIdempotencyKey()).current;
  const { carId } = useParams();
  const [car, setCar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Mumbai",
    preferred_date: "",
    test_drive: true,
    needs_loan: false,
    needs_insurance: false,
    exchange_car: "",
    notes: "",
  });

  useEffect(() => {
    api.get(`/cars/${carId}`).then((r) => setCar(r.data)).catch(() => setCar(null));
  }, [carId]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.city) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        car_id: carId,
        idempotency_key: bookingIdempotencyKey,
        ...form,
      });
      setBooking(data);
    } finally {
      setSubmitting(false);
    }
  };

  if (!car) {
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center text-slate-400">
        Loading car details…
      </div>
    );
  }

  if (booking) {
    return (
      <div className="bg-[#050505] min-h-screen" data-testid="booking-success-page">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-20">
          <div className="border border-[#10B981] bg-[#0A0A0A] p-10 relative" style={{ boxShadow: "0 0 40px rgba(16,185,129,0.15)" }}>
            <CheckCircle2 size={48} className="text-[#10B981] mb-6" />
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#10B981] font-mono mb-2">Booking Confirmed</div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light">
              Your <span className="text-[#F59E0B]">{booking.car_name}</span> is on its way.
            </h1>
            <p className="text-slate-300 mt-4 text-lg">{booking.status}</p>

            <div className="mt-8 grid md:grid-cols-2 gap-5 border-t border-[#262626] pt-8">
              <Info label="Dealer Partner" value={booking.dealer} />
              <Info label="Your City" value={booking.city} />
              <Info label="Customer" value={`${booking.name} · ${booking.phone}`} />
              <Info label="Booking ID" value={booking.id.slice(0, 8).toUpperCase()} mono />
              <Info label="Test Drive" value={booking.test_drive ? "Yes" : "No"} />
              <Info label="Loan Required" value={booking.needs_loan ? "Yes" : "No"} />
              <Info label="Insurance" value={booking.needs_insurance ? "Yes" : "No"} />
              <Info label="Preferred Date" value={booking.preferred_date || "Flexible"} />
            </div>

            <div className="mt-8 border-l-2 border-[#F59E0B] pl-4 bg-[#F59E0B]/5 py-3">
              <div className="flex items-center gap-2 text-[#F59E0B] font-semibold text-sm">
                <Phone size={14} /> Dealer will call you in ~{booking.eta_call_minutes} minutes
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Zero-wait guarantee. No paid placements. The dealer rep calls you — not the other way around.
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Link to="/cars" className="border border-white/20 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/5" data-testid="booking-back-to-cars">
                ← Back to all cars
              </Link>
              <Link to="/" className="bg-[#F59E0B] text-black px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#D97706]">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="book-car-page">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <Link to="/cars" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-[#F59E0B] flex items-center gap-1 mb-6" data-testid="book-back-link">
          <ChevronLeft size={14} /> back
        </Link>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Car card */}
          <div className="lg:col-span-5">
            <div className="border border-[#262626] bg-[#0D0D0D] overflow-hidden sticky top-24">
              <CarVisual car={car} className="aspect-[16/9]" />
              <div className="p-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{car.brand}</div>
                <div className="font-display text-3xl font-medium mt-1">{car.model}</div>
                <div className="text-sm text-slate-400 mt-1">{car.variant} · {car.segment}</div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#262626] pt-5">
                  <Spec label="Ex-showroom" value={formatINR(car.price_ex_showroom)} highlight />
                  <Spec label="On-road" value={formatINR(car.price_on_road)} />
                  <Spec label="Waiting" value={`${car.waiting_weeks} wk`} />
                  <Spec label="Safety" value={`${car.safety_rating}★`} />
                  <Spec label={car.fuel === "Electric" ? "Range km" : "Mileage"} value={`${car.mileage_kmpl}${car.fuel === "Electric" ? "" : " kmpl"}`} />
                  <Spec label="Seats" value={car.seats} />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-px bg-[#F59E0B]" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">{'/// dealer booking'}</span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light uppercase">
              Book your <span className="text-[#F59E0B]">zero-wait</span> test drive
            </h1>
            <p className="text-slate-400 mt-3 max-w-xl">No commissions hidden in your invoice. No dealer markup. Our partner will call you within 15 minutes.</p>

            <form onSubmit={submit} className="mt-8 space-y-5 border border-[#262626] bg-[#0A0A0A] p-8">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Full Name *">
                  <input required value={form.name} onChange={(e) => update("name", e.target.value)} data-testid="book-name-input" className="w-full ai-input px-3 py-2.5" />
                </Field>
                <Field label="Phone *">
                  <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9XXXX XXXXX" data-testid="book-phone-input" className="w-full ai-input px-3 py-2.5" />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} data-testid="book-email-input" className="w-full ai-input px-3 py-2.5" />
                </Field>
                <Field label="City *">
                  <select value={form.city} onChange={(e) => update("city", e.target.value)} data-testid="book-city-select" className="w-full ai-input px-3 py-2.5">
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Preferred Date">
                  <input type="date" value={form.preferred_date} onChange={(e) => update("preferred_date", e.target.value)} data-testid="book-date-input" className="w-full ai-input px-3 py-2.5" />
                </Field>
                <Field label="Exchange Car (optional)">
                  <input value={form.exchange_car} onChange={(e) => update("exchange_car", e.target.value)} placeholder="e.g. 2015 Swift VXI" data-testid="book-exchange-input" className="w-full ai-input px-3 py-2.5" />
                </Field>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#262626]">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-3">Services needed</div>
                <Checkbox checked={form.test_drive} onChange={(v) => update("test_drive", v)} label="Request test drive" tid="book-testdrive" />
                <Checkbox checked={form.needs_loan} onChange={(v) => update("needs_loan", v)} label="I need a car loan / EMI" tid="book-loan" />
                <Checkbox checked={form.needs_insurance} onChange={(v) => update("needs_insurance", v)} label="I need insurance quote" tid="book-insurance" />
              </div>

              <Field label="Anything else?">
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} data-testid="book-notes-input" className="w-full ai-input px-3 py-2.5 resize-none" />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                data-testid="book-submit-btn"
                className="w-full bg-[#F59E0B] text-black font-semibold text-xs uppercase tracking-[0.25em] px-7 py-4 disabled:opacity-50 hover:bg-[#D97706] flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" />Confirming</> : <>Confirm Zero-Wait Booking →</>}
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] text-center">
                By submitting you agree to be contacted by our dealer partner. No spam. No bias.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">{label}</div>
      <div className={`mt-1 text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Spec({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`text-base font-display mt-0.5 ${highlight ? "text-[#F59E0B]" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-2">{label}</div>
      {children}
    </label>
  );
}

function Checkbox({ checked, onChange, label, tid }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div
        onClick={() => onChange(!checked)}
        data-testid={tid}
        className={`w-5 h-5 border flex items-center justify-center transition-colors ${checked ? "bg-[#F59E0B] border-[#F59E0B]" : "border-[#262626] bg-[#0A0A0A]"}`}
      >
        {checked && <Check size={14} className="text-black" strokeWidth={3} />}
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}
