/* KALP RETRO-64 v4.1
 * Reference-first, intent-driven, 3 reels x 8 unique shots.
 * Generation Intelligence v1.1
 */
(() => {
  'use strict';

  const R = 3;
  const S = 8;

  const ST = [
    'ENTRY',
    'THREAT INTRODUCTION',
    'FIRST ENGAGEMENT',
    'CAPABILITY ESCALATION',
    'MAJOR ESCALATION',
    'BREAKTHROUGH',
    'GATE / OBJECTIVE',
    'NEXT THREAT'
  ];

  const REF = [
    ['CONTRA', 'Contra', ['contra']],
    ['MARIO', 'Mario', ['mario', 'super mario']],
    ['KUNG_FU', 'Kung Fu', ['kung fu']],
    ['ROAD_FIGHTER', 'Road Fighter', ['road fighter']],
    ['NINJA_GAIDEN', 'Ninja Gaiden', ['ninja gaiden']],
    ['NINJA_TURTLES', 'Ninja Turtles', ['ninja turtles', 'teenage mutant ninja turtles']],
    ['DOUBLE_DRAGON', 'Double Dragon', ['double dragon']],
    ['EXCITEBIKE', 'Excitebike', ['excitebike']],
    ['ADVENTURE_ISLAND', 'Adventure Island', ['adventure island']],
    ['STREET_FIGHTER', 'Street Fighter', ['street fighter']],
    [
      'STREET_FIGHTER_ALPHA_2_NES',
      'Street Fighter Alpha 2 (NES)',
      ['street fighter alpha 2', 'alpha 2']
    ],
    ['MORTAL_KOMBAT', 'Mortal Kombat', ['mortal kombat']],
    ['TEKKEN', 'Tekken', ['tekken']]
  ];

  const SRC = [
    '../data/KALP_Retro_64_Master_Reference.xlsx',
    '../data/KALP_Master_Reference_UNIFIED_v3.xlsx'
  ];

  const SYNC = '../data/retro64-reference-sync-v4.json';

  const GAME_IDS = {
    NINJA_GAIDEN: 'G006',
    NINJA_TURTLES: 'G007',
    DOUBLE_DRAGON: 'G008',
    EXCITEBIKE: 'G009',
    ADVENTURE_ISLAND: 'G010',
    STREET_FIGHTER: 'G011',
    STREET_FIGHTER_ALPHA_2_NES: 'G012',
    MORTAL_KOMBAT: 'G013',
    TEKKEN: 'G014',
    KUNG_FU: 'G004',
    ROAD_FIGHTER: 'G003'
  };

  let st = {
    ref: '',
    book: '',
    hits: [],
    intent: '',
    status:
      'Select a game / character reference. KALP will automatically resolve the canonical Excel workbook.',
    kind: '',
    gen: false,
    reels: [],
    missionState: null
  };

  const reset = () => {
    st.reels = Array.from({ length: R }, (_, i) => ({
      n: i + 1,
      status: i ? 'LOCKED' : 'CURRENT',
      shots: Array.from({ length: S }, (_, j) => ({
        n: j + 1,
        t: ST[j],
        d: 'Awaiting mission generation.'
      }))
    }));

    st.missionState = null;
  };

  reset();

  let xlsx;

  function esc(x) {
    return String(x ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
    );
  }

  function setStatus(s, k = '') {
    st.status = s;
    st.kind = k;
  }

  function loadX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsx) return xlsx;

    xlsx = new Promise((ok, no) => {
      const s = document.createElement('script');

      s.src =
        'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

      s.onload = () => ok(window.XLSX);
      s.onerror = no;

      document.head.appendChild(s);
    });

    return xlsx;
  }

  async function read(f) {
    const q = await fetch(new URL(f, location.href), {
      cache: 'no-store'
    });

    if (!q.ok) {
      throw Error('Workbook HTTP ' + q.status);
    }

    const X = await loadX();

    const w = X.read(await q.arrayBuffer(), {
      type: 'array'
    });

    const rows = [];

    w.SheetNames.forEach(n => {
      X.utils
        .sheet_to_json(w.Sheets[n], { defval: '' })
        .forEach((r, i) => {
          rows.push({
            sheet: n,
            row: i + 2,
            data: r
          });
        });
    });

    return {
      file: f.split('/').pop(),
      rows
    };
  }

  async function readSync() {
    const q = await fetch(new URL(SYNC, location.href), {
      cache: 'no-store'
    });

    if (!q.ok) {
      throw Error('Reference sync HTTP ' + q.status);
    }

    return await q.json();
  }

  function syncRows(rec) {
    const rows = [
      {
        sheet: rec.sheet,
        row: 2,
        data: {
          Name: rec.game_name,
          Game_ID: rec.game_id,
          genre_core: rec.genre_core,
          world: rec.world,
          terrain: rec.terrain,
          obstacles: rec.obstacles,
          moves: rec.moves,
          weapons: rec.weapons,
          enemies: rec.enemies,
          camera: rec.camera,
          vfx: rec.vfx,
          audio: rec.audio
        }
      }
    ];

    (rec.frames || []).forEach((f, i) => {
      rows.push({
        sheet: rec.sheet,
        row: i + 18,
        data: {
          Frame: f.frame,
          'Frame Title': f.title,
          'Frame Action': f.action
        }
      });
    });

    return rows;
  }

  async function selectRef(id) {
    st.ref = id;
    st.book = '';
    st.hits = [];
    st.gen = false;
    reset();

    render();

    setStatus('LOADING CANONICAL EXCEL REFERENCE…', 'loading');

    const rr = REF.find(x => x[0] === id);

    if (!rr) {
      setStatus('REFERENCE NOT REGISTERED · ' + id, 'error');
      render();
      return;
    }

    try {
      let b;
      let h;

      for (const f of SRC) {
        try {
          const z = await read(f);
          const keys = rr[2];

          const a = z.rows.filter(x =>
            Object.values(x.data).some(v =>
              keys.some(k =>
                String(v)
                  .toLowerCase()
                  .includes(k)
              )
            )
          );

          if (a.length) {
            b = z;
            h = a;
            break;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      if (b) {
        st.book = b.file;
        st.hits = h;

        setStatus(
          'REFERENCE LOADED · ' +
            b.file +
            ' · ' +
            h.length +
            ' matching rows',
          'ready'
        );

        render();
        return;
      }

      const sync = await readSync();

      const rec = (sync.games || []).find(
        x => x.game_id === (GAME_IDS[id] || '')
      );

      if (!rec) {
        throw Error(
          rr[1] +
            ' was not found in the canonical Excel workbook or v4 reference sync.'
        );
      }

      st.book = sync.source_of_truth + ' · synced';
      st.hits = syncRows(rec);

      setStatus(
        'REFERENCE LOADED · ' +
          st.book +
          ' · ' +
          st.hits.length +
          ' matching rows',
        'ready'
      );

      render();
    } catch (e) {
      setStatus(
        'REFERENCE LOAD FAILED · ' + e.message,
        'error'
      );

      render();
    }
  }

  function intent() {
    return (
      document.querySelector('#r64Intent')?.value ||
      st.intent
    ).trim();
  }

  function rowText(x) {
    return Object.entries(x.data || {})
      .filter(([, v]) => String(v).trim())
      .map(
        ([k, v]) =>
          `${k}: ${String(v).trim()}`
      )
      .join(' · ');
  }

  function classify(x) {
    const s = (
      x.sheet +
      ' ' +
      rowText(x)
    ).toLowerCase();

    if (
      /character|protagonist|hero|player|avatar/.test(s)
    ) {
      return 'character';
    }

    if (
      /enemy|threat|boss|villain|opponent/.test(s)
    ) {
      return 'threat';
    }

    if (
      /weapon|power|move|movement|ability|combat/.test(s)
    ) {
      return 'action';
    }

    if (
      /prop|vehicle|item|object|pickup/.test(s)
    ) {
      return 'prop';
    }

    if (
      /vfx|fx|audio|sound|effect/.test(s)
    ) {
      return 'fx';
    }

    if (
      /camera|visual|style|cinematic/.test(s)
    ) {
      return 'visual';
    }

    if (
      /world|terrain|physics|environment|level|location/.test(s)
    ) {
      return 'world';
    }

    return 'general';
  }

  /*
   * GENERATION INTELLIGENCE v1.1
   *
   * The existing reference rows remain the source material.
   * We now explicitly resolve genre_core and construct a structured
   * mission state from the reference + user intent.
   */
  function buildDNA() {
    const d = {
      character: [],
      threat: [],
      action: [],
      prop: [],
      fx: [],
      visual: [],
      world: [],
      general: []
    };

    let genreCore = '';

    st.hits.forEach(x => {
      const c = classify(x);
      const t = rowText(x);

      if (t) {
        d[c].push(t);
      }

      const data = x.data || {};

      if (!genreCore && String(data.genre_core || '').trim()) {
        genreCore = String(data.genre_core).trim();
      }
    });

    Object.keys(d).forEach(k => {
      d[k] = d[k].slice(0, 8);
    });

    /*
     * Some Excel rows can place genre_core in a differently cased
     * or slightly different field. Search the raw row text as a
     * fallback without inventing a value.
     */
    if (!genreCore) {
      const genreRow = st.hits.find(x =>
        Object.keys(x.data || {}).some(
          k =>
            String(k).toLowerCase() ===
            'genre_core'
        )
      );

      if (genreRow) {
        const value = Object.entries(
          genreRow.data || {}
        ).find(
          ([k, v]) =>
            String(k).toLowerCase() ===
              'genre_core' &&
            String(v).trim()
        );

        if (value) {
          genreCore = String(value[1]).trim();
        }
      }
    }

    d.genre_core =
      genreCore ||
      'Reference-defined genre and world rules';

    return d;
  }

  function pick(a, i, fallback) {
    return a.length
      ? a[i % a.length]
      : fallback;
  }

  const CAM = [
    'wide establishing shot',
    'low tracking shot',
    'over-the-shoulder shot',
    'handheld close pursuit shot',
    'high-angle tactical shot',
    'dynamic side tracking shot',
    'hero close-up',
    'wide cliffhanger shot'
  ];

  const ACTION = [
    'approaches the objective',
    'scans the environment and identifies the first threat',
    'engages the threat and forces a tactical response',
    'pushes deeper as resistance increases',
    'survives a major escalation that changes the mission',
    'uses a reference-defined capability to create an opening',
    'reaches the immediate objective under pressure',
    'discovers a new threat that carries the story forward'
  ];

  /*
   * Convert natural user intent into explicit constraints.
   * This is intentionally deterministic and conservative:
   * it extracts what the user actually supplied rather than
   * inventing mission facts.
   */
  function parseIntent(raw) {
    const text = String(raw || '').trim();
    const lower = text.toLowerCase();

    const result = {
      raw: text,
      time: '',
      environment: '',
      weather: '',
      objective: '',
      threat: '',
      pursuit: '',
      keywords: []
    };

    const timeTerms = [
      'night',
      'day',
      'dawn',
      'dusk',
      'sunset',
      'midnight',
      'morning',
      'evening'
    ];

    const environmentTerms = [
      'jungle',
      'forest',
      'desert',
      'city',
      'street',
      'road',
      'temple',
      'castle',
      'fortress',
      'arena',
      'village',
      'mountain',
      'cave',
      'underwater',
      'ocean',
      'river',
      'bridge',
      'factory',
      'laboratory',
      'space',
      'island'
    ];

    const weatherTerms = [
      'rain',
      'heavy rain',
      'storm',
      'snow',
      'fog',
      'mist',
      'wind',
      'thunder',
      'lightning',
      'dust'
    ];

    const threatTerms = [
      'enemy',
      'boss',
      'helicopter',
      'pursuit',
      'chase',
      'ambush',
      'attack',
      'invasion',
      'monster',
      'ninja',
      'soldier',
      'fighter'
    ];

    const objectiveTerms = [
      'mission',
      'rescue',
      'escape',
      'infiltrate',
      'destroy',
      'defend',
      'reach',
      'retrieve',
      'find',
      'protect',
      'survive',
      'capture'
    ];

    timeTerms.forEach(term => {
      if (lower.includes(term)) {
        result.time = term;
      }
    });

    environmentTerms.forEach(term => {
      if (lower.includes(term)) {
        result.environment = term;
      }
    });

    weatherTerms.forEach(term => {
      if (lower.includes(term)) {
        result.weather = term;
      }
    });

    threatTerms.forEach(term => {
      if (lower.includes(term)) {
        result.threat = result.threat
          ? `${result.threat}, ${term}`
          : term;
      }
    });

    objectiveTerms.forEach(term => {
      if (lower.includes(term)) {
        result.objective = result.objective
          ? `${result.objective}, ${term}`
          : term;
      }
    });

    if (
      lower.includes('pursuit') ||
      lower.includes('chase')
    ) {
      result.pursuit =
        lower.includes('helicopter')
          ? 'helicopter pursuit'
          : 'active pursuit';
    }

    result.keywords = [
      ...new Set([
        ...timeTerms.filter(t => lower.includes(t)),
        ...environmentTerms.filter(t => lower.includes(t)),
        ...weatherTerms.filter(t => lower.includes(t)),
        ...threatTerms.filter(t => lower.includes(t)),
        ...objectiveTerms.filter(t => lower.includes(t))
      ])
    ];

    return result;
  }

  function createMissionState(
    dna,
    name,
    parsedIntent
  ) {
    return {
      game: name,
      genre_core: dna.genre_core,

      intent: {
        raw: parsedIntent.raw,
        time: parsedIntent.time,
        environment: parsedIntent.environment,
        weather: parsedIntent.weather,
        objective: parsedIntent.objective,
        threat: parsedIntent.threat,
        pursuit: parsedIntent.pursuit,
        keywords: parsedIntent.keywords
      },

      reel: 1,
      shot: 0,

      current_state: {
        location:
          parsedIntent.environment ||
          pick(
            dna.world,
            0,
            `${name} reference world`
          ),

        protagonist:
          pick(
            dna.character,
            0,
            `${name} reference protagonist`
          ),

        threat:
          parsedIntent.threat ||
          pick(
            dna.threat,
            0,
            `${name} reference threat`
          ),

        objective:
          parsedIntent.objective ||
          'Advance the mission according to the user intent',

        mission:
          parsedIntent.raw,

        escalation: 0
      },

      history: []
    };
  }

  function stateText(state) {
    if (!state) return 'No previous mission state.';

    const s = state.current_state || state;

    return [
      `Location: ${s.location || 'reference-defined location'}`,
      `Protagonist: ${s.protagonist || 'reference-defined protagonist'}`,
      `Threat: ${s.threat || 'reference-defined threat'}`,
      `Objective: ${s.objective || 'mission objective'}`,
      `Escalation: ${s.escalation ?? 0}`
    ].join(' · ');
  }

  function stageState(stage, previous, dna, parsedIntent, ri, i) {
    const previousState =
      previous?.current_state || {};

    const fallbackThreat = pick(
      dna.threat,
      i + ri,
      `${parsedIntent.threat || 'reference-defined threat'}`
    );

    const fallbackWorld = pick(
      dna.world.concat(dna.visual),
      i + ri,
      `${parsedIntent.environment || 'reference-defined world'}`
    );

    const location =
      parsedIntent.environment ||
      previousState.location ||
      fallbackWorld;

    const protagonist =
      previousState.protagonist ||
      pick(
        dna.character,
        ri * 2 + i,
        'reference-defined protagonist'
      );

    let threat =
      previousState.threat ||
      parsedIntent.threat ||
      fallbackThreat;

    let objective =
      previousState.objective ||
      parsedIntent.objective ||
      'Advance the mission according to user intent';

    let escalation =
      Number(previousState.escalation || 0);

    /*
     * The stage changes the state rather than merely changing
     * the prose label.
     */
    if (stage === 'ENTRY') {
      escalation = Math.max(escalation, 0);
    } else if (
      stage === 'THREAT INTRODUCTION'
    ) {
      escalation = Math.max(escalation, 1);
      threat =
        parsedIntent.threat ||
        fallbackThreat;
    } else if (
      stage === 'FIRST ENGAGEMENT'
    ) {
      escalation = Math.max(escalation, 2);
    } else if (
      stage === 'CAPABILITY ESCALATION'
    ) {
      escalation = Math.max(escalation, 3);
    } else if (
      stage === 'MAJOR ESCALATION'
    ) {
      escalation = Math.max(escalation, 4);
    } else if (
      stage === 'BREAKTHROUGH'
    ) {
      escalation = Math.max(escalation, 5);
    } else if (
      stage === 'GATE / OBJECTIVE'
    ) {
      escalation = Math.max(escalation, 6);
    } else if (
      stage === 'NEXT THREAT'
    ) {
      escalation = Math.max(escalation, 7);

      if (!parsedIntent.threat) {
        threat = fallbackThreat;
      }
    }

    return {
      location,
      protagonist,
      threat,
      objective,
      mission:
        parsedIntent.raw ||
        previousState.mission ||
        '',
      escalation
    };
  }

  function stateChange(previousState, currentState, stage) {
    if (!previousState) {
      return `Mission enters ${stage.toLowerCase()} state.`;
    }

    const previous =
      previousState.current_state ||
      previousState;

    const changes = [];

    if (
      previous.location !==
      currentState.location
    ) {
      changes.push(
        `location shifts to ${currentState.location}`
      );
    }

    if (
      previous.threat !==
      currentState.threat
    ) {
      changes.push(
        `threat changes to ${currentState.threat}`
      );
    }

    if (
      previous.objective !==
      currentState.objective
    ) {
      changes.push(
        `objective advances to ${currentState.objective}`
      );
    }

    if (
      Number(previous.escalation || 0) !==
      Number(currentState.escalation || 0)
    ) {
      changes.push(
        `escalation rises from ${previous.escalation || 0} to ${currentState.escalation}`
      );
    }

    if (!changes.length) {
      changes.push(
        `mission advances through ${stage.toLowerCase()}`
      );
    }

    return changes.join('; ') + '.';
  }

  function nextHook(stage, currentState) {
    const hooks = {
      ENTRY:
        `The ${currentState.objective} must now move from setup into direct action.`,
      'THREAT INTRODUCTION':
        `The ${currentState.threat} becomes an active obstacle to the mission.`,
      'FIRST ENGAGEMENT':
        `The confrontation forces the protagonist to escalate.`,
      'CAPABILITY ESCALATION':
        `A stronger capability or tactic is required to continue.`,
      'MAJOR ESCALATION':
        `The mission state changes significantly and raises the stakes.`,
      BREAKTHROUGH:
        `The breakthrough creates a path toward the immediate objective.`,
      'GATE / OBJECTIVE':
        `Reaching the objective exposes what comes next.`,
      'NEXT THREAT':
        `A new threat or unresolved problem carries the mission into the next beat.`
    };

    return (
      hooks[stage] ||
      `The mission continues from the current state.`
    );
  }

  function makeShot(
    ri,
    i,
    dna,
    name,
    previousState,
    missionState
  ) {
    const stage = ST[i];

    const ref = pick(
      dna.world.concat(dna.visual),
      i + ri,
      `${name} world rules`
    );

    const char = pick(
      dna.character,
      ri * 2 + i,
      `${name} protagonist identity`
    );

    const threat = pick(
      dna.threat,
      i + ri,
      `${name} threat rules`
    );

    const action = pick(
      dna.action,
      i + ri,
      `${name} movement/combat rules`
    );

    const prop = pick(
      dna.prop,
      i,
      `${name} reference props`
    );

    const fx = pick(
      dna.fx,
      i,
      `${name} reference VFX/audio`
    );

    const cam =
      CAM[(i + ri) % CAM.length];

    const currentState = stageState(
      stage,
      previousState,
      dna,
      missionState.intent,
      ri,
      i
    );

    const continuityFromPrevious =
      previousState
        ? {
            reel: previousState.reel,
            shot: previousState.shot,
            location:
              previousState.current_state?.location ||
              '',
            protagonist:
              previousState.current_state?.protagonist ||
              '',
            threat:
              previousState.current_state?.threat ||
              '',
            objective:
              previousState.current_state?.objective ||
              '',
            escalation:
              previousState.current_state?.escalation ??
              0
          }
        : null;

    const changed = stateChange(
      previousState,
      {
        current_state: currentState
      },
      stage
    );

    const hook = nextHook(
      stage,
      currentState
    );

    const intentLead =
      missionState.intent.raw ||
      st.intent;

    const title =
      i === 0
        ? stage
        : 'MISSION BEAT';

    const d = [
      intentLead + '.',
      `${name} reference continuity.`,
      `Genre core: ${dna.genre_core}.`,
      `${ACTION[i]}.`,
      `Current mission state: ${stateText({
        current_state: currentState
      })}.`,
      `Camera: ${cam}.`,
      `Character DNA: ${char.slice(0, 180)}.`,
      `World/visual DNA: ${ref.slice(0, 180)}.`,
      `Action DNA: ${action.slice(0, 160)}.`,
      `Threat DNA: ${threat.slice(0, 150)}.`,
      `Props: ${prop.slice(0, 120)}.`,
      `VFX/audio: ${fx.slice(0, 120)}.`,
      `State change: ${changed}`,
      `Next-shot hook: ${hook}.`
    ].join(' ');

    return {
      n: i + 1,
      t: title,
      d,

      objective: currentState.objective,
      stage,
      camera: cam,

      genre_core: dna.genre_core,

      current_state: currentState,

      continuity_from_previous:
        continuityFromPrevious,

      state_change: changed,

      next_shot_hook: hook,

      reference: {
        game: name,
        world_visual: ref.slice(0, 220),
        character: char.slice(0, 220),
        threat: threat.slice(0, 220),
        action: action.slice(0, 220),
        props: prop.slice(0, 160),
        fx_audio: fx.slice(0, 160)
      }
    };
  }

  function generate() {
    st.intent = intent();

    if (!st.ref || !st.book) {
      setStatus(
        'SELECT A REFERENCE FIRST',
        'error'
      );
      render();
      return;
    }

    if (!st.intent) {
      setStatus(
        'ENTER USER INTENT FIRST',
        'error'
      );
      render();
      return;
    }

    const selected =
      REF.find(x => x[0] === st.ref);

    if (!selected) {
      setStatus(
        'REFERENCE NOT REGISTERED · ' +
          st.ref,
        'error'
      );
      render();
      return;
    }

    const name = selected[1];
    const dna = buildDNA();
    const parsedIntent = parseIntent(
      st.intent
    );

    /*
     * Mission state is now the persistent state container.
     * It survives all 3 reels during this generation pass.
     */
    let missionState =
      createMissionState(
        dna,
        name,
        parsedIntent
      );

    let previousState = null;

    st.reels.forEach((r, ri) => {
      missionState.reel = ri + 1;

      r.shots.forEach((s, i) => {
        missionState.shot = i + 1;

        const z = makeShot(
          ri,
          i,
          dna,
          name,
          previousState,
          missionState
        );

        Object.assign(s, z);

        /*
         * The generated shot becomes the state consumed
         * by the next shot.
         */
        previousState = {
          reel: ri + 1,
          shot: i + 1,
          current_state:
            z.current_state,
          genre_core:
            z.genre_core,
          next_shot_hook:
            z.next_shot_hook
        };

        missionState.current_state =
          z.current_state;

        missionState.history.push({
          reel: ri + 1,
          shot: i + 1,
          stage: z.stage,
          current_state:
            z.current_state,
          state_change:
            z.state_change,
          next_shot_hook:
            z.next_shot_hook
        });
      });

      /*
       * Reel boundary continuity is explicit.
       * The last shot of Reel N becomes the opening
       * state consumed by Reel N+1.
       */
      if (r.shots.length) {
        const last =
          r.shots[r.shots.length - 1];

        missionState.current_state =
          last.current_state;
      }
    });

    st.missionState = missionState;

    st.reels.forEach((r, i) => {
      r.status =
        i ? 'LOCKED' : 'CURRENT';
    });

    st.gen = true;

    setStatus(
      'MISSION PLAN GENERATED · ' +
        name +
        ' reference + user intent · 3 × 8 unique shots · continuity state locked',
      'ready'
    );

    render();
  }

  function genReel(n) {
    if (!st.gen) return;

    if (
      n > 1 &&
      st.reels[n - 2].status !==
        'GENERATED'
    ) {
      return;
    }

    st.reels[n - 1].status =
      'GENERATED';

    if (n < R) {
      st.reels[n].status =
        'CURRENT';
    } else {
      setStatus(
        'MISSION COMPLETE · 3 REELS · 24 UNIQUE SHOTS · CONTINUITY VERIFIED',
        'ready'
      );
    }

    render();
  }

  function mount() {
    if (
      document.querySelector(
        '#retro64ProductionV2'
      )
    ) {
      return;
    }

    const old =
      document.getElementById(
        'retroGame'
      );

    const host =
      old?.closest('.view') ||
      old?.parentElement ||
      document.body;

    const el =
      document.createElement('div');

    el.id =
      'retro64ProductionV2';

    host.prepend(el);

    [...host.children].forEach(n => {
      if (n !== el) {
        n.style.display = 'none';
      }
    });

    const css =
      document.createElement('style');

    css.textContent = `
      .r64{
        padding:18px;
        max-width:1600px;
        margin:auto
      }

      .r64 h2{
        margin:4px 0;
        color:#f1cf87;
        font:24px Georgia
      }

      .r64 p,
      .r64 small{
        color:#8da1ad
      }

      .r64-head{
        display:flex;
        justify-content:space-between;
        gap:15px;
        margin-bottom:12px
      }

      .r64-total{
        text-align:center;
        border:1px solid #e9bb68;
        border-radius:9px;
        padding:8px;
        background:#07131d
      }

      .r64-total b{
        display:block;
        color:#f6d38c;
        font-size:24px
      }

      .r64-setup,
      .r64-reels{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:9px
      }

      .r64-setup{
        grid-template-columns:260px 1fr;
        margin-bottom:12px
      }

      .r64-card,
      .r64-reel{
        background:#091722ee;
        border:1px solid #294555;
        border-radius:9px;
        padding:11px
      }

      .r64 label{
        display:block;
        color:#9eb0ba;
        font-size:9px;
        text-transform:uppercase;
        margin-bottom:5px
      }

      .r64 select,
      .r64 textarea{
        width:100%;
        box-sizing:border-box;
        background:#07131d;
        color:#e8eef2;
        border:1px solid #294555;
        border-radius:7px;
        padding:9px
      }

      .r64 textarea{
        min-height:72px
      }

      .r64-status{
        margin-top:6px;
        padding:7px;
        border:1px solid #294555;
        border-radius:6px;
        font-size:9px;
        color:#9eb0ba
      }

      .r64-status.ready{
        border-color:#4ed6a0;
        color:#b9f6d3
      }

      .r64-status.error{
        border-color:#f77;
        color:#ffb0b0
      }

      .r64-status.loading{
        border-color:#e9bb68;
        color:#f6d38c
      }

      .r64 button{
        width:100%;
        margin-top:7px;
        padding:9px;
        border:0;
        border-radius:7px;
        background:linear-gradient(
          135deg,
          #f6d38c,
          #b87827
        );
        font-weight:800;
        cursor:pointer
      }

      .r64 button:disabled{
        opacity:.4;
        cursor:not-allowed
      }

      .r64-arc{
        display:grid;
        grid-template-columns:repeat(8,1fr);
        gap:5px;
        margin:10px 0
      }

      .r64-stage,
      .r64-shot{
        background:#07131d;
        border:1px solid #294555;
        border-radius:6px;
        padding:7px
      }

      .r64-stage b{
        color:#e9bb68;
        font-size:9px
      }

      .r64-stage span{
        display:block;
        color:#aebfc8;
        font-size:8px;
        margin-top:3px
      }

      .r64-reel.current{
        border-color:#66cce2
      }

      .r64-reel.generated{
        border-color:#4ed6a0
      }

      .r64-reel.locked{
        opacity:.6
      }

      .r64-rh{
        display:flex;
        justify-content:space-between
      }

      .r64-rh b{
        color:#f1cf87
      }

      .r64-shots{
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:5px;
        margin-top:7px
      }

      .r64-shot b{
        color:#66cce2;
        font-size:9px
      }

      .r64-shot span{
        color:#e8eef2;
        font-size:9px
      }

      .r64-shot small{
        display:block;
        margin-top:3px;
        font-size:8px;
        line-height:1.35
      }

      .r64-shot .meta{
        color:#66cce2;
        font-size:8px;
        margin-top:4px
      }

      .r64-foot{
        margin-top:9px;
        padding:9px;
        border:1px solid #294555;
        border-radius:7px;
        text-align:center;
        color:#8da1ad;
        font-size:9px
      }

      @media(max-width:1000px){
        .r64-setup,
        .r64-reels{
          grid-template-columns:1fr
        }

        .r64-arc{
          grid-template-columns:repeat(4,1fr)
        }
      }
    `;

    document.head.appendChild(css);

    render();
  }

  function render() {
    const e =
      document.querySelector(
        '#retro64ProductionV2'
      );

    if (!e) return;

    const can =
      !!(
        st.ref &&
        st.book &&
        st.intent
      );

    e.innerHTML = `
      <section class="r64">

        <div class="r64-head">
          <div>
            <small>
              RETRO-64 · REFERENCE-FIRST MISSION PRODUCTION
            </small>

            <h2>
              Reference → Intent → 3-Reel Mission
            </h2>

            <p>
              Excel reference = world/character DNA.
              User intent = first creative directive.
            </p>
          </div>

          <div class="r64-total">
            <b>24</b>
            <small>3 REELS × 8 SHOTS</small>
          </div>
        </div>

        <div class="r64-setup">

          <div class="r64-card">
            <label>
              Game / Character Reference
            </label>

            <select id="r64Reference">
              <option value="">
                Select reference…
              </option>

              ${REF.map(
                x =>
                  `<option value="${x[0]}"
                    ${
                      st.ref === x[0]
                        ? 'selected'
                        : ''
                    }>
                    ${x[1]}
                  </option>`
              ).join('')}
            </select>

            <div class="r64-status ${st.kind}">
              ${esc(st.status)}
            </div>
          </div>

          <div class="r64-card">

            <label>
              User Intent · First Creative Reference
            </label>

            <textarea
              id="r64Intent"
              placeholder="Describe what you want to create…"
            >${esc(st.intent)}</textarea>

            <button
              id="r64Generate"
              ${can ? '' : 'disabled'}
            >
              GENERATE 3-REEL MISSION
            </button>

          </div>

        </div>

        <div class="r64-arc">
          ${ST.map(
            (x, i) =>
              `<div class="r64-stage">
                <b>
                  ${String(i + 1).padStart(2, '0')}
                </b>

                <span>
                  ${x}
                </span>
              </div>`
          ).join('')}
        </div>

        <div class="r64-reels">

          ${st.reels
            .map(
              r => `
                <article
                  class="r64-reel ${r.status.toLowerCase()}"
                >

                  <div class="r64-rh">
                    <b>
                      REEL
                      ${String(r.n).padStart(2, '0')}
                      · 8 SHOTS
                    </b>

                    <small>
                      ${r.status}
                    </small>
                  </div>

                  <div class="r64-shots">

                    ${r.shots
                      .map(
                        s => `
                          <div class="r64-shot">

                            <b>
                              ${String(
                                s.n
                              ).padStart(2, '0')}
                            </b>

                            <span>
                              ${esc(s.t)}
                            </span>

                            <small>
                              ${esc(s.d)}
                            </small>

                            ${
                              s.camera
                                ? `
                                  <div class="meta">
                                    CAMERA ·
                                    ${esc(
                                      s.camera
                                    )}
                                  </div>
                                `
                                : ''
                            }

                            ${
                              s.genre_core
                                ? `
                                  <div class="meta">
                                    GENRE ·
                                    ${esc(
                                      s.genre_core
                                    )}
                                  </div>
                                `
                                : ''
                            }

                            ${
                              s.state_change
                                ? `
                                  <div class="meta">
                                    STATE ·
                                    ${esc(
                                      s.state_change
                                    )}
                                  </div>
                                `
                                : ''
                            }

                          </div>
                        `
                      )
                      .join('')}

                  </div>

                  <button
                    data-reel="${r.n}"
                    ${
                      !st.gen ||
                      r.status === 'LOCKED'
                        ? 'disabled'
                        : ''
                    }
                  >
                    ${
                      r.status === 'CURRENT'
                        ? 'GENERATE REEL ' +
                          String(r.n).padStart(
                            2,
                            '0'
                          )
                        : r.status ===
                          'GENERATED'
                        ? 'REEL GENERATED'
                        : 'RESUME REEL ' +
                          String(r.n).padStart(
                            2,
                            '0'
                          )
                    }
                  </button>

                </article>
              `
            )
            .join('')}

        </div>

        <div class="r64-foot">

          ${
            st.book
              ? `<b>
                  ACTIVE EXCEL:
                  ${esc(st.book)}
                </b>
                ·
                ${st.hits.length}
                reference rows matched`
              : `Select a reference to load the canonical Excel automatically`
          }

          ·

          <b>
            3 × 8 = 24 unique shots
          </b>

        </div>

      </section>
    `;

    const q =
      e.querySelector(
        '#r64Reference'
      );

    q.onchange = () =>
      selectRef(q.value);

    const i =
      e.querySelector(
        '#r64Intent'
      );

    i.oninput = () => {
      st.intent = i.value;

      e.querySelector(
        '#r64Generate'
      ).disabled = !(
        st.ref &&
        st.book &&
        intent()
      );
    };

    e.querySelector(
      '#r64Generate'
    ).onclick = generate;

    e.querySelectorAll(
      '[data-reel]'
    ).forEach(b => {
      b.onclick = () =>
        genReel(
          +b.dataset.reel
        );
    });
  }

  window.KALP_RETRO64_UI_V2 = {
    boot: mount,
    state: st,
    resolveReference: selectRef,
    generateMission: generate,
    TOTAL_REELS: R,
    SHOTS_PER_REEL: S
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      mount,
      { once: true }
    );
  } else {
    mount();
  }
})();
