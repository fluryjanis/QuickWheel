/**
 * Action Wheel - Dual-Ring Content Script
 * Handles 2-layer radial trigonometry math, native middle-click autoscroll preservation, scroll locking, and 8 gesture actions.
 */

(function () {
  'use strict';

  // Configuration Constants
  const HOLD_THRESHOLD_MS = 150;
  const NEUTRAL_RADIUS_PX = 35;
  const INNER_RADIUS_MAX_PX = 120;
  const OUTER_RADIUS_MAX_PX = 210;

  // State Variables
  let holdTimer = null;
  let isWheelActive = false;
  let originX = 0;
  let originY = 0;
  let currentSector = 'NEUTRAL';
  let preventNextAuxClick = false;

  // Shadow DOM Root Setup for Style & DOM Isolation
  const hostDiv = document.createElement('div');
  hostDiv.id = 'action-wheel-extension-root';
  document.documentElement.appendChild(hostDiv);

  const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  // Load external stylesheet inside Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  // Wheel UI DOM Construction (Dual Concentric Rings)
  const wheelContainer = document.createElement('div');
  wheelContainer.className = 'wheel-overlay hidden';
  wheelContainer.innerHTML = `
    <div class="wheel-wrapper">
      <svg class="wheel-svg" viewBox="-200 -200 400 400">
        <!-- INNER RING SLICES (Radius 35px -> 120px) -->
        <path class="quadrant-slice" data-sector="INNER_UP" d="M -84.85 -84.85 A 120 120 0 0 1 84.85 -84.85 L 24.75 -24.75 A 35 35 0 0 0 -24.75 -24.75 Z" />
        <path class="quadrant-slice" data-sector="INNER_RIGHT" d="M 84.85 -84.85 A 120 120 0 0 1 84.85 84.85 L 24.75 24.75 A 35 35 0 0 0 24.75 -24.75 Z" />
        <path class="quadrant-slice" data-sector="INNER_BOTTOM" d="M 84.85 84.85 A 120 120 0 0 1 -84.85 84.85 L -24.75 24.75 A 35 35 0 0 0 24.75 24.75 Z" />
        <path class="quadrant-slice" data-sector="INNER_LEFT" d="M -84.85 84.85 A 120 120 0 0 1 -84.85 -84.85 L -24.75 -24.75 A 35 35 0 0 0 -24.75 24.75 Z" />

        <!-- OUTER RING SLICES (Radius 120px -> 200px) -->
        <path class="quadrant-slice" data-sector="OUTER_UP" d="M -141.42 -141.42 A 200 200 0 0 1 141.42 -141.42 L 84.85 -84.85 A 120 120 0 0 0 -84.85 -84.85 Z" />
        <path class="quadrant-slice" data-sector="OUTER_RIGHT" d="M 141.42 -141.42 A 200 200 0 0 1 141.42 141.42 L 84.85 84.85 A 120 120 0 0 0 84.85 -84.85 Z" />
        <path class="quadrant-slice" data-sector="OUTER_BOTTOM" d="M 141.42 141.42 A 200 200 0 0 1 -141.42 141.42 L -84.85 84.85 A 120 120 0 0 0 84.85 84.85 Z" />
        <path class="quadrant-slice" data-sector="OUTER_LEFT" d="M -141.42 141.42 A 200 200 0 0 1 -141.42 -141.42 L -84.85 -84.85 A 120 120 0 0 0 -84.85 84.85 Z" />
      </svg>
      
      <div class="wheel-center">
        <span class="cancel-icon">✕</span>
      </div>

      <!-- INNER RING ITEMS -->
      <div class="wheel-item item-inner-up" data-sector="INNER_UP">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        <span>Duplicate Tab</span>
      </div>
      <div class="wheel-item item-inner-right" data-sector="INNER_RIGHT">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <span>Focus Search</span>
      </div>
      <div class="wheel-item item-inner-bottom" data-sector="INNER_BOTTOM">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        <span>Copy Markdown</span>
      </div>
      <div class="wheel-item item-inner-left" data-sector="INNER_LEFT">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
        <span>Translate</span>
      </div>

      <!-- OUTER RING ITEMS -->
      <div class="wheel-item item-outer-up" data-sector="OUTER_UP">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
        <span>Jump to Top</span>
      </div>
      <div class="wheel-item item-outer-right" data-sector="OUTER_RIGHT">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
        <span>Mute Tab</span>
      </div>
      <div class="wheel-item item-outer-bottom" data-sector="OUTER_BOTTOM">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
        <span>Copy Link</span>
      </div>
      <div class="wheel-item item-outer-left" data-sector="OUTER_LEFT">
        <svg class="item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
        <span>Reopen Tab</span>
      </div>
    </div>
  `;

  const wheelWrapper = wheelContainer.querySelector('.wheel-wrapper');

  // Notification Toast DOM
  const toast = document.createElement('div');
  toast.className = 'action-wheel-toast hidden';

  shadowRoot.appendChild(wheelContainer);
  shadowRoot.appendChild(toast);

  // Quick references to slice elements
  const slices = shadowRoot.querySelectorAll('.quadrant-slice');
  const items = shadowRoot.querySelectorAll('.wheel-item');
  const centerCircle = shadowRoot.querySelector('.wheel-center');

  // --- Scroll & Pointer Lock Helpers ---

  function preventScrollEvent(e) {
    if (isWheelActive) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }

  function lockScrollAndPointer() {
    if (document.body) document.body.style.setProperty('overflow', 'hidden', 'important');
    if (document.documentElement) document.documentElement.style.setProperty('overflow', 'hidden', 'important');

    document.documentElement.style.setProperty('cursor', 'pointer', 'important');
    if (document.body) document.body.style.setProperty('cursor', 'pointer', 'important');
    hostDiv.style.setProperty('cursor', 'pointer', 'important');

    window.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('wheel', preventScrollEvent, { capture: true, passive: false });
    window.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
    document.addEventListener('touchmove', preventScrollEvent, { capture: true, passive: false });
  }

  function unlockScrollAndPointer() {
    // Explicit property removal guarantees original browser scrollbar & styles restore cleanly
    if (document.body) {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('cursor');
    }
    if (document.documentElement) {
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('cursor');
    }
    hostDiv.style.removeProperty('cursor');

    window.removeEventListener('wheel', preventScrollEvent, { capture: true });
    document.removeEventListener('wheel', preventScrollEvent, { capture: true });
    window.removeEventListener('touchmove', preventScrollEvent, { capture: true });
    document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
  }

  // --- Mouse Event Listeners ---

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return; // Middle mouse click only

    // DO NOT call e.preventDefault() here! Allows native quick-click middle-scroller to work.

    originX = e.clientX;
    originY = e.clientY;

    holdTimer = setTimeout(() => {
      isWheelActive = true;
      preventNextAuxClick = true;
      showWheel(originX, originY);
    }, HOLD_THRESHOLD_MS);
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!isWheelActive) return;

    e.preventDefault();
    e.stopPropagation();

    calculateQuadrant(e.clientX, e.clientY);
  }, true);

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 1) return;

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (isWheelActive) {
      e.preventDefault();
      e.stopPropagation();

      executeAction(currentSector);
      hideWheel();
      isWheelActive = false;
    }
  }, true);

  // Prevent middle click autoscroll or link open ONLY if wheel gesture was activated
  window.addEventListener('auxclick', (e) => {
    if (e.button === 1 && preventNextAuxClick) {
      e.preventDefault();
      e.stopPropagation();
      preventNextAuxClick = false;
    }
  }, true);

  // --- 2-Ring Radial Trigonometry Math ---

  function calculateQuadrant(mouseX, mouseY) {
    const dx = mouseX - originX;
    const dy = originY - mouseY; // Invert Y axis

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Neutral Center Zone
    if (distance <= NEUTRAL_RADIUS_PX) {
      updateActiveUI('NEUTRAL');
      return;
    }

    const angleRad = Math.atan2(dy, dx);
    let deg = angleRad * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // Directional Mapping (UP, RIGHT, BOTTOM, LEFT)
    let direction = 'UP';
    if (deg >= 45 && deg < 135) {
      direction = 'UP';
    } else if (deg >= 135 && deg < 225) {
      direction = 'LEFT';
    } else if (deg >= 225 && deg < 315) {
      direction = 'BOTTOM';
    } else if (deg >= 315 || deg < 45) {
      direction = 'RIGHT';
    }

    // Determine Ring Layer by Distance
    if (distance <= INNER_RADIUS_MAX_PX) {
      updateActiveUI(`INNER_${direction}`);
    } else {
      updateActiveUI(`OUTER_${direction}`);
    }
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

  function hideWheel() {
    wheelContainer.classList.add('hidden');
    unlockScrollAndPointer();
  }

  // --- Actions Handler ---

  function executeAction(sector) {
    switch (sector) {
      // INNER RING ACTIONS
      case 'INNER_UP': handleDuplicateTab(); break;
      case 'INNER_RIGHT': handleFocusSearch(); break;
      case 'INNER_BOTTOM': handleCopyMarkdown(); break;
      case 'INNER_LEFT': handleTranslate(); break;

      // OUTER RING ACTIONS
      case 'OUTER_UP': handleJumpToTop(); break;
      case 'OUTER_RIGHT': handleToggleMute(); break;
      case 'OUTER_BOTTOM': handleCopyPlainLink(); break;
      case 'OUTER_LEFT': handleReopenTab(); break;

      case 'NEUTRAL': default: break;
    }
  }

  // --- ACTION IMPLEMENTATIONS ---

  function handleDuplicateTab() {
    chrome.runtime.sendMessage({ type: 'DUPLICATE_TAB' });
    showToast('Duplicating tab...');
  }

  function handleJumpToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Jumped to top of page!');
  }

  function handleToggleMute() {
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

  // Universal Shadow DOM Deep Search Helper
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
    console.log('[Action Wheel] Custom Reddit Search Handler executing...');

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