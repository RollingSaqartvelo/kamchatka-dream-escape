// Physical-room layer for the calendar / шахматка.
//
// The hotel has 11 room *types* (see ROOMS), but several types are made up of
// many physical rooms with их собственными порядковыми номерами. This module
// expands each type into its individual physical units (and hostel beds), so
// the calendar can show a real PMS-style chessboard — one row per комната/койка.
//
// Booking → physical room: TravelLine отдаёт бронь по ТИПУ, не по комнате, so we
// auto-distribute bookings across the type's free units (greedy first-fit) for
// display. Persisting a specific room (room_unit) is a следующий шаг.

import { ROOMS } from "./rooms";

export type RoomUnit = {
  id: string; // unit id: typeId for singles, `typeId#NN` for rooms, `typeId#bK` for beds
  typeId: string; // parent room type id
  number: string; // "12" for rooms, "3" for bed №, "" for single rooms
  groupName: string; // полное имя типа — для заголовка группы
  unitLabel: string; // подпись строки: «№ 12» | «Кровать №1» | «Номер»
  name_ru: string; // = unitLabel (на случай прочих потребителей)
  price_from_rub: number;
  hostelBed: boolean;
};

// Кол-во коек у хостельных типов (каждая койка = отдельная строка-юнит).
export const HOSTEL_BEDS: Record<string, number> = {
  "hostel-10-mest": 10,
  "hostel-10-mest-b": 10,
  "hostel-4-mesta": 4,
  "hostel-12-mest": 12,
};

// Порядковые номера комнат для типов, у которых их несколько.
// (Остальные типы — по одной комнате; их id и есть юнит.)
const ROOM_NUMBERS: Record<string, string[]> = {
  "dvuhmestnyy-standart": ["1", "2", "3", "4", "5", "6", "7", "8", "12", "17", "18", "19", "20", "21", "22", "23"],
  "dvuhmestnyy-komfort-dop-mesto": ["11", "13", "14", "15"],
};

// Развёрнутый список физических юнитов в порядке типов (как в ROOMS).
export const ROOM_UNITS: RoomUnit[] = ROOMS.flatMap((room): RoomUnit[] => {
  const beds = HOSTEL_BEDS[room.id];
  if (beds) {
    return Array.from({ length: beds }, (_, i) => {
      const label = `Кровать №${i + 1}`;
      return {
        id: `${room.id}#b${i + 1}`,
        typeId: room.id,
        number: String(i + 1),
        groupName: room.name_ru,
        unitLabel: label,
        name_ru: label,
        price_from_rub: room.price_from_rub,
        hostelBed: true,
      };
    });
  }
  const numbers = ROOM_NUMBERS[room.id];
  if (numbers) {
    return numbers.map((n) => {
      const label = `№ ${n}`;
      return {
        id: `${room.id}#${n}`,
        typeId: room.id,
        number: n,
        groupName: room.name_ru,
        unitLabel: label,
        name_ru: label,
        price_from_rub: room.price_from_rub,
        hostelBed: false,
      };
    });
  }
  // Одиночная комната: id юнита == id типа (брони/драг резолвятся как раньше).
  return [
    {
      id: room.id,
      typeId: room.id,
      number: "",
      groupName: room.name_ru,
      unitLabel: room.name_ru,
      name_ru: room.name_ru,
      price_from_rub: room.price_from_rub,
      hostelBed: false,
    },
  ];
});

// Юниты, сгруппированные по типу (в порядке ROOMS).
export const UNITS_BY_TYPE: { typeId: string; units: RoomUnit[] }[] = ROOMS.map((r) => ({
  typeId: r.id,
  units: ROOM_UNITS.filter((u) => u.typeId === r.id),
}));

/** id юнита → id типа (для одиночных совпадает; срезает `#NN` / `#bK`). */
export function unitTypeId(unitId: string): string {
  const i = unitId.indexOf("#");
  return i === -1 ? unitId : unitId.slice(0, i);
}

/**
 * Ключ обслуживания юнита: для хостельных коек — id типа (ремонт = весь номер
 * целиком), для остальных — id комнаты. Используется чтобы скрыть из шахматки
 * номера/койки, помеченные «в ремонте» на странице «Номера».
 */
export function unitMaintKey(u: RoomUnit): string {
  return u.hostelBed ? u.typeId : u.id;
}

