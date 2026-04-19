import { Globe, Check } from "lucide-react";
import { LANGUAGES, useI18n } from "../lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, langNative } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        data-testid="language-toggle-btn"
      >
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:text-[#F59E0B] border border-white/10 px-3 py-2 transition-colors cursor-pointer">
          <Globe size={14} />
          {!compact && <span>{langNative}</span>}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-[#262626] rounded-none min-w-[180px] p-1">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            data-testid={`lang-option-${l.code}`}
            className="rounded-none flex items-center justify-between text-sm text-slate-300 hover:bg-white/5 hover:text-[#F59E0B] focus:bg-white/5 focus:text-[#F59E0B] cursor-pointer py-2 px-3"
          >
            <span>{l.native} <span className="text-slate-500 text-xs">· {l.name}</span></span>
            {lang === l.code && <Check size={14} className="text-[#F59E0B]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
