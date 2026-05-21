import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS: Array<{ code: "ru" | "en" | "zh"; label: string }> = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1.5 text-[11px] tracking-widest-plus uppercase transition-colors ${
          light ? "text-cream/80 hover:text-cream" : "text-foreground/70 hover:text-foreground"
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        {current.code.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32 rounded-none">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className="cursor-pointer text-sm"
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
