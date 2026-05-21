import { Camera } from "lucide-react";

export function RoomPhotoGallery({
  photos,
  onOpen,
  className,
}: {
  photos: string[];
  onOpen?: () => void;
  className?: string;
}) {
  const count = photos.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        "group relative block w-full overflow-hidden bg-cream " +
        (className ?? "")
      }
      aria-label="Открыть галерею"
    >
      {count > 0 ? (
        <img
          src={photos[0]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream to-beige">
          <div className="flex flex-col items-center gap-2 text-navy/40">
            <Camera className="h-10 w-10" strokeWidth={1} />
            <span className="text-[11px] uppercase tracking-widest">Фото скоро</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-navy/70 px-2.5 py-1 text-[11px] uppercase tracking-widest text-cream backdrop-blur-sm">
        <Camera className="h-3 w-3" strokeWidth={1.5} />
        {count > 0 ? `${count} фото` : "Фото скоро"}
      </div>
    </button>
  );
}
