import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 mt-24 overflow-hidden" data-testid="site-footer">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#F59E0B]/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5 group mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-[#F59E0B] to-[#C5832B] flex items-center justify-center amber-glow">
              <Zap size={16} strokeWidth={3} className="text-black" />
            </div>
            <div className="font-display uppercase tracking-[0.18em] text-sm font-semibold">
              Auto<span className="text-[#F59E0B]">·</span>AI
              <span className="ml-1.5 text-[10px] tracking-[0.3em] text-slate-400 font-mono">IN</span>
            </div>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            100% Unbiased. 0% Promotion. India's first AI-first car buying companion built on trust, powered by transparent data.
          </p>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] mb-4 font-bold font-mono">Product</h4>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/compare" className="hover:text-[#F59E0B] transition-colors">AI Compare</Link></li>
            <li><Link to="/recommend" className="hover:text-[#F59E0B] transition-colors">AI Recommend</Link></li>
            <li><Link to="/emi" className="hover:text-[#F59E0B] transition-colors">EMI Studio</Link></li>
            <li><Link to="/cars" className="hover:text-[#F59E0B] transition-colors">Zero-Wait Tracker</Link></li>
            <li><Link to="/premium" className="hover:text-[#F59E0B] transition-colors">Premium</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] mb-4 font-bold font-mono">Company</h4>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/about" className="hover:text-[#F59E0B] transition-colors" data-testid="footer-founder-link">About / Founder</Link></li>
            <li><span className="text-slate-400">Unbiased Pledge</span></li>
            <li><Link to="/dealers/apply" className="hover:text-[#F59E0B] transition-colors">Dealer Partners</Link></li>
            <li><Link to="/dealer" className="hover:text-[#F59E0B] transition-colors">Dealer Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] mb-4 font-bold font-mono">India HQ</h4>
          <p className="text-sm text-slate-300">Abhishek · Founder</p>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            हिंदी · English · தமிழ் · తెలుగు · मराठी · ಕನ್ನಡ · বাংলা · ગુજરાતી
          </p>
        </div>
      </div>

      <div className="relative border-t border-white/5 py-5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            © 2026 Auto-AI India. Built on trust, powered by transparent AI.
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-mono">
            Made in <span className="text-[#F59E0B]">Bharat</span> 🇮🇳
          </div>
        </div>
      </div>
    </footer>
  );
}
