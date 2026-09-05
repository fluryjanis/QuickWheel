/**
 * Quick Wheel - Content Script
 * 8-Octant Single-Ring Radial Wheel
 * Dual Trigger: Middle Mouse Button & Alt+Q Hotkey
 * Fixes: Auto-repeat flicker suppression, IPC shortcut debounce, and pinned-mode stabilization.
 */

(function () {
  'use strict';

  // Clean up any stale host instances from previous script injections
  const existingRoots = document.querySelectorAll('#research-wheel-extension-root, #quick-wheel-extension-root');
  existingRoots.forEach(el => el.remove());

  // Timing & Threshold Constants
  const HOLD_THRESHOLD_MS = 150;
  const RELEASE_GRACE_MS = 25;
  const NEUTRAL_RADIUS_PX = 35;

  // Gesture State Variables
  let holdTimer = null;
  let releaseGraceTimer = null;
  let isWheelActive = false;
  let originX = 0;
  let originY = 0;
  let currentSector = 'NEUTRAL';
  let preventNextAuxClick = false;

  // Hotkey State Variables
  let isKeyGesture = false;
  let keyPressStartTime = 0;
  let lastMouseX = window.innerWidth / 2;
  let lastMouseY = window.innerHeight / 2;

  // Non-destructive scroll lock coordinates (Prevents Twitter/X jump-to-top)
  let lockedScrollX = 0;
  let lockedScrollY = 0;

  // Shadow DOM Setup
  const hostDiv = document.createElement('div');
  hostDiv.id = 'quick-wheel-extension-root';
  document.documentElement.appendChild(hostDiv);

  const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  const wheelContainer = document.createElement('div');
  wheelContainer.className = 'wheel-overlay hidden';
  wheelContainer.innerHTML = `
    <div class="wheel-wrapper">
      <svg class="wheel-svg" viewBox="-200 -200 400 400">
        <!-- 8 EQUAL SINGLE-RING RADIAL OCTANTS (Radius 35px -> 160px) -->
        <path class="quadrant-slice" data-sector="N"  d="M -61.23 -147.82 A 160 160 0 0 1 61.23 -147.82 L 13.39 -32.34 A 35 35 0 0 0 -13.39 -32.34 Z" />
        <path class="quadrant-slice" data-sector="NE" d="M 61.23 -147.82 A 160 160 0 0 1 147.82 -61.23 L 32.34 -13.39 A 35 35 0 0 0 13.39 -32.34 Z" />
        <path class="quadrant-slice" data-sector="E"  d="M 147.82 -61.23 A 160 160 0 0 1 147.82 61.23 L 32.34 13.39 A 35 35 0 0 0 32.34 -13.39 Z" />
        <path class="quadrant-slice" data-sector="SE" d="M 147.82 61.23 A 160 160 0 0 1 61.23 147.82 L 13.39 32.34 A 35 35 0 0 0 32.34 13.39 Z" />
        <path class="quadrant-slice" data-sector="S"  d="M 61.23 147.82 A 160 160 0 0 1 -61.23 147.82 L -13.39 32.34 A 35 35 0 0 0 13.39 32.34 Z" />
        <path class="quadrant-slice" data-sector="SW" d="M -61.23 147.82 A 160 160 0 0 1 -147.82 61.23 L -32.34 13.39 A 35 35 0 0 0 -13.39 32.34 Z" />
        <path class="quadrant-slice" data-sector="W"  d="M -147.82 61.23 A 160 160 0 0 1 -147.82 -61.23 L -32.34 -13.39 A 35 35 0 0 0 -32.34 13.39 Z" />
        <path class="quadrant-slice" data-sector="NW" d="M -147.82 -61.23 A 160 160 0 0 1 -61.23 -147.82 L -13.39 -32.34 A 35 35 0 0 0 -32.34 -13.39 Z" />
      </svg>
      
      <div class="wheel-center">
        <span class="cancel-icon">✕</span>
      </div>

      <!-- 8 BALANCED ITEMS -->
      <div class="wheel-item item-n" data-sector="N">
        <span class="item-icon">⎘</span>
        <span class="item-text">Duplicate Tab</span>
      </div>
      <div class="wheel-item item-ne" data-sector="NE">
        <span class="item-icon">▲</span>
        <span class="item-text">Jump to Top</span>
      </div>
      <div class="wheel-item item-e" data-sector="E">
        <span class="item-icon">🔍</span>
        <span class="item-text">Focus Search</span>
      </div>
      <div class="wheel-item item-se" data-sector="SE">
        <span class="item-icon">🔇</span>
        <span class="item-text">Mute Tab</span>
      </div>
      <div class="wheel-item item-s" data-sector="S">
        <span class="item-icon">📝</span>
        <span class="item-text">Copy Markdown</span>
      </div>
      <div class="wheel-item item-sw" data-sector="SW">
        <span class="item-icon">🔗</span>
        <span class="item-text">Copy Link</span>
      </div>
      <div class="wheel-item item-w" data-sector="W">
        <span class="item-icon">🌐</span>
        <span class="item-text">Translate</span>
      </div>
      <div class="wheel-item item-nw" data-sector="NW">
        <span class="item-icon">↺</span>
        <span class="item-text">Reopen Tab</span>
      </div>
    </div>
  `;

  const wheelWrapper = wheelContainer.querySelector('.wheel-wrapper');
  const toast = document.createElement('div');
  toast.className = 'action-wheel-toast hidden';

  shadowRoot.appendChild(wheelContainer);
  shadowRoot.appendChild(toast);

  const slices = shadowRoot.querySelectorAll('.quadrant-slice');
  const items = shadowRoot.querySelectorAll('.wheel-item');
  const centerCircle = shadowRoot.querySelector('.wheel-center');

  // --- SCROLL SUPPRESSION & POINTER LOCK ---

  function preventScrollEvent(e) {
    if (isWheelActive) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  function preventKeyboardScroll(e) {
    if (!isWheelActive) return;
    const scrollKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
    if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function enforceLockedScroll() {
    if (isWheelActive) {
      window.scrollTo(lockedScrollX, lockedScrollY);
    }
  }

  function lockScrollAndPointer() {
    lockedScrollX = window.scrollX || window.pageXOffset || (document.documentElement ? document.documentElement.scrollLeft : 0) || 0;
    lockedScrollY = window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || 0;

    hostDiv.style.setProperty('cursor', 'pointer', 'important');

    window.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    window.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
    window.addEventListener('keydown', preventKeyboardScroll, { capture: true, passive: false });
    window.addEventListener('scroll', enforceLockedScroll, { capture: true, passive: false });
  }

  function killAutoscrollAndUnlock() {
    hostDiv.style.removeProperty('cursor');

    window.removeEventListener('wheel', preventScrollEvent, { capture: true });
    document.removeEventListener('wheel', preventScrollEvent, { capture: true });
    window.removeEventListener('touchmove', preventScrollEvent, { capture: true });
    document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
    window.removeEventListener('keydown', preventKeyboardScroll, { capture: true });
    window.removeEventListener('scroll', enforceLockedScroll, { capture: true });

    wheelContainer.classList.add('hidden');
  }

  function cancelAndCloseWheel() {
    killAutoscrollAndUnlock();
    isWheelActive = false;
    isKeyGesture = false;
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (releaseGraceTimer) {
      clearTimeout(releaseGraceTimer);
      releaseGraceTimer = null;
    }
  }

  // --- MOUSE LISTENERS ---

  window.addEventListener('mousemove', (e) => {
    // Continuously track cursor coordinates
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (!isWheelActive) return;

    e.preventDefault();
    e.stopPropagation();

    calculateSector(e.clientX, e.clientY);
  }, true);

  window.addEventListener('mousedown', (e) => {
    // If opened via hotkey in pinned mode: Left-Click executes hovered action or cancels
    if (e.button === 0 && isWheelActive && isKeyGesture) {
      e.preventDefault();
      e.stopPropagation();

      const sectorToRun = currentSector;
      killAutoscrollAndUnlock();
      isWheelActive = false;
      isKeyGesture = false;

      if (sectorToRun !== 'NEUTRAL') {
        executeQuickAction(sectorToRun);
      }
      return;
    }

    // Middle Mouse Button Trigger
    if (e.button !== 1) return;

    if (releaseGraceTimer) {
      clearTimeout(releaseGraceTimer);
      releaseGraceTimer = null;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    originX = e.clientX;
    originY = e.clientY;
    isKeyGesture = false;

    if (holdTimer) clearTimeout(holdTimer);

    holdTimer = setTimeout(() => {
      isWheelActive = true;
      preventNextAuxClick = true;
      showWheel(originX, originY);
    }, HOLD_THRESHOLD_MS);
  }, true);

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 1) return;

    if (holdTimer && !isWheelActive) {
      clearTimeout(holdTimer);
      holdTimer = null;
      return;
    }

    if (isWheelActive && !isKeyGesture) {
      e.preventDefault();
      e.stopPropagation();

      if (releaseGraceTimer) clearTimeout(releaseGraceTimer);

      releaseGraceTimer = setTimeout(() => {
        releaseGraceTimer = null;
        finalizeGestureAndExecute();
      }, RELEASE_GRACE_MS);
    }
  }, true);

  function finalizeGestureAndExecute() {
    if (!isWheelActive) return;

    const sectorToRun = currentSector;
    killAutoscrollAndUnlock();
    isWheelActive = false;
    isKeyGesture = false;

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    executeQuickAction(sectorToRun);
  }

  window.addEventListener('auxclick', (e) => {
    if (e.button === 1 && preventNextAuxClick) {
      e.preventDefault();
      e.stopPropagation();
      preventNextAuxClick = false;
    }
  }, true);

  // --- KEYBOARD HOTKEY LOGIC (Alt + Q) ---

  function startKeyWheel(x, y) {
    originX = x;
    originY = y;
    isWheelActive = true;
    isKeyGesture = true;
    keyPressStartTime = Date.now();
    showWheel(originX, originY);
  }

  window.addEventListener('keydown', (e) => {
    // Escape key closes the wheel anytime
    if (e.key === 'Escape' && isWheelActive) {
      e.preventDefault();
      e.stopPropagation();
      cancelAndCloseWheel();
      return;
    }

    // Direct local hotkey listener: Alt + Q
    if (e.altKey && e.code === 'KeyQ') {
      e.preventDefault();
      e.stopPropagation();

      // FIX 1: Ignore OS auto-repeat events when holding the key down (stops screen flashing)
      if (e.repeat) return;

      if (!isWheelActive) {
        startKeyWheel(lastMouseX, lastMouseY);
      } else if (isKeyGesture && Date.now() - keyPressStartTime > 250) {
        cancelAndCloseWheel();
      }
      return;
    }

    preventKeyboardScroll(e);
  }, true);

  window.addEventListener('keyup', (e) => {
    // Releasing Alt or Q after holding
    if (isWheelActive && isKeyGesture && (e.code === 'KeyQ' || e.key === 'Alt')) {
      const holdDuration = Date.now() - keyPressStartTime;

      // FIX 2: Only auto-execute if an action was actually selected (not NEUTRAL).
      // If the cursor is still in NEUTRAL, keep the wheel pinned open!
      if (holdDuration >= 180 && currentSector !== 'NEUTRAL') {
        e.preventDefault();
        e.stopPropagation();
        finalizeGestureAndExecute();
      }
    }
  }, true);

  // Listen for Chrome Extension Shortcut command from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TRIGGER_WHEEL_HOTKEY') {
      // FIX 3: Ignore background shortcut message if local keydown just started the wheel
      // (Stops the double-toggle race condition that made the wheel instantly disappear)
      if (Date.now() - keyPressStartTime < 350) return;

      if (!isWheelActive) {
        startKeyWheel(lastMouseX, lastMouseY);
      } else {
        cancelAndCloseWheel();
      }
    }
  });

  window.addEventListener('blur', () => {
    if (isWheelActive || holdTimer || releaseGraceTimer) {
      cancelAndCloseWheel();
    }
  });

  // --- RADIAL TRIGONOMETRY MATH ---

  function calculateSector(mouseX, mouseY) {
    const dx = mouseX - originX;
    const dy = originY - mouseY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= NEUTRAL_RADIUS_PX) {
      updateActiveUI('NEUTRAL');
      return;
    }

    const angleRad = Math.atan2(dy, dx);
    let deg = angleRad * (180 / Math.PI);
    if (deg < 0) deg += 360;

    let sector = 'N';
    if (deg >= 67.5 && deg < 112.5) {
      sector = 'N';
    } else if (deg >= 22.5 && deg < 67.5) {
      sector = 'NE';
    } else if (deg >= 337.5 || deg < 22.5) {
      sector = 'E';
    } else if (deg >= 292.5 && deg < 337.5) {
      sector = 'SE';
    } else if (deg >= 247.5 && deg < 292.5) {
      sector = 'S';
    } else if (deg >= 202.5 && deg < 247.5) {
      sector = 'SW';
    } else if (deg >= 157.5 && deg < 202.5) {
      sector = 'W';
    } else if (deg >= 112.5 && deg < 157.5) {
      sector = 'NW';
    }

    updateActiveUI(sector);
  }

  function updateActiveUI(sector) {
    currentSector = sector;

    slices.forEach(slice => {
      slice.classList.toggle('active', slice.dataset.sector === sector);
    });

    items.forEach(item => {
      item.classList.toggle('active', item.dataset.sector === sector);
    });

    centerCircle.classList.toggle('active', sector === 'NEUTRAL');
  }

  function showWheel(x, y) {
    wheelWrapper.style.left = `${x}px`;
    wheelWrapper.style.top = `${y}px`;
    wheelContainer.classList.remove('hidden');
    updateActiveUI('NEUTRAL');
    lockScrollAndPointer();
  }

  // --- ACTION ROUTING ---

  function executeQuickAction(sector) {
    switch (sector) {
      case 'N': handleDuplicateTab(); break;
      case 'NE': handleJumpToTop(); break;
      case 'E': handleFocusSearch(); break;
      case 'SE': handleToggleMute(); break;
      case 'S': handleCopyMarkdown(); break;
      case 'SW': handleCopyPlainLink(); break;
      case 'W': handleTranslate(); break;
      case 'NW': handleReopenTab(); break;
      case 'NEUTRAL': default: break;
    }
  }

  // ==========================================
  // --- ACTION IMPLEMENTATIONS ---
  // ==========================================

  function handleDuplicateTab() {
    chrome.runtime.sendMessage({ type: 'DUPLICATE_TAB' });
    showToast('Duplicating tab...');
  }

  function handleJumpToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Jumped to top of page!');
  }

  function handleToggleMute() {
    chrome.runtime.sendMessage({ type: 'TOGGLE_MUTE' });
    chrome.runtime.sendMessage({ type: 'TOGGLE_MUTE_TAB' });
    showToast('Mute toggled!');
  }

  function handleCopyPlainLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Page URL copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy URL');
    });
  }

  function handleReopenTab() {
    chrome.runtime.sendMessage({ type: 'REOPEN_CLOSED_TAB' });
    showToast('Reopening closed tab...');
  }

  function findDeepElement(selectors, root = document) {
    for (const selector of selectors) {
      try {
        const el = root.querySelector(selector);
        if (el) return el;
      } catch (e) {}
    }

    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        const found = findDeepElement(selectors, el.shadowRoot);
        if (found) return found;
      }
    }

    return null;
  }

  function createComposedEvent(type, EventClass = PointerEvent) {
    return new EventClass(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      buttons: 1
    });
  }

  function handleRedditSearch() {
    const redditHosts = document.querySelectorAll('shreddit-search-bar, faceplate-search-input, reddit-search-large, reddit-header-large, #search-input');
    let targetInput = null;

    for (const host of redditHosts) {
      const shadow = host.shadowRoot;
      if (shadow) {
        const shadowTrigger = shadow.querySelector('label, button, [part="container"], .input-container, .text-area-wrapper');
        if (shadowTrigger) {
          shadowTrigger.dispatchEvent(createComposedEvent('pointerdown', PointerEvent));
          shadowTrigger.dispatchEvent(createComposedEvent('mousedown', MouseEvent));
          shadowTrigger.dispatchEvent(createComposedEvent('pointerup', PointerEvent));
          shadowTrigger.dispatchEvent(createComposedEvent('mouseup', MouseEvent));
          shadowTrigger.dispatchEvent(createComposedEvent('click', MouseEvent));
        }

        const input = shadow.querySelector('input[name="q"], textarea[name="q"], input, textarea');
        if (input) {
          targetInput = input;
          break;
        }
      }
    }

    if (!targetInput) {
      targetInput = findDeepElement([
        'faceplate-search-input input',
        'faceplate-search-input textarea',
        'shreddit-search-bar input',
        'shreddit-search-bar textarea',
        'input[name="q"]',
        'textarea[name="q"]'
      ]);
    }

    if (targetInput) {
      const hostNode = targetInput.getRootNode()?.host;
      if (hostNode) {
        hostNode.dispatchEvent(createComposedEvent('pointerdown', PointerEvent));
        hostNode.dispatchEvent(createComposedEvent('click', MouseEvent));
      }

      if (typeof targetInput.scrollIntoView === 'function') {
        targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      targetInput.dispatchEvent(createComposedEvent('pointerdown', PointerEvent));
      targetInput.dispatchEvent(createComposedEvent('mousedown', MouseEvent));
      targetInput.dispatchEvent(createComposedEvent('pointerup', PointerEvent));
      targetInput.dispatchEvent(createComposedEvent('mouseup', MouseEvent));
      targetInput.dispatchEvent(createComposedEvent('click', MouseEvent));

      targetInput.focus();
      targetInput.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }));

      if (typeof targetInput.select === 'function') {
        targetInput.select();
      }

      showToast('Reddit search focused!');
      return true;
    }

    const slashOpts = { key: '/', code: 'Slash', keyCode: 191, which: 191, bubbles: true, cancelable: true, composed: true };
    window.dispatchEvent(new KeyboardEvent('keydown', slashOpts));
    document.dispatchEvent(new KeyboardEvent('keydown', slashOpts));
    showToast('Reddit search triggered!');
    return true;
  }

  function triggerFullFocus(el) {
    if (!el) return false;

    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let curr = el.getRootNode();
    while (curr && curr.host) {
      curr.host.dispatchEvent(createComposedEvent('click', MouseEvent));
      curr = curr.host.getRootNode();
    }

    el.dispatchEvent(createComposedEvent('pointerdown', PointerEvent));
    el.dispatchEvent(createComposedEvent('mousedown', MouseEvent));
    el.dispatchEvent(createComposedEvent('pointerup', PointerEvent));
    el.dispatchEvent(createComposedEvent('mouseup', MouseEvent));
    el.dispatchEvent(createComposedEvent('click', MouseEvent));

    el.focus();
    el.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }));

    if (typeof el.select === 'function') {
      el.select();
    } else if (typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(0, el.value ? el.value.length : 0);
    }

    return true;
  }

  function handleFocusSearch() {
    const isReddit = window.location.hostname.includes('reddit.com');

    if (isReddit) {
      handleRedditSearch();
      return;
    }

    const searchSelectors = [
      'textarea[name="q"]',
      'input[name="q"]',
      'textarea[part="control"]',
      'input[type="search"]',
      'input[name*="search" i]',
      'textarea[name*="search" i]',
      'input[placeholder*="search" i]',
      'textarea[placeholder*="search" i]',
      'textarea[placeholder*="Find" i]',
      'input[aria-label*="search" i]',
      '[role="searchbox"]'
    ];

    const searchInput = findDeepElement(searchSelectors);

    if (searchInput) {
      triggerFullFocus(searchInput);
      showToast('Search focused!');
      return;
    }

    const slashEvent = new KeyboardEvent('keydown', {
      key: '/',
      code: 'Slash',
      keyCode: 191,
      which: 191,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    document.dispatchEvent(slashEvent);
    showToast('Search triggered!');
  }

  function handleCopyMarkdown() {
    const selection = window.getSelection().toString().trim();
    const title = document.title || 'Untitled Page';
    const url = window.location.href;

    let markdown = '';
    if (selection) {
      markdown = `> ${selection}\n\n[${title}](${url})`;
    } else {
      markdown = `[${title}](${url})`;
    }

    navigator.clipboard.writeText(markdown).then(() => {
      showToast('Markdown link copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy to clipboard');
    });
  }

  function handleTranslate() {
    const textSelectors = [
      'h1', 'h2', 'h3', 'p',
      '#video-title', 'yt-formatted-string',
      'shreddit-post', 'span.title', 'a[id*="title"]'
    ];

    const elements = Array.from(document.querySelectorAll(textSelectors.join(',')))
      .filter(el => {
        const txt = el.innerText ? el.innerText.trim() : '';
        return txt.length > 3 && el.offsetWidth > 0 && el.offsetHeight > 0;
      })
      .slice(0, 20);

    if (elements.length === 0) {
      showToast('No readable text found to translate.');
      return;
    }

    const textList = elements.map(el => el.innerText.trim());

    showToast('Translating page text under the hood...');

    chrome.runtime.sendMessage({
      type: 'TRANSLATE_PAGE_NODES',
      payload: { textList }
    }, (response) => {
      if (response && response.success && response.translations) {
        response.translations.forEach((translatedText, index) => {
          if (elements[index] && translatedText) {
            elements[index].textContent = translatedText;
          }
        });
        showToast('Page translated!');
      } else {
        showToast('Translation failed.');
      }
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hidden');
    }, 2200);
  }
})();