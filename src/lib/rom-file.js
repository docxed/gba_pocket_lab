const gbaRomSize = 32 * 1024 * 1024;
const chunkSize = 1024 * 1024;

export async function readGbaRom(file, romSize = gbaRomSize) {
  if (file.size <= romSize) return new Uint8Array(await file.arrayBuffer());

  // A dump may have extra erased bytes after the cartridge data.
  let padding;
  for (let offset = romSize; offset < file.size; offset += chunkSize) {
    const tail = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
    padding ??= tail[0];
    if ((padding !== 0x00 && padding !== 0xff) || tail.some(byte => byte !== padding)) {
      throw Error('The ROM has extra data after the supported cartridge size. Select the original ROM file.');
    }
  }
  return new Uint8Array(await file.slice(0, romSize).arrayBuffer());
}
