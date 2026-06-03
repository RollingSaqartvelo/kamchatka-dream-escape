# -*- coding: utf-8 -*-
# Парсит выгрузку TravelLine (Report_*.xlsx) и генерирует SQL upsert в bookings.
# Групповые брони (Номеров>1) разбиваются на строку-на-номер; ключ
# tl_reservation_id = "<№брони>#<i>" совпадает с ключами API-синка (нет задвоений).
import openpyxl, re, json, sys, io

SRC = sys.argv[1] if len(sys.argv) > 1 else "C:/Users/Administrator/Downloads/Report_2026-04-01-2026-06-10.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else "C:/Users/Administrator/kamchatka-dream-escape/import_bookings.sql"

def norm(s):
    return re.sub(r'\s+', ' ', (s or "").lower().replace('ё', 'е')).strip()

def room_id(cat):
    c = norm(cat)
    if '12-ти' in c or '12 -' in c or '12-' in c and 'мест' in c: return 'hostel-12-mest'
    if '10-ти' in c or ('10' in c and 'мест' in c): return 'hostel-10-mest'
    if '4-х' in c or ('4' in c and 'мест' in c and 'двух' not in c): return 'hostel-4-mesta'
    if 'семейн' in c: return 'semeynyy-delux'
    if 'трехмест' in c and 'комфорт' in c: return 'comfort-3-shower'
    if 'двухмест' in c and 'эконом' in c and 'доп' in c: return 'dvuhmestnyy-ekonom-dop-mesto'
    if 'двухмест' in c and 'эконом' in c: return 'dvuhmestnyy-ekonom'
    if 'двухмест' in c and 'комфорт' in c and 'доп' in c: return 'dvuhmestnyy-komfort-dop-mesto'
    if 'двухмест' in c and 'комфорт' in c: return 'dvuhmestnyy-komfort'
    if 'двухмест' in c and ('двуспальн' in c or '1 двуспальн' in c or 'односпальн' in c): return 'dvuhmestnyy-standart'
    return 'unknown'

def src_slug(s):
    c = norm(s)
    if '101hotels' in c: return 'hotels101'
    if 'acase' in c or 'аон' in c: return 'acase'
    if 'bronevik' in c: return 'bronevik'
    if 'hotelbook' in c: return 'hotelbook'
    if 'ostrovok' in c or 'островок' in c: return 'ostrovok'
    if 'otello' in c: return 'otello'
    if 'ozon' in c: return 'ozon'
    if 'roomlink' in c or 'zabroniryi' in c: return 'roomlink'
    if 'rostelecom' in c or 'ростелеком' in c: return 'rostelecom'
    if 'trivio' in c: return 'trivio'
    if 'comfort booking' in c: return 'comfort_booking'
    if 'суточно' in c or 'sutochno' in c: return 'sutochno'
    if 'яндекс' in c or 'yandex' in c: return 'yandex'
    if 'стойк' in c or 'шахматк' in c: return 'tl_desk'
    if 'официальн' in c or 'мобильн' in c or 'poluostrov-hotel' in c or 'сайт' in c: return 'website'
    return 'travelline'

def split_num(s):
    # "1. A\n2. B" -> ["A","B"]; "A" -> ["A"]
    s = (s or "").strip()
    if not s: return []
    parts = re.split(r'\n', s)
    out = []
    for p in parts:
        p = re.sub(r'^\s*\d+\.\s*', '', p).strip()
        if p: out.append(p)
    return out

def name_parts(full):
    toks = (full or "").strip().split()
    if not toks: return ("Гость", "")
    return (toks[0], " ".join(toks[1:]))

def sq(v):  # SQL string literal
    if v is None: return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def jsq(obj):
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::jsonb"

def datepart(s):
    s = (s or "").strip()
    return s[:10] if len(s) >= 10 else None

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb.worksheets[0]
rows = list(ws.iter_rows(values_only=True))[1:]
def c(r, i):
    v = r[i]; return "" if v is None else str(v).strip()

