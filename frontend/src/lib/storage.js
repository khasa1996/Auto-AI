export const STORAGE_KEYS = {
  chatModel: "autoai_chat_model",
  pwaDismissed: "autoai_pwa_dismissed",
  token: "autoai_token",
  phone: "autoai_phone",
  adminPin: "autoai_admin_pin",
  lang: "autoai_lang",
  ttsVoice: "autoai_tts_voice",
};

export const getStored = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const setStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) */
  }
};

export const removeStored = (...keys) => {
  try {
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable (private mode / quota) */
  }
};
