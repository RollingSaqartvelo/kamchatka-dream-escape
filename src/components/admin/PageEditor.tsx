import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  loadPageContent,
  savePageContent,
  uploadMedia,
  deleteMedia,
  type PageContent,
} from "@/lib/site-content";
import type { PageSchema } from "@/lib/content-registry";

// Универсальный редактор контента страницы. Строится по схеме из реестра:
// текстовые поля, галереи фото и переключатель «скрыть блок». Дизайн страницы
// не трогается — меняется только содержимое.
export function PageEditor({ schema }: { schema: PageSchema }) {
  const [content, setContent] = useState<PageContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    setDirty(false);
    void loadPageContent(schema.key)
      .then(setContent)
      .catch(() => toast.error("Не удалось загрузить контент"))
      .finally(() => setLoading(false));
  }, [schema.key]);

  function setText(id: string, value: string) {
    setContent((c) => ({ ...c, text: { ...c.text, [id]: value } }));
    setDirty(true);
  }
  function setImages(id: string, list: string[]) {
    setContent((c) => ({ ...c, images: { ...c.images, [id]: list } }));
    setDirty(true);
  }
  function setHidden(id: string, hidden: boolean) {
    setContent((c) => ({ ...c, hidden: { ...c.hidden, [id]: hidden } }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await savePageContent(schema.key, content);
    setSaving(false);
    if (error) toast.error(`Не сохранилось: ${error.message ?? error}`);
    else {
      toast.success("Сохранено — изменения уже на сайте");
      setDirty(false);
    }
  }

  const val = (id: string, def: string) => content.text?.[id] ?? def;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={schema.href} target="_blank" rel="noreferrer" className="text-sm text-navy underline">
          Открыть страницу «{schema.label}» ↗
        </a>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
        >
          {saving ? "Сохранение…" : dirty ? "Сохранить изменения" : "Сохранено"}
        </button>
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-muted-foreground">Загрузка…</div>
      ) : (
        <div className="mt-8 space-y-6">
          {schema.blocks.map((block) => {
            const isHidden = content.hidden?.[block.id] ?? false;
            return (
              <section key={block.id} className="border border-border bg-background">
                <header className="flex items-center justify-between border-b border-border bg-cream/40 px-5 py-3">
                  <h3 className="font-serif text-lg text-navy">{block.label}</h3>
                  {block.toggleable && (
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={(e) => setHidden(block.id, !e.target.checked)}
                      />
                      {isHidden ? "Скрыт" : "Показан"}
                    </label>
                  )}
                </header>

                <div className={`space-y-4 p-5 ${isHidden ? "opacity-40" : ""}`}>
                  {block.fields.map((f) => {
                    if (f.type === "gallery") {
                      const list = content.images?.[f.id] ?? f.def;
                      return (
                        <GalleryField
                          key={f.id}
                          label={f.label}
                          photos={list}
                          onChange={(l) => setImages(f.id, l)}
                        />
                      );
                    }
                    return (
                      <label key={f.id} className="block">
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{f.label}</span>
                        {f.type === "textarea" ? (
                          <textarea
                            rows={3}
                            value={val(f.id, f.def)}
                            onChange={(e) => setText(f.id, e.target.value)}
                            className="mt-1 w-full border border-border bg-cream/20 px-3 py-2 text-sm text-navy outline-none focus:border-navy"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val(f.id, f.def)}
                            onChange={(e) => setText(f.id, e.target.value)}
                            className="mt-1 w-full border border-border bg-cream/20 px-3 py-2 text-sm text-navy outline-none focus:border-navy"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="flex justify-end">
            <button
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
              className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
            >
              {saving ? "Сохранение…" : dirty ? "Сохранить изменения" : "Сохранено"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryField({
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
    void deleteMedia(url);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border border-[#C9A96E] px-4 py-1.5 text-[11px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "+ Загрузить"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
      </div>
      {photos.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Фотографий нет.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex h-6 w-6 items-center justify-center bg-navy/80 text-xs text-cream disabled:opacity-30">←</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="flex h-6 w-6 items-center justify-center bg-navy/80 text-xs text-cream disabled:opacity-30">→</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
