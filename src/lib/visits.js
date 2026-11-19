const sessionKey = 'poke-lab:visit-attempted';

export function visitCounter(endpoint, request = globalThis.fetch, getStorage = () => globalThis.sessionStorage) {
  const url = endpoint?.trim();
  let recorded = false;

  async function read(method) {
    if (!url) return null;
    const response = await request(url, {
      method,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('Visit counter unavailable');
    const { total } = await response.json();
    if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid visit total');
    return total;
  }

  return {
    enabled: Boolean(url),
    async record() {
      if (!url || recorded) return;
      recorded = true;
      try {
        const storage = getStorage();
        if (storage.getItem(sessionKey)) return;
        storage.setItem(sessionKey, '1');
      } catch {
        return;
      }
      await read('POST');
    },
    total: () => read('GET')
  };
}
