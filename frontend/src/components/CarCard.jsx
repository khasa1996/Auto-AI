import { formatINR } from "../lib/api";
import { Shield, Fuel, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";

export default function CarCard({ car }) {
  const { t } = useI18n();
  return (
    <div
      data-testid={`car-card-${car.id}`}
      className="group relative border border-[#262626] bg-[#0D0D0D] hover:border-[#F59E0B] hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      <div className="aspect-[16/10] overflow-hidden bg-black">
        <img
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800")}
        />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{car.brand}</div>
            <div className="font-display text-xl font-medium text-white mt-1">{car.model}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Ex-showroom</div>
            <div className="font-display text-lg text-[#F59E0B]">{formatINR(car.price_ex_showroom)}</div>
          </div>
        </div>

        <div className="text-xs text-slate-400 mb-4">{car.variant} · {car.segment}</div>

        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#1a1a1a]">
          <Stat icon={<Fuel size={12} />} label={car.fuel === "Electric" ? "km" : "kmpl"} value={car.mileage_kmpl} />
          <Stat icon={<Shield size={12} />} label="safety" value={`${car.safety_rating}★`} />
          <Stat icon={<Users size={12} />} label="seats" value={car.seats} />
          <Stat icon={<Clock size={12} />} label="wait wk" value={car.waiting_weeks} />
        </div>

        <Link
          to={`/book/${car.id}`}
          data-testid={`book-btn-${car.id}`}
          className="mt-4 border border-[#F59E0B] text-[#F59E0B] text-center text-xs uppercase tracking-[0.25em] font-bold py-2.5 hover:bg-[#F59E0B] hover:text-black transition-colors"
        >
          {t("book_now")} →
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-500">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white mt-0.5 font-mono">{value}</div>
    </div>
  );
}
