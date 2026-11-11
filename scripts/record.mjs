#!/usr/bin/env node
/**
 * Screen-record a local page in headless Chrome (real time, WebGL) while an in-page driver uses
 * it, then encode a looping preview video. No dependencies besides ffmpeg on the PATH.
 *
 *   node scripts/record.mjs <url> <driver.js> <out.mp4> [options]
 *
 *   --w 1280 --h 856     viewport (CSS px) — capture taller than the output to crop a bar off
 *   --crop-top 56        rows cut off the top before scaling (the MatsuHub demo bar)
 *   --size 960x600       output size
 *   --seconds 10         how long to capture after the driver starts
 *   --wait 4000          ms to let the page settle after load (before the driver's setup)
 *   --fade 0.5           cross-fade the last N s into the first frame so the loop has no cut (0 = off)
 *   --crf 28             x264 quality (higher = smaller)
 *   --keep               keep the raw frames (prints where they are)
 *
 * The driver file is one JS expression evaluated in the page:
 *   ({ async setup(h) { … awaited before the capture starts … },
 *      async run(h)   { … started WITHOUT awaiting, while frames are captured … } })
 * `h` holds helpers: sleep, glide(x0, y0, x1, y1, ms), move(x, y), click(x, y), clickText(text),
 * typeInto(selector, text, msPerChar), find(text), center(el), scrollTo(y, ms).
 *
 * Frames come from Page.startScreencast (every frame acked, with its timestamp); the concat list
 * gives each frame its real duration, so playback speed is true to life. Writes <out.mp4> and a
 * poster <out.jpg> (the first frame of the loop). Prints the effective capture frame rate.
 *
 * Previews of the homepage demo cards: scripts/previews/*.js — each one starts with its re-run command.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const [url, driverPath, out] = args;
if (!url || !driverPath || !out) {
  console.error("usage: node scripts/record.mjs <url> <driver.js> <out.mp4> [--w 1280] [--h 856] [--crop-top 56] [--size 960x600] [--seconds 10] [--wait 4000] [--fade 0.5] [--crf 28] [--keep]");
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const W = Number(opt("w", 1280));
const H = Number(opt("h", 856));
const cropTop = Number(opt("crop-top", 56));
const [OW, OH] = opt("size", "960x600").split("x").map(Number);
const seconds = Number(opt("seconds", 10));
const wait = Number(opt("wait", 4000));
const fade = Number(opt("fade", 0.5));
const crf = Number(opt("crf", 28));
const keep = args.includes("--keep");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const driverSrc = readFileSync(driverPath, "utf8");

/** Helpers injected into the page as window.__rec. Synthetic events on the element under (x, y). */
const HELPERS = `(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  let px = 0, py = 0, last = null;
  const opts = (x, y, extra) => ({ bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true, view: window, ...extra });
  const move = (x, y) => {
    px = x; py = y;
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    if (el !== last) {
      if (last && last.isConnected) {
        last.dispatchEvent(new PointerEvent("pointerout", opts(x, y, { relatedTarget: el })));
        last.dispatchEvent(new MouseEvent("mouseout", opts(x, y, { relatedTarget: el })));
      }
      el.dispatchEvent(new PointerEvent("pointerover", opts(x, y, { relatedTarget: last })));
      el.dispatchEvent(new MouseEvent("mouseover", opts(x, y, { relatedTarget: last })));
      last = el;
    }
    el.dispatchEvent(new PointerEvent("pointermove", opts(x, y)));
    el.dispatchEvent(new MouseEvent("mousemove", opts(x, y)));
  };
  const click = (x, y) => {
    move(x, y);
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    el.dispatchEvent(new PointerEvent("pointerdown", opts(x, y, { button: 0, buttons: 1 })));
    el.dispatchEvent(new MouseEvent("mousedown", opts(x, y, { button: 0, buttons: 1 })));
    el.dispatchEvent(new PointerEvent("pointerup", opts(x, y, { button: 0, buttons: 0 })));
    el.dispatchEvent(new MouseEvent("mouseup", opts(x, y, { button: 0, buttons: 0 })));
    el.dispatchEvent(new MouseEvent("click", opts(x, y, { button: 0, buttons: 0, detail: 1 })));
    return el;
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const glide = async (x0, y0, x1, y1, ms) => {
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / ms);
      const k = ease(t);
      move(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
      if (t >= 1) break;
      await frame();
    }
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const find = (text, root = document) =>
    [...root.querySelectorAll("button, a, [role=button]")].find((el) => visible(el) && ((el.textContent || "").trim().includes(text) || (el.getAttribute("aria-label") || "").includes(text))) || null;
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const clickText = async (text, ms = 500) => {
    const el = find(text);
    if (!el) { console.warn("[rec] no button with text", text); return null; }
    const [x, y] = center(el);
    await glide(px, py, x, y, ms);
    el.click();
    return el;
  };
  const typeInto = async (selector, text, msPerChar = 70) => {
    const input = document.querySelector(selector);
    if (!input) { console.warn("[rec] no input", selector); return; }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    input.focus({ preventScroll: true });
    for (let i = 0; i <= text.length; i++) {
      setter.call(input, text.slice(0, i));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(msPerChar);
    }
  };
  const scrollTo = async (y, ms = 900) => {
    const y0 = window.scrollY, t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / ms);
      window.scrollTo({ top: y0 + (y - y0) * ease(t), behavior: "instant" });
      if (t >= 1) break;
      await frame();
    }
  };
  window.__rec = { sleep, frame, move, click, glide, find, center, clickText, typeInto, scrollTo, get pointer() { return [px, py]; } };
})()`;

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "rec-"));
const framesDir = mkdtempSync(join(tmpdir(), "rec-frames-"));
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
    `--window-size=${W},${H}`,
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
    } else if (msg.method === "Runtime.consoleAPICalled" && (msg.params.type === "error" || msg.params.type === "warning")) {
      problems.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
    }
  });

  await page("Page.enable");
  await page("Runtime.enable");
  await page("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

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

  const evaluate = async (expression, awaitPromise) => {
    const r = await page("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`page eval failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result?.value;
  };
  await evaluate(HELPERS, false);
  await evaluate(`window.__driver = (${driverSrc}); (async () => { if (window.__driver.setup) await window.__driver.setup(window.__rec); })()`, true);

  // Capture: every screencast frame is written with its compositor timestamp and acked at once.
  const frames = [];
  let writes = Promise.resolve();
  listeners.add((msg) => {
    if (msg.sessionId !== sessionId || msg.method !== "Page.screencastFrame") return;
    const { data, metadata, sessionId: ackId } = msg.params;
    page("Page.screencastFrameAck", { sessionId: ackId }).catch(() => {});
    const file = join(framesDir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    writes = writes.then(() => writeFileSync(file, Buffer.from(data, "base64")));
  });
  await page("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  while (!frames.length) await sleep(10);
  const t0 = frames[0].t;
  await evaluate(`window.__driver.run(window.__rec).catch((e) => console.error("[rec] driver failed", e)); 0`, false);
  while (!frames.length || frames[frames.length - 1].t - t0 < seconds) await sleep(20);
  await page("Page.stopScreencast");
  await writes;

  // Keep frames inside [t0, t0 + seconds]; each lasts until the next one's timestamp.
  const kept = frames.filter((f) => f.t - t0 <= seconds);
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < kept.length; i++) {
    const end = i + 1 < kept.length ? kept[i + 1].t : t0 + seconds;
    lines.push(`file '${kept[i].file}'`, `duration ${Math.max(0.001, end - kept[i].t).toFixed(4)}`);
  }
  lines.push(`file '${kept[kept.length - 1].file}'`); // concat demuxer quirk: repeat the last frame
  const list = join(framesDir, "list.txt");
  writeFileSync(list, lines.join("\n") + "\n");
  const gaps = kept.slice(1).map((f, i) => f.t - kept[i].t);
  const longest = Math.max(...gaps);
  console.log(`captured ${kept.length} frames in ${seconds}s → ${(kept.length / seconds).toFixed(1)} fps effective (longest gap ${(longest * 1000).toFixed(0)} ms)`);

  // Encode: crop the bar, scale, constant 30 fps, then blend the tail into the head for the loop.
  const base = `crop=${W}:${H - cropTop}:0:${cropTop},scale=${OW}:${OH}:flags=lanczos:in_range=pc:out_range=tv,fps=30,format=yuv420p`;
  const filter =
    fade > 0
      ? `[0:v]${base},split[a][b];[a]trim=start=${fade},setpts=PTS-STARTPTS[m];[b]trim=end=${fade},setpts=PTS-STARTPTS[h];` +
        `[m][h]xfade=transition=fade:duration=${fade}:offset=${(seconds - 2 * fade).toFixed(3)}[v]`
      : `[0:v]${base}[v]`;
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-filter_complex", filter, "-map", "[v]", "-an",
      "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
    { stdio: "inherit" },
  );
  const poster = out.replace(/\.mp4$/, ".jpg");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", out, "-frames:v", "1", "-q:v", "4", poster], { stdio: "inherit" });
  console.log(`${out}\n${poster}`);
  if (problems.length) console.error(`page problems (${problems.length}):\n- ${[...new Set(problems)].slice(0, 12).join("\n- ")}`);
  if (keep) console.log(`frames kept in ${framesDir}`);
  await send("Browser.close").catch(() => {});
} catch (err) {
  console.error(`record failed: ${err.message}`);
  exitCode = 1;
} finally {
  chrome.kill();
  await sleep(150);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
    if (!keep) rmSync(framesDir, { recursive: true, force: true });
  } catch {
    // leftover temp dirs are harmless
  }
  process.exit(exitCode);
}
