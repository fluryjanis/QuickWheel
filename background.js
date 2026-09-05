/**
 * Quick Wheel - Background Worker
 */

// Handle hotkey command from Chrome Shortcuts API
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-quick-wheel' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_WHEEL_HOTKEY' }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  // Duplicate current active tab
  if (message.type === 'DUPLICATE_TAB') {
    if (tabId) {
      chrome.tabs.duplicate(tabId).catch(() => {});
    }
  }

  // Toggle tab mute state
  if (message.type === 'TOGGLE_MUTE' || message.type === 'TOGGLE_MUTE_TAB') {
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        const isMuted = tab.mutedInfo ? tab.mutedInfo.muted : false;
        chrome.tabs.update(tabId, { muted: !isMuted });
      });
    }
  }

  // Restore last closed tab
  if (message.type === 'REOPEN_CLOSED_TAB') {
    if (chrome.sessions && chrome.sessions.restore) {
      chrome.sessions.restore().catch(() => {});
    }
  }

  // In-place batch translation
  if (message.type === 'TRANSLATE_PAGE_NODES') {
    const textList = message.payload.textList || [];
    const targetLang = (chrome.i18n.getUILanguage() || 'en').split('-')[0];

    const delimiter = ' ||| ';
    const combinedText = textList.join(delimiter);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(combinedText)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data[0]) {
          const fullTranslation = data[0].map(item => item[0]).join('');
          const translations = fullTranslation.split('|||').map(s => s.trim());
          sendResponse({ success: true, translations });
        } else {
          sendResponse({ success: false, error: 'Translation failed' });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open
  }

  return true;
});