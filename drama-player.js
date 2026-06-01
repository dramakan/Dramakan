/**
 * ============================================================
 * DRAMA-PLAYER.JS — Dramakan Stream Link Interceptor  v2.0
 * ============================================================
 * Responsibilities:
 *  - Accept a primary + array of backup stream URLs
 *  - Probe each URL (HEAD request with timeout) before loading
 *  - On 404 / timeout / network error → trigger kany 'error'
 *    and auto-fall-through to the next backup server
 *  - Integrate with HLS.js for m3u8 streams; fallback to native
 *  - Expose `window.kanyPlayer` global for page-level control
 *  - Dispatch custom events for the rest of the page to observe
 *
 * Usage (your watch page):
 *
 *   <script type="module">
 *     import { initDramaPlayer } from './drama-player.js';
 *
 *     initDramaPlayer({
 *       videoEl:  document.getElementById('drama-video'),
 *       sources: [
 *         { url: 'https://cdn1.example.com/ep1/master.m3u8', label: 'Server 1' },
 *         { url: 'https://cdn2.example.com/ep1/master.m3u8', label: 'Server 2' },
 *         { url: 'https://cdn3.example.com/ep1/master.m3u8', label: 'Server 3' },
 *       ],
 *       probeTimeout: 5000,  // ms to wait before declaring a dead link
 *     });
 *   </script>
 *
 * ============================================================
 */

/* ──────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────── */
const DEFAULT_PROBE_TIMEOUT_MS = 5000;  // 5 s probe deadline
const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
const HLS_MIME = 'application/vnd.apple.mpegurl';

/* ──────────────────────────────────────────────────────────
   MODULE STATE
────────────────────────────────────────────────────────── */
let _hlsInstance    = null;   // active HLS.js instance
let _videoEl        = null;
let _sources        = [];     // [{ url, label }]
let _currentIndex   = 0;      // which source is active
let _probeTimeout   = DEFAULT_PROBE_TIMEOUT_MS;
let _isLoading      = false;

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */

/** Safe Kany accessor — no-op if kany-ui.js not loaded */
function kany() {
  return window.kany ?? { setState: () => {}, toast: () => {} };
}

function log(...args) {
  console.log('[DramaPlayer]', ...args);
}

/**
 * Dispatch a custom event from the video element so the
 * rest of the page can react (e.g. analytics, subtitles).
 */
function _emit(name, detail = {}) {
  if (!_videoEl) return;
  _videoEl.dispatchEvent(new CustomEvent(`dramakan:${name}`, {
    bubbles:    true,
    cancelable: false,
    detail,
  }));
}

/* ──────────────────────────────────────────────────────────
   HLS.JS LOADER
   Dynamically load HLS.js the first time we need it.
   Resolves immediately if already loaded.
────────────────────────────────────────────────────────── */
let _hlsLoadPromise = null;

function _loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (_hlsLoadPromise) return _hlsLoadPromise;

  _hlsLoadPromise = new Promise((resolve, reject) => {
    const script   = document.createElement('script');
    script.src     = HLS_CDN;
    script.onload  = () => resolve(window.Hls);
    script.onerror = () => reject(new Error('Failed to load HLS.js'));
    document.head.appendChild(script);
  });

  return _hlsLoadPromise;
}

/* ──────────────────────────────────────────────────────────
   PROBE A STREAM URL
   Sends a HEAD request to check if the URL is alive.
   Returns a resolved/rejected Promise.
────────────────────────────────────────────────────────── */

