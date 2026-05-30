import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown, Users, Ruler, DoorClosed, Layers } from "lucide-react";
import type { Room } from "@/data/rooms";
import { RoomPhotoGallery } from "./RoomPhotoGallery";
import { RoomModal } from "./RoomModal";

function fmtPrice(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export function RoomCard({
  room,
  bookingSearch,
}: {
  room: Room;
  bookingSearch?: Record<string, string | number>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article className="grid grid-cols-1 border border-border bg-card md:grid-cols-[400px_1fr]">
        <RoomPhotoGallery
          photos={room.photos}
          onOpen={() => setModalOpen(true)}
          className="h-[260px] md:h-[300px]"
        />

        <div className="flex flex-col p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-left"
          >
            <h2 className="font-serif text-3xl text-navy hover:text-gold transition-colors sm:text-[34px]">
              {room.name_ru}
            </h2>
          </button>

          <div className="mt-4 h-px w-full bg-border" />

          {/* Specs */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gold" strokeWidth={1.5} />
              {t("rooms.card.seats", { n: room.max_guests })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-gold" strokeWidth={1.5} />
              {t("rooms.card.area", { n: room.area_sqm })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DoorClosed className="h-4 w-4 text-gold" strokeWidth={1.5} />
              {t("rooms.card.rooms", { n: room.rooms_count })}
            </span>
            {room.levels && (
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-gold" strokeWidth={1.5} />
                {t("rooms.card.levels", { n: room.levels })}
              </span>
            )}
          </div>

          {/* Quick amenities */}
          <div className="mt-4 flex flex-wrap gap-2">
            {room.quick_amenities.map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1.5 bg-cream px-3 py-1 text-xs text-navy/80"
              >
                <span>{a.icon}</span>
                {a.label}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="mt-5 text-sm italic leading-relaxed text-muted-foreground line-clamp-3">
            {room.description_ru}
          </p>

          {/* Expand */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex w-fit items-center gap-1 text-xs uppercase tracking-widest text-gold hover:text-gold-dark transition-colors"
          >
            {t("rooms.card.more")}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          </button>

          {expanded && (
            <div className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {room.amenities_categories.map((cat) => (
                <div key={cat.label}>
                  <p className="text-xs font-medium uppercase tracking-wider text-navy">
                    {cat.label}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {cat.items.map((it) => (
                      <li key={it} className="text-[12px] text-muted-foreground">
                        · {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 h-px w-full bg-border" />

          {/* Footer */}
          <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("rooms.card.from")}
              </p>
              <p className="font-serif text-2xl text-navy">
                {fmtPrice(room.price_from_rub)}{" "}
                <span className="text-sm text-muted-foreground">{t("rooms.card.perNight")}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="border border-navy px-5 py-3 text-[11px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream transition-colors"
              >
                {t("rooms.card.priceCta")}
              </button>
              <Link
                to="/booking"
                search={{ ...(bookingSearch ?? {}), roomId: room.id }}
                className="bg-navy px-5 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-gold transition-colors"
              >
                {t("rooms.card.book")}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <RoomModal room={room} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
