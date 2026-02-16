# Todo List: OpenClaw Sidekick - Phases 1, 2, 3 & 4 🦞

This todo list covers the implementation of **Phase 1** (Secure Local Bridge), **Phase 2** (The Side Panel), **Phase 3** (The "Magic": Injection & Highlighting), and **Phase 4** (Technical Constraints & Mitigation) as outlined in `sidekick-implementation.md`.

---

## Phase 1: The Secure Local Bridge

### 1. Discovery Service & Local Bridge (Gateway Side)
- [ ] **Establish Discovery Endpoint in Gateway**
  - [ ] Modify `src/browser/extension-relay.ts` or create a new discovery service to listen on a fixed/known port (e.g., `18789`).
  - [ ] Implement a lightweight GET `/sidekick/discovery` endpoint that returns Gateway version and status.
  - [ ] Ensure the discovery service only binds to loopback (`127.0.0.1`) for security.
  - [ ] Add CORS headers to allow requests from `chrome-extension://*`.
- [ ] **Enhance `extension-relay.ts` for Authentication Handshake**
  - [ ] Define `AUTH_REQUEST` and `AUTH_RESPONSE` message types in the relay protocol.
  - [ ] Implement a "Pending Approval" state for new extension connections.
  - [ ] Add a `ClientKey` / `ClientID` registration mechanism to uniquely identify extension instances.
  - [ ] Create a registry for "Approved Extensions" (persisted in OpenClaw config or a local DB).
- [ ] **User Approval Flow (macOS Integration)**
  - [ ] Implement a bridge to trigger a macOS notification or menu bar prompt when a new `AUTH_REQUEST` arrives.
  - [ ] Create a simple "Approval UI" (can be a CLI prompt for now, moving to macOS app later) to allow/deny the extension.
  - [ ] On approval, return an `AuthToken` to the extension and store it in the Gateway's allowed-clients list.

### 2. Extension Scaffold & Basic Bridge (Extension Side)
- [ ] **Initialize Extension Project**
  - [ ] Create `extensions/sidekick` directory.
  - [ ] Create `manifest.json` (MV3) with necessary permissions: `sidePanel`, `debugger`, `scripting`, `storage`, `declarativeNetRequest`.
- [ ] **Implement Discovery & Handshake Logic (`background.js`)**
  - [ ] Add a timer-based or trigger-based "Discovery" loop that pings `localhost:18789/sidekick/discovery`.
  - [ ] Upon finding the Gateway, initiate the WebSocket connection to `/extension`.
  - [ ] Handle the `AUTH_REQUEST` protocol: Generate `ClientKey`, send request, store `AuthToken`.
- [ ] **Robust WebSocket Management**
  - [ ] Implement exponential backoff for reconnection.
  - [ ] Add heartbeat (ping/pong) logic.

### 3. Security Hardening & Verification
- [ ] **Origin Verification**
  - [ ] Strengthen loopback and origin checks in `extension-relay.ts`.
- [ ] **End-to-End Handshake Test**
  - [ ] Verify `AUTH_REQUEST` -> Approval -> `AuthToken` flow.

---

## Phase 2: The Side Panel (The UX Core)

### 1. Extension Side Panel UI & Basics
- [ ] **Configure Side Panel in `manifest.json`**
  - [ ] Add `sidePanel` to `permissions`.
  - [ ] Define `side_panel` with `default_path: "sidepanel.html"`.
  - [ ] Set `action` to open the side panel on click.
- [ ] **Create Side Panel UI Scaffold**
  - [ ] Build `sidepanel.html` with a basic chat interface layout.
  - [ ] Implement `sidepanel.js` to handle UI logic and message passing.
  - [ ] Add a "Connect/Status" indicator showing the link to the OpenClaw Gateway.
  - [ ] Design a minimalist, "OpenClaw-themed" CSS (using the 🦞 palette).
- [ ] **Tab Context Tracking (`background.js`)**
  - [ ] Listen for `chrome.tabs.onActivated` and `chrome.tabs.onUpdated`.
  - [ ] Implement a debounced mechanism to send "Active Tab" metadata to the Gateway.
  - [ ] Ensure only the current active tab's context is synced to avoid noise.