/**
 * Probe a URL for availability.
 *
 * Strategy:
 *  - Use fetch() with AbortController for timeout
 *  - Accept any 2xx or 3xx as "alive"
 *  - Reject on 4xx, 5xx, network failure, or timeout
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function _probeUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  try {
    log(`Probing: ${url}`);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      /* mode: 'no-cors' can be used if CORS is not set up on CDN,
         but we lose the ability to read the status code.
         For production, ensure CDN sends CORS headers. */
      cache:  'no-store', // always get fresh result
    });

    clearTimeout(timer);

    if (!response.ok) {
      /* 4xx / 5xx — server returned an error */
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    log(`✓ Alive (${response.status}): ${url}`);
    return response;

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout after ${timeoutMs}ms: ${url}`);
    }
    throw err; // re-throw network / status errors
  }
}

/* ──────────────────────────────────────────────────────────
   DESTROY ACTIVE HLS INSTANCE
────────────────────────────────────────────────────────── */
function _destroyHls() {
  if (_hlsInstance) {
    _hlsInstance.stopLoad();
    _hlsInstance.detachMedia();
    _hlsInstance.destroy();
    _hlsInstance = null;
    log('HLS.js instance destroyed.');
  }
}

/* ──────────────────────────────────────────────────────────
   LOAD A VERIFIED URL INTO THE PLAYER
────────────────────────────────────────────────────────── */
async function _loadIntoPlayer(url, label) {
  _destroyHls();

  /* ── Check if native HLS is supported (Safari / iOS) ── */
  const supportsNativeHLS = _videoEl.canPlayType(HLS_MIME) !== '';
  const isHlsUrl          = /\.m3u8(\?|$)/i.test(url);

  if (isHlsUrl && !supportsNativeHLS) {
    /* Need HLS.js */
    try {
      const Hls = await _loadHls();

      if (!Hls.isSupported()) {
        throw new Error('HLS.js is not supported in this browser.');
      }

      _hlsInstance = new Hls({
        /* Performance tuning for high-traffic */
        enableWorker:          true,
        lowLatencyMode:        false,
        backBufferLength:      60,
        maxBufferLength:       60,
        maxMaxBufferLength:    120,
        startLevel:            -1,        // auto quality
        abrEwmaDefaultEstimate: 3_000_000, // initial bandwidth guess 3 Mbps
      });

      _hlsInstance.loadSource(url);
      _hlsInstance.attachMedia(_videoEl);

      _hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        log(`HLS manifest parsed for ${label}`);
        kany().setState('watching', `Loaded: ${label} 🎬`);
        _emit('sourceloaded', { url, label, method: 'hls.js' });
        _videoEl.play().catch(() => {
          /* Browser may block autoplay — user must click play */
        });
      });

      /* Handle fatal HLS errors — try next source */
      _hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          log(`Fatal HLS.js error on ${label}:`, data);
          _handleSourceFailure(`HLS fatal error (${data.type})`, label);
        }
      });

    } catch (hlsErr) {
      log('HLS.js load/attach error:', hlsErr);
      _handleSourceFailure(hlsErr.message, label);
    }

  } else {
    /* Native playback (MP4 / native HLS on Safari) */
    _videoEl.src = url;
    _videoEl.load();

    _videoEl.addEventListener('loadedmetadata', () => {
      log(`Native player loaded metadata for ${label}`);
      kany().setState('watching', `Loaded: ${label} 🎬`);
      _emit('sourceloaded', { url, label, method: 'native' });
    }, { once: true });

    _videoEl.addEventListener('error', (e) => {
      const code = _videoEl.error?.code ?? 'unknown';
      _handleSourceFailure(`Native video error (code ${code})`, label);
    }, { once: true });
  }
}

/* ──────────────────────────────────────────────────────────
   SOURCE FAILURE HANDLER
   Called when a source errors at load-time (post-probe).
   Triggers Kany error state and advances to next backup.
────────────────────────────────────────────────────────── */
function _handleSourceFailure(reason, label) {
  log(`Source failed: ${label} — ${reason}`);

  kany().setState(
    'error',
    `Uh oh! ${label} died. Fetching backup... 🛠️`
  );

  _emit('sourcefailed', { label, reason });

  /* Advance to next source */
  _tryNextSource();
}

/* ──────────────────────────────────────────────────────────
   MAIN ORCHESTRATOR
   Iterates sources, probing each before loading.
────────────────────────────────────────────────────────── */
async function _tryNextSource() {
  if (_isLoading) return; // prevent concurrent attempts
  _isLoading = true;

  /* Exhausted all sources */
  if (_currentIndex >= _sources.length) {
    log('All sources exhausted!');
    kany().setState(
      'error',
      'All servers are down. Please try again later. 😢'
    );
    kany().toast('All backup servers failed ❌', 'error');
    _emit('allsourcesfailed');
    _isLoading = false;
    return;
  }

  const source = _sources[_currentIndex];
  log(`Attempting source [${_currentIndex + 1}/${_sources.length}]: ${source.label}`);

  /* Update bubble to show we're trying */
  kany().setState(
    'thinking',
    _currentIndex === 0
      ? `Loading ${source.label}... ⏳`
      : `Trying ${source.label}... 🔄`
  );

  try {
    /* ── Probe phase ── */
    await _probeUrl(source.url, _probeTimeout);

    /* ── Probe passed — load into player ── */
    _currentIndex++;       // advance now so failures auto-advance correctly
    _isLoading = false;
    await _loadIntoPlayer(source.url, source.label);

  } catch (probeErr) {
    /* ── Probe failed ── */
    log(`Probe failed for ${source.label}:`, probeErr.message);

    kany().setState(
      'error',
      `${source.label} is dead. Trying next backup... 🛠️`
    );

    _emit('probefailed', { label: source.label, reason: probeErr.message });

    _currentIndex++;
    _isLoading = false;

    /* Small delay before next attempt to avoid hammering */
    await _delay(800);
    await _tryNextSource();
  }
}

/** Simple promise-based delay */
function _delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ──────────────────────────────────────────────────────────
   PUBLIC API — initDramaPlayer
────────────────────────────────────────────────────────── */

/**
 * Initialize the drama player with a prioritized source list.
 *
 * @param {Object} config
 * @param {HTMLVideoElement} config.videoEl    - The <video> element
 * @param {Array<{url: string, label: string}>} config.sources
 *   - Ordered list of stream URLs. First = primary, rest = backups.
 * @param {number} [config.probeTimeout=5000]  - ms before probe timeout
 *
 * @returns {{ loadSources, switchTo, destroy }}
 */
export function initDramaPlayer({ videoEl, sources, probeTimeout }) {
  if (!videoEl || !Array.isArray(sources) || sources.length === 0) {
    console.error('[DramaPlayer] videoEl and at least one source are required.');
    return;
  }

  _videoEl      = videoEl;
  _probeTimeout = probeTimeout ?? DEFAULT_PROBE_TIMEOUT_MS;
  _sources      = sources.map((s, i) => ({
    url:   s.url,
    label: s.label ?? `Server ${i + 1}`,
  }));
  _currentIndex = 0;
  _isLoading    = false;

  log('DramaPlayer initialized with sources:', _sources.map(s => s.label));

  /* ── Start trying sources immediately ── */
  _tryNextSource();

  /* ── Expose global controller ── */
  const controller = {
    /**
     * Reload from the beginning of the source list
     * (e.g., user navigates to a new episode).
     * @param {Array<{url, label}>} newSources
     */
    loadSources(newSources) {
      _destroyHls();
      _sources      = newSources.map((s, i) => ({
        url:   s.url,
        label: s.label ?? `Server ${i + 1}`,
      }));
      _currentIndex = 0;
      _isLoading    = false;
      _tryNextSource();
    },

    /**
     * Jump directly to a specific source index (e.g., user picks
     * "Server 2" from a quality selector).
     * @param {number} index
     */
    switchTo(index) {
      if (index < 0 || index >= _sources.length) {
        console.warn('[DramaPlayer] switchTo: index out of range');
        return;
      }
      _destroyHls();
      _currentIndex = index;
      _isLoading    = false;
      _tryNextSource();
    },

    /**
     * Get the list of available sources (for building a server picker UI).
     * @returns {Array<{url, label}>}
     */
    get sources() { return [..._sources]; },

    /**
     * Get the currently active source index.
     */
    get currentIndex() { return _currentIndex - 1; },

    /**
     * Tear down HLS.js and stop all activity.
     */
    destroy() {
      _destroyHls();
      if (_videoEl) {
        _videoEl.src = '';
        _videoEl.load();
      }
      log('DramaPlayer destroyed.');
    },
  };

  window.kanyPlayer = controller;
  return controller;
}