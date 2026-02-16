// background.js - OpenClaw Sidekick Extension 🦞

const GATEWAY_URL = 'http://127.0.0.1:18789';
const WS_URL = 'ws://127.0.0.1:18789/extension';
let socket = null;
let reconnectTimeout = 1000;
let isConnected = false;

// Debugger state
const DEBUGGER_TARGET = { tabId: chrome.debugger.TARGET_TAB_ID };
let isDebuggerAttached = false;
let activeTabId = null;
let activeSessionId = null;

function connectToGateway() {
  console.log('🦞 Sidekick: Attempting to connect to OpenClaw Gateway...');
  
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('🦞 Sidekick: Connected to Gateway');
    isConnected = true;
    reconnectTimeout = 1000;
    updateStatus('connected');
    
    // Attach to current active tab
    attachToActiveTab();
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

// Tab and debugger management
async function attachToActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.log('🦞 Sidekick: No active tab found');
      return;
    }
    
    activeTabId = tab.id;
    await attachDebugger(tab.id);
  } catch (err) {
    console.error('🦞 Sidekick: Failed to attach to active tab:', err);
  }
}

async function attachDebugger(tabId) {
  if (isDebuggerAttached) {
    try {
      await chrome.debugger.detach({ tabId: activeTabId });
    } catch {
      // Ignore detach errors
    }
    isDebuggerAttached = false;
  }

  // Skip chrome:// and other restricted URLs
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    console.log('🦞 Sidekick: Cannot attach to restricted URL:', tab?.url);
    return;
  }

  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    isDebuggerAttached = true;
    activeTabId = tabId;
    activeSessionId = `tab-${tabId}`;
    
    console.log('🦞 Sidekick: Debugger attached to tab', tabId);
    
    // Enable necessary domains
    await sendDebuggerCommand(tabId, 'Runtime.enable');
    await sendDebuggerCommand(tabId, 'DOM.enable');
    await sendDebuggerCommand(tabId, 'Page.enable');
    
    // Notify gateway that target is attached
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        method: 'forwardCDPEvent',
        params: {
          method: 'Target.attachedToTarget',
          params: {
            sessionId: activeSessionId,
            targetInfo: {
              targetId: String(tabId),
              type: 'page',
              title: tab.title || '',
              url: tab.url || '',
              attached: true
            },
            waitingForDebugger: false
          }
        }
      }));
    }
  } catch (err) {
    console.error('🦞 Sidekick: Failed to attach debugger:', err);
    isDebuggerAttached = false;
  }
}

async function detachDebugger() {
  if (!isDebuggerAttached || !activeTabId) return;
  
  try {
    await chrome.debugger.detach({ tabId: activeTabId });
    
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        method: 'forwardCDPEvent',
        params: {
          method: 'Target.detachedFromTarget',
          params: {
            sessionId: activeSessionId,
            targetId: String(activeTabId)
          }
        }
      }));
    }
  } catch {
    // Ignore
  }
  
  isDebuggerAttached = false;
  activeTabId = null;
  activeSessionId = null;
}

