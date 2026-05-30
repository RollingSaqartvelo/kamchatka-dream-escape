import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, MapPin, Menu, User, X } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import logoDark from "@/assets/logo-poluostrov-dark.png";
import logoLight from "@/assets/logo-poluostrov-light.png";

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [scrolledRaw, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = !isHome || scrolledRaw;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navItems = [
    { to: "/rooms", label: t("nav.rooms") },
    { to: "/services", label: t("nav.services") },
    { to: "/wellness", label: t("nav.wellness") },
    { to: "/kamchatka", label: t("nav.kamchatka") },
    { to: "/about", label: t("nav.about") },
    { to: "/contacts", label: t("nav.contacts") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Top dark navy bar — contact strip */}
      <div className="bg-navy text-gold">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="hidden items-center gap-6 text-[11px] tracking-widest-plus uppercase md:flex">
            <a href="tel:+79149945757" className="inline-flex items-center gap-2 text-gold hover:text-cream">
              <Phone className="h-3 w-3" />
              {t("header.phone")}
            </a>
            <span className="inline-flex items-center gap-2 text-gold/80">
              <MapPin className="h-3 w-3" />
              {t("header.address")}
            </span>
          </div>
          <a
            href="tel:+79149945757"
            className="text-[11px] tracking-widest-plus uppercase text-gold md:hidden"
          >
            {t("header.phone")}
          </a>

          <div className="flex items-center gap-4">
            <LanguageSwitcher light />
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-[11px] tracking-widest-plus uppercase text-cream/80 hover:text-cream"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("nav.account")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav — transparent over hero, solid white after scroll */}
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? "bg-background/95 shadow-[0_1px_0_0_var(--color-border)] backdrop-blur"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={scrolled ? logoDark : logoLight}
              alt={t("brand.short")}
              className="h-12 w-auto transition-opacity"
            />
            <span
              className={`font-serif text-lg tracking-wide transition-colors ${
                scrolled ? "text-navy" : "text-cream"
              }`}
            >
              {t("brand.wordmark")}
            </span>
          </Link>


          {/* Desktop nav */}
          <nav className="hidden items-center gap-9 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-[11px] tracking-widest-plus uppercase transition-colors ${
                  scrolled
                    ? "text-navy/80 hover:text-gold"
                    : "text-cream/90 hover:text-gold"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/booking"
              className={`hidden md:inline-flex h-10 items-center px-6 text-[11px] tracking-widest-plus uppercase transition-all ${
                scrolled
                  ? "bg-navy text-cream hover:bg-navy/90"
                  : "bg-cream text-navy hover:bg-cream/90"
              }`}
              style={{ borderRadius: "2px" }}
            >
              {t("nav.book")}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={`lg:hidden ${scrolled ? "text-navy" : "text-cream"}`}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <div
        className={`lg:hidden fixed inset-x-0 top-[calc(2.25rem+5rem)] bottom-0 z-40 bg-cream transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex h-full flex-col overflow-y-auto px-6 py-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="border-b border-navy/10 py-5 font-serif text-2xl text-navy hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/booking"
            onClick={() => setMobileOpen(false)}
            className="mt-8 inline-flex h-12 items-center justify-center bg-navy px-6 text-[11px] tracking-widest-plus uppercase text-cream"
            style={{ borderRadius: "2px" }}
          >
            {t("nav.book")}
          </Link>
          <a
            href="tel:+79149945757"
            className="mt-6 inline-flex items-center justify-center gap-2 text-[11px] tracking-widest-plus uppercase text-navy/70"
          >
            <Phone className="h-3 w-3" />
            {t("header.phone")}
          </a>
        </nav>
      </div>
    </header>
  );
}
