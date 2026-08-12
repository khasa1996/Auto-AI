import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { API } from "../lib/api";
import { STORAGE_KEYS, getStored, setStored } from "./storage";

/**
 * Voice preference — read/written to localStorage. Shared across the app.
 * Values: "female" | "male"
 */
export function getVoicePref() {
  return getStored(STORAGE_KEYS.ttsVoice, "female");
}
export function setVoicePref(v) {
  setStored(STORAGE_KEYS.ttsVoice, v);
}

/**
 * Hook that manages a single <audio> element for TTS playback.
 * Guarantees only ONE clip plays at a time across the app.
 */
let _globalAudio = null;
let _globalOwner = null;
const _listeners = new Set();

function _notify() {
  _listeners.forEach((cb) => cb(_globalOwner));
}

export function useTTS() {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ownerRef = useRef(Symbol("tts-owner"));

  const speak = useCallback(
    async (text, voice) => {
      if (!text || !text.trim()) return;

      // If this hook is already the owner and playing → stop
      if (_globalOwner === ownerRef.current && _globalAudio && !_globalAudio.paused) {
        _globalAudio.pause();
        _globalAudio.currentTime = 0;
        _globalAudio = null;
        _globalOwner = null;
        setPlaying(false);
        _notify();
        return;
      }

      // Stop whatever else was playing
      if (_globalAudio) {
        _globalAudio.pause();
        _globalAudio = null;
        _globalOwner = null;
        _notify();
      }

      setBusy(true);
      try {
        const resp = await fetch(`${API}/tts/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: voice || getVoicePref() }),
        });
        if (!resp.ok) throw new Error(`TTS ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        _globalAudio = audio;
        _globalOwner = ownerRef.current;
        _notify();

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (_globalAudio === audio) {
            _globalAudio = null;
            _globalOwner = null;
            _notify();
          }
          setPlaying(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setPlaying(false);
        };
        await audio.play();
        setPlaying(true);
      } catch (err) {
        console.error("TTS failed:", err);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  // Subscribe to global changes so `playing` stays fresh when other components stop us
  const _sync = useCallback((owner) => {
    setPlaying(owner === ownerRef.current);
  }, []);
  if (!_listeners.has(_sync)) _listeners.add(_sync);

  return { speak, busy, playing };
}

/**
 * <SpeakButton /> — click to hear `text` spoken. Icon-only, small.
 */
export function SpeakButton({ text, voice, className = "", testId }) {
  const { speak, busy, playing } = useTTS();
  const onClick = (e) => {
    e.stopPropagation();
    speak(text, voice);
  };
  return (
    <button
      onClick={onClick}
      data-testid={testId || "speak-btn"}
      title={playing ? "Stop" : "Read aloud"}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-sm border border-white/10 hover:border-[#F59E0B]/60 hover:text-[#F59E0B] text-slate-400 transition-all ${
        playing ? "text-[#F59E0B] border-[#F59E0B]/60 bg-[#F59E0B]/10" : ""
      } ${className}`}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : playing ? (
        <VolumeX size={11} />
      ) : (
        <Volume2 size={11} />
      )}
    </button>
  );
}
