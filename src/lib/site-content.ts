import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Движок контента сайта. Любой текст / фото / видимость блока на странице можно
// переопределить из админки. Дизайн (вёрстка, расположение блоков) зашит в коде —
// редактор меняет только содержимое. Если в базе пусто, страница показывает
// значения по умолчанию (из JSX), поэтому сайт никогда не ломается.
//
// Хранится в таблице site_content: одна строка на страницу, ключ "page:<id>".
//   data = { text: {fieldId: "..."}, images: {fieldId: ["url", ...]}, hidden: {blockId: true} }
// ─────────────────────────────────────────────────────────────────────────────

export type ListItem = Record<string, string>; // подполя элемента списка (текст/URL фото)

export type PageContent = {
  text?: Record<string, string>;
  images?: Record<string, string[]>; // галерея; одиночное фото — массив из 1 элемента
  lists?: Record<string, ListItem[]>; // повторяющиеся карточки
  hidden?: Record<string, boolean>;
};

export async function loadPageContent(pageId: string): Promise<PageContent> {
  const { data, error } = await (supabase as any)
    .from("site_content")
    .select("data")
    .eq("key", `page:${pageId}`)
    .maybeSingle();
  if (error || !data) return {};
  return (data.data ?? {}) as PageContent;
}

export async function savePageContent(pageId: string, content: PageContent) {
  return (supabase as any)
    .from("site_content")
    .upsert({ key: `page:${pageId}`, data: content, updated_at: new Date().toISOString() });
}

// Геттеры контента, привязанные к одной странице — для публичных страниц.
export type PageGetters = {
  ready: boolean;
  text: (id: string, def: string) => string;
  image: (id: string, def: string) => string;
  images: (id: string, def: string[]) => string[];
  list: (id: string, def: ListItem[]) => ListItem[];
  hidden: (id: string) => boolean;
};

export function usePageContent(pageId: string): PageGetters {
  const [c, setC] = useState<PageContent>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void loadPageContent(pageId)
      .then(setC)
      .catch(() => {})
      .finally(() => setReady(true));
  }, [pageId]);
  return {
    ready,
    text: (id, def) => {
      const v = c.text?.[id];
      return v !== undefined && v !== "" ? v : def;
    },
    image: (id, def) => c.images?.[id]?.[0] ?? def,
    images: (id, def) => {
      const v = c.images?.[id];
      return v && v.length ? v : def;
    },
    list: (id, def) => {
      const v = c.lists?.[id];
      return v && v.length ? v : def;
    },
    hidden: (id) => c.hidden?.[id] ?? false,
  };
}

// ── Хранилище фото ───────────────────────────────────────────────────────────

// Загрузка изображения в бакет site-media → публичный URL.
export async function uploadMedia(file: File, folder = "site"): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("site-media")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl;
}

// Удаление файла из бакета (только свои загрузки; статику из /public не трогаем).
export async function deleteMedia(url: string): Promise<void> {
  const marker = "/site-media/";
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = url.slice(i + marker.length);
  await supabase.storage.from("site-media").remove([path]);
}
