// sidepanel.js - OpenClaw Sidekick 🦞

const GATEWAY_WS_URL = "ws://127.0.0.1:18789";
const chatContainer = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusBadge = document.getElementById("status");

let gatewaySocket = null;
let messageId = 1;
let isGatewayConnected = false;

function updateStatusUI(status) {
  statusBadge.textContent = status === "connected" ? "Connected" : "Disconnected";
  statusBadge.className = `status-badge status-${status}`;
}

// Connect to OpenClaw Gateway
function connectToGateway() {
  console.log("🦞 Sidekick: Connecting to gateway...");

  gatewaySocket = new WebSocket(GATEWAY_WS_URL);

  gatewaySocket.onopen = () => {
    console.log("🦞 Sidekick: Connected to gateway");
    isGatewayConnected = true;
    updateStatusUI("connected");

    // Send connect message
    sendGatewayMessage("connect", {
      client: {
        id: "openclaw-sidekick-extension",
        displayName: "OpenClaw Sidekick",
        version: "0.1.0",
      },
      minProtocol: 1,
      maxProtocol: 1,
    });
  };

  gatewaySocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("🦞 Sidekick: Gateway message:", data);

      if (data.type === "event" && data.event === "chat") {
        // Handle chat response
        const payload = data.payload || {};
        if (payload.content) {
          appendMessage(payload.content, "agent");
        }
      } else if (data.type === "response") {
        // Handle direct response
        if (data.payload && data.payload.message) {
          appendMessage(data.payload.message, "agent");
        }
      }
    } catch (err) {
      console.error("🦞 Sidekick: Error parsing gateway message:", err);
    }
  };

  gatewaySocket.onclose = () => {
    console.log("🦞 Sidekick: Gateway connection closed");
    isGatewayConnected = false;
    updateStatusUI("disconnected");
    // Reconnect after 5 seconds
    setTimeout(connectToGateway, 5000);
  };

  gatewaySocket.onerror = (err) => {
    console.error("🦞 Sidekick: Gateway error:", err);
    isGatewayConnected = false;
    updateStatusUI("disconnected");
  };
}

function sendGatewayMessage(method, params) {
  if (!gatewaySocket || gatewaySocket.readyState !== WebSocket.OPEN) {
    console.warn("🦞 Sidekick: Gateway not connected");
    return;
  }

  const message = {
    id: messageId++,
    type: "request",
    method,
    params,
  };

  gatewaySocket.send(JSON.stringify(message));
}

// Get initial status from background
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
  if (response && response.status) {
    // Don't update UI - we track gateway connection separately
  }
});

// Listen for status updates from background (extension relay status)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATUS_UPDATE") {
    // Background extension relay status changed
    console.log("🦞 Sidekick: Extension relay status:", message.status);
  }
});

function appendMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message message-${sender}`;
  msgDiv.textContent = text;
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendBtn.addEventListener("click", () => {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";

  if (!isGatewayConnected) {
    appendMessage(
      "Not connected to OpenClaw gateway. Please wait or reload the extension.",
      "agent",
    );
    return;
  }

  // Send message to gateway
  console.log("🦞 Sidekick: Sending to gateway:", text);

  // Get current tab info for context
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const context = currentTab
      ? {
          url: currentTab.url,
          title: currentTab.title,
        }
      : null;

    sendGatewayMessage("chat", {
      message: text,
      context: {
        type: "browser",
        tab: context,
      },
    });
  });

  // Show processing indicator
  appendMessage("Processing your request...", "agent");
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Connect to gateway when panel opens
connectToGateway();
