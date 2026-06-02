-- Стандартные номера 17–23 стоят на «Ремонт» в TravelLine (партнёрский API
-- этот статус не отдаёт), поэтому проставляем его вручную: они скрываются из
-- шахматки и снимаются с продажи. Снять — кнопкой «В работу» на странице «Номера».
INSERT INTO public.room_maintenance (room_key, reason)
VALUES
  ('dvuhmestnyy-standart#17', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#18', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#19', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#20', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#21', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#22', 'Ремонт (TravelLine)'),
  ('dvuhmestnyy-standart#23', 'Ремонт (TravelLine)')
ON CONFLICT (room_key) DO NOTHING;
