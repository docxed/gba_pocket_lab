CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover TEXT NOT NULL,
  menu_hint TEXT NOT NULL,
  patch_note TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE builds (
  game_id TEXT NOT NULL REFERENCES games(id),
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (game_id, sort_order)
);

INSERT INTO games VALUES
  ('soulgold', 'Pokémon SoulGold', 'covers/soulgold.webp', 'Start > Cheat', 'Opens the existing debug menu and keeps Docs available.', 1),
  ('emerald-crest', 'Pokémon Emerald Crest', 'covers/emerald-crest.png', 'Start > Right > CHEAT', 'Adds CHEAT to the right page of the Start menu and opens the existing debug menu.', 2),
  ('wally-quest', 'Pokémon Wally Quest', 'covers/wally-quest.png', 'Start > MAX CHEATS', 'Sets money to 999,999 and tops up Rare Candies and Master Balls to 99 each when the bag has room.', 3);
INSERT INTO builds VALUES
  ('soulgold', 1, 'English 1.2.1'),
  ('soulgold', 2, 'TH Nonplae 1.2'),
  ('emerald-crest', 1, 'v1.0.F'),
  ('wally-quest', 1, 'v1.1');
