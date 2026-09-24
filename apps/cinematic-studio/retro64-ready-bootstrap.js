(function () {
  if (window.__retroReady && typeof window.__retroReady.then === 'function') return;

  const REQUIRED_GAME = { value: 'G001', label: 'Contra' };
  const V4_REFERENCE_URL = './data/retro64-reference-sync-v4.json';

  function waitForDom() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  function normalizeV4Game(game, sourceArtifact) {
    const frames = Array.isArray(game.frames)
      ? game.frames.map((frame, index) => [
          frame && frame.title ? frame.title : `Frame ${index + 1}`,
          frame && frame.action ? frame.action : ''
        ])
      : [];

    return {
      id: game.game_id,
      name: game.game_name,
      status: 'ACTIVE',
      durationSeconds: 60,
      format: '9:16',
      worksheet: game.sheet,
      world: game.world || '',
      terrain: game.terrain || '',
      obstacles: game.obstacles || '',
      enemies: game.enemies || 'Reference enemies and environmental opposition',
      moves: game.moves || '',
      weapons: game.weapons || '',
      powerUps: game.powerUps || '',
      abilities: game.abilities || '',
      props: game.props || '',
      camera: game.camera || '',
      vfx: game.vfx || '',
      sound: game.audio || '',
      realistic: game.realistic || '',
      frames
    };
  }

  // The legacy inline registry is loaded before this bootstrap's DOM-ready
  // callback. Merge the v4 registry into that inline source synchronously so
  // retroBoot() sees G006-G014 during its first read rather than replacing the
  // selector with the legacy G001-G005 set.
  function mergeV4ReferenceIntoInlineRegistry() {
    const inline = document.getElementById('kalp-retro-reference-inline');
    if (!inline || !inline.textContent.trim()) return { merged: false, count: 0 };

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', V4_REFERENCE_URL, false);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(null);

      if (xhr.status < 200 || xhr.status >= 300) {
        throw new Error(`v4 reference HTTP ${xhr.status}`);
      }

      const v4 = JSON.parse(xhr.responseText);
      if (!Array.isArray(v4.games) || !v4.games.length) {
        throw new Error('v4 reference contains no games');
      }

      const legacy = JSON.parse(inline.textContent);
      const existing = new Map((legacy.games || []).map(game => [game.id, game]));
      const sourceArtifact = v4.source_of_truth || 'KALP_Master_Reference_UNIFIED_v4.xlsx';

      for (const rawGame of v4.games) {
        const normalized = normalizeV4Game(rawGame, sourceArtifact);
        if (normalized.id && normalized.name) existing.set(normalized.id, normalized);
      }

      legacy.games = Array.from(existing.values());
      legacy.sourceArtifact = sourceArtifact;
      legacy.referenceSyncVersion = v4.version || '4.0';
      inline.textContent = JSON.stringify(legacy);

      return { merged: true, count: v4.games.length };
    } catch (error) {
      console.error('[RETRO-64] v4 reference merge failed:', error);
      window.__retroReferenceMergeError = String(error && error.message || error);
      return { merged: false, count: 0 };
    }
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

  // This must happen before DOMContentLoaded so the existing retroBoot()
  // listener consumes the merged registry on its first execution.
  const referenceMerge = mergeV4ReferenceIntoInlineRegistry();

  window.__retroReady = (async () => {
    await waitForDom();
    await new Promise(requestAnimationFrame);
    const select = await waitForRetroSelect();
    window.__retroBootstrap = {
      version: '1.3',
      readyAt: new Date().toISOString(),
      gameSelect: '#retroGame',
      selectedGame: select.value || REQUIRED_GAME.value,
      navigationBridge: true,
      referenceSync: referenceMerge.merged ? 'v4-merged' : 'legacy-only',
      referenceSyncCount: referenceMerge.count
    };
    return window.__retroBootstrap;
  })();

  window.__retroReady.catch(error => {
    window.__retroBootstrapError = String(error && error.message || error);
    console.error('[RETRO-64] bootstrap failed:', error);
  });
})();