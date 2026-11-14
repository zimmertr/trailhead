// TJ himself: a chibi with a big head, as SNES sprites are, drawn from a pose and outlined in one
// pass. One figure, three kits. Every scene poses him through these functions.
import { clamp, lerp, R, INK, BM, outline, disc, thick } from './core.js';

// What he wears in each place. upper and lower are the two halves of a leg.
const KITS = {
  // Yellow sun hoody, black quarter tights, a Salomon ADV Skin 12 vest, sunglasses, cap.
  trail: { top: R.sun, upper: [R.navy[0], R.navy[1]], lower: [R.skin[1], R.skin[2]], hand: [R.skin[1], R.skin[2]], hat: R.blaze, brim: true, pack: [R.navy[1], R.navy[2]], packW: 1, strap: R.navy[2], flask: R.shoe[2], shoe: R.shoe },
  // Yellow pants, yellow sun hoody, yellow climbing pack, green helmet.
  wall: { top: R.sun, upper: [R.mustard[0], R.mustard[1]], lower: [R.mustard[0], R.mustard[1]], hand: [R.skin[1], R.skin[2]], hat: R.kit, pack: [R.mustard[1], R.mustard[2]], packW: 2, strap: R.mustard[0], shoe: [R.bark[0], R.red[1], R.red[2]] },
  // Soft shell pants, green puffy, green helmet, mountaineering pack, boots and gloves.
  alpine: { top: R.kit, upper: [R.rock[0], R.rock[1]], lower: [R.rock[0], R.rock[1]], hand: [R.navy[0], R.navy[1]], hat: R.kit, pack: [R.blaze[0], R.blaze[1]], packW: 3, strap: R.blaze[0], shoe: [R.bark[0], R.bark[1], R.bark[2]] }
};

function ik(hx, hy, fx, fy, a, b, forward) {
  const dx = fx - hx, dy = fy - hy, d = Math.min(a + b - 0.01, Math.hypot(dx, dy)), base = Math.atan2(dy, dx);
  const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const k1 = [hx + a * Math.cos(base - al), hy + a * Math.sin(base - al)], k2 = [hx + a * Math.cos(base + al), hy + a * Math.sin(base + al)];
  return (k1[0] > k2[0]) === forward ? k1 : k2;
}

const W = 34, H = 40, OX = 16, OY = 36;

// Seen from the side, facing right. feet are relative to the hip, hands to the shoulder; the
// first of each pair is the near limb. Everything else is optional:
//   bob lifts the body, lean tips the torso forward, crouch drops the hips, head moves the head,
//   held is a function that draws whatever is in his hands, look turns the face ('up', 'down').
function sideFig(kitName, o = {}) {
  const k = KITS[kitName], b = new BM(W, H); b.ox = OX; b.oy = OY;
  const bob = o.bob || 0, lean = o.lean == null ? 1 : o.lean, drop = o.crouch || 0;
  const hip = [OX + (o.hipX || 0), 28 + bob + drop], sh = [hip[0] + lean, hip[1] - 6 + Math.round(drop * 0.3)];
  const feet = o.feet || [[1, 8.5], [-1, 8.5]], hands = o.hands || [[1, 6.5], [-1, 6.5]];
  const leg = (i, dark) => {
    const [fx, fy] = feet[i], d = dark ? 0 : 1;
    const kn = ik(hip[0], hip[1], hip[0] + fx, hip[1] + fy - drop, 4.6, 4.6, o.kneeBack ? false : true);
    thick(b, hip[0], hip[1], kn[0], kn[1], 2, t => t < 0.5 ? k.upper[d] : k.lower[d]);
    thick(b, kn[0], kn[1], hip[0] + fx, hip[1] + fy - drop, 2, k.lower[d]);
    const sx = Math.round(hip[0] + fx), sy = Math.round(hip[1] + fy - drop);
    for (let dx = -1; dx <= 2; dx++) b.set(sx + dx, sy + 1, dx === 2 ? k.shoe[0] : k.shoe[dark ? 0 : 1]);
    b.set(sx, sy, k.shoe[2]);
  };
  const arm = (i, dark) => {
    const [hx, hy] = hands[i], d = dark ? 0 : 1;
    const e = ik(sh[0], sh[1], sh[0] + hx, sh[1] + hy, 3.2, 3.2, o.elbowFwd ? true : false);
    thick(b, sh[0], sh[1], e[0], e[1], 2, k.top[dark ? 0 : 1]);
    thick(b, e[0], e[1], sh[0] + hx, sh[1] + hy, 2, t => t < 0.55 ? k.top[dark ? 0 : 1] : k.hand[d]);
  };
  arm(1, true); leg(1, true);
  // The pack sits on his back, behind the torso.
  for (let y = sh[1]; y <= sh[1] + (k.packW > 1 ? 5 : 3); y++) for (let x = 1; x <= k.packW; x++) b.set(hip[0] - 2 - x + Math.round((hip[1] - y) / 6 * lean), y, k.pack[x === k.packW ? 0 : 1]);
  for (let y = sh[1] - 1; y <= hip[1]; y++) for (let x = -2; x <= 2; x++) {
    const l = Math.round((hip[1] - y) / 6 * lean);
    let c = y >= hip[1] - 1 ? k.upper[1] : x === -2 ? k.top[0] : x === 2 ? k.top[2] : k.top[1];
    if (y < hip[1] - 1 && x === 1 && k.strap) c = k.strap;
    b.set(hip[0] + x + l, y, c);
  }
  if (k.flask) b.set(hip[0] + 2 + lean, sh[1] + 1, k.flask);
  leg(0, false); arm(0, false);
  const hd = o.head || [0, 0], cx = sh[0] + 1 + hd[0], cy = sh[1] - 6 + hd[1];
  head(b, k, cx, cy, 'side', o.look);
  if (o.held) o.held(b, sh, hands, hip);
  outline(b, INK);
  return b;
}

