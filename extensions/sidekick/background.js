// background.js - OpenClaw Sidekick Extension 🦞

const GATEWAY_URL = 'http://127.0.0.1:18789';
const WS_URL = 'ws://127.0.0.1:18789/extension';
let socket = null;
let reconnectTimeout = 1000;
let isConnected = false;

function connectToGateway() {
  console.log('🦞 Sidekick: Attempting to connect to OpenClaw Gateway...');
  
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('🦞 Sidekick: Connected to Gateway');
    isConnected = true;
    reconnectTimeout = 1000;
    updateStatus('connected');
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('🦞 Sidekick: Received message', message);

      if (message.method === 'ping') {
        socket.send(JSON.stringify({ method: 'pong' }));
        return;
      }

      if (message.method === 'forwardCDPCommand') {
        handleCDPCommand(message);
      }
    } catch (err) {
      console.error('🦞 Sidekick: Error handling message', err);
    }
  };

  socket.onclose = () => {
    console.log('🦞 Sidekick: Connection closed');
    isConnected = false;
    updateStatus('disconnected');
    scheduleReconnect();
  };

  socket.onerror = (err) => {
    console.error('🦞 Sidekick: WebSocket error', err);
    socket.close();
  };
}

function scheduleReconnect() {
  console.log(`🦞 Sidekick: Reconnecting in ${reconnectTimeout}ms...`);
  setTimeout(connectToGateway, reconnectTimeout);
  reconnectTimeout = Math.min(reconnectTimeout * 2, 30000);
}

async function handleCDPCommand(message) {
  const { id, params } = message;
  const { method, params: cdpParams, sessionId } = params;

  try {
    // Basic CDP command forwarding logic
    // For now, we mainly handle Browser and Target commands that can be shimmed
    // or forwarded to chrome.debugger if attached.
    
    // TODO: Implement actual chrome.debugger integration here
    
    socket.send(JSON.stringify({
      id,
      result: {}, // Dummy success for now
    }));
  } catch (error) {
    socket.send(JSON.stringify({
      id,
      error: error.message,
    }));
  }
}

function updateStatus(status) {
  chrome.storage.local.set({ gatewayStatus: status });
  // Broadcast to side panel if open
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status });
}

// Start discovery/connection
connectToGateway();

// Listen for messages from sidepanel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({ status: isConnected ? 'connected' : 'disconnected' });
  }
});

// Side Panel behavior: open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
