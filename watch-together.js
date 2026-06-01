/**
 * ============================================================
 * WATCH-TOGETHER.JS — Dramakan Co-Watch Sync Engine  v2.0
 * ============================================================
 * Responsibilities:
 *  - Sync two+ users' video playback via Firebase Realtime DB
 *  - Detect timestamp drift > 3 s → trigger kany 'thinking'
 *  - Snap to host time when back in sync → trigger 'synced'
 *  - Handle disconnects cleanly via Firebase onDisconnect()
 *  - Publish host/guest roles so only host writes position
 *
 * Usage (add to your watch page HTML):
 *
 *   <script type="module">
 *     import { initWatchTogether } from './watch-together.js';
 *     initWatchTogether({
 *       firebaseConfig: { ... },   // your Firebase project config
 *       roomId: 'room_abc123',     // unique room identifier
 *       videoEl: document.getElementById('drama-video'),
 *       userId: 'user_xyz',        // your auth'd user id
 *     });
 *   </script>
 *
 * ============================================================
 * Firebase Web SDK v9+ (modular) loaded via CDN ─
 * Make sure these are in your HTML BEFORE this module:
 *
 *   <script type="module">
 *     // The import map is provided by importShim or native
 *   </script>
 *
 * Or just import from the CDN directly (shown below).
 * ============================================================
 */

/* ── Firebase CDN imports (v10 compat modular) ──
   These URLs are stable for the v10 release train.
   Pin to an exact version in production, e.g. firebase@10.12.0 */
import { initializeApp }              from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  get,
  remove,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

/* ──────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────── */
const SYNC_THRESHOLD_SEC  = 3;     // seconds of drift before re-sync kicks in
const SYNC_INTERVAL_MS    = 3000;  // how often to write host position (ms)
const SEEK_LOCK_MS        = 1200;  // ignore DB events briefly after local seek
const RESYNC_THROTTLE_MS  = 2000;  // don't re-seek more than once per 2 s

/* ──────────────────────────────────────────────────────────
   MODULE STATE (private to this module)
────────────────────────────────────────────────────────── */
let _db           = null;
let _roomRef      = null;   // Firebase ref to /rooms/{roomId}
let _videoEl      = null;
let _userId       = null;
let _isHost       = false;  // host writes; guests read and snap
let _syncInterval = null;   // setInterval handle for host writes
let _seekLock     = false;  // true while we're programmatically seeking
let _lastResync   = 0;      // timestamp of last guest resync
let _initialized  = false;

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */

/**
 * Safe accessor for window.kany — returns a no-op proxy
 * if kany-ui.js hasn't loaded yet, so this module is decoupled.
 */
function kany() {
  return window.kany ?? {
    setState: () => {},
    toast:    () => {},
  };
}

/**
 * Log with module prefix (only in dev; strip in prod with bundler)
 */
function log(...args) {
  console.log('[WatchTogether]', ...args);
}

/* ──────────────────────────────────────────────────────────
   ROLE NEGOTIATION
   First user to join a room becomes host.
   Subsequent users are guests.
   If host leaves, the longest-connected guest is promoted.
────────────────────────────────────────────────────────── */

/**
 * Attempt to claim the host role.
 * Uses a simple "first-write-wins" pattern — reads /rooms/{id}/host
 * and only sets it if empty.
 * @returns {Promise<boolean>} true if we are now the host
 */
async function _negotiateRole(roomRef, userId) {
  const hostRef   = ref(_db, `${roomRef.toString()}/host`);
  const snapshot  = await get(hostRef);
  const hostId    = snapshot.val();

  if (!hostId) {
    /* Room is empty — claim host */
    await set(hostRef, userId);

    /* When host disconnects, clear the host field so a guest can promote */
    onDisconnect(hostRef).remove();
    log(`User "${userId}" is the HOST.`);
    return true;
  }

  if (hostId === userId) {
    log(`User "${userId}" reclaiming HOST role.`);
    return true;
  }

  log(`User "${userId}" is a GUEST. Host is "${hostId}".`);
  return false;
}