### 2. Gateway Integration (`/sidekick/sync`)
- [ ] **Create Sidekick Route Registrar**
  - [ ] Create `src/browser/routes/sidekick.ts` to house sidekick-specific endpoints.
  - [ ] Register it in `src/browser/routes/index.ts`.
- [ ] **Implement `/sidekick/sync` Endpoint**
  - [ ] Define request schema for receiving `url`, `title`, and `DOM_Snapshot` (or accessibility tree).
  - [ ] Update the active session's "Agent Context" with the received data.
  - [ ] Integrate with the Memory Subsystem to allow the Agent to "see" what the user is seeing.
- [ ] **Bidirectional Message Bridge**
  - [ ] Extend `extension-relay.ts` to support `SIDEBAR_MESSAGE` type.
  - [ ] Implement a path for the Agent to send text/status updates directly to the extension side panel.
  - [ ] Add a "User Message" flow from the side panel back to the OpenClaw Agent.

### 3. Real-time DOM Snapshotting (Content Script)
- [ ] **Implement Snapshot Logic (`content-script.js`)**
  - [ ] Create a function to capture the current page state (stripped DOM or AXTree).
  - [ ] Add logic to handle "Shadow DOM" if necessary.
  - [ ] Send the snapshot to `background.js` when requested or on significant page changes.

### 4. Agent Presence & "Watching" UX
- [ ] **Visual "Watching" Indicator**
  - [ ] Implement a subtle animation or status text in the Side Panel: "OpenClaw is watching...".
  - [ ] Trigger this state whenever the Gateway confirms it has processed a new context sync.

---

## Phase 3: The "Magic" (Injection & Highlighting)

### 1. Highlighting & Visual Feedback (The "🦞 Glow")
- [ ] **Define CSS for Highlighting**
  - [ ] Create `highlight-target` (static glow) and `highlight-pulse` (active) classes in `content-script.css`.
  - [ ] Use Shadow DOM or strict prefixing to ensure zero style leakage into the host page.
- [ ] **Implement Highlight Logic in `content-script.js`**
  - [ ] Create listeners for `HIGHLIGHT_ELEMENT` and `CLEAR_HIGHLIGHTS`.
  - [ ] Implement a robust selector engine: ID, CSS, XPath, and Fuzzy Text matching.
  - [ ] Add smooth "Scroll into View" for highlighted elements.
- [ ] **Relay Command Routing**
  - [ ] Update `extension-relay.ts` to route highlight commands from the Gateway to specific tabs.

### 2. "What am I looking at?" (Contextual Summary)
- [ ] **Page Context Extraction**
  - [ ] Enhance `content-script.js` to extract visible text, meta-data, and structured semantic hints.
- [ ] **Gateway Summary Integration**
  - [ ] Create a Gateway route to process `DOM_SNAPSHOT` against the Agent's "Memory Subsystem" (e.g., user trip notes).
- [ ] **Side Panel UI**
  - [ ] Add a primary "Summarize Page" button with a 🦞 loading state.

### 3. "Ghost Writer" (Inline Text Assistance)
- [ ] **Input Field Detection**
  - [ ] Monitor focus on `input`, `textarea`, and `contenteditable`.
- [ ] **🦞 Icon Injection**
  - [ ] Dynamically inject the 🦞 icon into the active text field's bounding box.
- [ ] **Drafting Workflow**
  - [ ] Trigger side-panel drafting or mini-overlay on icon click.
  - [ ] Implement "Insert Draft" with simulated typing support for form validation.

### 4. "Privacy Masking" (Local Redaction)
- [ ] **Local Redaction Engine**
  - [ ] Implement regex-based masking for PII (Credit Cards, Passwords) in `background.js` or `offscreen` doc.
- [ ] **Vision Pipeline Hook**
  - [ ] Apply black-box overlays to sensitive DOM regions *before* capturing and sending screenshots to the Gateway.

### 5. Agent Drivers & Automation Logic
- [ ] **Update `ExtensionDriver`**
  - [ ] Prioritize `chrome.scripting` (DOM-based) for clicks/typing to avoid the "Debugger Banner".
  - [ ] Fallback to `chrome.debugger` (CDP) only for vision-critical snapshots or complex interactions.
