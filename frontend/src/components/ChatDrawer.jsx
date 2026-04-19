import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Trash2, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { useI18n, LANGUAGES } from "../lib/i18n";

const QUICK_PROMPTS = {
  en: ["Creta vs Seltos — which is safer?", "Best car under ₹10 lakh for city", "Why is Thar waiting so long?", "Hybrid or EV in 2026?"],
  hi: ["Creta और Seltos में कौन सुरक्षित है?", "₹10 लाख में शहर के लिए बेस्ट कार", "Thar का वेटिंग इतना क्यों?", "2026 में hybrid या EV?"],
  ta: ["Creta vs Seltos — எது பாதுகாப்பானது?", "₹10 லட்சத்துக்குள் சிறந்த கார்", "Thar காத்திருப்பு ஏன்?", "Hybrid அல்லது EV?"],
  te: ["Creta vs Seltos — ఏది సురక్షితం?", "₹10 లక్షలలో మెరుగైన కారు", "Thar వెయిటింగ్ ఎందుకు?", "Hybrid లేదా EV?"],
  mr: ["Creta vs Seltos — कोण सुरक्षित?", "₹10 लाखात सर्वोत्तम गाडी", "Thar चे वेटिंग का?", "Hybrid की EV?"],
  kn: ["Creta vs Seltos — ಯಾವುದು ಸುರಕ್ಷಿತ?", "₹10 ಲಕ್ಷದೊಳಗೆ ಉತ್ತಮ ಕಾರು", "Thar ಕಾಯುವಿಕೆ ಏಕೆ?", "Hybrid ಅಥವಾ EV?"],
  bn: ["Creta vs Seltos — কোনটি নিরাপদ?", "₹10 লাখে সেরা গাড়ি", "Thar-এর অপেক্ষা কেন?", "Hybrid না EV?"],
  gu: ["Creta vs Seltos — કયું સુરક્ષિત?", "₹10 લાખમાં શ્રેષ્ઠ કાર", "Thar નું વેઇટિંગ કેમ?", "Hybrid કે EV?"],
};

export default function ChatDrawer() {
  const { t, lang, langName } = useI18n();
  const greetings = {
    en: "Namaste! I'm your 24×7 unbiased Auto-AI expert. Ask me anything about Indian cars — comparisons, waiting periods, EMI, safety, or which car fits your needs.",
    hi: "नमस्ते! मैं आपका 24×7 निष्पक्ष Auto-AI विशेषज्ञ हूँ। भारतीय कारों के बारे में कुछ भी पूछें।",
    ta: "வணக்கம்! நான் உங்கள் 24×7 பாரபட்சமற்ற Auto-AI நிபுணர். இந்திய கார்கள் பற்றி எதையும் கேளுங்கள்.",
    te: "నమస్తే! నేను మీ 24×7 నిష్పక్షపాత Auto-AI నిపుణుడు. భారతీయ కార్ల గురించి అడగండి.",
    mr: "नमस्कार! मी तुमचा 24×7 निष्पक्ष Auto-AI तज्ञ. भारतीय गाड्यांबद्दल काहीही विचारा.",
    kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ 24×7 ನಿಷ್ಪಕ್ಷ Auto-AI ತಜ್ಞ.",
    bn: "নমস্কার! আমি আপনার 24×7 নিরপেক্ষ Auto-AI বিশেষজ্ঞ।",
    gu: "નમસ્તે! હું તમારો 24×7 નિષ્પક્ષ Auto-AI નિષ્ણાત છું.",
  };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: greetings[lang] || greetings.en }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, open]);

  // Update greeting on language change (only if conversation hasn't started)
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" ? [{ role: "assistant", content: greetings[lang] || greetings.en }] : m));
  }, [lang]); // eslint-disable-line

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { session_id: sessionId, message: msg, language: langName });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, my AI brain is offline. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setMessages([{ role: "assistant", content: greetings[lang] || greetings.en }]);
    setSessionId(`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  };

  const prompts = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="chat-open-btn"
        className="fixed bottom-6 right-6 z-40 bg-[#F59E0B] text-black px-5 py-3 flex items-center gap-2 font-semibold text-sm uppercase tracking-[0.15em] pulse-amber hover:bg-[#D97706] transition-colors"
      >
        <Sparkles size={16} strokeWidth={2.5} />
        {t("ask_ai")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="chat-drawer">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg h-full bg-black border-l border-[#262626] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10B981] rounded-full pulse-amber" />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">24×7 Auto-AI · {langName}</div>
                  <div className="font-display font-medium">Unbiased Expert</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clear}
                  data-testid="chat-clear-btn"
                  title="Clear conversation"
                  className="text-slate-400 hover:text-[#F59E0B] p-1"
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setOpen(false)} data-testid="chat-close-btn" className="text-slate-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 font-mono text-sm" data-testid="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "assistant" ? "chat-ai-msg text-slate-200" : "chat-user-msg ml-8 text-white"}>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    {m.role === "assistant" ? "AI" : "You"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {busy && (
                <div className="chat-ai-msg text-slate-400">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">AI</div>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#F59E0B] animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-[#F59E0B] animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 bg-[#F59E0B] animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 2 && (
              <div className="px-5 pb-3 space-y-1.5" data-testid="chat-quick-prompts">
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 flex items-center gap-1 mb-2">
                  <ChevronDown size={10} /> quick prompts
                </div>
                {prompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p)}
                    data-testid={`quick-prompt-${i}`}
                    className="block w-full text-left text-xs border border-[#262626] px-3 py-2 text-slate-300 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-[#262626] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={lang === "hi" ? "Swift vs Baleno, कौन सुरक्षित है?" : "Swift vs Baleno, which is safer?"}
                data-testid="chat-input"
                className="flex-1 ai-input px-3 py-2 text-sm"
              />
              <button
                onClick={() => send()}
                disabled={busy}
                data-testid="chat-send-btn"
                className="bg-[#F59E0B] text-black px-4 disabled:opacity-50 hover:bg-[#D97706]"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