/* ──────────────────────────────────────────────────────────
   PRESENCE — write user online status + clean up on disconnect
────────────────────────────────────────────────────────── */
function _registerPresence(roomRef, userId) {
  const presenceRef = ref(_db, `${roomRef.toString()}/presence/${userId}`);

  set(presenceRef, {
    joinedAt:  serverTimestamp(),
    online:    true,
  });

  /* Firebase removes this node if the connection drops */
  onDisconnect(presenceRef).remove();

  /* Watch presence to notify Kany when partner joins/leaves */
  const allPresenceRef = ref(_db, `${roomRef.toString()}/presence`);
  onValue(allPresenceRef, (snapshot) => {
    const members = snapshot.val() ?? {};
    const count   = Object.keys(members).length;

    if (count === 1) {
      /* Alone in the room */
      kany().setState('idle', 'Waiting for your watch partner... 👀');
    } else {
      /* Partner is online */
      kany().toast(`${count} people in this room 🍿`, 'success');
    }
  });
}

/* ──────────────────────────────────────────────────────────
   HOST — WRITE LOOP
   Publishes current video state every SYNC_INTERVAL_MS
────────────────────────────────────────────────────────── */
function _startHostWriter(roomRef) {
  if (_syncInterval) clearInterval(_syncInterval);

  log('Starting host write loop...');

  _syncInterval = setInterval(() => {
    if (!_videoEl || _videoEl.paused) return; // don't spam when paused

    const payload = {
      currentTime: _videoEl.currentTime,
      paused:      _videoEl.paused,
      updatedAt:   Date.now(),
    };

    const stateRef = ref(_db, `${roomRef.toString()}/state`);
    set(stateRef, payload).catch((err) => {
      console.error('[WatchTogether] Host write failed:', err);
      kany().setState('error', 'Sync write failed. Retrying... 🔄');
    });
  }, SYNC_INTERVAL_MS);

  /* Also write immediately on play/pause events */
  _videoEl.addEventListener('play',  () => _flushHostState(roomRef));
  _videoEl.addEventListener('pause', () => _flushHostState(roomRef));
  _videoEl.addEventListener('seeked', () => _flushHostState(roomRef));
}

/** One-shot flush of current video state */
function _flushHostState(roomRef) {
  const stateRef = ref(_db, `${roomRef.toString()}/state`);
  set(stateRef, {
    currentTime: _videoEl.currentTime,
    paused:      _videoEl.paused,
    updatedAt:   Date.now(),
  });
}

/* ──────────────────────────────────────────────────────────
   GUEST — READ & SYNC
   Listens for host state changes and snaps if drifted
────────────────────────────────────────────────────────── */
function _startGuestListener(roomRef) {
  const stateRef = ref(_db, `${roomRef.toString()}/state`);

  log('Guest: subscribing to host state...');

  kany().setState('watching', 'Syncing with host... 🔄');

  onValue(stateRef, (snapshot) => {
    /* Skip if we're in a seek-lock window */
    if (_seekLock) return;

    const hostState = snapshot.val();
    if (!hostState) return; // no data yet

    const { currentTime: hostTime, paused: hostPaused } = hostState;
    const guestTime = _videoEl.currentTime;
    const drift     = Math.abs(guestTime - hostTime);
    const now       = Date.now();

    /* ── Sync play/pause state ── */
    if (hostPaused && !_videoEl.paused) {
      _videoEl.pause();
      kany().toast('Host paused ⏸️');
    } else if (!hostPaused && _videoEl.paused) {
      _videoEl.play().catch(() => {
        /* Autoplay may be blocked by browser — user interaction needed */
        kany().setState('error', 'Click play to resume with host ▶️');
      });
    }

    /* ── Drift check ── */
    if (drift > SYNC_THRESHOLD_SEC) {
      /* Only resync once per RESYNC_THROTTLE_MS to avoid jitter */
      if (now - _lastResync < RESYNC_THROTTLE_MS) return;

      log(`Drift detected: ${drift.toFixed(2)}s — resyncing...`);
      kany().setState('thinking', `Re-syncing... (${drift.toFixed(1)}s drift) 🔄`);

      _lastResync = now;

      /* Lock to prevent feedback loop when seeking */
      _seekLock = true;
      _videoEl.currentTime = hostTime;

      /* Release lock after browser fires 'seeked' event */
      _videoEl.addEventListener('seeked', function onSeeked() {
        _videoEl.removeEventListener('seeked', onSeeked);
        _seekLock = false;

        log('Re-sync complete!');
        kany().setState('synced', 'We are in sync! 🎉', 4000);
      }, { once: true });

    } else if (_currentKanyState() === 'thinking') {
      /* Was thinking, now drift is OK */
      kany().setState('synced', 'In sync! 🎉', 3000);
    }
  });
}

