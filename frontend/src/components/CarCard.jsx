import { formatINR } from "../lib/api";
import { Shield, Fuel, Clock, Users, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "../lib/i18n";
import CarVisual from "./CarVisual";

export default function CarCard({ car }) {
  const { t } = useI18n();
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      data-testid={`car-card-${car.id}`}
      className="group relative border border-white/10 bg-[#0A0A0A] hover:border-[#F59E0B]/60 transition-colors duration-500 flex flex-col overflow-hidden corner-notch"
    >
      {/* glow on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#F59E0B]/15 blur-3xl rounded-full" />
      </div>

      {/* car image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0A0A0A]">
        <CarVisual car={car} className="w-full h-full group-hover:scale-[1.06] transition-transform duration-700 ease-out" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent pointer-events-none" />

        {/* floating segment tag */}
        <div className="absolute top-3 left-3 glass border border-white/15 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-200">
          {car.segment}
        </div>

        {/* price chip */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-[#F59E0B]/30 px-3 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-mono">Ex-showroom</div>
          <div className="font-num text-xl text-[#F59E0B] leading-none mt-0.5">{formatINR(car.price_ex_showroom)}</div>
        </div>
      </div>

      <div className="relative p-5 flex flex-col flex-1 z-[1]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">{car.brand}</div>
            <div className="font-display text-xl font-medium text-white mt-1 leading-tight">{car.model}</div>
            <div className="text-xs text-slate-400 mt-1">{car.variant}</div>
          </div>
          <div className="w-8 h-8 border border-white/10 group-hover:border-[#F59E0B]/60 group-hover:text-[#F59E0B] flex items-center justify-center text-slate-400 transition-all">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5">
          <Stat icon={<Fuel size={12} />} label={car.fuel === "Electric" ? "km" : "kmpl"} value={car.mileage_kmpl} />
          <Stat icon={<Shield size={12} />} label="safety" value={`${car.safety_rating}★`} />
          <Stat icon={<Users size={12} />} label="seats" value={car.seats} />
          <Stat icon={<Clock size={12} />} label="wait wk" value={car.waiting_weeks} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            to={`/showroom/${car.id}`}
            data-testid={`showroom-btn-${car.id}`}
            className="border border-white/15 text-center text-[10px] uppercase tracking-[0.2em] font-bold py-2.5 text-slate-300 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
          >
            360° Explore
          </Link>
          <Link
            to={`/book/${car.id}`}
            data-testid={`book-btn-${car.id}`}
            className="btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black text-center text-[10px] uppercase tracking-[0.25em] font-bold py-2.5 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.6)] transition-all"
          >
            {t("book_now")} →
          </Link>
        </div>
      </div>
    </motion.div>
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
