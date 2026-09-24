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

  function showRetroView() {
    const select = document.querySelector('#retroGame');
    if (!select) return false;

    let node = select;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('view')) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        node.classList.add('active');
        return true;
      }
      node = node.parentElement;
    }

    return false;
  }

  function installRetroNavigationBridge() {
    const activate = () => {
      showRetroView();
      requestAnimationFrame(showRetroView);
      setTimeout(showRetroView, 0);
    };

    document.addEventListener('click', event => {
      const nav = event.target && event.target.closest && event.target.closest('[data-nav="retro"]');
      if (nav) activate();
    }, true);

    document.querySelectorAll('[data-nav="retro"]').forEach(nav => {
      nav.addEventListener('click', activate, true);
    });

    const observer = new MutationObserver(() => {
      const select = document.querySelector('#retroGame');
      if (select && select.offsetParent !== null) return;
      const retroNav = document.querySelector('[data-nav="retro"].nav-active, [data-nav="retro"].on');
      if (retroNav) activate();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  }

  function waitForRetroSelect(timeoutMs = 10000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          const select = ensureRetroSelect();
          installRetroNavigationBridge();
          resolve(select);
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
      version: '1.2',
      readyAt: new Date().toISOString(),
      gameSelect: '#retroGame',
      selectedGame: select.value || REQUIRED_GAME.value,
      navigationBridge: true
    };
    return window.__retroBootstrap;
  })();

  window.__retroReady.catch(error => {
    window.__retroBootstrapError = String(error && error.message || error);
    console.error('[RETRO-64] bootstrap failed:', error);
  });
})();