// sidepanel.js - OpenClaw Sidekick 🦞

const chatContainer = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusBadge = document.getElementById("status");

function updateStatusUI(status) {
  statusBadge.textContent = status === "connected" ? "Connected" : "Disconnected";
  statusBadge.className = `status-badge status-${status}`;
}

// Track if extension relay is connected (background script to extension relay)
let isExtensionConnected = false;

// Get initial status from background
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
  if (response && response.status) {
    isExtensionConnected = response.status === "connected";
    updateStatusUI(response.status);
  }
});

// Listen for status updates and agent responses from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATUS_UPDATE") {
    isExtensionConnected = message.status === "connected";
    updateStatusUI(message.status);
  }

  if (message.type === "AGENT_RESPONSE") {
    // Remove processing message if present
    const processingMsg = chatContainer.querySelector(".processing");
    if (processingMsg) {
      processingMsg.remove();
    }
    appendMessage(message.content, "agent");
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

  if (!isExtensionConnected) {
    appendMessage(
      "Extension relay not connected. Make sure the OpenClaw browser server is running.",
      "agent",
    );
    return;
  }

  // Show processing indicator
  appendMessage("Processing your request...", "agent", true);

  // Send message to background script
  console.log("🦞 Sidekick: Sending to background:", text);

  chrome.runtime.sendMessage(
    {
      type: "SEND_TO_AGENT",
      message: text,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        const processingMsg = chatContainer.querySelector(".processing");
        if (processingMsg) processingMsg.remove();
        appendMessage("Error: " + chrome.runtime.lastError.message, "agent");
        return;
      }

      if (!response || !response.success) {
        const processingMsg = chatContainer.querySelector(".processing");
        if (processingMsg) processingMsg.remove();
        appendMessage(response?.error || "Failed to process message", "agent");
      }
      // Success - wait for AGENT_RESPONSE message
    },
  );
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
