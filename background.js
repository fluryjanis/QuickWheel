/**
 * Action Wheel - Background Service Worker
 * Handles extension messaging, Tab Duplication, Tab Muting, Reopening Tabs, and Batch Translation.
 */

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle Tab Duplication
  if (message.type === 'DUPLICATE_TAB') {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.duplicate(sender.tab.id);
    }
  }

  // Handle Tab Muting
  if (message.type === 'TOGGLE_MUTE_TAB') {
    if (sender.tab && sender.tab.id) {
      const isMuted = sender.tab.mutedInfo ? sender.tab.mutedInfo.muted : false;
      chrome.tabs.update(sender.tab.id, { muted: !isMuted });
    }
  }

  // Handle Reopening Last Closed Tab
  if (message.type === 'REOPEN_CLOSED_TAB') {
    if (chrome.sessions && chrome.sessions.restore) {
      chrome.sessions.restore();
    }
  }

  // Handle Under-the-Hood Batch Text Translation
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

    return true; // Keeps messaging channel open for asynchronous response
  }

  return true;
});