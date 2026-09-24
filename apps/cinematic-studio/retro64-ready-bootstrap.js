(function () {
  if (window.__retroReady && typeof window.__retroReady.then === 'function') return;

  const REQUIRED_GAME = { value: 'G001', label: 'Contra' };

  function waitForDom() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  function ensureRetroSelect() {
    const select = document.querySelector('#retroGame');
    if (!select) throw new Error('Retro-64 bootstrap: #retroGame not found');

    const hasRequired = Array.from(select.options || []).some(o => o.value === REQUIRED_GAME.value);
    if (!hasRequired) {
      const option = document.createElement('option');
      option.value = REQUIRED_GAME.value;
      option.textContent = REQUIRED_GAME.label;
      select.appendChild(option);
    }
    return select;
  }

  function waitForRetroSelect(timeoutMs = 10000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          resolve(ensureRetroSelect());
        } catch (error) {
          if (Date.now() - started >= timeoutMs) {
            reject(error);
            return;
          }
          setTimeout(tick, 50);
        }
      };
      tick();
    });
  }

  window.__retroReady = (async () => {
    await waitForDom();
    await new Promise(requestAnimationFrame);
    const select = await waitForRetroSelect();
    window.__retroBootstrap = {
      version: '1.1',
      readyAt: new Date().toISOString(),
      gameSelect: '#retroGame',
      selectedGame: select.value || REQUIRED_GAME.value
    };
    return window.__retroBootstrap;
  })();

  window.__retroReady.catch(error => {
    window.__retroBootstrapError = String(error && error.message || error);
    console.error('[RETRO-64] bootstrap failed:', error);
  });
})();
