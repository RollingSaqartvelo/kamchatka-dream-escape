import { useTranslation } from "react-i18next";
import RU from "country-flag-icons/react/3x2/RU";
import GB from "country-flag-icons/react/3x2/GB";
import CN from "country-flag-icons/react/3x2/CN";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS: Array<{
  code: "ru" | "en" | "zh";
  label: string;
  Flag: React.ComponentType<{ className?: string; title?: string }>;
}> = [
  { code: "ru", label: "Русский", Flag: RU },
  { code: "en", label: "English", Flag: GB },
  { code: "zh", label: "中文", Flag: CN },
];

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];
  const CurrentFlag = current.Flag;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-2 text-[11px] tracking-widest-plus uppercase transition-colors ${
          light ? "text-cream/80 hover:text-cream" : "text-foreground/70 hover:text-foreground"
        }`}
      >
        <CurrentFlag className="h-3.5 w-5 rounded-[1px]" title={current.label} />
        {current.code.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 rounded-none">
        {LANGS.map(({ code, label, Flag }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className="cursor-pointer gap-2 text-sm"
          >
            <Flag className="h-3.5 w-5 rounded-[1px]" title={label} />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
