-- Contador de turnos del bot para límite duro de seguridad
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS bot_turn_count INT NOT NULL DEFAULT 0;
