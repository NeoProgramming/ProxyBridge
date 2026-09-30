chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'fetch-test') return;
  (async () => {
    const url = 'https://proxmint.com/api/geoip';
    const t0 = performance.now();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const dt = Math.round(performance.now() - t0);
      const text = await res.text();
      sendResponse({ ok: true, status: res.status, ms: dt, body: text });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // важно: асинхронный sendResponse
});
