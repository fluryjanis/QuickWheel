/**
 * Action Wheel - Side Panel Script
 * Listens for contextual storage updates and renders captured text.
 */

document.addEventListener('DOMContentLoaded', () => {
  const pageInfoEl = document.getElementById('page-info');
  const contentDisplayEl = document.getElementById('content-display');
  const copyBtn = document.getElementById('btn-copy');
  const clearBtn = document.getElementById('btn-clear');

  function loadContext() {
    chrome.storage.local.get('activeContext', (result) => {
      if (result.activeContext) {
        const { text, title, url } = result.activeContext;
        pageInfoEl.textContent = `${title || 'Page'} - ${url}`;
        contentDisplayEl.textContent = text || 'No text captured.';
      }
    });
  }

  // Load initial context
  loadContext();

  // Listen for storage changes in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.activeContext) {
      loadContext();
    }
  });

  copyBtn.addEventListener('click', () => {
    const text = contentDisplayEl.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Text', 1500);
      });
    }
  });

  clearBtn.addEventListener('click', () => {
    contentDisplayEl.textContent = 'No text captured.';
    pageInfoEl.textContent = 'Cleared context';
    chrome.storage.local.remove('activeContext');
  });
});