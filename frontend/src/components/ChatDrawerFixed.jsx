import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Cpu, Send, Sparkles, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, USER_TOKEN_KEY } from "../lib/api";
import { useI18n } from "../lib/i18n";

const QUICK_PROMPTS = {
  en: [
    "Creta vs Seltos — which is safer?",
    "Best car under ₹10 lakh for city",
    "Why is Thar waiting so long?",
    "Hybrid or EV in 2026?",
  ],
  hi: [
    "Creta और Seltos में कौन सुरक्षित है?",
    "₹10 लाख में शहर के लिए बेस्ट कार",
    "Thar का वेटिंग इतना क्यों?",
    "2026 में hybrid या EV?",
  ],
  ta: [
    "Creta vs Seltos — எது பாதுகாப்பானது?",
    "₹10 லட்சத்துக்குள் சிறந்த கார்",
    "Thar காத்திருப்பு ஏன்?",
    "Hybrid அல்லது EV?",
  ],
  te: [
    "Creta vs Seltos — ఏది సురక్షితం?",
    "₹10 లక్షలలో మెరుగైన కారు",
    "Thar వెయిటింగ్ ఎందుకు?",
    "Hybrid లేదా EV?",
  ],
  mr: [
    "Creta vs Seltos — कोण सुरक्षित?",
    "₹10 लाखात सर्वोत्तम गाडी",
    "Thar चे वेटिंग का?",
    "Hybrid की EV?",
  ],
  kn: [
    "Creta vs Seltos — ಯಾವುದು ಸುರಕ್ಷಿತ?",
    "₹10 ಲಕ್ಷದೊಳಗೆ ಉತ್ತಮ ಕారు",
    "Thar ಕಾಯುವಿಕೆ ಏಕೆ?",
    "Hybrid ಅಥವಾ EV?",
  ],
  bn: [
    "Creta vs Seltos — কোনটি নিরাপদ?",
    "₹10 লাখে সেরা গাড়ি",
    "Thar-এর অপেক্ষা কেন?",
    "Hybrid না EV?",
  ],
  gu: [
    "Creta vs Seltos — કયું સુરક્ષિત?",
    "₹10 લાખમાં શ્રેષ્ઠ કાર",
    "Thar નું વેઇટિંગ કેમ?",
    "Hybrid કે EV?",
  ],
};

const GREETINGS = {
  en: "Namaste! I'm your 24×7 unbiased Auto-AI expert. Ask me anything about Indian cars — comparisons, waiting periods, EMI, safety, or which car fits your needs.",
  hi: "नमस्ते! मैं आपका 24×7 निष्पक्ष Auto-AI विशेषज्ञ हूँ। भारतीय कारों के बारे में कुछ भी पूछें।",
  ta: "வணக்கம்! நான் உங்கள் 24×7 பாரபட்சமற்ற Auto-AI நிபுணர். இந்திய கார்கள் பற்றி எதையும் கேளுங்கள்.",
  te: "నమస్తే! నేను మీ 24×7 నిష్పక్షపాత Auto-AI నిపుణుడు. భారతీయ కార్ల గురించి అడగండి.",
  mr: "नमस्कार! मी तुमचा 24×7 निष्पक्ष Auto-AI तज्ञ. भारतीय गाड्यांबद्दल काहीही विचारा.",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ 24×7 ನಿಷ್ಪಕ್ಷ Auto-AI ತಜ್ಞ.",
  bn: "নমস্কার! আমি আপনার 24×7 নিরপেক্ষ Auto-AI বিশেষজ্ঞ।",
  gu: "નમસ્તે! હું તમારો 24×7 નિષ્પક્ષ Auto-AI નિષ્ણાત છું.",
};

function newSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ChatDrawerFixed() {
  const { t, lang, langName } = useI18n();
  const navigate = useNavigate();
  const greeting = GREETINGS[lang] || GREETINGS.en;
  const prompts = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en;
  const scrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState(() => localStorage.getItem("autoai_chat_model") || "claude");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/ai/models")
      .then((response) => {
        if (!cancelled) setModels(response.data?.models || []);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0].role === "assistant"
        ? [{ role: "assistant", content: greeting }]
        : current,
    );
  }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const activeModel = useMemo(
    () => models.find((model) => model.id === modelId) || { label: "AI", family: "" },
    [models, modelId],
  );

  const resetConversation = () => {
    setMessages([{ role: "assistant", content: greeting }]);
    setSessionId(newSessionId());
  };

  const selectModel = (id) => {
    setModelId(id);
    localStorage.setItem("autoai_chat_model", id);
    setShowPicker(false);
    resetConversation();
  };

  const send = async (value) => {
    const message = (value ?? input).trim();
    if (!message || busy) return;

    if (!localStorage.getItem(USER_TOKEN_KEY)) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Please sign in to use Auto-AI chat. Your conversation is private to your account.",
          action: "login",
        },
      ]);
      setInput("");
      return;
    }

    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setBusy(true);

    try {
      const { data } = await api.post("/ai/chat", {
        session_id: sessionId,
        message,
        language: langName,
        model: modelId,
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply, model: data.model },
      ]);
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem(USER_TOKEN_KEY);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: "Your session expired. Please sign in again to continue.",
            action: "login",
          },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: "Sorry, the AI service is temporarily unavailable. Please try again." },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        data-testid="chat-open-btn"
        aria-label={t("ask_ai")}
        className="fixed bottom-6 right-6 z-[60] group"
      >
        <div className="relative">
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#C5832B] breathe flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent_50%)]" />
            <Sparkles size={22} strokeWidth={2.5} className="text-black relative z-[1]" />
          </div>
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

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg h-full glass-strong border-l border-white/10 flex flex-col"
              aria-label="Auto-AI assistant"
            >
              <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full pulse-amber" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">24×7 Auto-AI · {langName}</div>
                    <div className="font-display font-medium">Unbiased Expert</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetConversation} data-testid="chat-clear-btn" title="Clear conversation" className="text-slate-400 hover:text-[#F59E0B] p-1">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setOpen(false)} data-testid="chat-close-btn" aria-label="Close chat" className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>
              </header>

              <div className="relative px-5 py-2.5 border-b border-white/10 bg-black/40">
                <button
                  onClick={() => setShowPicker((value) => !value)}
                  data-testid="chat-model-picker"
                  className="w-full flex items-center justify-between text-left group"
                  aria-expanded={showPicker}
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
                  <ChevronDown size={14} className={`text-slate-400 group-hover:text-[#F59E0B] transition-transform ${showPicker ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showPicker && models.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-5 right-5 top-full mt-1 z-20 glass-strong border border-white/10 p-2"
                    >
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => selectModel(model.id)}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between"
                        >
                          <span className="text-xs text-white">{model.label}</span>
                          <span className="text-[9px] text-slate-500 uppercase">{model.family}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4" data-testid="chat-messages">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className={message.role === "user" ? "max-w-[85%] bg-[#F59E0B] text-black px-4 py-3 text-sm" : "max-w-[90%] bg-white/5 border border-white/10 text-slate-200 px-4 py-3 text-sm leading-relaxed"}>
                      {message.content}
                      {message.action === "login" && (
                        <button onClick={() => navigate("/login")} className="mt-3 block text-[10px] uppercase tracking-[0.2em] font-bold text-[#F59E0B] hover:underline">
                          Sign in
                        </button>
                      )}
                      {message.model && <div className="mt-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">{message.model}</div>}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 px-4 py-3 text-xs text-slate-400">Thinking…</div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-white/10">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {prompts.map((prompt) => (
                    <button key={prompt} onClick={() => send(prompt)} disabled={busy} className="shrink-0 text-[10px] text-slate-300 border border-white/10 px-3 py-2 hover:border-[#F59E0B]/50 hover:text-[#F59E0B] disabled:opacity-50">
                      {prompt}
                    </button>
                  ))}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about any Indian car…"
                    disabled={busy}
                    className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#F59E0B]/60"
                    aria-label="Ask Auto-AI"
                  />
                  <button type="submit" disabled={busy || !input.trim()} className="w-11 h-11 shrink-0 bg-[#F59E0B] text-black flex items-center justify-center disabled:opacity-40" aria-label="Send message">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