// Физические номера для управления (страница «Номера»). Хостел = 1 номер
// (а не N коек), т.к. в ремонт ставится весь номер целиком.
export type ManagedRoom = {
  key: string; // == unitMaintKey
  typeId: string;
  groupName: string;
  label: string; // «№ 12» | «Кровать…»→имя типа | имя одиночного типа
  hostel: boolean;
  beds?: number;
};

export const MANAGED_ROOMS: ManagedRoom[] = UNITS_BY_TYPE.flatMap(({ typeId, units }): ManagedRoom[] => {
  const groupName = units[0]?.groupName ?? typeId;
  const beds = HOSTEL_BEDS[typeId];
  if (beds) {
    return [{ key: typeId, typeId, groupName, label: groupName, hostel: true, beds }];
  }
  return units.map((u) => ({
    key: u.id,
    typeId,
    groupName,
    label: u.unitLabel,
    hostel: false,
  }));
});

// Управляемые номера, сгруппированные по типу (для блочного вывода).
export const MANAGED_BY_TYPE: { typeId: string; groupName: string; rooms: ManagedRoom[] }[] =
  ROOMS.map((r) => ({
    typeId: r.id,
    groupName: r.name_ru,
    rooms: MANAGED_ROOMS.filter((m) => m.typeId === r.id),
  }));

/** Реальный booking id из ключа реплицированной хостельной полосы (`id__bK`). */
export function realBookingId(id: string): string {
  const i = id.indexOf("__b");
  return i === -1 ? id : id.slice(0, i);
}

type Assignable = {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  adults?: number;
};

/**
 * Раскладывает брони по физическим юнитам для отображения в шахматке.
 * - Одиночные типы: бронь остаётся на своей единственной строке.
 * - Типы с несколькими комнатами: greedy first-fit по свободным комнатам;
 *   переполнение (овербукинг сверх числа комнат) садится на уже занятую → конфликт.
 * - Хостелы: бронь занимает max(1, adults) коек; для каждой койки — отдельная
 *   полоса с ключом `${id}__bK` (реальный id восстанавливается realBookingId()).
 * Возвращает новый массив того же типа с переопределёнными `id`/`room_id`.
 */
export function assignToUnits<T extends Assignable>(bookings: T[]): T[] {
  const unitsByType = new Map<string, RoomUnit[]>();
  for (const t of UNITS_BY_TYPE) unitsByType.set(t.typeId, t.units);

  const byType = new Map<string, T[]>();
  for (const b of bookings) {
    const tid = b.room_id;
    const arr = byType.get(tid);
    if (arr) arr.push(b);
    else byType.set(tid, [b]);
  }

  const out: T[] = [];
  for (const [typeId, list] of byType) {
    const units = unitsByType.get(typeId);
    const sorted = [...list].sort((a, b) => (a.check_in < b.check_in ? -1 : a.check_in > b.check_in ? 1 : 0));

    // Тип не из нашей раскладки (unknown) — оставляем как есть.
    if (!units || units.length === 0) {
      out.push(...sorted);
      continue;
    }

    const isHostel = units[0].hostelBed;
    // last checkout date (ISO) занятый каждой койкой/комнатой; "" = свободна
    const freeAt = units.map(() => "");

    if (!isHostel) {
      for (const b of sorted) {
        let idx = freeAt.findIndex((end) => end === "" || end <= b.check_in);
        if (idx === -1) idx = 0; // переполнение → конфликт на первой комнате
        freeAt[idx] = b.check_out;
        out.push({ ...b, room_id: units[idx].id });
      }
    } else {
      for (const b of sorted) {
        const need = Math.max(1, b.adults ?? 1);
        let placed = 0;
        for (let i = 0; i < units.length && placed < need; i++) {
          if (freeAt[i] === "" || freeAt[i] <= b.check_in) {
            freeAt[i] = b.check_out;
            out.push({ ...b, id: `${b.id}__b${placed + 1}`, room_id: units[i].id });
            placed++;
          }
        }
        // Не хватило свободных коек (овербукинг) — сажаем остаток на первую койку.
        for (; placed < need; placed++) {
          out.push({ ...b, id: `${b.id}__b${placed + 1}`, room_id: units[0].id });
        }
      }
    }
  }
  return out;
}
