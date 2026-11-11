/*
 * Preview of the Aurora demo for the homepage card (public/previews/imobiliarias.mp4 + .jpg).
 * Re-record whenever the demo changes (dev server on :3000):
 *
 *   node scripts/record.mjs "http://localhost:3000/demos/imobiliarias" scripts/previews/aurora.js public/previews/imobiliarias.mp4 --seconds 11.5 --crf 29
 *
 * The pointer sweeps up the tower (hover band + floor card follow), clicks a floor (camera flies
 * in), opens the cut-away plan, enters a room, then backs out step by step to the facade where it started.
 * Coordinates are for the 1280×856 recording viewport (tower centre x≈568; floor n at
 * y≈200 + (18 − n)·29) — re-measure if the hero layout changes.
 */
({
  X: 568,
  y: (floor) => 200 + (18 - floor) * 29,
  /** The room bar's back button ("Voltar à planta" in a room, "Voltar ao prédio" on the plan). */
  async back(h) {
    const btn = [...document.querySelectorAll("button[data-back]")].find((b) => b.getBoundingClientRect().width > 0);
    if (!btn) return console.warn("[rec] no back button");
    const [x, y] = h.center(btn);
    const [px, py] = h.pointer;
    await h.glide(px, py, x, y, 350);
    btn.click();
  },
  async setup(h) {
    h.move(this.X, this.y(7));
    await h.sleep(900);
  },
  async run(h) {
    const { X } = this;
    await h.sleep(150);
    await h.glide(X, this.y(7), X + 14, this.y(15), 1600);
    await h.sleep(150);
    await h.glide(X + 14, this.y(15), X, this.y(12), 450);
    await h.sleep(150);
    h.click(X, this.y(12));
    await h.sleep(1150);
    await h.clickText("Ver residência", 400);
    await h.sleep(1100);
    const spot = [...document.querySelectorAll('button[aria-label^="Ver "][data-open="true"]')][0];
    if (spot) {
      const [sx, sy] = h.center(spot);
      const [px, py] = h.pointer;
      await h.glide(px, py, sx + 11, sy, 500);
      await h.sleep(250);
      spot.click();
    } else console.warn("[rec] no room hotspot");
    await h.sleep(1500);
    await this.back(h);
    await h.sleep(950);
    await this.back(h);
    await h.sleep(900);
    await h.clickText("Fachada", 300);
    await h.sleep(700);
    const [px, py] = h.pointer;
    await h.glide(px, py, X, this.y(7), 700);
  },
})
