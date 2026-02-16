# Implementation Plan: OpenClaw Sidekick Chrome Extension 🦞 (Rethink v2)

After a deep-dive into `extension-relay.ts` and the OpenClaw browser driver architecture, I have re-evaluated the technical plan. The initial plan was too optimistic about "zero setup." This revised plan addresses the real-world constraints of Chrome's security model, the limitations of the existing relay, and the "mainstream" UX requirements.

---

## 1. The "Hard Truths" of the Investigation

1.  **Passive vs. Active Control:** The current `extension-relay.ts` is built for **OpenClaw to control the browser**. It is *not* built for the browser to trigger OpenClaw. A true "Sidekick" needs bidirectional triggers.
2.  **The Debugger Barrier:** Chrome's `chrome.debugger` API (required for CDP) shows a permanent, scary yellow banner: *"OpenClaw Sidekick is debugging this browser."* This is a massive UX hurdle for "normal people."
3.  **Authentication Ghosting:** While we can use existing cookies, if a site uses strict **Frame Guard** or **Content Security Policy (CSP)**, OpenClaw's Canvas cannot easily overlay or interact with that site without significant injection hacks.

---

## 2. Revised Architectural Strategy: The "Overlay-Native" Model

Instead of a pure CDP debugger (which is scary and heavy), we will use a **Hybrid Injection Model**:

1.  **Lightweight Content Scripts:** Use standard DOM manipulation for 90% of tasks (reading text, clicking buttons). This avoids the "Yellow Debugger Banner."
2.  **On-Demand CDP:** Only trigger the `chrome.debugger` API when a "Complex Vision" or "Deep Automation" task is required, then immediately detach.
3.  **The WebSocket Handshake:** The extension must "Self-Identify" to the local OpenClaw gateway. 

---

## 3. Detailed Implementation Roadmap

### Phase 1: The Secure Local Bridge
*   **Problem:** How does the extension find OpenClaw?
*   **Solution:** The OpenClaw Gateway will start a lightweight **Discovery Service** on a known port (e.g., 18789). The extension will "ping" this port.
*   **Security (Pairing):** Upon first connection, the Extension generates a `ClientKey`. The user must see a notification in the OpenClaw macOS menu bar: *"Chrome Extension is requesting access. Approve?"*
*   **Code Change:** Update `src/browser/extension-relay.ts` to support an `AUTH_REQUEST` event before allowing CDP commands.

### Phase 2: The Side Panel (The UX Core)
*   **Architecture:** Use Chrome's `sidePanel` API.
*   **Deep Integration:**
    *   **Live Context:** Every time the user changes tabs, the extension sends the `url` and a `DOM_Snapshot` to OpenClaw's **Memory Subsystem**.
    *   **Agent Presence:** The OpenClaw agent appears as a chat bubble in the side panel. It should feel like the agent is "watching the screen with you."
*   **Code Change:** Create a new Gateway endpoint `/sidekick/sync` that accepts DOM trees and updates the active session context.

### Phase 3: The "Magic" (Injection & Highlighting)
*   **Task:** The Agent needs to "Point" at a button on Amazon.
*   **Mechanism:**
    1.  Agent identifies the element via its internal vision/DOM model.
    2.  Gateway sends a `HIGHLIGHT_ELEMENT` message via the Relay.
    3.  Extension **Content Script** finds the element and injects a temporary CSS class with a "🦞 Glow" effect.
*   **Why this works for non-devs:** It feels like the AI is physically interacting with the page, not just talking in a sidebox.

---

## 4. Technical Constraints & Mitigation

| Constraint | Mitigation Strategy |
| :--- | :--- |
| **Scary Debugger Banner** | Default to DOM-based interaction. Only use `chrome.debugger` for Vision snapshots. |
| **Site CSP (Security)** | Use `chrome.offscreen` documents to handle heavy processing/parsing without blocking the UI thread. |
| **Tab Persistence** | Implement a `Session_Handover` protocol in `extension-relay.ts` so the Agent "follows" you as you click through a checkout flow. |

---

## 5. The "Normal Person" Feature Set (Final Polish)

1.  **"What am I looking at?" Button:** One click summarizes the current page based on the user's *current* OpenClaw goals (e.g., "Summarize this hotel review based on my 'Lisbon Trip' notes").
2.  **"Ghost Writer":** In any text field, a small 🦞 icon appears. Tapping it lets OpenClaw draft the reply based on your "SOUL" (Personal AI Identity).
3.  **"Privacy Masking":** When the Agent takes a screenshot for vision analysis, the extension **locally redacts** credit card patterns and passwords before sending the image to the local Gateway.

---

## 6. Implementation Checklist for Devs

- [ ] **Modify `extension-relay.ts`**: Add support for `ClientID` tracking and `DOM_SYNC` events.
- [ ] **Build `manifest.json`**: MV3 with `sidePanel`, `debugger`, `scripting`, and `storage` permissions.
- [ ] **Implement `background.js`**: Handle the persistent WS connection and automatic reconnect logic.
- [ ] **Develop `content-script.js`**: The DOM-bridge for highlighting and ghost-writing.
- [ ] **Integrate with `pw-ai.ts`**: Create a new `ExtensionDriver` that prefers DOM-injection over CDP for simple clicks to avoid the debugger banner.

---

This plan is significantly more robust as it prioritizes **UX safety (no permanent banner)** and **Privacy (local redaction)**, making it truly ready for "Normal People."
