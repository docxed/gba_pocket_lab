import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import seed from '../data/catalog.sql?raw';

export async function loadCatalog() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const database = new SQL.Database();
  try {
    database.run(seed);
    return database.exec(
      'SELECT g.id, g.name, g.cover, g.menu_hint, g.patch_note, g.patch_note_th, b.name FROM games g JOIN builds b ON b.game_id = g.id ORDER BY g.sort_order, b.sort_order'
    )[0].values.reduce((games, [id, name, cover, menuHint, noteEn, noteTh, build]) => {
      const game = games[id] ??= { id, name, cover: cover ? import.meta.env.BASE_URL + cover : null, menuHint, patchNotes: { en: noteEn, th: noteTh }, builds: [] };
      game.builds.push(build);
      return games;
    }, {});
  } finally {
    database.close();
  }
}
