// The other people in the world, drawn with TJ's own figure so they stand at his size and in his style.
import { frac, R, INK, BM, outline } from './core.js';
import { sideFig, backFig } from './tj.js';
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
  // The open tin: three pans of colour. And her pack, set down a little way behind her, past where he sits.
  const tin = new BM(7, 4); for (let x = 1; x < 6; x++) { tin.set(x, 1, R.rock[4]); tin.set(x, 2, [R.red[1], R.red[1], R.yellow[1], R.glac[1], R.glac[1]][x - 1]); } outline(tin, INK);
  const pack = new BM(10, 11); pack.ox = 5; pack.oy = 10;
  for (let y = 1; y < 10; y++) for (let x = 1 + (y < 3 ? 1 : 0); x < 9 - (y < 3 ? 1 : 0); x++) pack.set(x, y, y === 4 ? R.teal[0] : x < 4 ? R.teal[2] : R.teal[1]);
  pack.set(4, 6, R.rock[4]); pack.set(5, 6, R.rock[4]); outline(pack, INK);
  return {
    // She faces left, toward the towers. x, y is where her feet rest.
    draw(scr, x, y, t, waving) {
      const u = t % 7.5, f = waving ? frames.wave[Math.floor(t * 5) & 1] : u > 5.4 && u < 7 ? frames.look : frac(t * 1.4) < 0.5 ? frames.a : frames.b;
      scr.put(pack, x + 38, y + 2, false);
      scr.put(rock, x + 3, y + 1, false);
      scr.blit(tin, x + 7, y - 9);
      scr.put(f, x - 2, y, true);
    }
  };
}

// The two at the foot of Proficiency Peak: a man with short black hair and a woman with long red hair.
export const PAIR = [
  { top: [R.jay[1], R.jay[2], R.jay[3]], upper: [R.rock[0], R.rock[1]], lower: [R.rock[0], R.rock[1]], hand: [R.skin[1], R.skin[2]], hat: R.kit, bare: true, hair: [R.basalt[0], R.basalt[1], R.basalt[2]], beard: false, shades: false, packW: -1, shoe: [R.bark[0], R.bark[1], R.bark[2]] },
  { top: [R.mist[3], R.mist[4], R.mist[5]], upper: [R.navy[0], R.navy[1]], lower: [R.navy[0], R.navy[1]], hand: [R.skin[1], R.skin[2]], hat: R.kit, bare: true, hair: [R.blaze[0], R.blaze[1], R.blaze[2]], long: 6, beard: false, shades: false, packW: -1, shoe: [R.bark[0], R.red[1], R.red[2]] }
];

// Either of them can belay, seen from behind as the climber is, or sit side-on with something to eat.
// Each belay frame says where its two hands are (grip: the hand up the rope, brake: the hand below
// the device), measured from the hips, so the scene can run the rope through them.
export function makeCragPair() {
  const feet = [[-3, 13], [3, 13]];
  const belay = PAIR.map(k => {
    const f = (grip, brake, ft) => Object.assign(backFig(k, { hands: [brake, grip], feet: ft || feet, rack: false }), { grip, brake });
    // ready: both hands low on the rope, waiting for him to tie in.
    return { a: f([7, -12], [-6, 0]), b: f([7, -9], [-6, -3]), lock: f([6, -7], [-5, 3], [[-5, 12], [5, 12]]), rest: f([6, 2], [-6, 2]), ready: f([5, -3], [-5, 1]) };
  });
  const sit = { lean: 0, crouch: 3, feet: [[5, 8.5], [4, 8.5]] };
  // A bar in a yellow wrapper, peeled back at one end.
  const snack = PAIR.map(k => {
    const f = (hands, look, at) => sideFig(k, { ...sit, hands, look, head: look === 'up' ? [0, -1] : [0, 0], held: (b, sh) => { const x = sh[0] + at[0], y = sh[1] + at[1]; b.set(x, y, R.skin[2]); b.set(x, y + 1, R.skin[1]); b.set(x - 1, y - 1, R.yellow[1]); b.set(x - 1, y, R.yellow[0]); b.set(x - 1, y - 2, R.wood[1]); } });
    // ready and five: the free hand lifted, then held out and up for him to slap.
    return { lap: f([[4, 3], [3, 4]], 'down', [5, 3]), bite: f([[5, -1], [3, 4]], null, [7, -1]), up: f([[4, 3], [3, 4]], 'up', [5, 3]), ready: f([[3, -5], [3, 4]], 'up', [4, 4]), five: f([[6, -7], [3, 4]], 'up', [4, 4]) };
  });
  // Either of them side-on and standing, for when he comes over: a fist drawn back and put out, and a hand
  // lifted and held up to be slapped.
  const side = PAIR.map(k => ({ stand: sideFig(k, { lean: 0 }), bump: [sideFig(k, { lean: 0, hands: [[1, 2], [-1, 6]] }), sideFig(k, { lean: 1, hands: [[6, 0], [-1, 6]] })], five: [sideFig(k, { lean: 0, hands: [[1, -7], [-1, 6]], elbowFwd: true }), sideFig(k, { lean: 1, hands: [[6, -6], [-1, 6]], elbowFwd: true })] }));
  const rock = makeBoulder(533, 6);
  // The slack rope, flaked out in a pile at the belayer's feet.
  const pile = new BM(11, 6); pile.ox = 5; pile.oy = 5;
  for (const [x, y] of [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [1, 3], [9, 3], [3, 3], [5, 3], [7, 3], [2, 2], [4, 2], [6, 2], [8, 2], [4, 1], [5, 1], [6, 1]]) pile.set(x, y, (x + y) % 3 ? R.teal[2] : R.white[1]);
  outline(pile, INK);
  return {
    belay, pile, side,
    // The one who is not belaying eats, chews, and looks up to see how it is going. x, y is where the feet rest.
    snack(scr, who, x, y, t, five) {
      const u = t % 6.2, f = snack[who][five === 2 ? 'five' : five ? 'ready' : u > 4.6 ? 'up' : u > 2 && u < 2.7 ? 'bite' : 'lap'];
      scr.put(rock, x + 3, y + 1, false);
      scr.put(f, x - 2, y, true);
    }
  };
}
