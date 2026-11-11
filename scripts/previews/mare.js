/*
 * Preview of the Maré demo for the homepage card (public/previews/restaurantes.mp4 + .jpg).
 * Re-record whenever the demo changes (dev server on :3000):
 *
 *   node scripts/record.mjs "http://localhost:3000/demos/restaurantes" scripts/previews/mare.js public/previews/restaurantes.mp4 --seconds 11.5
 *
 * The facade, the pointer finds the door and walks in (camera goes inside), the cut-away salon
 * with the hover ring moving over a few tables, the demo's mare:show-table event zooms onto window table J3, then "Ver a
 * vista desta mesa"; it starts backing out to the salon (the demo's own blur dissolve) and the
 * recorder's last-half-second cross-fade lands that dissolve on the facade, closing the loop.
 * Table coordinates are for the 1280×856 recording viewport — re-measure if the model moves.
 */
({
  async setup(h) {
    h.move(980, 520);
    await h.sleep(300);
  },
  async run(h) {
    await h.sleep(300);
    const door = document.querySelector('[aria-label="Entrar no Maré"]');
    if (!door) return console.warn("[rec] no door");
    const [dx, dy] = h.center(door);
    await h.glide(980, 520, dx, dy, 900);
    await h.sleep(350);
    door.click();
    await h.sleep(1700);
    // hover over a few tables on the cut-away model
    await h.glide(dx, dy, 455, 345, 500);
    await h.sleep(300);
    await h.glide(455, 345, 780, 340, 650);
    await h.sleep(300);
    await h.glide(780, 340, 780, 420, 350);
    await h.sleep(300);
    await h.glide(780, 420, 690, 540, 500);
    await h.sleep(350);
    window.dispatchEvent(new CustomEvent("mare:show-table", { detail: { tableId: "J3" } }));
    await h.sleep(1300);
    await h.clickText("Ver a vista desta mesa", 400);
    await h.sleep(1600);
    await h.clickText("Voltar ao salão", 400);
  },
})