out_rows = []
unknown_cats = set()
for r in rows:
    num = c(r, 1)
    if not num: continue
    status = c(r, 16)
    if 'отмен' in norm(status) or c(r, 10):  # отменённые пропускаем
        continue
    ci = datepart(c(r, 11)); co = datepart(c(r, 13))
    if not ci or not co: continue
    try: nrooms = max(1, int(float(c(r, 3) or 1)))
    except: nrooms = 1
    cats = split_num(c(r, 18)) or ['']
    guests = split_num(c(r, 2))
    genders = split_num(c(r, 24)); cits = split_num(c(r, 25)); dobs = split_num(c(r, 29))
    try: total = round(float(c(r, 4) or 0))
    except: total = 0
    try: prepaid = round(float(c(r, 6) or 0))
    except: prepaid = 0
    try: nights = int(float(c(r, 12) or 1))
    except: nights = 1
    arrival_dt = c(r, 11); departure_dt = c(r, 13)
    src = src_slug(c(r, 14))
    phone = c(r, 21); email = c(r, 22)
    organizer = c(r, 23)
    comment = c(r, 20)
    company = c(r, 34) or c(r, 33)
    inn = c(r, 35)
    tariff = c(r, 38)
    meal = c(r, 19)
    conf = c(r, 0)
    try: total_guests = int(float(c(r, 30) or 0))
    except: total_guests = 0
    paid_full = prepaid > 0 and prepaid >= total

    per_price = total // nrooms
    per_prepaid = prepaid // nrooms
    for i in range(nrooms):
        cat = cats[i] if i < len(cats) else cats[-1]
        rid = room_id(cat)
        if rid == 'unknown': unknown_cats.add(cat)
        # цена: остаток на последнюю комнату
        price = per_price + (total - per_price * nrooms if i == nrooms - 1 else 0)
        pp = per_prepaid + (prepaid - per_prepaid * nrooms if i == nrooms - 1 else 0)
        if nrooms == 1:
            occ = guests[0] if guests else organizer
            adults = max(1, total_guests or len(guests) or 1)
        else:
            occ = guests[i] if i < len(guests) else (organizer or "Гость")
            adults = 1
        last, first = name_parts(occ)
        meta = {
            "kind": "tl-report", "arrival": arrival_dt, "departure": departure_dt,
            "tariff": tariff, "mealPlan": meal, "organizer": organizer if organizer and organizer != occ else "",
            "groupSize": nrooms, "roomNo": i + 1, "confirmation": conf,
            "company": company, "inn": inn, "comment": comment,
            "guests": guests, "genders": genders, "citizenships": cits, "dob": dobs,
            "prepaid": pp, "sourceName": c(r, 14),
        }
        out_rows.append({
            "tl": f"{num}#{i}", "bn": num, "first": first or "—", "last": last or "Бронь TL",
            "email": email or "tl@noemail.invalid", "phone": phone or "",
            "rid": rid, "rname": cat, "ci": ci, "co": co, "nights": nights,
            "adults": adults, "children": 0, "src": src, "status": "paid" if paid_full else "confirmed",
            "total": price, "rpt": price, "prepaid": pp, "remaining": max(0, price - pp),
            "meta": meta,
        })

# Генерим SQL
# booking_number НЕ заполняем (на нём отдельный unique-constraint, а группа = N
# строк с одним номером). Синк делает так же. Номер брони хранится в tl_reservation_id.
cols = ("tl_reservation_id, first_name, last_name, email, phone, room_id, room_name, "
        "check_in, check_out, nights, adults, children, meal_plan, source, payment_status, "
        "total_price, room_price_total, breakfast_total, prepayment_amount, remaining_amount, "
        "special_requests, id_consent, terms_consent")
vals = []
for x in out_rows:
    vals.append("(" + ", ".join([
        sq(x["tl"]), sq(x["first"]), sq(x["last"]), sq(x["email"]), sq(x["phone"]),
        sq(x["rid"]), sq(x["rname"]), sq(x["ci"]), sq(x["co"]), str(x["nights"]), str(x["adults"]),
        str(x["children"]), "'room_only'", sq(x["src"]), sq(x["status"]),
        str(x["total"]), str(x["rpt"]), "0", str(x["prepaid"]), str(x["remaining"]),
        jsq(x["meta"]), "true", "true",
    ]) + ")")

min_ci = min(x["ci"] for x in out_rows)
max_co = max(x["co"] for x in out_rows)
upd = (
    "ON CONFLICT (tl_reservation_id) DO UPDATE SET\n"
    "  first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,\n"
    "  email=EXCLUDED.email, phone=EXCLUDED.phone, room_id=EXCLUDED.room_id, room_name=EXCLUDED.room_name,\n"
    "  check_in=EXCLUDED.check_in, check_out=EXCLUDED.check_out, nights=EXCLUDED.nights, adults=EXCLUDED.adults,\n"
    "  source=EXCLUDED.source, payment_status=EXCLUDED.payment_status, total_price=EXCLUDED.total_price,\n"
    "  room_price_total=EXCLUDED.room_price_total, prepayment_amount=EXCLUDED.prepayment_amount,\n"
    "  remaining_amount=EXCLUDED.remaining_amount, special_requests=EXCLUDED.special_requests;"
)
parts = [
    "-- Импорт броней из отчёта TravelLine. Чистим период и заливаем заново (idempotent).",
    "-- Брони с сайта/вручную (tl_reservation_id IS NULL) НЕ трогаются.",
    f"DELETE FROM public.bookings WHERE tl_reservation_id IS NOT NULL "
    f"AND check_in >= '{min_ci}' AND check_in <= '{max_co}';",
    "",
]
BATCH = 100
for b in range(0, len(vals), BATCH):
    chunk = vals[b:b + BATCH]
    parts.append(f"INSERT INTO public.bookings ({cols}) VALUES")
    parts.append(",\n".join(chunk))
    parts.append(upd)
    parts.append("")
sql = "\n".join(parts)
with io.open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"bookings rows (после разбивки групп): {len(out_rows)} из {len(rows)} строк отчёта")
print(f"SQL → {OUT}  ({len(sql)} симв.)")
if unknown_cats:
    print("⚠ НЕ сопоставлены категории:", unknown_cats)
else:
    print("✓ все категории сопоставлены")
# распределение по типам
from collections import Counter
print("по типам:", dict(Counter(x["rid"] for x in out_rows)))
print("по каналам:", dict(Counter(x["src"] for x in out_rows)))