/** Read Kany's current state (safe) */
function _currentKanyState() {
  return window.kany?.state ?? 'idle';
}

/* ──────────────────────────────────────────────────────────
   HOST PROMOTION
   If the host leaves, watch for the host field to clear
   and promote this guest if they're the senior member.
────────────────────────────────────────────────────────── */
function _watchForPromotion(roomRef, userId) {
  const hostRef = ref(_db, `${roomRef.toString()}/host`);

  onValue(hostRef, async (snapshot) => {
    const currentHost = snapshot.val();

    if (!currentHost && !_isHost) {
      log('Host left — attempting promotion...');
      kany().setState('thinking', 'Host left. Taking over... 👑');

      const promoted = await _negotiateRole(roomRef, userId);
      if (promoted) {
        _isHost = true;
        clearInterval(_syncInterval); // clear any previous loop (shouldn't exist for guests)
        _startHostWriter(roomRef);
        kany().setState('watching', 'You are now the host 👑');
        kany().toast('You are now the room host 👑', 'success');
      }
    }
  });
}

/* ──────────────────────────────────────────────────────────
   PUBLIC API — initWatchTogether
────────────────────────────────────────────────────────── */

/**
 * Initialize the Watch-Together sync engine.
 *
 * @param {Object} config
 * @param {Object} config.firebaseConfig  - Firebase app config object
 * @param {string} config.roomId          - Unique room ID string
 * @param {HTMLVideoElement} config.videoEl - The <video> element to control
 * @param {string} config.userId          - Authenticated user identifier
 *
 * @returns {{ destroy: Function }} - Call destroy() to cleanly tear down
 */
export async function initWatchTogether({ firebaseConfig, roomId, videoEl, userId }) {
  /* Guard: prevent double init */
  if (_initialized) {
    console.warn('[WatchTogether] Already initialized. Call destroy() first.');
    return;
  }

  if (!firebaseConfig || !roomId || !videoEl || !userId) {
    console.error('[WatchTogether] Missing required config. Aborting.');
    return;
  }

  _videoEl  = videoEl;
  _userId   = userId;
  _initialized = true;

  log(`Initializing room "${roomId}" for user "${userId}"...`);
  kany().setState('thinking', 'Connecting to watch room... 🔗');

  /* ── Init Firebase app (avoid duplicate if already inited) ── */
  let app;
  try {
    app = initializeApp(firebaseConfig, `dramakan-${roomId}`);
  } catch (e) {
    /* If already initialized under this name, getApp will recover it */
    if (e.code === 'app/duplicate-app') {
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      app = getApp(`dramakan-${roomId}`);
    } else {
      throw e;
    }
  }

  _db = getDatabase(app);
  _roomRef = ref(_db, `rooms/${roomId}`);

  /* ── Step 1: Register presence ── */
  _registerPresence(_roomRef, userId);

  /* ── Step 2: Negotiate host/guest role ── */
  _isHost = await _negotiateRole(_roomRef, userId);

  /* ── Step 3: Start role-specific logic ── */
  if (_isHost) {
    _startHostWriter(_roomRef);
    kany().setState('watching', 'You are the host — enjoy! 🎬');
    kany().toast('Watch room created 🎉', 'success');
  } else {
    _startGuestListener(_roomRef);
    _watchForPromotion(_roomRef, userId);
    kany().toast('Joined watch room 🍿', 'success');
  }

  log('Watch-Together engine ready!');

  /* ── Return tear-down handle ── */
  return {
    /**
     * Clean up all Firebase listeners and intervals.
     * Call this when navigating away from the watch page.
     */
    destroy() {
      log('Destroying Watch-Together session...');

      if (_syncInterval) {
        clearInterval(_syncInterval);
        _syncInterval = null;
      }

      /* Remove presence node immediately (not just on disconnect) */
      const presenceRef = ref(_db, `rooms/${roomId}/presence/${userId}`);
      remove(presenceRef);

      /* If host is leaving, clear host field so guest can promote */
      if (_isHost) {
        const hostRef = ref(_db, `rooms/${roomId}/host`);
        remove(hostRef);
      }

      _initialized = false;
      kany().setState('idle', 'Left the watch room.');
    },
  };
}