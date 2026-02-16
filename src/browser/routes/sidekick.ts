import type { BrowserRouteContext } from "../server-context.js";
import type { BrowserRouteRegistrar } from "./types.js";

export function registerSidekickRoutes(app: BrowserRouteRegistrar, _ctx: BrowserRouteContext) {
  // GET /sidekick/discovery - Used by the extension to find the gateway
  app.get("/sidekick/discovery", async (req, res) => {
    res.json({
      status: "ok",
      version: "0.1.0",
      name: "OpenClaw Gateway",
      capabilities: ["sidekick", "relay"],
    });
  });

  // POST /sidekick/sync - Receive page context (URL, Title, DOM) from extension
  app.post("/sidekick/sync", async (req, res) => {
    // TODO: Implement actual context sync with Memory Subsystem
    console.log("🦞 Sidekick Sync received:", req.body?.url);
    res.json({ status: "ok" });
  });
}
