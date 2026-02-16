// sidepanel.js - OpenClaw Sidekick 🦞

const GATEWAY_WS_URL = "ws://127.0.0.1:18789";
const chatContainer = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusBadge = document.getElementById("status");

let gatewaySocket = null;
let isGatewayConnected = false;
let messageId = 1;
let connectNonce = null;

function updateStatusUI(status) {
  statusBadge.textContent = status === "connected" ? "Connected" : "Disconnected";
  statusBadge.className = `status-badge status-${status}`;
}

// Connect to OpenClaw Gateway
function connectToGateway() {
  console.log("🦞 Sidekick: Connecting to gateway...");

  gatewaySocket = new WebSocket(GATEWAY_WS_URL);

  gatewaySocket.onopen = () => {
    console.log("🦞 Sidekick: WebSocket connected, waiting for challenge...");
  };

  gatewaySocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("🦞 Sidekick: Gateway message:", data);

      if (data.type === "event" && data.event === "connect.challenge") {
        // Handle auth challenge
        connectNonce = data.payload?.nonce;
        console.log("🦞 Sidekick: Got challenge nonce:", connectNonce);

        // Send connect request with correct webchat auth
        // Based on OpenClaw protocol: client.id must be "openclaw-control-ui" for webchat
        const connectPayload = {
          minProtocol: 1,
          maxProtocol: 1,
          client: {
            id: "openclaw-control-ui",
            displayName: "OpenClaw Sidekick",
            version: "0.1.0",
            platform: "chrome",
            mode: "webchat",
          },
          role: "operator",
          scopes: ["operator.admin"],
          caps: ["chat"],
          nonce: connectNonce,
        };
        console.log("🦞 Sidekick: Sending connect:", JSON.stringify(connectPayload, null, 2));
        sendGatewayMessage("connect", connectPayload);
      } else if (data.type === "response" && data.id) {
        // Handle response to our connect request
        if (data.ok) {
          console.log("🦞 Sidekick: Connected to gateway successfully");
          isGatewayConnected = true;
          updateStatusUI("connected");
          appendMessage(
            "Connected to OpenClaw agent! I can now see and control your browser.",
            "agent",
          );
        } else {
          console.error("🦞 Sidekick: Connection failed:", data.error);
          appendMessage("Connection failed: " + (data.error?.message || "Unknown error"), "agent");
        }
      } else if (data.type === "event" && data.event === "chat") {
        // Handle chat response from agent
        const processingMsg = chatContainer.querySelector(".processing");
        if (processingMsg) processingMsg.remove();

        const content = data.payload?.content || data.payload?.message;
        if (content) {
          appendMessage(content, "agent");
        }
      } else if (data.type === "event" && data.event === "browser") {
        // Handle browser tool response
        console.log("🦞 Sidekick: Browser event:", data.payload);
      }
    } catch (err) {
      console.error("🦞 Sidekick: Error parsing gateway message:", err);
    }
  };

  gatewaySocket.onclose = (event) => {
    console.log("🦞 Sidekick: Gateway connection closed", event.code, event.reason);
    isGatewayConnected = false;
    updateStatusUI("disconnected");

    // Show error message if this is the first connection attempt
    if (!document.querySelector(".connection-error")) {
      appendMessage(`Connection closed (code: ${event.code}). Retrying in 5 seconds...`, "agent");
      const msgs = chatContainer.querySelectorAll(".message-agent");
      msgs[msgs.length - 1]?.classList.add("connection-error");
    }

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
    id: String(messageId++),
    type: "req",
    method,
    params,
  };

  const msgStr = JSON.stringify(message);
  console.log(
    "🦞 Sidekick: Sending:",
    msgStr.substring(0, 200) + (msgStr.length > 200 ? "..." : ""),
  );
  gatewaySocket.send(msgStr);
}

// Also track extension relay status
let isExtensionConnected = false;

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
  if (response && response.status) {
    isExtensionConnected = response.status === "connected";
    if (!isGatewayConnected) {
      updateStatusUI(response.status);
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATUS_UPDATE") {
    isExtensionConnected = message.status === "connected";
    if (!isGatewayConnected) {
      updateStatusUI(message.status);
    }
  }
});

function appendMessage(text, sender, isProcessing = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message message-${sender}`;
  if (isProcessing) {
    msgDiv.classList.add("processing");
    msgDiv.style.fontStyle = "italic";
    msgDiv.style.color = "#666";
  }
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
    appendMessage("Not connected to OpenClaw gateway. Please wait for connection...", "agent");
    return;
  }

  // Show processing indicator
  appendMessage("Processing your request...", "agent", true);

  // Send chat message to gateway
  console.log("🦞 Sidekick: Sending to gateway:", text);

  // Get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    sendGatewayMessage("chat", {
      content: text,
      context: {
        type: "browser",
        tab: currentTab
          ? {
              url: currentTab.url,
              title: currentTab.title,
            }
          : null,
      },
    });
  });
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Connect when panel opens
connectToGateway();
