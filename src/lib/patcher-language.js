const storageKey = 'poke-lab-patcher-language';

export function patcherLanguage(browser = window) {
  try {
    const stored = browser.localStorage.getItem(storageKey);
    if (stored === 'en' || stored === 'th') return stored;
  } catch {
    // The browser language still applies if local storage is disabled.
  }
  const preferred = browser.navigator.languages?.[0] || browser.navigator.language;
  return /^th(?:-|$)/i.test(preferred) ? 'th' : 'en';
}

export function savePatcherLanguage(language, browser = window) {
  try {
    browser.localStorage.setItem(storageKey, language);
  } catch {
    // The current selection still applies for this page.
  }
}

export const patcherCopy = {
  en: {
    language: 'Page language',
    game: 'Game',
    platform: 'Platform',
    ndsRomHint: 'Use a .nds file already patched to one of these ROM hack versions.',
    ndsFileType: '.nds file',
    ndsSuccess: 'Patched. Open the new ROM.',
    search: 'Search games or versions',
    noGames: 'No matching games',
    builds: 'Supported builds',
    projectPage: 'Project page',
    supportProject: 'Support this project',
    supportFeedback: 'You can include feedback with your donation.',
    romHint: 'Use a .gba file already patched to one of these ROM hack versions.',
    rom: 'ROM file',
    choose: 'Choose or drop a ROM',
    replace: 'Click to replace',
    fileType: '.gba file',
    remove: 'Remove ROM',
    patch: 'Patch & download',
    privacy: 'Your ROM stays on this device.',
    catalogError: 'Could not load the game list. Reload the page to try again.',
    multipleFiles: 'Choose one ROM at a time.',
    patching: 'Checking the ROM and applying the patch...',
    success: 'Patched. Open the new ROM and choose',
    untested: 'This build passed structure checks and still needs emulator testing.',
    patchError: 'Could not patch the ROM.'
  },
  th: {
    language: 'ภาษาหน้าเว็บ',
    game: 'เกม',
    platform: 'เครื่องเกม',
    ndsRomHint: 'ใช้ไฟล์ .nds ของ ROM แฮ็กตามเวอร์ชันที่แสดงด้านบน',
    ndsFileType: 'ไฟล์ .nds',
    ndsSuccess: 'แพตช์สำเร็จ เปิด ROM ใหม่แล้วใช้ทางลัด',
    search: 'ค้นหาเกมหรือเวอร์ชัน',
    noGames: 'ไม่พบเกมที่ตรงกัน',
    builds: 'เวอร์ชันที่รองรับ',
    projectPage: 'หน้าโครงการ',
    supportProject: 'สนับสนุนโครงการนี้',
    supportFeedback: 'คุณสามารถฝากความคิดเห็นพร้อมการสนับสนุนได้',
    romHint: 'ใช้ไฟล์ .gba ของ ROM แฮ็กตามเวอร์ชันที่แสดงด้านบน',
    rom: 'ไฟล์ ROM',
    choose: 'เลือกหรือลากไฟล์ ROM มาวาง',
    replace: 'กดเพื่อเปลี่ยนไฟล์',
    fileType: 'ไฟล์ .gba',
    remove: 'เอาไฟล์ ROM ออก',
    patch: 'แพตช์และดาวน์โหลด',
    privacy: 'ไฟล์ ROM อยู่ในเครื่องของคุณ',
    catalogError: 'โหลดรายชื่อเกมไม่ได้ โปรดรีโหลดหน้าแล้วลองใหม่',
    multipleFiles: 'เลือกไฟล์ ROM ทีละไฟล์',
    patching: 'กำลังตรวจและแพตช์ ROM…',
    success: 'แพตช์สำเร็จ เปิด ROM ใหม่แล้วเลือก',
    untested: 'ตรวจโครงสร้างผ่านแล้ว รุ่นนี้ยังต้องทดสอบในอีมูเลเตอร์',
    patchError: 'แพตช์ ROM ไม่สำเร็จ'
  }
};
