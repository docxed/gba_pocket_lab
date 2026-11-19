CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover TEXT NOT NULL
);

CREATE TABLE builds (
  game_id TEXT NOT NULL REFERENCES games(id),
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (game_id, sort_order)
);

INSERT INTO games VALUES ('soulgold', 'Pokémon SoulGold', 'covers/soulgold.webp');
INSERT INTO builds VALUES
  ('soulgold', 1, 'English 1.2.1'),
  ('soulgold', 2, 'TH Nonplae 1.2');