- [ ] **Verification Loops**
  - [ ] Implement Agent checks: "I've highlighted the element, waiting for user confirmation or next step."

---

## Phase 4: Technical Constraints & Mitigation

### 1. Debugger Banner Management
- [ ] **On-Demand Detach Logic**
  - [ ] Implement a strictly scoped lifecycle for `chrome.debugger.attach`: Attach -> Take Snapshot/Perform Action -> Immediate `detach`.
  - [ ] Ensure a timeout mechanism detaches the debugger if a command hangs, preventing the banner from lingering indefinitely.
- [ ] **"Banner-Free" Interaction Tier**
  - [ ] Document and implement a "Safe Mode" where the extension exclusively uses `chrome.scripting` for all non-vision tasks.

### 2. CSP & Security Bypass (Offscreen Documents)
- [ ] **Offscreen Parsing Engine**
  - [ ] Set up a `chrome.offscreen` document to handle complex DOM parsing or image processing that might be blocked by a host page's strict CSP.
  - [ ] Implement a message passing bridge between `content-script` -> `background` -> `offscreen`.
- [ ] **Handling Frame Guard**
  - [ ] Implement logic to detect when the active context is inside a protected `iframe` and adjust the selector engine to traverse frame boundaries via the `debugger` API if needed.

### 3. Tab & Session Persistence
- [ ] **Session Handover Protocol**
  - [ ] Update `extension-relay.ts` to support `SESSION_HANDOVER` messages.
  - [ ] Ensure that when a user navigates from `Site A` to `Site B`, the Agent's short-term memory (staged data, active highlights) is correctly serialized and handed over to the new tab context.
  - [ ] Implement "Tab Stickiness": Option for the user to pin the Agent to a specific tab even if they browse elsewhere.

### 4. Performance Optimization
- [ ] **Differential DOM Syncing**
  - [ ] Instead of sending a full `DOM_SNAPSHOT` on every minor change, implement a "Diff" mechanism in `content-script.js` to only send updates for changed nodes.
- [ ] **Asset Caching**
  - [ ] Cache heavy visual assets (🦞 icons, CSS files) locally in the extension to ensure zero latency during injection.

---

## Phase 5: The "Normal Person" Feature Set (Final Polish)

### 1. "What am I looking at?" (Contextual Summarization)
- [ ] **Frontend (Side Panel UI)**
  - [ ] Add a prominent "What am I looking at?" button in the Sidekick side panel.
  - [ ] Implement a loading state (spinner/🦞 animation) using `src/cli/progress.ts` inspired patterns for the side panel.
- [ ] **Extension Logic (Background/Content Script)**
  - [ ] Implement `captureCurrentPageContext` function to gather:
    - [ ] Page Title and URL.
    - [ ] Cleaned DOM text (using a readability-like library or basic heuristic).
    - [ ] Meta tags (description, keywords).
  - [ ] Handle "Summary Request" event:
    - [ ] Send gathered context to OpenClaw Gateway via `/sidekick/summarize` or existing agent endpoint.
- [ ] **Gateway Integration (`src/api/sidekick.ts`)**
  - [ ] Create/Update endpoint to receive page context.
  - [ ] Integrate with the Agent's **Memory Subsystem**:
    - [ ] Retrieve relevant "Long-term goals" or "Active projects" (e.g., "Lisbon Trip").
    - [ ] Construct a prompt that combines: "Current Goal" + "Page Context" + "User Intent (Summarize)".
  - [ ] Stream the summary response back to the Sidekick UI.

### 2. "Ghost Writer" (Inline AI Drafting)
- [ ] **Content Script Injection**
  - [ ] Implement a `TextFieldObserver` that detects active text areas, inputs, and content-editable divs.
  - [ ] Create a "🦞 Ghost Writer" floating icon component:
    - [ ] Style it to be unobtrusive (small, semi-transparent lobster icon).
    - [ ] Positioning logic to snap to the corner of the active text field.