// The head, for every view. Cap or helmet on top, short hair, sunglasses, a short beard.
function head(b, k, cx, cy, view, look) {
  const helmet = !k.brim, dy = look === 'up' ? -1 : look === 'down' ? 1 : 0;
  disc(b, cx, cy, view === 'side' ? 5 : 5.2, (nx, ny, x, y) => {
    const ry = y - cy;
    if (ry <= -2 || (helmet && ry <= -1 && view !== 'back')) return ry <= -4 ? k.hat[nx < 0.1 ? 2 : 1] : ry === -2 && !helmet ? k.hat[0] : k.hat[nx < -0.3 ? 2 : 1];
    if (view === 'back') return ry >= 3 ? R.skin[1] : R.hair[ry >= 2 ? 0 : 1];
    if (view === 'side') {
      if (nx < -0.4) return ry >= 2 ? R.skin[1] : R.hair[1];
      if (ry >= 4 + dy && nx > -0.3) return R.hair[1];
      if (ry === 3 + dy && nx > -0.3 && nx < 0.35) return R.hair[1];
      return R.skin[nx > 0.5 ? 1 : 2];
    }
    if (Math.abs(nx) > 0.74) return ry >= 1 ? R.hair[1] : R.skin[1];
    if (ry >= 4 || (ry === 3 && Math.abs(nx) > 0.25)) return R.hair[1];
    return R.skin[nx > 0.3 ? 1 : 2];
  });
  if (view === 'side') {
    if (k.brim) for (let x = cx + 3; x <= cx + 6; x++) b.set(x, cy - 2 + (look === 'up' ? -1 : 0), k.hat[0]);
    b.set(cx + 2, cy + dy, INK); b.set(cx + 3, cy + dy, INK); b.set(cx + 4, cy + dy, INK); b.set(cx + 1, cy + dy, R.navy[1]);
    b.set(cx - 1, cy + 1, R.skin[0]);
  } else if (view === 'front') {
    for (let x = -3; x <= 3; x++) b.set(cx + x, cy, x === 0 ? R.navy[1] : INK);
    b.set(cx, cy + 2, R.skin[1]);
    if (k.brim) for (let x = -4; x <= 4; x++) b.set(cx + x, cy - 2, k.hat[0]);
  }
}

// Seen from the front, or from behind when back is set. lift raises each foot, swing each hand.
function frontFig(kitName, o = {}) {
  const k = KITS[kitName], b = new BM(W, H); b.ox = OX; b.oy = OY;
  const bob = o.bob || 0, lift = o.lift || [0, 0], swing = o.swing || 0, back = !!o.back, cx = OX;
  for (let s = 0; s < 2; s++) {
    const x = s ? cx + 1 : cx - 3, up = lift[s];
    for (let y = 28 + bob; y <= 35 - up; y++) { const c = y < 31 + bob ? k.upper : k.lower; b.set(x, y, c[s ? 0 : 1]); b.set(x + 1, y, c[0]); }
    b.set(x, 36 - up, k.shoe[1]); b.set(x + 1, 36 - up, k.shoe[1]); b.set(x - (s ? 0 : 1), 36 - up, k.shoe[0]);
  }
  for (let y = 21 + bob; y <= 29 + bob; y++) for (let x = cx - 3; x <= cx + 3; x++) {
    let c = y >= 28 + bob ? k.upper[1] : x < cx - 1 ? k.top[2] : x > cx + 1 ? k.top[0] : k.top[1];
    if (y < 28 + bob) {
      if (back && Math.abs(x - cx) <= k.packW && y < 27 + bob) c = k.pack[x > cx ? 0 : 1];
      else if (!back && k.strap && Math.abs(x - cx) === 2 && y < 27 + bob) c = y === 23 + bob && k.flask ? k.flask : k.strap;
    }
    b.set(x, y, c);
  }
  // Arms swing beside the body, a column apart from the shirt.
  for (let s = 0; s < 2; s++) {
    const x = s ? cx + 5 : cx - 5, dy = s ? -swing : swing;
    for (let y = 21 + bob; y <= 27 + bob + dy; y++) { b.set(x, y, y < 25 + bob + dy ? k.top[s ? 0 : 1] : k.hand[s ? 0 : 1]); b.set(s ? cx + 4 : cx - 4, y, y < 24 + bob ? k.top[0] : 0); }
  }
  head(b, k, cx, 16 + bob, back ? 'back' : 'front');
  if (o.held) o.held(b, cx, 21 + bob);
  outline(b, INK);
  return b;
}

