import { createContext, useContext, useState } from "react";
import { STORAGE_KEYS, getStored, setStored } from "./storage";

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
];

const DICT = {
  en: {
    nav_home: "Home", nav_compare: "Compare", nav_recommend: "Recommend", nav_cars: "Cars", nav_emi: "EMI", nav_news: "News",
    cta_true_verdict: "True Verdict →",
    hero_tag: "India's First Unbiased Car AI",
    hero_title_1: "The", hero_title_2: "True Verdict", hero_title_3: "on every car in India.",
    hero_sub: "Zero promotions. Zero human bias. Zero waiting. Just an AI engine analysing real data to tell you which car actually deserves your money — and which ones don't.",
    hero_cta_compare: "Start AI Comparison", hero_cta_recommend: "Find My Perfect Car",
    cars_indexed: "cars indexed", brand_bias: "brand bias", ai_expert: "AI expert",
    zero_wait_live: "Live · Zero-Wait Tracker", refresh_label: "refresh:",
    ask_ai: "Ask Auto-AI", book_now: "Book Now",
  },
  hi: {
    nav_home: "होम", nav_compare: "तुलना", nav_recommend: "सुझाव", nav_cars: "कारें", nav_emi: "ईएमआई", nav_news: "समाचार",
    cta_true_verdict: "असली फैसला →",
    hero_tag: "भारत का पहला निष्पक्ष कार AI",
    hero_title_1: "हर कार पर", hero_title_2: "असली फैसला", hero_title_3: "बिना किसी पक्षपात के।",
    hero_sub: "कोई प्रमोशन नहीं। कोई पक्षपात नहीं। कोई इंतज़ार नहीं। सिर्फ़ AI जो असली डेटा पर बताता है कि कौन सी कार आपके पैसे के लायक है।",
    hero_cta_compare: "AI तुलना शुरू करें", hero_cta_recommend: "मेरी कार खोजें",
    cars_indexed: "कारें सूचीबद्ध", brand_bias: "ब्रांड पक्षपात", ai_expert: "AI विशेषज्ञ",
    zero_wait_live: "लाइव · वेटिंग ट्रैकर", refresh_label: "अपडेट:",
    ask_ai: "Auto-AI से पूछें", book_now: "बुक करें",
  },
  ta: {
    nav_home: "முகப்பு", nav_compare: "ஒப்பிடு", nav_recommend: "பரிந்துரை", nav_cars: "கார்கள்", nav_emi: "EMI", nav_news: "செய்திகள்",
    cta_true_verdict: "உண்மையான தீர்ப்பு →",
    hero_tag: "இந்தியாவின் முதல் பாரபட்சமற்ற கார் AI",
    hero_title_1: "ஒவ்வொரு கார் மீதும்", hero_title_2: "உண்மையான தீர்ப்பு", hero_title_3: "இந்தியாவில்.",
    hero_sub: "விளம்பரம் இல்லை. பாரபட்சம் இல்லை. காத்திருப்பு இல்லை. உண்மையான தரவுகளை ஆராய்ந்து சொல்லும் AI.",
    hero_cta_compare: "AI ஒப்பீடு தொடங்கு", hero_cta_recommend: "எனது கார் கண்டுபிடி",
    cars_indexed: "கார்கள் பட்டியல்", brand_bias: "பிராண்ட் பாரபட்சம்", ai_expert: "AI நிபுணர்",
    zero_wait_live: "நேரடி · காத்திருப்பு டிராக்கர்", refresh_label: "புதுப்பிப்பு:",
    ask_ai: "Auto-AI-யிடம் கேள்", book_now: "புக் செய்",
  },
  te: {
    nav_home: "హోమ్", nav_compare: "పోల్చండి", nav_recommend: "సిఫార్సు", nav_cars: "కార్లు", nav_emi: "EMI", nav_news: "వార్తలు",
    cta_true_verdict: "నిజమైన తీర్పు →",
    hero_tag: "భారత్ యొక్క మొదటి నిష్పక్షపాత కార్ AI",
    hero_title_1: "ప్రతి కారుపై", hero_title_2: "నిజమైన తీర్పు", hero_title_3: "భారతదేశంలో.",
    hero_sub: "ప్రమోషన్లు లేవు. పక్షపాతం లేదు. వేచివుండటం లేదు. నిజమైన డేటాను విశ్లేషించే AI.",
    hero_cta_compare: "AI పోలిక ప్రారంభించండి", hero_cta_recommend: "నా కారును కనుగొనండి",
    cars_indexed: "కార్ల జాబితా", brand_bias: "బ్రాండ్ పక్షపాతం", ai_expert: "AI నిపుణుడు",
    zero_wait_live: "లైవ్ · వెయిటింగ్ ట్రాకర్", refresh_label: "రిఫ్రెష్:",
    ask_ai: "Auto-AI ని అడగండి", book_now: "బుక్ చేయండి",
  },
  mr: {
    nav_home: "मुख्यपृष्ठ", nav_compare: "तुलना", nav_recommend: "शिफारस", nav_cars: "गाड्या", nav_emi: "EMI", nav_news: "बातम्या",
    cta_true_verdict: "खरा निर्णय →",
    hero_tag: "भारताचा पहिला निष्पक्ष कार AI",
    hero_title_1: "प्रत्येक गाडीवर", hero_title_2: "खरा निर्णय", hero_title_3: "भारतात.",
    hero_sub: "कोणतीही जाहिरात नाही. पक्षपात नाही. प्रतीक्षा नाही. फक्त AI जो खऱ्या डेटाचे विश्लेषण करतो.",
    hero_cta_compare: "AI तुलना सुरू करा", hero_cta_recommend: "माझी गाडी शोधा",
    cars_indexed: "गाड्या सूचीबद्ध", brand_bias: "ब्रँड पक्षपात", ai_expert: "AI तज्ञ",
    zero_wait_live: "लाइव्ह · प्रतीक्षा ट्रॅकर", refresh_label: "रिफ्रेश:",
    ask_ai: "Auto-AI ला विचारा", book_now: "बुक करा",
  },
  kn: {
    nav_home: "ಮುಖಪುಟ", nav_compare: "ಹೋಲಿಸಿ", nav_recommend: "ಶಿಫಾರಸು", nav_cars: "ಕಾರುಗಳು", nav_emi: "EMI", nav_news: "ಸುದ್ದಿ",
    cta_true_verdict: "ನಿಜವಾದ ತೀರ್ಪು →",
    hero_tag: "ಭಾರತದ ಮೊದಲ ನಿಷ್ಪಕ್ಷ ಕಾರು AI",
    hero_title_1: "ಪ್ರತಿ ಕಾರಿನ ಮೇಲೆ", hero_title_2: "ನಿಜವಾದ ತೀರ್ಪು", hero_title_3: "ಭಾರತದಲ್ಲಿ.",
    hero_sub: "ಪ್ರಚಾರ ಇಲ್ಲ. ಪಕ್ಷಪಾತ ಇಲ್ಲ. ಕಾಯುವಿಕೆ ಇಲ್ಲ. ಕೇವಲ AI ನಿಜವಾದ ದತ್ತಾಂಶ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.",
    hero_cta_compare: "AI ಹೋಲಿಕೆ ಪ್ರಾರಂಭಿಸಿ", hero_cta_recommend: "ನನ್ನ ಕಾರು ಹುಡುಕಿ",
    cars_indexed: "ಕಾರುಗಳ ಪಟ್ಟಿ", brand_bias: "ಬ್ರಾಂಡ್ ಪಕ್ಷಪಾತ", ai_expert: "AI ತಜ್ಞ",
    zero_wait_live: "ಲೈವ್ · ಕಾಯುವಿಕೆ ಟ್ರಾಕರ್", refresh_label: "ರಿಫ್ರೆಶ್:",
    ask_ai: "Auto-AI ಕೇಳಿ", book_now: "ಬುಕ್ ಮಾಡಿ",
  },
  bn: {
    nav_home: "হোম", nav_compare: "তুলনা", nav_recommend: "সুপারিশ", nav_cars: "গাড়ি", nav_emi: "EMI", nav_news: "খবর",
    cta_true_verdict: "সত্য রায় →",
    hero_tag: "ভারতের প্রথম নিরপেক্ষ কার AI",
    hero_title_1: "প্রতিটি গাড়ির উপর", hero_title_2: "সত্য রায়", hero_title_3: "ভারতে.",
    hero_sub: "কোন প্রচার নেই। পক্ষপাত নেই। অপেক্ষা নেই। শুধু AI যা সত্য ডেটা বিশ্লেষণ করে।",
    hero_cta_compare: "AI তুলনা শুরু করুন", hero_cta_recommend: "আমার গাড়ি খুঁজুন",
    cars_indexed: "গাড়ির তালিকা", brand_bias: "ব্র্যান্ড পক্ষপাত", ai_expert: "AI বিশেষজ্ঞ",
    zero_wait_live: "লাইভ · অপেক্ষা ট্র্যাকার", refresh_label: "রিফ্রেশ:",
    ask_ai: "Auto-AI কে জিজ্ঞাসা করুন", book_now: "বুক করুন",
  },
  gu: {
    nav_home: "હોમ", nav_compare: "સરખામણી", nav_recommend: "ભલામણ", nav_cars: "કાર", nav_emi: "EMI", nav_news: "સમાચાર",
    cta_true_verdict: "સાચો નિર્ણય →",
    hero_tag: "ભારતનું પ્રથમ નિષ્પક્ષ કાર AI",
    hero_title_1: "દરેક કાર પર", hero_title_2: "સાચો નિર્ણય", hero_title_3: "ભારતમાં.",
    hero_sub: "કોઈ પ્રમોશન નહીં. પક્ષપાત નહીં. રાહ જોવાની નહીં. ફક્ત AI જે વાસ્તવિક ડેટાનું વિશ્લેષણ કરે છે.",
    hero_cta_compare: "AI સરખામણી શરૂ કરો", hero_cta_recommend: "મારી કાર શોધો",
    cars_indexed: "કાર સૂચિ", brand_bias: "બ્રાન્ડ પક્ષપાત", ai_expert: "AI નિષ્ણાત",
    zero_wait_live: "લાઇવ · રાહ ટ્રેકર", refresh_label: "રિફ્રેશ:",
    ask_ai: "Auto-AI ને પૂછો", book_now: "બુક કરો",
  },
};

const I18nContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k, langName: "English" });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => getStored(STORAGE_KEYS.lang, "en"));
  const setLang = (l) => { setStored(STORAGE_KEYS.lang, l); setLangState(l); };
  const t = (k) => DICT[lang]?.[k] || DICT.en[k] || k;
  const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  return (
    <I18nContext.Provider value={{ lang, setLang, t, langName: meta.name, langNative: meta.native }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
