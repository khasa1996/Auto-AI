import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

import CarConfigurator from './CarConfigurator';
import ConfiguratorAIAssistant from '../components/configurator/ConfiguratorAIAssistant';

export default function ConfiguratorExperience() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <CarConfigurator />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-black/85 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-amber-300 shadow-2xl backdrop-blur-xl transition hover:border-amber-300/70 hover:bg-black"
        aria-expanded={open}
        aria-controls="configurator-ai-panel"
      >
        {open ? <X size={14} /> : <Sparkles size={14} />}
        {open ? 'Close AI' : 'AI Build'}
      </button>
      {open && (
        <div
          id="configurator-ai-panel"
          className="fixed bottom-20 right-5 z-40 w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-amber-300/20 bg-[#080808]/95 p-1 shadow-2xl backdrop-blur-2xl"
        >
          <ConfiguratorAIAssistant />
        </div>
      )}
    </div>
  );
}
