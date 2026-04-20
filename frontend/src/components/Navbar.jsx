import { Link, NavLink } from "react-router-dom";
import { Menu, Zap } from "lucide-react";
import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "../lib/i18n";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const links = [
    { to: "/", key: "nav_home" },
    { to: "/compare", key: "nav_compare" },
    { to: "/recommend", key: "nav_recommend" },
    { to: "/cars", key: "nav_cars" },
    { to: "/emi", key: "nav_emi" },
    { to: "/news", key: "nav_news" },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10" data-testid="site-navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-8 h-8 bg-[#F59E0B] flex items-center justify-center">
            <Zap size={16} strokeWidth={2.5} className="text-black" />
          </div>
          <div className="font-display uppercase tracking-[0.2em] text-sm font-semibold">
            Auto<span className="text-[#F59E0B]">·</span>AI India
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.key.replace("nav_", "")}`}
              className={({ isActive }) =>
                `px-3 py-2 text-xs uppercase tracking-[0.2em] font-semibold transition-colors ${
                  isActive ? "text-[#F59E0B]" : "text-slate-400 hover:text-white"
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageToggle />
          <Link
            to="/login"
            data-testid="nav-login"
            className="text-xs uppercase tracking-[0.2em] text-slate-300 border border-white/10 px-4 py-2 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
          >
            Login
          </Link>
          <Link
            to="/premium"
            data-testid="nav-premium"
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#F59E0B] border border-[#F59E0B]/40 px-4 py-2 hover:bg-[#F59E0B]/10 transition-colors"
          >
            <Zap size={12} strokeWidth={2.5} /> Premium
          </Link>
          <Link
            to="/compare"
            data-testid="cta-compare-top"
            className="bg-[#F59E0B] text-black text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:bg-[#D97706] transition-colors"
          >
            {t("cta_true_verdict")}
          </Link>
        </div>

        <button
          className="lg:hidden text-white flex items-center gap-3"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="lg:hidden absolute top-3 right-16">
        <LanguageToggle compact />
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#050505]" data-testid="nav-mobile-menu">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm uppercase tracking-[0.2em] border-b border-white/5 ${
                  isActive ? "text-[#F59E0B]" : "text-slate-300"
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