// Seen from behind on a wall, each hand and foot on its own hold. Offsets are measured from the
// middle of his hips; the scene works out where the holds are.
function backFig(kitName, o) {
  const k = KITS[kitName], b = new BM(44, 52); b.ox = 22; b.oy = 28;
  const cx = 22, cy = 28, tilt = o.tilt || 0;
  const hipL = [cx - 2, cy], hipR = [cx + 2, cy], shL = [cx - 4 + tilt, cy - 9], shR = [cx + 4 + tilt, cy - 9];
  const limb = (a, t, l1, l2, out, c1, c2, w) => {
    const j = ik(a[0], a[1], cx + t[0], cy + t[1], l1, l2, out);
    thick(b, a[0], a[1], j[0], j[1], w, c1); thick(b, j[0], j[1], cx + t[0], cy + t[1], w, c2);
  };
  // Legs, knees turned out, then the shoes.
  limb(hipL, o.feet[0], 6.8, 6.8, false, k.upper[1], k.lower[1], 2.4); limb(hipR, o.feet[1], 6.8, 6.8, true, k.upper[0], k.lower[0], 2.4);
  for (const f of o.feet) { b.set(cx + f[0], cy + f[1], k.shoe[1]); b.set(cx + f[0] + 1, cy + f[1], k.shoe[1]); b.set(cx + f[0], cy + f[1] + 1, k.shoe[0]); b.set(cx + f[0] + 1, cy + f[1] + 1, k.shoe[0]); }
  // Body and pack.
  for (let y = cy - 10; y <= cy + 1; y++) for (let x = -4; x <= 4; x++) {
    const t = Math.round(tilt * (cy - y) / 10);
    let c = y >= cy ? k.upper[1] : x < -2 ? k.top[2] : x > 2 ? k.top[0] : k.top[1];
    if (y === cy - 1) c = INK;
    else if (y < cy - 2 && y > cy - 9 && Math.abs(x) <= k.packW) c = k.pack[x > 0 ? 0 : 1];
    b.set(cx + x + t, y, c);
  }
  if (o.rack !== false) { b.set(cx - 4, cy, R.rock[3]); b.set(cx + 4, cy, R.red[1]); b.set(cx - 3, cy + 1, R.rock[2]); b.set(cx + 3, cy + 1, R.rock[3]); }
  limb(shL, o.hands[0], 6, 6, false, k.top[2], k.top[1], 2.2); limb(shR, o.hands[1], 6, 6, true, k.top[1], k.top[0], 2.2);
  for (const h of o.hands) { b.set(cx + h[0], cy + h[1], k.hand[1]); b.set(cx + h[0], cy + h[1] - 1, k.hand[1]); if (o.tool) o.tool(b, cx + h[0], cy + h[1]); }
  head(b, k, cx + tilt, cy - 15 + (o.headY || 0), 'back');
  outline(b, INK);
  return b;
}

const FEET = [[4, 8], [1, 8.5], [-2, 8], [-5, 5], [-2, 3], [3, 5.5]];
const HANDS = [[-3, 5], [-2, 6], [1, 6], [3, 4], [2, 5], [-1, 6]];
const cache = {};
// The run and idle frames for a kit: six from the side, four each from the front and the back.
function makeRunner(kit = 'trail') {
  if (cache[kit]) return cache[kit];
  const side = f => sideFig(kit, { feet: [FEET[f], FEET[(f + 3) % 6]], hands: [HANDS[f], HANDS[(f + 3) % 6]], bob: [0, -1, -1, 0, -1, -1][f] });
  const front = (f, back) => frontFig(kit, { bob: [0, -1, 0, -1][f], lift: [[0, 2], [1, 1], [2, 0], [1, 1]][f], swing: [1, 0, -1, 0][f], back });
  return cache[kit] = {
    side: [0, 1, 2, 3, 4, 5].map(side), sideIdle: [sideFig(kit, { lean: 0 })],
    down: [0, 1, 2, 3].map(f => front(f, false)), downIdle: [frontFig(kit)],
    up: [0, 1, 2, 3].map(f => front(f, true)), upIdle: [frontFig(kit, { back: true })]
  };
}

export { KITS, ik, sideFig, frontFig, backFig, head, makeRunner, FEET, HANDS };
