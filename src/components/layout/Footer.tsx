import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin } from "lucide-react";
import { usePageContent } from "@/lib/site-content";
import { useRequisites } from "@/lib/requisites";
import logoLight from "@/assets/logo-poluostrov-light.svg";

const telHref = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

export function Footer() {
  const { t } = useTranslation();
  const c = usePageContent("nav");
  const req = useRequisites();
  const phone = c.text("contact.phone", t("header.phone"));
  const address = c.text("contact.address", t("header.address"));
  const email = c.text("contact.email", "poluostrovkam@mail.ru");

  return (
    <footer className="bg-navy text-cream/80">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center">
              <img src={logoLight} alt={t("brand.short")} className="h-14 w-auto" />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-cream/60">
              {c.text("footer.about", t("footer.about"))}
            </p>
            <p className="mt-4 text-xs text-cream/40">
              {req.ipName} · ИНН {req.inn}<br />
              {req.hotelAddress}
            </p>
          </div>


          <div>
            <h4 className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
              {c.text("footer.navHeading", t("footer.nav"))}
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                ["/rooms", c.text("menu.rooms", t("nav.rooms"))],
                ["/services", c.text("menu.services", t("nav.services"))],
                ["/wellness", c.text("menu.wellness", t("nav.wellness"))],
                ["/about", c.text("menu.about", t("nav.about"))],
                ["/booking", c.text("menu.book", t("nav.book"))],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to as string} className="transition-colors hover:text-gold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
              {c.text("footer.contactHeading", t("footer.contact"))}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>{address}</span>
              </li>
              <li>
                <a
                  href={telHref(phone)}
                  className="inline-flex items-center gap-2 transition-colors hover:text-gold"
                >
                  <Phone className="h-4 w-4 text-gold" />
                  {phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-gold"
                >
                  <Mail className="h-4 w-4 text-gold" />
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-cream/10 pt-8 text-xs text-cream/40 md:flex-row md:items-center">
          <p>{c.text("footer.rights", t("footer.rights"))}</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-gold">
              {c.text("footer.privacy", t("footer.privacy"))}
            </Link>
            <Link to="/oferta" className="hover:text-gold">
              {c.text("footer.terms", t("footer.terms"))}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
