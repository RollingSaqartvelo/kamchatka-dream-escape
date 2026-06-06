import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ROOMS } from "@/data/rooms";
import { format } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialRoomId?: string;
  initialCheckIn?: Date;
  customRooms?: { id: string; name: string }[];
};

const STATUSES = [
  { value: "pending", label: "Новая (ожидает оплаты)" },
  { value: "confirmed", label: "Подтверждена (без оплаты)" },
  { value: "paid", label: "Оплачена" },
];

export function OfflineBookingModal({
  open,
  onClose,
  onCreated,
  initialRoomId,
  initialCheckIn,
  customRooms = [],
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    room_id: initialRoomId ?? ROOMS[0]?.id ?? "",
    check_in: initialCheckIn ? format(initialCheckIn, "yyyy-MM-dd") : "",
    check_out: "",
    adults: 2,
    children: 0,
    meal_plan: "room_only" as "room_only" | "breakfast",
    total_price: 0,
    payment_status: "confirmed",
    admin_notes: "",
  }));

  if (!open) return null;

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.check_in || !form.check_out) {
      setError("Укажите даты заезда и выезда");
      return;
    }
    const ci = new Date(form.check_in);
    const co = new Date(form.check_out);
    const nights = Math.round((co.getTime() - ci.getTime()) / 86_400_000);
    if (nights < 1) {
      setError("Дата выезда должна быть позже даты заезда");
      return;
    }

    const roomName =
      ROOMS.find((r) => r.id === form.room_id)?.name_ru ??
      customRooms.find((c) => `custom-${c.id}` === form.room_id)?.name;
    if (!roomName) {
      setError("Выберите номер");
      return;
    }

    setSubmitting(true);
    const { error: insErr } = await supabase.from("bookings").insert({
      first_name: form.first_name.trim() || "—",
      last_name: form.last_name.trim() || "—",
      phone: form.phone.trim() || "—",
      email: form.email.trim() || "offline@poluostrov.local",
      room_id: form.room_id,
      room_name: roomName,
      check_in: form.check_in,
      check_out: form.check_out,
      nights,
      adults: form.adults,
      children: form.children,
      meal_plan: form.meal_plan,
      special_requests: [],
      total_price: form.total_price,
      room_price_total: form.total_price,
      breakfast_total: 0,
      prepayment_amount: 0,
      remaining_amount: form.total_price,
      payment_status: form.payment_status,
      payment_method: "offline",
      id_consent: true,
      terms_consent: true,
      admin_notes: form.admin_notes.trim() || null,
    });
    setSubmitting(false);

    if (insErr) {
      console.error(insErr);
      setError(insErr.message);
      return;
    }
    onCreated?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-background p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E]">
              Создать вручную
            </p>
            <h2 className="mt-1 font-serif text-2xl text-navy">Оффлайн-бронирование</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-navy">
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Имя гостя">
              <input
                value={form.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Фамилия">
              <input
                value={form.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Телефон">
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
          </div>

          <Field label="Номер">
            <select
              value={form.room_id}
              onChange={(e) => setField("room_id", e.target.value)}
              className="w-full border border-border bg-background px-3 py-2"
            >
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_ru}
                </option>
              ))}
              {customRooms.length > 0 && (
                <optgroup label="Добавленные номера">
                  {customRooms.map((c) => (
                    <option key={c.id} value={`custom-${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Заезд">
              <input
                type="date"
                value={form.check_in}
                onChange={(e) => setField("check_in", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Выезд">
              <input
                type="date"
                value={form.check_out}
                onChange={(e) => setField("check_out", e.target.value)}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Взрослые">
              <input
                type="number"
                min={1}
                max={10}
                value={form.adults}
                onChange={(e) => setField("adults", Number(e.target.value))}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Дети">
              <input
                type="number"
                min={0}
                max={10}
                value={form.children}
                onChange={(e) => setField("children", Number(e.target.value))}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Питание">
              <select
                value={form.meal_plan}
                onChange={(e) =>
                  setField("meal_plan", e.target.value as "room_only" | "breakfast")
                }
                className="w-full border border-border bg-background px-3 py-2"
              >
                <option value="room_only">Без завтрака</option>
                <option value="breakfast">С завтраком</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Сумма ₽">
              <input
                type="number"
                min={0}
                value={form.total_price}
                onChange={(e) => setField("total_price", Number(e.target.value))}
                className="w-full border border-border px-3 py-2"
              />
            </Field>
            <Field label="Статус оплаты">
              <select
                value={form.payment_status}
                onChange={(e) => setField("payment_status", e.target.value)}
                className="w-full border border-border bg-background px-3 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Заметки">
            <textarea
              rows={3}
              value={form.admin_notes}
              onChange={(e) => setField("admin_notes", e.target.value)}
              className="w-full border border-border px-3 py-2"
              placeholder="Источник, особые условия и т. д."
            />
          </Field>

          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-border px-5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy px-6 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-50"
            >
              {submitting ? "Сохраняем…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-navy">
        {label}
      </span>
      {children}
    </label>
  );
}