- [ ] **Interaction Logic**
  - [ ] On click of 🦞 icon:
    - [ ] Show a mini-prompt overlay or redirect focus to the Side Panel.
    - [ ] Capture the current field's content (if any) and surrounding context (labels, placeholders).
- [ ] **AI Soul Integration**
  - [ ] Send text field context and user "SOUL" parameters to the Gateway.
  - [ ] Implement `draftReply` logic in the Agent that mimics the user's voice.
- [ ] **Writing Back**
  - [ ] Implement a "Insert" button in the draft UI.
  - [ ] Content script logic to programmatically fill the text field (triggering `input` and `change` events to ensure site-scripts detect the change).

### 3. "Privacy Masking" (Local Redaction)
- [ ] **Extension-Side Vision Pipeline**
  - [ ] Hook into the screenshot capture logic (used for CDP vision tasks).
  - [ ] Implement `LocalRedactor` module:
    - [ ] Regex-based detection for:
      - [ ] Credit Card numbers (Luhn check).
      - [ ] Email addresses.
      - [ ] Phone numbers.
      - [ ] Common Password field patterns.
- [ ] **Visual Redaction (Canvas)**
  - [ ] Use a hidden `<canvas>` to process the captured screenshot.
  - [ ] Map detected sensitive DOM element coordinates to the screenshot image.
  - [ ] Apply "Black Box" or "Pixelation" filter to these regions.
- [ ] **Gateway Security Handshake**
  - [ ] Ensure the Gateway verifies that images received from the extension are "Clean" or at least from an "Authenticated Sidekick".

### 4. Final Polish & UX
- [ ] **Onboarding Flow**
  - [ ] Implement a "Welcome to Sidekick" tour in the side panel upon first pairing.
  - [ ] Explain the "Yellow Banner" (when it appears and why).
- [ ] **The "🦞 Glow" (Highlighting)**
  - [ ] Refine the CSS for `osc-highlight-glow`:
    - [ ] Use a pulsing lobster-red/orange shadow.
    - [ ] Ensure it doesn't break site layouts (use `outline` or `box-shadow` instead of `border`).
- [ ] **Notification System**
  - [ ] Hook Extension events into macOS System Notifications (via Gateway) for long-running tasks.
- [ ] **Settings Page**
  - [ ] Add toggles for:
    - [ ] "Auto-summarize new tabs"
    - [ ] "Enable Ghost Writer"
    - [ ] "Aggressive Privacy Masking"

### 5. Verification & Testing
- [ ] **Unit Tests**
  - [ ] Test `LocalRedactor` against dummy data.
  - [ ] Test DOM snapshotting for performance on heavy sites (e.g., Amazon, Jira).
- [ ] **E2E Tests**
  - [ ] Verify "Ghost Writer" insertion on major platforms (Gmail, Slack Web, Twitter).
  - [ ] Verify Privacy Masking correctly blocks PII in screenshots.


## Phase 6: Implementation Checklist

### 1. Gateway & Relay Enhancements (`src/browser/extension-relay.ts`)

- [ ] **Modify `extension-relay.ts` for Client Tracking**
  - [ ] **Define Identity Types:** Add `ClientID` (UUID) and `ClientType` ("sidekick") to the relay protocol.
  - [ ] **Implement `AUTH_REQUEST` Flow:**
    - [ ] Create a `handleAuthRequest` function that triggers a local pairing event.
    - [ ] Emit an event that the macOS app (or CLI) can listen to for user approval.
    - [ ] Once approved, generate a persistent `AuthToken` and send it back to the extension.
- [ ] **Implement `DOM_SYNC` Event Handling**
  - [ ] Add `DOM_SYNC` to the `ExtensionMessage` union type.
  - [ ] Create a handler in `ensureChromeExtensionRelayServer` that:
    - [ ] Parses the `url`, `title`, and `DOM_tree` (or accessibility tree).
    - [ ] Routes this data to the OpenClaw **Memory Subsystem** or the active `Session` context.
    - [ ] Updates the "Snapshot" used by the AI Agent when it asks "What am I looking at?".
- [ ] **Bi-directional Message Routing**
  - [ ] Implement `sendToSidePanel(clientId, message)` to allow the Gateway to push chat messages or status updates to the Sidekick UI.

