export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-4 gap-8">
        <div>
          <div className="font-display uppercase tracking-[0.2em] text-sm font-semibold mb-3">
            Auto<span className="text-[#F59E0B]">·</span>AI India
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            100% Unbiased. 0% Promotion. The AI-first car buying companion for India.
          </p>
          <a href="/about" className="inline-block mt-4 text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] hover:underline" data-testid="footer-founder-link">
            Founder: Abhishek →
          </a>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3 font-bold">Product</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><a href="/compare" className="hover:text-[#F59E0B]">AI Compare</a></li>
            <li><a href="/recommend" className="hover:text-[#F59E0B]">AI Recommend</a></li>
            <li><a href="/emi" className="hover:text-[#F59E0B]">EMI Studio</a></li>
            <li><a href="/cars" className="hover:text-[#F59E0B]">Zero-Wait Tracker</a></li>
            <li><a href="/premium" className="hover:text-[#F59E0B]">Premium</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3 font-bold">Company</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><a href="/about" className="hover:text-[#F59E0B]">About / Founder</a></li>
            <li>Unbiased Pledge</li>
            <li><a href="/dealers/apply" className="hover:text-[#F59E0B]">Dealer Partners</a></li>
            <li><a href="/dealer" className="hover:text-[#F59E0B]">Dealer Login</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3 font-bold">India HQ</h4>
          <p className="text-sm text-slate-300">Abhishek · Founder</p>
          <p className="text-xs text-slate-500 mt-2">हिंदी · English · தமிழ் · తెలుగు · मराठी · ಕನ್ನಡ</p>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
        © 2026 Auto-AI India. Built on trust, powered by transparent AI.
      </div>
    </footer>
  );
}
