import { Link, NavLink } from "react-router-dom";
import { Menu, X, Zap, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "../lib/i18n";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", key: "nav_home" },
    { to: "/compare", key: "nav_compare" },
    { to: "/recommend", key: "nav_recommend" },
    { to: "/cars", key: "nav_cars" },
    { to: "/emi", key: "nav_emi" },
    { to: "/news", key: "nav_news" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-strong border-b border-white/10 shadow-[0_4px_40px_-20px_rgba(0,0,0,0.8)]"
          : "glass border-b border-white/5"
      }`}
      data-testid="site-navbar"
    >
      {/* animated top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/60 to-transparent" />

      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative w-9 h-9 bg-gradient-to-br from-[#F59E0B] to-[#C5832B] flex items-center justify-center amber-glow"
          >
            <Zap size={16} strokeWidth={3} className="text-black relative z-[1]" />
            <div className="absolute inset-0 bg-[#F59E0B]/30 blur-md -z-[0]" />
          </motion.div>
          <div className="font-display uppercase tracking-[0.18em] text-sm font-semibold">
            Auto<span className="text-[#F59E0B]">·</span>AI
            <span className="ml-1.5 text-[10px] tracking-[0.3em] text-slate-400 font-mono">IN</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5 relative">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.key.replace("nav_", "")}`}
              className={({ isActive }) =>
                `relative px-3.5 py-2 text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors ${
                  isActive ? "text-[#F59E0B]" : "text-slate-300 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {t(l.key)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-2 right-2 -bottom-px h-px bg-[#F59E0B]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          <LanguageToggle />
          <Link
            to="/login"
            data-testid="nav-login"
            className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-300 border border-white/15 px-4 py-2 hover:border-[#F59E0B]/50 hover:text-[#F59E0B] transition-all"
          >
            Login
          </Link>
          <Link
            to="/premium"
            data-testid="nav-premium"
            className="group flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold text-[#F59E0B] border border-[#F59E0B]/40 px-4 py-2 hover:bg-[#F59E0B]/10 transition-all"
          >
            <Crown size={12} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />{" "}
            Premium
          </Link>
          <Link
            to="/compare"
            data-testid="cta-compare-top"
            className="btn-shine bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black text-[11px] uppercase tracking-[0.22em] font-bold px-5 py-2.5 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.6)] transition-all"
          >
            {t("cta_true_verdict")}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white flex items-center gap-3 z-[60]"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="lg:hidden absolute top-3.5 right-16">
        <LanguageToggle compact />
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl overflow-hidden"
            data-testid="nav-mobile-menu"
          >
            {links.map((l, i) => (
              <motion.div
                key={l.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-6 py-3.5 text-sm uppercase tracking-[0.22em] border-b border-white/5 font-semibold ${
                      isActive ? "text-[#F59E0B] bg-[#F59E0B]/5" : "text-slate-300"
                    }`
                  }
                >
                  {t(l.key)}
                </NavLink>
              </motion.div>
            ))}
            <div className="p-4 flex gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex-1 text-center text-[11px] uppercase tracking-[0.22em] text-slate-300 border border-white/15 py-3"
              >
                Login
              </Link>
              <Link
                to="/premium"
                onClick={() => setOpen(false)}
                className="flex-1 text-center text-[11px] uppercase tracking-[0.22em] font-bold bg-[#F59E0B] text-black py-3"
              >
                Premium
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
