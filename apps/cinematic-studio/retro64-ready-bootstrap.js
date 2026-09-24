(function () {
  if (window.__retroReady && typeof window.__retroReady.then === 'function') return;

  const V4_REFERENCE_URL = './data/retro64-reference-sync-v4.json';
  const REQUIRED_GAME = { value: 'G001', label: 'Contra' };

  // GitHub Pages serves the Cinematic Studio app from /cinematic-studio/.
  // The legacy Retro UI used ../data/... which resolves to the site root
  // (/data/...) and therefore returned HTTP 404. Normalize only the Retro
  // reference-sync asset so the existing UI can continue to use the same
  // runtime contract without changing unrelated fetches.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const raw = String(input && input.url ? input.url : input || '');
    const match = raw.match(/(?:^|\/)data\/(retro64-reference-sync-v4\.json)(?:[?#].*)?$/);
    if (match) {
      const target = new URL('./data/' + match[1], location.href).href;
      if (typeof input === 'string' || input instanceof URL) return nativeFetch(target, init);
      if (typeof Request !== 'undefined' && input instanceof Request) {
        return nativeFetch(new Request(target, input), init);
      }
      return nativeFetch(target, init);
    }
    return nativeFetch(input, init);
  };

  function waitForDom() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  function normalizeGame(game) {
    return {
      id: game.game_id,
      name: game.game_name,
      worksheet: game.sheet,
      world: game.world || '',
      terrain: game.terrain || '',
      obstacles: game.obstacles || '',
      enemies: game.enemies || '',
      moves: game.moves || '',
      weapons: game.weapons || '',
      powerUps: game.powerUps || '',
      abilities: game.abilities || '',
      props: game.props || '',
      camera: game.camera || '',
      vfx: game.vfx || '',
      sound: game.audio || '',
      realistic: game.realistic || '',
      frames: Array.isArray(game.frames) ? game.frames.map((frame, i) => [frame.title || `Frame ${i + 1}`, frame.action || '']) : []
    };
  }

  async function loadV4() {
    const response = await fetch(V4_REFERENCE_URL, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`v4 reference HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.games) || payload.games.length === 0) throw new Error('v4 reference contains no games');
    return payload;
  }

  function findGameSelect() {
    return document.querySelector('#retroGame');
  }

  function ensureRetroGameOptions(games) {
    const select = findGameSelect();
    if (!select) return false;

    const current = select.value;
    const wanted = new Map();
    Array.from(select.options).forEach(option => wanted.set(option.value, option.textContent));
    wanted.set(REQUIRED_GAME.value, REQUIRED_GAME.label);
    games.forEach(game => {
      if (game.id && game.name) wanted.set(game.id, game.name);
    });

    const fragment = document.createDocumentFragment();
    wanted.forEach((label, value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      fragment.appendChild(option);
    });
    select.replaceChildren(fragment);
    if (current && wanted.has(current)) select.value = current;
    else select.value = REQUIRED_GAME.value;

    window.__retroReferenceGames = games;
    window.__retroReferenceRegistry = Object.fromEntries(games.map(game => [game.id, game]));
    return true;
  }

  function activateRetroView() {
    const retroView = document.querySelector('[data-view="retro"]');
    if (!retroView) return false;

    document.querySelectorAll('[data-view]').forEach(view => {
      const active = view === retroView;
      view.classList.toggle('active', active);
      if (active) {
        view.style.display = 'block';
      } else {
        view.style.display = 'none';
      }
    });

    document.querySelectorAll('[data-nav]').forEach(button => {
      button.classList.toggle('nav-active', button.dataset.nav === 'retro');
    });

    return true;
  }

  function installNavigationBridge() {
    const activate = () => {
      activateRetroView();
      requestAnimationFrame(activateRetroView);
      setTimeout(activateRetroView, 0);
      setTimeout(activateRetroView, 100);
    };

    document.addEventListener('click', event => {
      const nav = event.target && event.target.closest && event.target.closest('[data-nav="retro"]');
      if (nav) {
        event.preventDefault();
        activate();
      }
    }, true);

    window.__openRetro64Direct = activate;
  }

  window.__retroReady = (async () => {
    await waitForDom();
    const payload = await loadV4();
    const games = payload.games.map(normalizeGame);

    let populated = ensureRetroGameOptions(games);
    installNavigationBridge();

    [0, 50, 150, 300, 600, 1000].forEach(delay => {
      setTimeout(() => ensureRetroGameOptions(games), delay);
    });

    populated = populated || !!findGameSelect();
    window.__retroBootstrap = {
      version: '1.6',
      readyAt: new Date().toISOString(),
      gameSelect: '#retroGame',
      selectedGame: (findGameSelect() && findGameSelect().value) || REQUIRED_GAME.value,
      navigationBridge: true,
      directViewActivation: true,
      referenceSync: 'v4-direct',
      referenceSyncCount: games.length,
      selectorPopulated: populated,
      referencePathFix: true
    };
    return window.__retroBootstrap;
  })();

  window.__retroReady.catch(error => {
    window.__retroBootstrapError = String(error && error.message || error);
    console.error('[RETRO-64] bootstrap failed:', error);
  });
})();