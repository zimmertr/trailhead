// The other people in the world, drawn with TJ's own figure so they stand at his size and in his style.
import { frac, R, INK, BM, outline } from './core.js';
import { sideFig } from './tj.js';
import { makeBoulder } from './sprites.js';

// Kayti: long brown hair, a purple puffy, no hat or sunglasses.
const KAYTI = { top: R.lupine, upper: [R.navy[1], R.navy[2]], lower: [R.navy[1], R.navy[2]], hand: [R.skin[1], R.skin[2]], hat: R.lupine, bare: true, hair: [R.bark[1], R.bark[2], R.bark[3]], long: 7, beard: false, shades: false, packW: 0, shoe: [R.bark[0], R.bark[1], R.bark[2]] };

// She sits on a rock at base camp with a small watercolour pad on her knee, a tin of paints beside her
// and her pack on the ground: she paints, sizes up a tower against her brush, and paints again.
export function makeKayti() {
  const sit = { lean: 1, crouch: 3, feet: [[5, 8.5], [4, 8.5]] };
  // The pad lies on her thigh: a white page with the towers going onto it in blue and grey.
  const pad = (b, hip) => {
    for (let y = -4; y <= -2; y++) for (let x = 2; x <= 7; x++) b.set(hip[0] + x, hip[1] + y + (x > 5 ? 1 : 0), R.white[1]);
    b.set(hip[0] + 3, hip[1] - 3, R.glac[2]); b.set(hip[0] + 4, hip[1] - 4, R.granite[2]); b.set(hip[0] + 5, hip[1] - 3, R.glac[1]); b.set(hip[0] + 6, hip[1] - 2, R.glac[3]);
  };
  // The brush hand goes on last, over the page: the hand, then n pixels of handle, then the wet tip.
  const brush = (dx, dy, n) => (b, sh, hands) => {
    const x = Math.round(sh[0] + hands[0][0]), y = Math.round(sh[1] + hands[0][1]);
    b.set(x, y, R.skin[2]); b.set(x - 1, y, R.skin[1]);
    for (let k = 1; k <= n; k++) b.set(x + k * dx, y + k * dy, R.wood[1]);
    b.set(x + (n + 1) * dx, y + (n + 1) * dy, R.glac[0]);
  };
  const frame = (hands, look, held) => sideFig(KAYTI, { ...sit, hands, look, head: look === 'up' ? [0, -1] : [0, 0], held: (b, sh, hd, hip) => { pad(b, hip); held(b, sh, hd); } });
  const frames = {
    a: frame([[3, 0], [3, 5]], 'down', brush(0, 1, 0)),
    b: frame([[5, 1], [3, 5]], 'down', brush(0, 1, 0)),
    // Arm out, brush upright: measuring a tower.
    look: frame([[6, -1], [3, 5]], 'up', brush(0, -1, 2)),
    // Clicked, she looks up and waves the brush.
    wave: [frame([[6, -2], [3, 5]], null, brush(0, -1, 2)), frame([[6, -3], [3, 5]], null, brush(1, -1, 2))]
  };
  const rock = makeBoulder(531, 5.5);
  // The open tin: three pans of colour. And her pack, set down behind her.
  const tin = new BM(7, 4); for (let x = 1; x < 6; x++) { tin.set(x, 1, R.rock[4]); tin.set(x, 2, [R.red[1], R.red[1], R.yellow[1], R.glac[1], R.glac[1]][x - 1]); } outline(tin, INK);
  const pack = new BM(10, 11); pack.ox = 5; pack.oy = 10;
  for (let y = 1; y < 10; y++) for (let x = 1 + (y < 3 ? 1 : 0); x < 9 - (y < 3 ? 1 : 0); x++) pack.set(x, y, y === 4 ? R.teal[0] : x < 4 ? R.teal[2] : R.teal[1]);
  pack.set(4, 6, R.rock[4]); pack.set(5, 6, R.rock[4]); outline(pack, INK);
  return {
    // She faces left, toward the towers. x, y is where her feet rest.
    draw(scr, x, y, t, waving) {
      const u = t % 7.5, f = waving ? frames.wave[Math.floor(t * 5) & 1] : u > 5.4 && u < 7 ? frames.look : frac(t * 1.4) < 0.5 ? frames.a : frames.b;
      scr.put(pack, x + 17, y + 1, false);
      scr.put(rock, x + 3, y + 1, false);
      scr.blit(tin, x + 7, y - 9);
      scr.put(f, x - 2, y, true);
    }
  };
}
