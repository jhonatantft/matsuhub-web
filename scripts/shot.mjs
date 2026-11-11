#!/usr/bin/env node
/**
 * Screenshot a local page in headless Chrome, in real time, with WebGL. No dependencies.
 * Safe to run several at once (each run gets its own Chrome profile).
 *
 *   node scripts/shot.mjs <url> <out.png> [options]
 *
 *   --w 1440 --h 900   viewport (CSS px); --mobile = 390×844 touch device
 *   --wait 2500        ms to let the page run after load before the capture
 *   --y 1800           scroll to this offset first (then waits 700 ms more)
 *   --full             capture the whole page height instead of the viewport
 *   --eval "js"        run a snippet in the page before the capture
 *
 * URL params understood by the app (lib/lab.ts): ?t=4 freezes animation time,
 * ?p=0.5 forces a pinned scene's progress, ?y=1200 jumps to a scroll offset.
 * JavaScript errors and console errors from the page are printed to stderr.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const [url, out] = args;
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--w 1440] [--h 900] [--mobile] [--wait 2500] [--y N] [--full] [--eval "js"]');
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const mobile = flag("mobile");
const W = Number(opt("w", mobile ? 390 : 1440));
const H = Number(opt("h", mobile ? 844 : 900));
const wait = Number(opt("wait", 2500));
const scrollY = opt("y", null);
const snippet = opt("eval", null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--mute-audio",
    "--use-angle=metal",
    "--enable-unsafe-swiftshader",
    `--window-size=${Math.max(W, 500)},${H}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

let exitCode = 0;
try {
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    chrome.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    chrome.on("exit", () => reject(new Error("Chrome exited before DevTools was ready")));
    setTimeout(() => reject(new Error("Timed out starting Chrome")), 20000);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("DevTools socket error")), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);

  const problems = [];
  listeners.add((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      problems.push(`exception: ${d.exception?.description ?? d.text}`);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      problems.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
    } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      problems.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
    }
  });

  await page("Page.enable");
  await page("Runtime.enable");
  await page("Log.enable");
  await page("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile });
  if (mobile) await page("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  const loaded = new Promise((resolve) => {
    const fn = (msg) => {
      if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
        listeners.delete(fn);
        resolve();
      }
    };
    listeners.add(fn);
    setTimeout(resolve, 30000);
  });
  await page("Page.navigate", { url });
  await loaded;
  await sleep(wait);

  if (scrollY !== null) {
    await page("Runtime.evaluate", { expression: `window.scrollTo({ top: ${Number(scrollY)}, behavior: "instant" })` });
    await sleep(700);
  }
  if (snippet) {
    const r = await page("Runtime.evaluate", { expression: snippet, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) problems.push(`--eval failed: ${r.exceptionDetails.text}`);
    else if (r.result?.value !== undefined) console.log(`eval → ${JSON.stringify(r.result.value)}`);
    await sleep(300);
  }

  const shot = { format: "png" };
  if (flag("full")) {
    const { cssContentSize } = await page("Page.getLayoutMetrics");
    shot.captureBeyondViewport = true;
    shot.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 16000), scale: 1 };
  }
  const { data } = await page("Page.captureScreenshot", shot);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(out);
  if (problems.length) console.error(`page problems (${problems.length}):\n- ${[...new Set(problems)].slice(0, 12).join("\n- ")}`);

  await send("Browser.close").catch(() => {});
} catch (err) {
  console.error(`shot failed: ${err.message}`);
  exitCode = 1;
} finally {
  chrome.kill();
  await sleep(150);
  try {
    // Chrome may still be flushing its profile for a moment after it is killed.
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  } catch {
    // A leftover temp profile is harmless; never fail a successful capture over it.
  }
  process.exit(exitCode);
}
