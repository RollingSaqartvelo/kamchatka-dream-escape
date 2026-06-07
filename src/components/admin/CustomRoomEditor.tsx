import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, deleteMedia } from "@/lib/site-content";
import { AMENITY_OPTIONS } from "@/data/amenities";
import type { PricePeriod } from "@/lib/custom-rooms";

const MAX_PHOTOS = 18;

const DEFAULT_PERIODS: PricePeriod[] = [
  { from: "01.04", to: "01.06", price: 0 },
  { from: "01.06", to: "01.09", price: 0 },
  { from: "01.09", to: "01.01", price: 0 },
  { from: "01.01", to: "01.04", price: 0 },
];

type Tab = "main" | "prices" | "amenities" | "photos";

export function CustomRoomEditor({
  id,
  onClose,
  onSaved,
  mode = "custom",
  typeId,
  title,
  seed,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
  mode?: "custom" | "builtin";
  typeId?: string; // для встроенных номеров (room_overrides.type_id)
  title?: string; // заголовок для встроенных (имя из ROOMS)
  seed?: { description?: string; area_sqm?: number | null; max_guests?: number | null; beds?: string; photos?: string[] };
}) {
  const builtin = mode === "builtin";
  const [tab, setTab] = useState<Tab>("main");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [guests, setGuests] = useState("");
  const [beds, setBeds] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [periods, setPeriods] = useState<PricePeriod[]>(DEFAULT_PERIODS);
  const [published, setPublished] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      if (builtin) {
        const { data } = await (supabase as any).from("room_overrides").select("*").eq("type_id", typeId).maybeSingle();
        setName(title ?? "");
        setDescription(data?.description ?? seed?.description ?? "");
        setArea(data?.area_sqm != null ? String(data.area_sqm) : seed?.area_sqm != null ? String(seed.area_sqm) : "");
        setGuests(data?.max_guests != null ? String(data.max_guests) : seed?.max_guests != null ? String(seed.max_guests) : "");
        setBeds(data?.beds ?? seed?.beds ?? "");
        setAmenities(data?.amenities ?? []);
        setPhotos(data?.photos?.length ? data.photos : seed?.photos ?? []);
        setPeriods((data?.price_periods?.length ? data.price_periods : DEFAULT_PERIODS) as PricePeriod[]);
      } else {
        const { data } = await (supabase as any).from("custom_rooms").select("*").eq("id", id).maybeSingle();
        if (data) {
          setName(data.name ?? "");
          setDescription(data.description ?? "");
          setArea(data.area_sqm != null ? String(data.area_sqm) : "");
          setGuests(data.max_guests != null ? String(data.max_guests) : "");
          setBeds(data.beds ?? "");
          setAmenities(data.amenities ?? []);
          setPhotos(data.photos ?? []);
          setPeriods((data.price_periods?.length ? data.price_periods : DEFAULT_PERIODS) as PricePeriod[]);
          setPublished(data.published ?? true);
        }
      }
      setLoading(false);
    })();
  }, [id, builtin, typeId, title]);

  function toggleAmenity(key: string) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function setPeriod(i: number, patch: Partial<PricePeriod>) {
    setPeriods((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Максимум ${MAX_PHOTOS} фото`);
      return;
    }
    setUploading(true);
    const toUpload = Array.from(files).slice(0, room);
    try {
      for (const f of toUpload) {
        const url = await uploadMedia(f, "rooms");
        setPhotos((prev) => [...prev, url]);
      }
      toast.success("Фото загружены");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    void deleteMedia(url).catch(() => {});
  }

  async function save() {
    if (!builtin && !name.trim()) {
      toast.error("Укажите название номера");
      setTab("main");
      return;
    }
    setSaving(true);
    // сохраняем только заполненные периоды (цена > 0)
    const cleanPeriods = periods.filter((p) => Number(p.price) > 0 && p.from && p.to);
    const minPrice = cleanPeriods.length ? Math.min(...cleanPeriods.map((p) => Number(p.price))) : 0;
    const common = {
      description: description.trim(),
      area_sqm: area ? parseInt(area, 10) : null,
      max_guests: guests ? parseInt(guests, 10) : null,
      beds: beds.trim(),
      amenities,
      photos,
      price_periods: cleanPeriods,
    };
    let error;
    if (builtin) {
      ({ error } = await (supabase as any)
        .from("room_overrides")
        .upsert({ type_id: typeId, ...common, base_price: minPrice, updated_at: new Date().toISOString() }));
    } else {
      ({ error } = await (supabase as any)
        .from("custom_rooms")
        .update({ name: name.trim(), ...common, price: minPrice, published })
        .eq("id", id));
    }
    setSaving(false);
    if (error) {
      toast.error("Не удалось сохранить");
      console.error(error);
    } else {
      toast.success("Карточка номера сохранена");
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-3xl bg-background p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E]">Карточка номера</p>
            <h2 className="mt-1 font-serif text-2xl text-navy">{name || "Новый номер"}</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-navy">×</button>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <>
            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b border-border text-[11px] uppercase tracking-widest">
              {([
                ["main", "Основное"],
                ["prices", "Цены"],
                ["amenities", "Удобства"],
                ["photos", `Фото (${photos.length})`],
              ] as [Tab, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-4 py-2 ${tab === k ? "border-b-2 border-navy text-navy" : "text-muted-foreground hover:text-navy"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6 min-h-[260px]">
              {tab === "main" && (
                <div className="space-y-4">
                  {!builtin && (
                    <Field label="Название номера *">
                      <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Напр. Апартаменты на 2 этаже" />
                    </Field>
                  )}
                  <Field label="Описание">
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder="Кратко о номере…" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Площадь, м²">
                      <input type="number" min={0} value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Вместимость, гостей">
                      <input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Кровати">
                    <input value={beds} onChange={(e) => setBeds(e.target.value)} className={inputCls} placeholder="Напр. двуспальная кровать + софа" />
                  </Field>
                  {!builtin && (
                    <label className="flex items-center gap-2 text-sm text-navy">
                      <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                      Показывать на сайте (после загрузки фото)
                    </label>
                  )}
                </div>
              )}

              {tab === "prices" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Цены за ночь по периодам (даты в формате ДД.ММ). Можно заполнить любой один —
                    пустые не сохранятся.
                  </p>
                  {periods.map((p, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <Field label="С (ДД.ММ)">
                        <input value={p.from} onChange={(e) => setPeriod(i, { from: e.target.value })} className={`${inputCls} w-24`} placeholder="01.06" />
                      </Field>
                      <Field label="По (ДД.ММ)">
                        <input value={p.to} onChange={(e) => setPeriod(i, { to: e.target.value })} className={`${inputCls} w-24`} placeholder="01.09" />
                      </Field>
                      <Field label="Цена, ₽">
                        <input type="number" min={0} value={p.price || ""} onChange={(e) => setPeriod(i, { price: parseInt(e.target.value, 10) || 0 })} className={`${inputCls} w-28`} placeholder="0" />
                      </Field>
                      <button onClick={() => setPeriods((prev) => prev.filter((_, idx) => idx !== i))} className="mb-1 px-2 py-2 text-sm text-rose-600 hover:underline">удалить</button>
                    </div>
                  ))}
                  <button onClick={() => setPeriods((prev) => [...prev, { from: "", to: "", price: 0 }])} className="text-xs uppercase tracking-widest text-[#C9A96E] hover:underline">+ Добавить период</button>
                </div>
              )}

              {tab === "amenities" && (
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((a) => {
                    const on = amenities.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        onClick={() => toggleAmenity(a.key)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          on ? "border-navy bg-navy text-cream" : "border-border bg-background text-navy hover:border-navy"
                        }`}
                      >
                        <span>{a.icon}</span> {a.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === "photos" && (
                <div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading || photos.length >= MAX_PHOTOS}
                      className="border border-navy px-4 py-2 text-[11px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream disabled:opacity-50"
                    >
                      {uploading ? "Загрузка…" : "+ Загрузить фото"}
                    </button>
                    <span className="text-xs text-muted-foreground">{photos.length} / {MAX_PHOTOS}</span>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onPickFiles(e.target.files)} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {photos.map((url) => (
                      <div key={url} className="group relative aspect-square overflow-hidden border border-border">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => void removePhoto(url)}
                          className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-border pt-5">
              <button onClick={onClose} className="border border-border px-5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:border-navy">Отмена</button>
              <button onClick={() => void save()} disabled={saving} className="bg-navy px-6 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-50">
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A96E]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