function sendDebuggerCommand(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

async function handleCDPCommand(message) {
  const { id, params } = message;
  const { method, params: cdpParams = {}, sessionId } = params;

  try {
    let result;
    
    // Handle tab-related commands
    if (method === 'Target.getTargets') {
      const tabs = await chrome.tabs.query({});
      result = {
        targetInfos: tabs.map(tab => ({
          targetId: String(tab.id),
          type: 'page',
          title: tab.title || '',
          url: tab.url || '',
          attached: tab.id === activeTabId
        }))
      };
    }
    else if (method === 'Target.attachToTarget') {
      const targetId = cdpParams.targetId;
      if (targetId) {
        const tabId = parseInt(targetId, 10);
        if (!isNaN(tabId)) {
          await attachDebugger(tabId);
          result = { sessionId: activeSessionId };
        } else {
          throw new Error('Invalid targetId');
        }
      } else {
        throw new Error('targetId required');
      }
    }
    else if (method === 'Target.activateTarget') {
      const targetId = cdpParams.targetId;
      if (targetId) {
        const tabId = parseInt(targetId, 10);
        if (!isNaN(tabId)) {
          await chrome.tabs.update(tabId, { active: true });
          result = {};
        }
      }
    }
    else if (method === 'Target.closeTarget') {
      const targetId = cdpParams.targetId;
      if (targetId) {
        const tabId = parseInt(targetId, 10);
        if (!isNaN(tabId)) {
          await chrome.tabs.remove(tabId);
          result = {};
        }
      }
    }
    else if (method === 'Target.getTargetInfo') {
      const targetId = cdpParams.targetId || sessionId?.replace('tab-', '');
      if (targetId) {
        const tabId = parseInt(targetId, 10);
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        if (tab) {
          result = {
            targetInfo: {
              targetId: String(tab.id),
              type: 'page',
              title: tab.title || '',
              url: tab.url || '',
              attached: tab.id === activeTabId
            }
          };
        }
      }
    }
    // Handle Browser commands
    else if (method === 'Browser.getVersion') {
      result = {
        protocolVersion: '1.3',
        product: 'Chrome/OpenClaw-Sidekick',
        revision: '0',
        userAgent: navigator.userAgent,
        jsVersion: 'V8'
      };
    }
    else if (method === 'Browser.setDownloadBehavior') {
      result = {};
    }
    // Forward all other commands to the debugger
    else if (isDebuggerAttached && activeTabId) {
      result = await sendDebuggerCommand(activeTabId, method, cdpParams);
    } else {
      throw new Error('Debugger not attached');
    }

    socket.send(JSON.stringify({
      id,
      result: result ?? {}
    }));
  } catch (error) {
    console.error(`🦞 Sidekick: CDP command failed: ${method}`, error);
    socket.send(JSON.stringify({
      id,
      error: error.message
    }));
  }
}

// Listen for debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  console.log('🦞 Sidekick: Debugger event', method, params);
  
  if (socket?.readyState === WebSocket.OPEN && activeSessionId) {
    socket.send(JSON.stringify({
      method: 'forwardCDPEvent',
      params: {
        method,
        params,
        sessionId: activeSessionId
      }
    }));
  }
});

chrome.debugger.onDetach.addListener((source, reason) => {
  console.log('🦞 Sidekick: Debugger detached:', reason);
  isDebuggerAttached = false;
  
  if (socket?.readyState === WebSocket.OPEN && activeSessionId) {
    socket.send(JSON.stringify({
      method: 'forwardCDPEvent',
      params: {
        method: 'Target.detachedFromTarget',
        params: {
          sessionId: activeSessionId,
          targetId: String(source.tabId)
        }
      }
    }));
  }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('🦞 Sidekick: Tab activated', activeInfo.tabId);
  if (isConnected) {
    await attachDebugger(activeInfo.tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === 'complete') {
    console.log('🦞 Sidekick: Active tab updated', tab.url);
    
    // Re-attach to refresh the session
    if (isConnected) {
      await attachDebugger(tabId);
    }
    
    // Notify gateway of navigation
    if (socket?.readyState === WebSocket.OPEN && activeSessionId) {
      socket.send(JSON.stringify({
        method: 'forwardCDPEvent',
        params: {
          method: 'Target.targetInfoChanged',
          params: {
            targetInfo: {
              targetId: String(tabId),
              type: 'page',
              title: tab.title || '',
              url: tab.url || '',
              attached: true
            }
          }
        }
      }));
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === activeTabId) {
    console.log('🦞 Sidekick: Active tab closed');
    await detachDebugger();
  }
});

function updateStatus(status) {
  chrome.storage.local.set({ gatewayStatus: status });
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status }).catch(() => {});
}

// Start connection
connectToGateway();

// Listen for messages from sidepanel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({ status: isConnected ? 'connected' : 'disconnected' });
  }
  return true;
});

// Side Panel behavior: open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
