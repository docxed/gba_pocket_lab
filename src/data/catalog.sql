CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover TEXT NOT NULL,
  menu_hint TEXT NOT NULL,
  menu_hint_th TEXT,
  patch_note TEXT NOT NULL,
  patch_note_th TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  description TEXT,
  description_th TEXT,
  platform TEXT NOT NULL DEFAULT 'GBA' CHECK (platform IN ('GBA', 'NDS')),
  project_url TEXT
);

CREATE TABLE builds (
  game_id TEXT NOT NULL REFERENCES games(id),
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (game_id, sort_order)
);

INSERT INTO games (id, name, cover, menu_hint, patch_note, patch_note_th, sort_order) VALUES
  ('soulgold', 'Pokémon SoulGold', 'covers/soulgold.webp', 'Start > Cheat', 'Opens the Debug menu.', 'เปิดเมนู Debug', 1),
  ('soulgold-mega-xtream', 'Pokémon SoulGold MegaXtream', 'covers/soulgold-mega-xtream.webp', 'Start > Cheat', 'Opens the Debug menu.', 'เปิดเมนู Debug', 2),
  ('emerald-crest', 'Pokémon Emerald Crest', 'covers/emerald-crest.png', 'Start > Right > CHEAT', 'Press Right in Start to find CHEAT.', 'กดขวาในเมนู Start เพื่อไปที่ CHEAT', 3),
  ('wally-quest', 'Pokémon Wally Quest', 'covers/wally-quest.png', 'Start > MAX CHEATS', 'Sets money to 999,999 and tops up Rare Candy and Master Ball to 99 each if there is room.', 'เติมเงินเป็น 999,999 และเติม Rare Candy กับ Master Ball ให้ครบอย่างละ 99 เมื่อกระเป๋ามีที่พอ', 4),
  ('unbound', 'Pokémon Unbound', 'covers/unbound.webp', 'Start > Cheat', 'Cheat is the rightmost icon in Start.', 'Cheat คือไอคอนขวาสุดของเมนู Start', 5),
  ('theta-emerald', 'Pokémon Theta Emerald: The Last Dance', 'covers/theta-emerald.webp', 'Start > Cheat', 'Sets money to 9,999,999 and tops up Rare Candy and Master Ball to 99 each if there is room.', 'เติมเงินเป็น 9,999,999 และเติม Rare Candy กับ Master Ball ให้ครบอย่างละ 99 เมื่อกระเป๋ามีที่พอ', 6),
  ('generation-3-evolved', 'Pokémon Generation 3 Evolved', 'covers/generation-3-evolved.png', 'Start > Cheat', 'Opens the Debug menu.', 'เปิดเมนู Debug', 7),
  ('national-dex', 'Pokémon Emerald: Complete National Dex Edition', 'covers/national-dex.png', 'Start > Cheat', 'Sets money to 999,999 and tops up Rare Candy and Master Ball to 99 each if there is room.', 'เติมเงินเป็น 999,999 และเติม Rare Candy กับ Master Ball ให้ครบอย่างละ 99 เมื่อกระเป๋ามีที่พอ', 8),
  ('hns-legends', 'Pokémon Heart & Soul Legends', 'covers/hns-legends.webp', 'Start > Cheat', 'Opens the game’s Debug menu.', 'เปิดเมนู Debug ของเกม', 9);
UPDATE games
SET description = 'An Emerald ROM hack that makes all 386 Pokémon obtainable and keeps the difficulty close to the original.',
    description_th = 'ROM แฮ็กของ Pokémon Emerald ที่ให้คุณหาโปเกมอนได้ครบทั้ง 386 ตัว โดยมีความยากใกล้เคียงกับเกมต้นฉบับ',
    project_url = 'https://www.romhacking.net/hacks/1991/'
WHERE id = 'national-dex';

INSERT INTO games (id, name, cover, menu_hint, patch_note, patch_note_th, sort_order, platform, menu_hint_th) VALUES
  ('origin-heart-gold', 'Pokémon Origin Heart Gold', 'covers/origin-heart-gold.webp', 'Hold L and tap SELECT while walking', 'Sets money to 999,999 and tops up Rare Candy and Master Ball to 99 each if there is room.', 'เติมเงินเป็น 999,999 และเติม Rare Candy กับ Master Ball ให้ครบอย่างละ 99 เมื่อกระเป๋ามีที่พอ', 10, 'NDS', 'กด L ค้างแล้วแตะ SELECT ตอนเดินในฉาก');

INSERT INTO builds VALUES
  ('soulgold', 1, 'English 1.2.1'),
  ('soulgold', 2, 'TH Nonplae 1.2'),
  ('soulgold-mega-xtream', 1, 'vTH.1.1.4-4'),
  ('emerald-crest', 1, 'v1.0.F'),
  ('wally-quest', 1, 'v1.1'),
  ('unbound', 1, 'English v2.1.1.1'),
  ('unbound', 2, 'TH Nonplae 2.0'),
  ('theta-emerald', 1, 'The Last Dance (Completo)'),
  ('generation-3-evolved', 1, 'v1.0.26'),
  ('national-dex', 1, 'Standard'),
  ('national-dex', 2, 'Lite'),
  ('hns-legends', 1, 'M9.8'),
  ('origin-heart-gold', 1, 'English v1.0.0-rc8'),
  ('origin-heart-gold', 2, 'TH Nonplae v1.3');
