import { Link } from "@tanstack/react-router";
import { Users, Ruler, DoorClosed, Layers, Camera } from "lucide-react";
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

function PhotoTile({ src, label }: { src?: string; label?: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cream to-beige">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Camera className="h-8 w-8 text-navy/30" strokeWidth={1} />
      )}
      {label && (
        <span className="absolute inset-0 flex items-center justify-center bg-navy/40 text-xs uppercase tracking-widest text-cream">
          {label}
        </span>
      )}
    </div>
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
  const photos = room.photos;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
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
          <PhotoTile src={photos[0]} />
          <div className="hidden grid-cols-2 grid-rows-2 gap-1 sm:grid">
            <PhotoTile src={photos[1]} />
            <PhotoTile src={photos[2]} />
            <PhotoTile src={photos[3]} />
            <PhotoTile src={photos[4]} label="Смотреть все →" />
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-8 px-4 pb-32 sm:px-6 md:grid-cols-[1fr_1fr] md:pb-28">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gold">Номер</p>
            <h2 className="mt-2 font-serif text-3xl text-navy sm:text-4xl">
              {room.name_ru}
            </h2>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gold" strokeWidth={1.5} />
                до {room.max_guests} мест
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-gold" strokeWidth={1.5} />
                {room.area_sqm} м²
              </span>
              <span className="inline-flex items-center gap-1.5">
                <DoorClosed className="h-4 w-4 text-gold" strokeWidth={1.5} />
                {room.rooms_count} комн.
              </span>
              {room.levels && (
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-gold" strokeWidth={1.5} />
                  {room.levels} уровня
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
              Описание
            </p>
            <p className="mt-4 text-base italic leading-relaxed text-muted-foreground">
              {room.description_ru}
            </p>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Спальные места
              </p>
              <p className="mt-2 text-sm text-navy">{room.beds}</p>
            </div>
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-start justify-between gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-serif text-xl text-navy">
              от {fmtPrice(room.price_from_rub)}
              <span className="ml-1 text-sm text-muted-foreground">
                за 1 ночь
              </span>
            </p>
          </div>
          <Link
            to="/booking"
            className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-gold transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Узнать цену на другие даты
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
