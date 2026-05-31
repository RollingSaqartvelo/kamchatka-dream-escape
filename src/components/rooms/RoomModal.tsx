import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Ruler,
  DoorClosed,
  Layers,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Room } from "@/data/rooms";

function fmtPrice(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function PhotoTile({
  src,
  label,
  alt,
  onClick,
}: {
  src?: string;
  label?: string;
  alt?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cream to-beige",
        onClick && "cursor-pointer",
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? label ?? ""}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <Camera className="h-8 w-8 text-navy/30" strokeWidth={1} />
      )}
      {label && (
        <span className="absolute inset-0 flex items-center justify-center bg-navy/45 text-xs uppercase tracking-widest text-cream transition-colors group-hover:bg-navy/60">
          {label}
        </span>
      )}
    </Tag>
  );
}

export function RoomModal({
  room,
  open,
  onOpenChange,
}: {
  room: Room;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const photos = room.photos;
  const total = photos.length;
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(
    () => setLightbox((i) => (i === null ? i : (i - 1 + total) % total)),
    [total],
  );
  const next = useCallback(
    () => setLightbox((i) => (i === null ? i : (i + 1) % total)),
    [total],
  );

  // Keyboard nav for the lightbox; capture phase so Escape closes the
  // lightbox without bubbling to Radix and closing the whole modal.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox, close, prev, next]);

  // Reset lightbox whenever the modal itself is closed.
  useEffect(() => {
    if (!open) setLightbox(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (lightbox !== null) e.preventDefault();
        }}
        className={cn(
          "max-w-[1100px] gap-0 border-0 bg-background p-0",
          "h-[100dvh] sm:h-auto sm:max-h-[92vh]",
          "w-screen sm:w-[95vw]",
          "overflow-y-auto rounded-none sm:rounded-sm",
        )}
      >
        <DialogTitle className="sr-only">{room.name_ru}</DialogTitle>
        <DialogDescription className="sr-only">
          {room.description_ru}
        </DialogDescription>

        {/* Photos */}
        <div className="grid h-[280px] grid-cols-1 gap-1 p-4 pt-12 sm:h-[380px] sm:grid-cols-[2fr_1fr] sm:p-6 sm:pt-6">
          <PhotoTile src={photos[0]} alt={room.name_ru} onClick={photos[0] ? () => setLightbox(0) : undefined} />
          <div className="hidden grid-cols-2 grid-rows-2 gap-1 sm:grid">
            <PhotoTile src={photos[1]} alt={room.name_ru} onClick={photos[1] ? () => setLightbox(1) : undefined} />
            <PhotoTile src={photos[2]} alt={room.name_ru} onClick={photos[2] ? () => setLightbox(2) : undefined} />
            <PhotoTile src={photos[3]} alt={room.name_ru} onClick={photos[3] ? () => setLightbox(3) : undefined} />
            <PhotoTile
              src={photos[4]}
              alt={room.name_ru}
              label={
                total > 5
                  ? t("rooms.gallery.morePhotos", { n: total - 4 })
                  : total > 4
                    ? t("rooms.gallery.viewAll")
                    : undefined
              }
              onClick={photos[4] ? () => setLightbox(4) : undefined}
            />
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-8 px-4 pb-32 sm:px-6 md:grid-cols-[1fr_1fr] md:pb-28">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gold">{t("rooms.modal.eyebrow")}</p>
            <h2 className="mt-2 font-serif text-3xl text-navy sm:text-4xl">
              {room.name_ru}
            </h2>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
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

            <div className="mt-5 flex flex-wrap gap-2">
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

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-gold">
              {t("rooms.modal.desc")}
            </p>
            <p className="mt-4 text-base italic leading-relaxed text-muted-foreground">
              {room.description_ru}
            </p>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("rooms.modal.beds")}
              </p>
              <p className="mt-2 text-sm text-navy">{room.beds}</p>
            </div>
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-start justify-between gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-serif text-xl text-navy">
              {t("rooms.card.from")} {fmtPrice(room.price_from_rub)}
              <span className="ml-1 text-sm text-muted-foreground">
                {t("rooms.modal.perNight")}
              </span>
            </p>
          </div>
          <Link
            to="/booking"
            className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-gold transition-colors"
            onClick={() => onOpenChange(false)}
          >
            {t("rooms.modal.otherDates")}
          </Link>
        </div>

        {/* Lightbox */}
        {lightbox !== null && photos[lightbox] && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 select-none"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={`${room.name_ru} — ${lightbox + 1} / ${total}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20"
              aria-label={t("rooms.gallery.close")}
            >
              <X className="h-5 w-5" />
            </button>

            {total > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20 sm:left-6"
                aria-label={t("rooms.gallery.prev")}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <img
              src={photos[lightbox]}
              alt={`${room.name_ru} — ${lightbox + 1}`}
              decoding="async"
              className="max-h-[88vh] max-w-[92vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {total > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20 sm:right-6"
                aria-label={t("rooms.gallery.next")}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs tracking-widest text-cream">
              {lightbox + 1} / {total}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
