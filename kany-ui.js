/**
 * ============================================================
 * KANY-UI.JS — Dramakan Mascot Visual Engine  v2.0
 * ============================================================
 * Responsibilities:
 *  - Inject glassmorphism widget HTML into the DOM
 *  - Drive CSS steps() sprite animations via state classes
 *  - Expose `window.kany` global controller
 *  - Queue speech bubble messages with optional auto-dismiss
 *  - Emit/listen to custom events for cross-module comms
 *
 * Usage:
 *   window.kany.setState('error', 'Server dead!', 5000)
 *   window.kany.toast('Room joined ✓')
 *   window.kany.minimize()
 * ============================================================
 */

(function KanyUI() {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     CONSTANTS
  ────────────────────────────────────────────────────────── */
  const SPRITE_SRC = 'kany(1).png'; // adjust path as needed

  /**
   * Valid states and their defaults.
   * text      → default bubble message
   * duration  → ms before auto-returning to idle (0 = sticky)
   * loop      → whether sprite animation loops
   */
  const STATES = {
    idle:     { text: 'Watching with you! 🍿',     duration: 0,     loop: true  },
    watching: { text: 'Enjoying the drama! 🎬',    duration: 0,     loop: true  },
    thinking: { text: 'Hmm, let me check...',       duration: 0,     loop: true  },
    synced:   { text: 'We are in sync! 🎉',         duration: 4000,  loop: false },
    error:    { text: 'Uh oh! Something broke 🛠️', duration: 0,     loop: true  },
    party:    { text: 'Let\'s gooo! 🎊',            duration: 5000,  loop: true  },
  };

  /* ──────────────────────────────────────────────────────────
     STATE (module-private)
  ────────────────────────────────────────────────────────── */
  let _currentState   = 'idle';
  let _isMinimized    = false;
  let _dismissTimer   = null;   // auto-dismiss timeout handle
  let _messageQueue   = [];     // future: queue multiple messages
  let _toastContainer = null;

  /* ──────────────────────────────────────────────────────────
     INJECT CSS
     Dynamically load kany.css so kany-ui.js is self-contained
  ────────────────────────────────────────────────────────── */
  function _injectCSS() {
    if (document.getElementById('kany-stylesheet')) return;
    const link = document.createElement('link');
    link.id   = 'kany-stylesheet';
    link.rel  = 'stylesheet';
    link.href = 'kany.css';
    document.head.appendChild(link);
  }

  /* ──────────────────────────────────────────────────────────
     BUILD WIDGET HTML
     Creates the DOM tree for the mascot widget and appends
     it to document.body. Idempotent — safe to call multiple times.
  ────────────────────────────────────────────────────────── */
  function _buildWidget() {
    if (document.getElementById('kany-widget')) return; // already exists

    /* ── Toast stack (separate from widget so it stacks above) ── */
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'kany-toast-stack';
    document.body.appendChild(_toastContainer);

    /* ── Main widget ── */
    const widget = document.createElement('div');
    widget.id = 'kany-widget';
    widget.setAttribute('data-state', 'idle');
    widget.setAttribute('role', 'complementary');
    widget.setAttribute('aria-label', 'Kany mascot');

    widget.innerHTML = `
      <!-- Speech Bubble -->
      <div id="kany-bubble" role="status" aria-live="polite">
        <span class="kany-status-dot" aria-hidden="true"></span>
        <span class="kany-bubble-text" id="kany-bubble-text">
          ${STATES.idle.text}
        </span>
      </div>

      <!-- Avatar -->
      <div id="kany-avatar" title="Click to minimize Kany" aria-label="Kany mascot">
        <!-- Minimize button -->
        <button id="kany-minimize" aria-label="Minimize Kany" title="Minimize">×</button>

        <!-- Glass inner circle containing sprite -->
        <div id="kany-avatar-inner">
          <div
            id="kany-sprite"
            class="state-idle"
            role="img"
            aria-label="Kany idle animation"
            style="background-image: url('${SPRITE_SRC}');"
          ></div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    /* ── Wire up interactions ── */
    _bindEvents(widget);
  }

  /* ──────────────────────────────────────────────────────────
     BIND EVENTS
  ────────────────────────────────────────────────────────── */
  function _bindEvents(widget) {
    const minimizeBtn = widget.querySelector('#kany-minimize');
    const avatar      = widget.querySelector('#kany-avatar');

    /* Click minimize button → toggle minimized state */
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // don't bubble to avatar
      kanyController.toggleMinimize();
    });

    /* Right-click avatar → toggle bubble visibility */
    avatar.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const bubble = document.getElementById('kany-bubble');
      bubble.classList.toggle('visible');
    });

    /* Listen for synced animation end → revert to watching */
    const sprite = widget.querySelector('#kany-sprite');
    sprite.addEventListener('animationend', () => {
      if (_currentState === 'synced') {
        // After the one-shot synced animation, go back to watching
        _applyState('watching', null, 0);
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     APPLY STATE — private implementation
     @param {string} state    - key from STATES
     @param {string|null} text - override message; null = default
     @param {number} duration - ms before reverting to idle; 0 = sticky
  ────────────────────────────────────────────────────────── */
  function _applyState(state, text, duration) {
    const widget  = document.getElementById('kany-widget');
    const sprite  = document.getElementById('kany-sprite');
    const bubble  = document.getElementById('kany-bubble');
    const bubbleTxt = document.getElementById('kany-bubble-text');

    if (!widget || !sprite) {
      console.warn('[Kany] Widget not yet mounted, queuing state change.');
      _messageQueue.push({ state, text, duration });
      return;
    }

    /* Guard: ignore invalid states */
    if (!STATES[state]) {
      console.warn(`[Kany] Unknown state: "${state}". Valid states:`, Object.keys(STATES));
      return;
    }

    /* Clear existing auto-dismiss timer */
    if (_dismissTimer) {
      clearTimeout(_dismissTimer);
      _dismissTimer = null;
    }

    /* Resolve final values */
    const stateDef    = STATES[state];
    const finalText   = (text !== null && text !== undefined) ? text : stateDef.text;
    const finalDur    = (duration !== undefined && duration !== null) ? duration : stateDef.duration;

    /* Update module state */
    _currentState = state;

    /* ── 1. Update widget data-state for CSS theming ── */
    widget.setAttribute('data-state', state);

    /* ── 2. Swap sprite class ── */
    // Remove all state-* classes first
    const existing = [...sprite.classList].filter(c => c.startsWith('state-'));
    existing.forEach(c => sprite.classList.remove(c));
    // Force reflow so the animation restarts from frame 0
    void sprite.offsetWidth;
    sprite.classList.add(`state-${state}`);
    sprite.setAttribute('aria-label', `Kany ${state} animation`);

    /* ── 3. Update bubble text with a micro-fade ── */
    bubble.classList.remove('visible');

    // Small delay lets the fade-out complete before changing text
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bubbleTxt.textContent = finalText;
        bubble.classList.add('visible');
      });
    });

    /* ── 4. Schedule auto-dismiss ── */
    if (finalDur > 0) {
      _dismissTimer = setTimeout(() => {
        _applyState('idle', null, 0);
      }, finalDur);
    }

    /* ── 5. Dispatch custom event so other modules can react ── */
    window.dispatchEvent(new CustomEvent('kany:statechange', {
      detail: { state, text: finalText, duration: finalDur }
    }));
  }

  /* ──────────────────────────────────────────────────────────
     SHOW BUBBLE (helper to show/hide bubble explicitly)
  ────────────────────────────────────────────────────────── */
  function _showBubble(visible) {
    const bubble = document.getElementById('kany-bubble');
    if (!bubble) return;
    if (visible) {
      bubble.classList.add('visible');
    } else {
      bubble.classList.remove('visible');
    }
  }

  /* ──────────────────────────────────────────────────────────
     TOAST — ephemeral notification (4 s auto-dismiss)
     @param {string} message
     @param {'info'|'success'|'error'} type
  ────────────────────────────────────────────────────────── */
  function _showToast(message, type = 'info') {
    if (!_toastContainer) return;

    const colours = {
      info:    'rgba(167, 139, 250, 0.35)',
      success: 'rgba(16, 185, 129, 0.35)',
      error:   'rgba(239, 68, 68, 0.35)',
    };

    const toast = document.createElement('div');
    toast.className = 'kany-toast';
    toast.textContent = message;
    toast.style.borderColor = colours[type] || colours.info;

    _toastContainer.appendChild(toast);

    /* Remove from DOM after animation completes (4 s) */
    toast.addEventListener('animationend', (e) => {
      if (e.animationName === 'kany-toast-out') {
        toast.remove();
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     DRAIN QUEUE — process any setState calls that arrived
     before the DOM was ready
  ────────────────────────────────────────────────────────── */
  function _drainQueue() {
    while (_messageQueue.length > 0) {
      const { state, text, duration } = _messageQueue.shift();
      _applyState(state, text, duration);
    }
  }

  /* ──────────────────────────────────────────────────────────
     PUBLIC CONTROLLER
     Exposed as window.kany
  ────────────────────────────────────────────────────────── */
  const kanyController = {
    /**
     * Set Kany's state.
     * @param {string} state       - 'idle'|'watching'|'thinking'|'synced'|'error'|'party'
     * @param {string} [text]      - Custom bubble message (optional)
     * @param {number} [duration]  - Auto-revert to idle after ms (0 = sticky)
     *
     * @example
     *   window.kany.setState('error', 'Server is down! 🔴', 8000)
     *   window.kany.setState('synced')
     */
    setState(state, text = null, duration = null) {
      _applyState(state, text, duration);
    },

    /**
     * Show a brief toast notification.
     * @param {string} message
     * @param {'info'|'success'|'error'} [type]
     */
    toast(message, type = 'info') {
      _showToast(message, type);
    },

    /**
     * Force-show the speech bubble.
     * @param {string} [text] - Optional override text
     */
    speak(text) {
      if (text) {
        const el = document.getElementById('kany-bubble-text');
        if (el) el.textContent = text;
      }
      _showBubble(true);
    },

    /**
     * Hide the speech bubble.
     */
    silence() {
      _showBubble(false);
    },

    /**
     * Minimize the widget.
     */
    minimize() {
      const w = document.getElementById('kany-widget');
      if (!w) return;
      _isMinimized = true;
      w.classList.add('minimized');
      const btn = document.getElementById('kany-minimize');
      if (btn) btn.textContent = '+';
    },

    /**
     * Restore the widget from minimized state.
     */
    restore() {
      const w = document.getElementById('kany-widget');
      if (!w) return;
      _isMinimized = false;
      w.classList.remove('minimized');
      const btn = document.getElementById('kany-minimize');
      if (btn) btn.textContent = '×';
    },

    /**
     * Toggle between minimized and restored states.
     */
    toggleMinimize() {
      _isMinimized ? this.restore() : this.minimize();
    },

    /** Read current state (read-only) */
    get state() { return _currentState; },

    /** Read minimized status (read-only) */
    get isMinimized() { return _isMinimized; },
  };

  /* ──────────────────────────────────────────────────────────
     INIT — mount when DOM is ready
  ────────────────────────────────────────────────────────── */
  function _init() {
    _injectCSS();
    _buildWidget();

    /* Show idle bubble after a brief delay (feels more natural) */
    setTimeout(() => {
      _showBubble(true);
      _drainQueue();
    }, 600);

    /* Expose global controller */
    window.kany = kanyController;

    console.log('[Kany] Visual Engine v2.0 ready 🐱');
  }

  /* DOM-ready guard */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init, { once: true });
  } else {
    _init(); // DOM already parsed (e.g., script at bottom of <body>)
  }

})();