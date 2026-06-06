import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import QRCode from "qrcode";

// Регистрируем шрифт с поддержкой кириллицы
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxP.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc9.ttf",
      fontWeight: 700,
    },
  ],
});

const NAVY = "#1a1a2e";
const GOLD = "#C9A96E";
const LIGHT = "#f5f2ee";
const BORDER = "#e8e4de";

const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    backgroundColor: "#ffffff",
    padding: 0,
  },

  // ─── Шапка ───────────────────────────────
  header: {
    backgroundColor: NAVY,
    padding: "16 24",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  hotelLabel: {
    color: GOLD,
    fontSize: 7,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  hotelName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
  },
  hotelCity: { color: "#999999", fontSize: 8, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  voucherLabel: { color: GOLD, fontSize: 7, letterSpacing: 3 },
  voucherNum: { color: "#ffffff", fontSize: 16, fontWeight: 700 },
  phone: { color: "#cccccc", fontSize: 9, marginTop: 4 },

  // ─── Секция деталей брони ─────────────────
  detailsRow: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  detailCell: {
    flex: 1,
    padding: "10 12",
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderRightStyle: "solid",
  },
  detailCellLast: { flex: 1, padding: "10 12" },
  cellLabel: { color: "#999999", fontSize: 7, letterSpacing: 1, marginBottom: 3 },
  cellValue: { color: NAVY, fontSize: 10, fontWeight: 700 },
  cellValueSmall: { color: NAVY, fontSize: 9 },

  // ─── Таблица гостей ───────────────────────
  section: { padding: "0 24" },
  sectionTitle: {
    color: NAVY,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    padding: "10 0 6",
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    borderBottomStyle: "solid",
    marginBottom: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    padding: "5 8",
  },
  tableRow: {
    flexDirection: "row",
    padding: "7 8",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "7 8",
    backgroundColor: LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  th: { color: "#ffffff", fontSize: 7, fontWeight: 700, letterSpacing: 1 },
  td: { color: NAVY, fontSize: 9 },
  col0: { width: 40 },
  col1: { width: 100 },
  col2: { flex: 1 },
  col3: { width: 120 },
  col4: { width: 80 },

  // ─── Итого + QR ──────────────────────────
  footer: {
    flexDirection: "row",
    padding: "14 24",
    backgroundColor: LIGHT,
    borderTopWidth: 2,
    borderTopColor: GOLD,
    borderTopStyle: "solid",
    marginTop: 8,
    alignItems: "center",
  },
  footerLeft: { flex: 1 },
  footerCenter: { flex: 1 },
  footerRight: { width: 80, alignItems: "center" },
  totalLabel: { color: "#999999", fontSize: 7, letterSpacing: 1, marginBottom: 2 },
  totalValue: { color: GOLD, fontSize: 16, fontWeight: 700 },
  prepayLabel: { color: "#999999", fontSize: 7, marginTop: 4 },
  prepayValue: { color: NAVY, fontSize: 10, fontWeight: 700 },
  address: { color: "#666666", fontSize: 8, lineHeight: 1.6 },
  qrLabel: { color: "#999999", fontSize: 6, letterSpacing: 1, marginTop: 3 },

  // ─── Нижняя полоса ───────────────────────
  strip: {
    backgroundColor: NAVY,
    padding: "6 24",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stripText: { color: "#666666", fontSize: 7 },
  stripGold: { color: GOLD, fontSize: 7 },
});

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type VoucherData = {
  booking_number: string;
  first_name: string;
  last_name: string;
  salutation?: string | null;
  phone: string;
  email: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  meal_plan: string;
  total_price: number;
  prepayment_amount: number;
  payment_status: string;
  booking_id?: string;
  qrDataUrl?: string;
};

export function VoucherDocument({ b }: { b: VoucherData }) {
  const meal = b.meal_plan === "breakfast" ? "Завтрак включён" : "Без питания";
  const salut = b.salutation === "mrs" ? "MRS." : "MR.";
  const totalFmt = new Intl.NumberFormat("ru-RU").format(b.total_price);
  const prepayFmt = new Intl.NumberFormat("ru-RU").format(b.prepayment_amount);
  const guestsLabel = `${b.adults} взр.${b.children ? ` + ${b.children} дет.` : ""}`;

  return (
    <Document title={`Ваучер ${b.booking_number}`} author="Гостиница Полуостров">
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* ── Шапка ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.hotelLabel}>Гостиница</Text>
            <Text style={s.hotelName}>ПОЛУОСТРОВ</Text>
            <Text style={s.hotelCity}>Петропавловск-Камчатский</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.voucherLabel}>ВАУЧЕР</Text>
            <Text style={s.voucherNum}>{b.booking_number}</Text>
            <Text style={s.phone}>+7 (914) 994-57-57</Text>
          </View>
        </View>

        {/* ── Строка деталей ── */}
        <View style={s.detailsRow}>
          <View style={s.detailCell}>
            <Text style={s.cellLabel}>ТИП НОМЕРА</Text>
            <Text style={s.cellValue}>{b.room_name}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.cellLabel}>ЗАЕЗД</Text>
            <Text style={s.cellValue}>{fmt(b.check_in)}</Text>
            <Text style={s.cellValueSmall}>с 14:00</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.cellLabel}>ВЫЕЗД</Text>
            <Text style={s.cellValue}>{fmt(b.check_out)}</Text>
            <Text style={s.cellValueSmall}>до 12:00</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.cellLabel}>НОЧЕЙ</Text>
            <Text style={s.cellValue}>{b.nights}</Text>
          </View>
          <View style={s.detailCell}>
            <Text style={s.cellLabel}>ГОСТЕЙ</Text>
            <Text style={s.cellValue}>{guestsLabel}</Text>
          </View>
          <View style={s.detailCellLast}>
            <Text style={s.cellLabel}>ПИТАНИЕ</Text>
            <Text style={s.cellValue}>{meal}</Text>
          </View>
        </View>

        {/* ── Список гостей ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Список гостей</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.col0]}>ПОЛ</Text>
            <Text style={[s.th, s.col1]}>ФАМИЛИЯ</Text>
            <Text style={[s.th, s.col2]}>ИМЯ</Text>
            <Text style={[s.th, s.col3]}>ТЕЛЕФОН</Text>
            <Text style={[s.th, s.col4]}>EMAIL</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.td, s.col0]}>{salut}</Text>
            <Text style={[s.td, s.col1]}>{b.last_name.toUpperCase()}</Text>
            <Text style={[s.td, s.col2]}>{b.first_name.toUpperCase()}</Text>
            <Text style={[s.td, s.col3]}>{b.phone}</Text>
            <Text style={[s.td, s.col4]}>{b.email}</Text>
          </View>
        </View>

        {/* ── Футер: итого + адрес + QR ── */}
        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.totalLabel}>ИТОГО К ОПЛАТЕ</Text>
            <Text style={s.totalValue}>₽ {totalFmt}</Text>
            <Text style={s.prepayLabel}>Предоплата (оплачена)</Text>
            <Text style={s.prepayValue}>₽ {prepayFmt}</Text>
          </View>
          <View style={s.footerCenter}>
            <Text style={s.address}>
              {"Гостиница «Полуостров»\n"}
              {"ул. Абеля, 41\n"}
              {"Петропавловск-Камчатский\n"}
              {"+7 (914) 994-57-57\n"}
              {"poluostrov-hotel.ru"}
            </Text>
          </View>
          <View style={s.footerRight}>
            {b.qrDataUrl ? (
              <Image src={b.qrDataUrl} style={{ width: 72, height: 72 }} />
            ) : null}
            <Text style={s.qrLabel}>ОНЛАЙН-ЧЕКИН</Text>
          </View>
        </View>

        {/* ── Нижняя полоска ── */}
        <View style={s.strip}>
          <Text style={s.stripText}>
            Документ сформирован: {fmtLong(new Date().toISOString())}
          </Text>
          <Text style={s.stripGold}>
            Данный документ является подтверждением бронирования
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ─── Генерация PDF в Buffer ────────────────────────────────────────────────────

