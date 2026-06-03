import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import {
  loadServicesContent,
  saveServicesContent,
  uploadMedia,
  deleteMedia,
  SERVICES_DEFAULT,
  type ServicesContent,
} from "@/lib/site-content";

export const Route = createFileRoute("/admin/site")({
  component: AdminSitePage,
  head: () => ({
    meta: [
      { title: "Управление отелем — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// Описание полей цен — чтобы не дублировать разметку.
const PRICE_FIELDS: { key: keyof ServicesContent["prices"]; label: string; type: "num" | "text"; unit?: string }[] = [
  { key: "breakfast", label: "Завтрак", type: "num", unit: "₽ / гость в сутки" },
  { key: "lunch", label: "Обед", type: "num", unit: "₽ / гость в сутки" },
  { key: "dinner", label: "Ужин", type: "num", unit: "₽ / гость в сутки" },
  { key: "halfBoard", label: "Полупансион", type: "num", unit: "₽ / гость в сутки" },
  { key: "fullBoard", label: "Полный пансион", type: "num", unit: "₽ / гость в сутки" },
  { key: "transferCar", label: "Трансфер — легковой", type: "num", unit: "₽ / поездка" },
  { key: "transferMinibus", label: "Трансфер — микроавтобус", type: "num", unit: "₽ / поездка" },
  { key: "earlyCheckin", label: "Ранний заезд", type: "text", unit: "от стоимости за ночь" },
  { key: "lateCheckout", label: "Поздний выезд", type: "text", unit: "от стоимости за ночь" },
];

const PHOTO_GROUPS: { key: keyof ServicesContent["photos"]; label: string }[] = [
  { key: "breakfast", label: "Завтрак — фото" },
  { key: "dinner", label: "Ужин — фото" },
  { key: "dishes", label: "Блюда кухни (галерея «Обед»)" },
];

function AdminSitePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [content, setContent] = useState<ServicesContent>(SERVICES_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void loadServicesContent()
      .then(setContent)
      .catch(() => toast.error("Не удалось загрузить контент"))
      .finally(() => setLoading(false));
  }, []);

  function setPrice(key: keyof ServicesContent["prices"], value: number | string) {
    setContent((c) => ({ ...c, prices: { ...c.prices, [key]: value } }));
    setDirty(true);
  }

  function setPhotos(key: keyof ServicesContent["photos"], list: string[]) {
    setContent((c) => ({ ...c, photos: { ...c.photos, [key]: list } }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await saveServicesContent(content);
    setSaving(false);
    if (error) {
      toast.error(`Не сохранилось: ${error.message ?? error}`);
    } else {
      toast.success("Сохранено — изменения уже на сайте");
      setDirty(false);
    }
  }

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Только для администратора</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Редактировать контент сайта может только владелец (роль admin). Менеджеры —
          без доступа к этому разделу.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Контент сайта</p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Управление отелем · Услуги</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Меняйте цены и фотографии — обновления сразу появляются на странице{" "}
              <a href="/services" target="_blank" rel="noreferrer" className="text-navy underline">
                «Услуги»
              </a>
              .
            </p>
          </div>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
          >
            {saving ? "Сохранение…" : dirty ? "Сохранить изменения" : "Сохранено"}
          </button>
        </div>

        {loading ? (
          <div className="mt-10 text-sm text-muted-foreground">Загрузка…</div>
        ) : (
          <>
            {/* Цены */}
            <section className="mt-10">
              <h2 className="font-serif text-2xl text-navy">Цены</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {PRICE_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1 border border-border bg-cream/30 p-4">
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{f.label}</span>
                    <div className="flex items-baseline gap-2">
                      {f.type === "num" ? (
                        <input
                          type="number"
                          min={0}
                          value={content.prices[f.key] as number}
                          onChange={(e) => setPrice(f.key, Math.max(0, Number(e.target.value) || 0))}
                          className="w-32 border-b border-border bg-transparent py-1 font-serif text-2xl text-navy outline-none focus:border-navy"
                        />
                      ) : (
                        <input
                          type="text"
                          value={content.prices[f.key] as string}
                          onChange={(e) => setPrice(f.key, e.target.value)}
                          className="w-32 border-b border-border bg-transparent py-1 font-serif text-2xl text-navy outline-none focus:border-navy"
                        />
                      )}
                      <span className="text-xs text-muted-foreground">{f.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Фотографии */}
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-navy">Фотографии</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                JPG/PNG/WebP. Удаление убирает фото со страницы. Порядок — как в списке.
              </p>
              <div className="mt-5 space-y-8">
                {PHOTO_GROUPS.map((g) => (
                  <PhotoManager
                    key={g.key}
                    label={g.label}
                    photos={content.photos[g.key]}
                    onChange={(list) => setPhotos(g.key, list)}
                  />
                ))}
              </div>
            </section>

            <div className="mt-12 flex justify-end">
              <button
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
                className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
              >
                {saving ? "Сохранение…" : dirty ? "Сохранить изменения" : "Сохранено"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PhotoManager({
  label,
  photos,
  onChange,
}: {
  label: string;
  photos: string[];
  onChange: (list: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await uploadMedia(file));
      } catch (e: any) {
        toast.error(`Не загрузилось «${file.name}»: ${e?.message ?? e}`);
      }
    }
    setUploading(false);
    if (added.length) {
      onChange([...photos, ...added]);
      toast.success(`Загружено: ${added.length}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(url: string) {
    onChange(photos.filter((u) => u !== url));
    void deleteMedia(url); // удаляем из бакета (только свои загрузки)
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-navy">{label}</h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border border-[#C9A96E] px-4 py-2 text-[11px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "+ Загрузить"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">Фотографий нет.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((url, i) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden border border-border bg-beige">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                title="Удалить"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-rose-600 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
              <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="Левее"
                  className="flex h-6 w-6 items-center justify-center bg-navy/80 text-xs text-cream disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                  title="Правее"
                  className="flex h-6 w-6 items-center justify-center bg-navy/80 text-xs text-cream disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
