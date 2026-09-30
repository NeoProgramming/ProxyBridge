const URL = 'https://proxmint.com/api/geoip';

async function fetchFromHere(label) {
  const t0 = performance.now();
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    const dt = Math.round(performance.now() - t0);
    const text = await res.text();
    return { label, ok: true, status: res.status, ms: dt, body: text };
  } catch (e) {
    return { label, ok: false, error: String(e) };
  }
}

function render(results) {
  const root = document.getElementById('results');
  root.innerHTML = '';
  for (const r of results) {
    const h = document.createElement('h4');
    h.textContent = r.label;
    root.appendChild(h);

    const pre = document.createElement('pre');
    if (r.ok) {
      pre.className = 'ok';
      pre.textContent = `HTTP ${r.status} (${r.ms} ms)\n${r.body}`;
    } else {
      pre.className = 'err';
      pre.textContent = 'Ошибка: ' + r.error;
    }
    root.appendChild(pre);
  }
}

document.getElementById('run').addEventListener('click', async () => {
  const out = [];

  // 1. Контекст: popup
  out.push(await fetchFromHere('1) POPUP (окно расширения)'));

  // 2. Контекст: service worker
  try {
    const swResult = await chrome.runtime.sendMessage({ type: 'fetch-test' });
    out.push({
      label: '2) SERVICE WORKER (background)',
      ok: swResult.ok,
      status: swResult.status,
      ms: swResult.ms,
      body: swResult.body,
      error: swResult.error
    });
  } catch (e) {
    out.push({ label: '2) SERVICE WORKER (background)', ok: false, error: String(e) });
  }

  // 3. Контекст: content script в активной вкладке
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('нет активной вкладки');

    const [inj] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: async (url) => {
        const t0 = performance.now();
        try {
          const res = await fetch(url, { cache: 'no-store' });
          const dt = Math.round(performance.now() - t0);
          const text = await res.text();
          return { ok: true, status: res.status, ms: dt, body: text };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      args: [URL]
    });

    const r = inj.result;
    out.push({
      label: '3) CONTENT SCRIPT (ISOLATED, активная вкладка)',
      ok: r.ok,
      status: r.status,
      ms: r.ms,
      body: r.body,
      error: r.error
    });
  } catch (e) {
    out.push({
      label: '3) CONTENT SCRIPT (ISOLATED, активная вкладка)',
      ok: false,
      error: String(e)
    });
  }

  render(out);
});
