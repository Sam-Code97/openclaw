// sidepanel.js - OpenClaw Sidekick 🦞

const chatContainer = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusBadge = document.getElementById('status');

function updateStatusUI(status) {
  statusBadge.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
  statusBadge.className = `status-badge status-${status}`;
}

// Get initial status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response && response.status) {
    updateStatusUI(response.status);
  }
});

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATUS_UPDATE') {
    updateStatusUI(message.status);
  }
});

function appendMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message message-${sender}`;
  msgDiv.textContent = text;
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendBtn.addEventListener('click', () => {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  userInput.value = '';

  // TODO: Send to Gateway via background script
  console.log('🦞 Sidekick: User asked:', text);
  
  // Fake response for now
  setTimeout(() => {
    appendMessage("I've received your request. I'm processing the page context...", 'agent');
  }, 500);
});

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});
