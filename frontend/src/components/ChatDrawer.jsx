import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Trash2, ChevronDown, Cpu, Zap, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { SpeakButton, getVoicePref, setVoicePref } from "../lib/tts";

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

  // AI model picker
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState(() => localStorage.getItem("autoai_chat_model") || "claude");
  const [showPicker, setShowPicker] = useState(false);

  // Voice picker (ElevenLabs TTS)
  const [voice, setVoice] = useState(() => getVoicePref());
  const changeVoice = (v) => { setVoice(v); setVoicePref(v); };

  useEffect(() => {
    api.get("/ai/models").then((r) => setModels(r.data.models || [])).catch(() => {});
  }, []);

  const activeModel = models.find((m) => m.id === modelId) || { label: "AI", family: "" };

  const pickModel = (id) => {
    setModelId(id);
    localStorage.setItem("autoai_chat_model", id);
    setShowPicker(false);
    // Fresh session per model to keep chat history clean
    setSessionId(`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setMessages([{ role: "assistant", content: greetings[lang] || greetings.en }]);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, open]);

  // Update greeting on language change (only if conversation hasn't started)
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === "assistant" ? [{ role: "assistant", content: greetings[lang] || greetings.en }] : m));
  }, [lang]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { session_id: sessionId, message: msg, language: langName, model: modelId });
      setMessages((m) => [...m, { role: "assistant", content: data.reply, model: data.model }]);
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
      {/* Floating orb FAB */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        data-testid="chat-open-btn"
        className="fixed bottom-6 right-6 z-[60] group"
      >
        <div className="relative">
          {/* glowing orb */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#C5832B] breathe flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent_50%)]" />
            <Sparkles size={22} strokeWidth={2.5} className="text-black relative z-[1]" />
          </div>
          {/* text tooltip */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 glass-strong border border-white/10 px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none">
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#F59E0B]">{t("ask_ai")}</span>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="chat-drawer">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg h-full glass-strong border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
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

            {/* Model picker bar */}
            <div className="relative px-5 py-2.5 border-b border-white/10 bg-black/40">
              <button
                onClick={() => setShowPicker((v) => !v)}
                data-testid="chat-model-picker"
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center border border-[#F59E0B]/30 bg-[#F59E0B]/5">
                    <Cpu size={13} className="text-[#F59E0B]" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.28em] text-slate-500 font-mono">Active AI</div>
                    <div className="text-xs text-white font-semibold flex items-center gap-1.5">
                      {activeModel.label}
                      <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500">· {activeModel.family}</span>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 group-hover:text-[#F59E0B] transition-transform ${showPicker ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-5 right-5 top-full mt-1 glass-strong border border-white/15 z-[10] shadow-2xl"
                    data-testid="chat-model-dropdown"
                  >
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => pickModel(m.id)}
                        data-testid={`chat-model-option-${m.id}`}
                        className={`w-full flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-[#F59E0B]/10 transition-colors text-left ${
                          modelId === m.id ? "bg-[#F59E0B]/8" : ""
                        }`}
                      >
                        <div>
                          <div className="text-sm text-white font-semibold flex items-center gap-2">
                            {m.label}
                            {modelId === m.id && (
                              <span className="text-[9px] uppercase tracking-[0.2em] text-[#F59E0B] font-mono">Active</span>
                            )}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-0.5 font-mono">
                            {m.family} · {m.strength}
                          </div>
                        </div>
                        {m.id.startsWith("gemini") ? (
                          <Zap size={12} className="text-[#F59E0B] flex-shrink-0" />
                        ) : (
                          <Sparkles size={12} className="text-[#F59E0B] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 font-mono text-sm" data-testid="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "assistant" ? "chat-ai-msg text-slate-200" : "chat-user-msg ml-8 text-white"}>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1 flex items-center gap-2">
                    <span>{m.role === "assistant" ? "AI" : "You"}</span>
                    {m.role === "assistant" && m.model && (
                      <span className="text-[9px] tracking-[0.15em] text-[#F59E0B] font-mono normal-case">· {m.model}</span>
                    )}
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
                className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black px-4 disabled:opacity-50 hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.6)] transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
