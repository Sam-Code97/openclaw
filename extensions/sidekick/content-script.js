// content-script.js - OpenClaw Sidekick 🦞

console.log('🦞 OpenClaw Sidekick content script active');

// Listen for messages from background/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT_ELEMENT') {
    highlightElement(message.selector);
    sendResponse({ success: true });
  }
});

function highlightElement(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('osc-highlight-glow');
    
    // Remove after some time
    setTimeout(() => {
      el.classList.remove('osc-highlight-glow');
    }, 5000);
  }
}

// TODO: Implement DOM snapshotting and change detection
