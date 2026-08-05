/**
 * Research Wheel - Background Worker
 * Handles Scholar & PubMed searches, Workspace Side Panel opening, and Translation API.
 */

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tab = sender.tab;

  // Open Research Workspace Side Panel
  if (message.type === 'OPEN_RESEARCH_PANEL') {
    if (tab && tab.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
  }

  // Scholar Search
  if (message.type === 'SEARCH_SCHOLAR') {
    const query = message.payload.query;
    const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: scholarUrl });
  }

  // PubMed Search
  if (message.type === 'SEARCH_PUBMED') {
    const query = message.payload.query;
    const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: pubmedUrl });
  }

  // Under-the-Hood Batch Translation
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