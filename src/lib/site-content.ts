import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Контент страницы «Услуги». Хранится в site_content под ключом "services".
// Публичная страница читает его с фолбэком на дефолты — если в базе пусто или
// синхронизация недоступна, сайт показывает текущие значения и не ломается.
// ─────────────────────────────────────────────────────────────────────────────

export type ServicesContent = {
  prices: {
    breakfast: number;
    lunch: number;
    dinner: number;
    halfBoard: number;
    fullBoard: number;
    transferCar: number;
    transferMinibus: number;
    earlyCheckin: string; // напр. «50 %»
    lateCheckout: string;
  };
  photos: {
    breakfast: string[];
    dinner: string[];
    dishes: string[];
  };
};

export const SERVICES_DEFAULT: ServicesContent = {
  prices: {
    breakfast: 450,
    lunch: 850,
    dinner: 850,
    halfBoard: 1200,
    fullBoard: 1900,
    transferCar: 1500,
    transferMinibus: 2000,
    earlyCheckin: "50 %",
    lateCheckout: "50 %",
  },
  photos: {
    breakfast: [
      "/media/breakfast-1.webp",
      "/media/breakfast-2.webp",
      "/media/breakfast-3.webp",
      "/media/breakfast-4.webp",
    ],
    dinner: ["/media/dinner-1.webp", "/media/dinner-2.webp", "/media/dinner-3.webp"],
    dishes: [
      "/media/dish-bruschetta.jpg",
      "/media/dish-vyalenoe-myaso.jpg",
      "/media/dish-tiramisu.jpg",
      "/media/dish-desert.jpg",
    ],
  },
};

// Аккуратно сливаем сохранённый контент с дефолтами (на случай новых полей).
export function mergeServices(stored: Partial<ServicesContent> | null | undefined): ServicesContent {
  if (!stored) return SERVICES_DEFAULT;
  return {
    prices: { ...SERVICES_DEFAULT.prices, ...(stored.prices ?? {}) },
    photos: { ...SERVICES_DEFAULT.photos, ...(stored.photos ?? {}) },
  };
}

export async function loadServicesContent(): Promise<ServicesContent> {
  const { data, error } = await (supabase as any)
    .from("site_content")
    .select("data")
    .eq("key", "services")
    .maybeSingle();
  if (error || !data) return SERVICES_DEFAULT;
  return mergeServices(data.data as Partial<ServicesContent>);
}

export async function saveServicesContent(content: ServicesContent) {
  return (supabase as any)
    .from("site_content")
    .upsert({ key: "services", data: content, updated_at: new Date().toISOString() });
}

// Загрузка изображения в бакет site-media → публичный URL.
export async function uploadMedia(file: File, folder = "services"): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("site-media")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl;
}

// Удаление файла из бакета (только для своих загрузок; дефолтные /media/* не трогаем).
export async function deleteMedia(url: string): Promise<void> {
  const marker = "/site-media/";
  const i = url.indexOf(marker);
  if (i === -1) return; // не наш файл (например, статика из /public) — просто игнорируем
  const path = url.slice(i + marker.length);
  await supabase.storage.from("site-media").remove([path]);
}
