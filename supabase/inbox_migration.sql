-- ============================================================
-- Этап 8: CRM Инбокс — conversations + messages
-- Запустить в Supabase SQL Editor
-- ============================================================

-- Диалоги (один на каждого гостя / тему)
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name       TEXT NOT NULL DEFAULT '',
  guest_email      TEXT NOT NULL DEFAULT '',
  guest_phone      TEXT DEFAULT '',
  channel          TEXT NOT NULL DEFAULT 'website',
  -- website | telegram | vk | phone | email | travelline
  status           TEXT NOT NULL DEFAULT 'open',
  -- open | resolved | spam
  unread_count     INT NOT NULL DEFAULT 0,
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  last_preview     TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Сообщения внутри диалога
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender            TEXT NOT NULL DEFAULT 'guest',  -- guest | admin
  body              TEXT NOT NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg   ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_booking    ON conversations(booking_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Только администраторы и менеджеры видят инбокс
CREATE POLICY "admin_conversations" ON conversations
  FOR ALL TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin') OR
    private.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "admin_messages" ON messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          private.has_role(auth.uid(), 'admin') OR
          private.has_role(auth.uid(), 'manager')
        )
    )
  );

-- Service role обходит RLS — нужно для server functions
-- (createClient с SUPABASE_SERVICE_ROLE_KEY уже обходит, ничего дополнительного не нужно)
