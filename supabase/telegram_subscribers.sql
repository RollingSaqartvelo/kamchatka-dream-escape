-- Подписчики Telegram-уведомлений
CREATE TABLE IF NOT EXISTS telegram_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
  chat_id     BIGINT NOT NULL,
  first_name  TEXT DEFAULT '',
  username    TEXT DEFAULT '',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_sub_booking ON telegram_subscribers(booking_id);
CREATE INDEX IF NOT EXISTS idx_tg_sub_chat    ON telegram_subscribers(chat_id);
