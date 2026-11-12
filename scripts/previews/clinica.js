/*
 * Preview of the Elo demo for the homepage card (public/previews/clinicas.mp4 + .jpg).
 * Re-record whenever the demo changes (dev server on :3000):
 *
 *   node scripts/record.mjs "http://localhost:3000/demos/clinicas" scripts/previews/clinica.js public/previews/clinicas.mp4 --seconds 11.5
 *
 * The facade, the pointer finds the door at the far left and walks in (camera into the cut-away
 * floor), the hover outline and card move over three rooms (waiting room, consultório 2, the
 * ultrasound room), a click zooms onto consultório 1 (falls back to the demo's own elo:show-room
 * event if the click misses), then "Ver a sala" opens the room photo and "Voltar à planta" starts
 * backing out; the recorder's last-half-second cross-fade lands on the facade, closing the loop.
 * Room coordinates are for the 1280×856 recording viewport — re-measure if the model moves.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- record.mjs evaluates this file as one expression
({
  async setup(h) {
    h.move(900, 560);
    await h.sleep(300);
  },
  async run(h) {
    await h.sleep(300);
    const door = document.querySelector('[aria-label="Entrar na Elo"]');
    if (!door) return console.warn("[rec] no door");
    const [dx, dy] = h.center(door);
    await h.glide(900, 560, dx, dy, 900);
    await h.sleep(350);
    door.click();
    await h.sleep(1900);
    // hover three rooms of the floor
    await h.glide(dx, dy, 640, 580, 600);
    await h.sleep(450);
    await h.glide(640, 580, 465, 270, 650);
    await h.sleep(450);
    await h.glide(465, 270, 1010, 290, 700);
    await h.sleep(450);
    // zoom into consultório 1
    await h.glide(1010, 290, 275, 270, 700);
    await h.sleep(200);
    h.click(275, 270);
    await h.sleep(250);
    if (document.querySelector("[data-room]")?.getAttribute("data-room") !== "c1") {
      window.dispatchEvent(new CustomEvent("elo:show-room", { detail: { room: "c1" } }));
    }
    await h.sleep(1100);
    await h.clickText("Ver a sala", 500);
    await h.sleep(1500);
    await h.clickText("Voltar à planta", 400);
  },
})
