/*
 * Preview of the Pulso demo for the homepage card (public/previews/ecommerce.mp4 + .jpg).
 * Re-record whenever the demo changes (dev server on :3000):
 *
 *   node scripts/record.mjs "http://localhost:3000/demos/ecommerce" scripts/previews/pulso.js public/previews/ecommerce.mp4 --seconds 11 --crf 22
 *
 * The pointer drags the 3D headphones round (a fling, so they keep turning), "Desmontar" explodes
 * them, "Montar" puts them back, "Pergunte à loja" scrolls to the intent search, where
 * "fone para correr até R$ 800" is typed character by character and the results reorder; then it
 * scrolls back to the top so the loop closes. Coordinates are for the 1280×856 recording viewport.
 */
({
  async setup(h) {
    window.scrollTo({ top: 0, behavior: "instant" });
    h.move(640, 600);
    await h.sleep(300);
  },
  async run(h) {
    const canvas = [...document.querySelectorAll("canvas")].find((c) => c.getBoundingClientRect().width > 200);
    if (!canvas) return console.warn("[rec] no 3D canvas");
    const ev = (type, x, y, buttons) =>
      canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
    // drag-to-turn with a fling
    await h.glide(640, 600, 180, 460, 450);
    ev("pointerdown", 180, 460, 1);
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / 650);
      ev("pointermove", 180 + 260 * t * t, 460 - 20 * t, 1);
      if (t >= 1) break;
      await h.frame();
    }
    ev("pointerup", 440, 440, 0);
    await h.sleep(500);
    await h.clickText("Desmontar", 450);
    await h.sleep(1250);
    await h.clickText("Montar", 400);
    await h.sleep(850);
    await h.clickText("Pergunte à loja", 450);
    await h.sleep(1100);
    const input = document.querySelector("#busca input");
    if (input) {
      const [ix, iy] = h.center(input);
      const [px, py] = h.pointer;
      await h.glide(px, py, ix - 120, iy, 350);
    }
    await h.typeInto("#busca input", "fone para correr até R$ 800", 55);
    await h.sleep(1100);
    await h.scrollTo(0, 900);
  },
})
