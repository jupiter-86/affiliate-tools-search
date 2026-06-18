# 🧭 Affiliate-tools research agent (travel blogs)

> English (default). Русская версия: [README.ru.md](README.ru.md).

A local agent for **Claude Code**: finds travel blogs for a given country and collects which
**affiliate monetization tools** they use (booking widgets, CTA buttons, inline hotel/tour cards,
OTA links, coupons/promos, popups, sticky bars, JS integrations from Stay22 / Travelpayouts / Klook /
GetYourGuide, etc.). It screenshots the **actual elements** and outputs an **HTML report** (output is
always HTML) that is built **step-by-step** — blog by blog.

## How to use (target flow)
1. Download/clone this folder (or open it from cloud storage) and open it in **Claude Code**.
2. Install dependencies once:
   ```bash
   npm run setup        # npm install + npx playwright install chromium
   ```
   (Needs Node.js 18+. A system Chrome is optional — Playwright installs Chromium.)
3. **Playwright MCP connects itself**: the folder ships a `.mcp.json`, so when you open it in Claude Code
   the agent will offer to connect the `playwright` server — accept it. (Manual equivalent if needed:
   `claude mcp add playwright npx '@playwright/mcp@latest'`.) The main workhorse is `scan-tools.js`;
   the MCP is for interactively driving the browser.
4. Just tell Claude, e.g.:
   > **do an analysis of affiliate tools on travel blogs for Japan**

   Everything happens automatically: the agent finds blogs (WebSearch), scans them via Playwright,
   captures validated tool screenshots, and assembles the HTML. You get a `<country>-blogs.html`
   file that grows as the analysis proceeds (you can open and refresh it while it runs).

   **By default the browser does NOT pop up** (headless) — no windows covering your work.
   If you need to show the window (sometimes beats more anti-bot) — run with `HEADED=1` (see below).

## What you get
- `<country>-blogs.html` — the main report: a table **# · Blog · Description · Tools ·
  Tool screenshots** with embedded (base64) thumbnails. Opens in any browser.
- `<country>-manifest.json` — raw detection data (next to the HTML).
- Element screenshots — in `tools/`.

## Commands (the agent runs these itself; you can too)
```bash
# 1) the agent prepares targets-<country>.json: [{ "slug","name","home","seed" }, ...]
# 2) scan + step-by-step HTML build (locale: zh-TW / ja-JP / ko-KR / en-US / ...):
#    headless by default — NO browser window appears:
node scan-tools.js targets-japan.json japan ja-JP
# show the window (if a site blocks headless — better chance against anti-bot):
HEADED=1 node scan-tools.js targets-japan.json japan ja-JP
# rebuild the HTML from the manifest separately:
node gen-html.js japan-manifest.json japan-blogs.html "Japan travel blogs — affiliate tools"
```

### Dynamic anti-bot widgets (Travelpayouts Emerald, Stay22, etc.)
Some monetization blocks (e.g. TP **Emerald**, Shadow-DOM, loaded by `emrld.cc`) are served only to a
trusted session and **do not render under automation**. Their presence is still recorded as a
"JS integration". To try capturing the rendered block itself, run the scan via **CDP against your own
Chrome** (a warmed profile):
```bash
# 1) bring up a profile copy with a debug port (Chrome ≥136 blocks the port on the default profile):
cp -R "<your Chrome profile>" /tmp/ch-warm
"/path/to/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/ch-warm
# 2) scan through it:
CDP_URL=http://localhost:9222 node scan-tools.js targets-japan.json japan ja-JP
```
Even then it does not always work (TP detects the bot) — whatever isn't captured, screenshot it manually.

The full agent instruction and all the context (what we search for, sources, tools, validation, the hook,
generation) is in `.claude/skills/tp-affiliate-tools-research/SKILL.md` (English: `SKILL.en.md`).
