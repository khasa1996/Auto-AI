import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, USER_TOKEN_KEY } from "../lib/api";
import { Phone, Loader2, Shield, ArrowRight } from "lucide-react";

export default function Login() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const nav = useNavigate();

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (phone.length < 10) { setError("Enter a valid 10-digit phone"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/auth/send-otp", { phone });
      setDemoOtp(data.demo_otp || "");
      setStep(2);
    } catch (e) {
      setError(e?.response?.status === 429 ? "Too many OTP requests. Try again later." : "Could not send OTP, please try again");
    }
    finally { setLoading(false); }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/auth/verify-otp", { phone, otp });
      localStorage.setItem(USER_TOKEN_KEY, data.token);
      localStorage.setItem("autoai_phone", data.phone);
      nav("/my-bookings");
    } catch (e) {
      setError(e?.response?.status === 429 ? "Too many attempts. Request a new OTP later." : "Invalid or expired OTP");
    }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#050505] min-h-screen flex items-center justify-center px-6" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={16} className="text-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B] font-bold font-mono">{'/// secure login'}/span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tighter font-light uppercase">
          Track your <span className="text-[#F59E0B]">bookings.</span>
        </h1>
        <p className="text-slate-400 mt-3">Phone OTP. No passwords. No spam.</p>

        <div className="mt-10 border border-[#262626] bg-[#0A0A0A] p-8">
          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-5" data-testid="otp-phone-form">
              <label className="block">
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-2">Your Phone</div>
                <div className="flex items-center gap-2 ai-input px-3 py-3">
                  <Phone size={14} className="text-slate-500" />
                  <span className="text-slate-400">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="9XXXX XXXXX"
                    data-testid="login-phone-input"
                    className="flex-1 bg-transparent outline-none text-white"
                  />
                </div>
              </label>
              {error && <div className="text-xs text-[#EF4444]" data-testid="login-error">{error}</div>}
              <button
                disabled={loading}
                data-testid="login-send-otp-btn"
                className="w-full bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-[0.25em] py-3.5 disabled:opacity-50 hover:bg-[#D97706] flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" />Sending</> : <>Send OTP <ArrowRight size={14} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5" data-testid="otp-verify-form">
              <label className="block">
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-2">Enter 6-digit OTP</div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                  data-testid="login-otp-input"
                  className="w-full ai-input px-3 py-3 tracking-[0.3em] text-lg text-center font-mono"
                />
              </label>
              {demoOtp && (
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] font-mono bg-[#F59E0B]/5 border border-[#F59E0B]/30 px-3 py-2">
                  Demo OTP (dev mode): <strong>{demoOtp}</strong>
                </div>
              )}
              {error && <div className="text-xs text-[#EF4444]">{error}</div>}
              <button
                disabled={loading || otp.length !== 6}
                data-testid="login-verify-btn"
                className="w-full bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-[0.25em] py-3.5 disabled:opacity-50 hover:bg-[#D97706]"
              >
                {loading ? "Verifying" : "Verify & Continue →"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-slate-400 hover:text-[#F59E0B] uppercase tracking-[0.2em]">
                ← Use a different phone
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/dealer" className="hover:text-[#F59E0B] uppercase tracking-[0.2em]" data-testid="dealer-login-link">
            Dealer? Access command center →
          </Link>
        </div>
      </div>
    </div>
  );
}