### 2. Chrome Extension Scaffolding (`extensions/chrome-extension/`)

- [ ] **Build `manifest.json` (MV3)**
  - [ ] Set `manifest_version: 3`.
  - [ ] Add permissions: `sidePanel`, `debugger`, `scripting`, `storage`, `tabs`, `activeTab`, `host_permissions` for `localhost`.
  - [ ] Define the `side_panel` with a default path of `ui/sidepanel.html`.
  - [ ] Configure `background` as a service worker (`background.js`).
- [ ] **Implement `background.js` (The Hub)**
  - [ ] **WebSocket Manager:**
    - [ ] Create a robust WS client that connects to `ws://localhost:18789/extension`.
    - [ ] Implement automatic reconnect with exponential backoff.
    - [ ] Handle the initial `AUTH_REQUEST` handshake and store the `AuthToken` in `chrome.storage.local`.
  - [ ] **Command Router:**
    - [ ] Listen for messages from the Gateway and dispatch them to `sidepanel.js` or `content-script.js`.
    - [ ] Handle `chrome.debugger` commands (Attach/Detach/Command) on behalf of the Gateway.
- [ ] **State Management**
  - [ ] Sync the "Current Active Tab ID" with the Gateway so the Agent knows which page is "live."

### 3. Side Panel UI & UX (`extensions/chrome-extension/ui/`)

- [ ] **Develop `sidepanel.html` & `sidepanel.js`**
  - [ ] **Chat Interface:** Build a scrolling message list for Agent-User interaction.
  - [ ] **Branding:** Apply the OpenClaw "Lobster" palette (Red/Orange/Dark) and icons.
  - [ ] **Context Controls:** Add a "Sync Now" or "Summarize Page" button.
  - [ ] **Connection Status:** Implement a visual indicator (🦞 Connected / ⚪ Connecting / 🔴 Error).
- [ ] **UI Integration**
  - [ ] Listen for `SIDEBAR_MESSAGE` events from `background.js` to update the chat log in real-time.

### 4. Content Script Injection (`extensions/chrome-extension/scripts/`)

- [ ] **Implement `content-script.js` (The DOM Bridge)**
  - [ ] **Highlighting Engine:**
    - [ ] Create a `highlightElement(selector)` function that injects a `osc-sidekick-glow` CSS class.
    - [ ] Handle `clearHighlights()` to remove all injected visual cues.
  - [ ] **Ghost Writer Injection:**
    - [ ] Listen for `focus` events on inputs/textareas.
    - [ ] Inject a floating `🦞` button near the cursor.
    - [ ] Implement a popup or listener to receive text drafts from the Agent and insert them into the field.
- [ ] **DOM Snapshotting**
  - [ ] Create a `getDOMSnapshot()` function that returns a lightweight, JSON-serializable representation of the page.
  - [ ] **Privacy First:** Strip out values from sensitive fields (password, credit card patterns) *before* sending to `background.js`.

### 5. Driver Integration (`src/browser/pw-ai.ts`)

- [ ] **Create `ExtensionDriver`**
  - [ ] Implement the `BrowserDriver` interface (like Playwright/Puppeteer).
  - [ ] **Hybrid Logic:**
    - [ ] For `click()`/`type()`: First attempt via `chrome.scripting.executeScript` (no debugger banner).
    - [ ] For `screenshot()`/`vision()`: Use `chrome.debugger` (CDP) and immediately detach.
  - [ ] Update `pw-ai.ts` to automatically detect if a Sidekick extension is connected and prefer it over starting a headless browser.

### 6. Verification & Polishing

- [ ] **Build Pipeline**
  - [ ] Add a `pnpm extension:build` script to bundle the extension (if using TypeScript/Tailwind).
- [ ] **Connectivity Testing**
  - [ ] Verify the extension pings the local Gateway on startup.
  - [ ] Test the "Yellow Banner" mitigation by confirming DOM actions don't trigger it.
- [ ] **End-to-End Walkthrough**
  - [ ] 1. Load extension -> 2. Pair with OpenClaw -> 3. Open Side Panel -> 4. Navigate to a site -> 5. Agent highlights an element.
