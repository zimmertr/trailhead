// Round 4's map: where everything is. Numbers and shapes only; nothing is painted here. The block-in
// page (plan4.js) reads it now and the real map will read the same numbers, so the two cannot drift.
import { clamp, lerp, smooth, sq, vnoise, fbm, catmull } from './core.js';

export const NW = 1920, NH = 1080;
export const T = { x: 980, y: 650 }, KIOSK = { x: 1008, y: 630 }, REGISTER = { x: 955, y: 643 };
// The three destinations. PROF is the foot of Proficiency Peak, which stands on the ground; Mount
// Monolith and the Spires are part of the skyline.
export const MONO = { x: 620, top: 232, west: 236, east: 252 }, SPIRES = { x: 1070, top: 278 }, PROF = { x: 1384, y: 526, w: 164, h: 142 };
export const CAMP = { x: 1098, y: 524 }, FALL = { x: 689, y: 604 };

export const groundLine = x => 462 + 8 * (fbm(x / 9, 3.3, 14, 2) - 0.5);
// Above 0 is sea. The shore cuts the bottom-left corner from about (0, 640) to (470, 1080).
export const coast = (x, y) => (y - 640) - x * 0.936 + 26 * Math.sin(x / 95) + 44 * (fbm(x / 80, y / 80, 80, 3) - 0.5);

const LAKE = [[640, 540, 44, 15], [598, 546, 27, 10], [683, 535, 25, 9], [656, 552, 23, 8], [612, 533, 20, 7]];
export const lakeD = (x, y) => { let d = 9; for (const [cx, cy, rx, ry] of LAKE) d = Math.min(d, Math.hypot((x - cx) / rx, (y - cy) / ry)); return d + 0.16 * (vnoise(x / 9, y / 5, 4) - 0.5); };
export const ISLE = { x: 626, y: 542 };
export const isleD = (x, y) => Math.hypot((x - ISLE.x) / 7, (y - ISLE.y) / 3.2);
const TARNS = [[1292, 506, 22, 7], [1452, 530, 18, 6], [1512, 500, 14, 5], [1246, 534, 10, 4], [1330, 640, 12, 4]];
export const tarnD = (x, y) => { let d = 9; for (const [cx, cy, rx, ry] of TARNS) d = Math.min(d, Math.hypot((x - cx) / rx, (y - cy) / ry)); return d + 0.2 * (vnoise(x / 6, y / 4, 44) - 0.5); };

// The ground is tiered. Each tier is a level that ends southward in a rock step; the step's face is
// what shows. edge is the lip's y at x, h the height of the face, which tapers to nothing at both ends.
export const TIERS = [
  { name: 'bench', x0: 492, x1: 928, h: 18, ramp: 'rock', edge: x => 602 + 7 * Math.sin((x - 540) / 58) + 8 * (vnoise(x / 22, 1, 301) - 0.5) },
  { name: 'headwall', x0: 984, x1: 1178, h: 16, ramp: 'rock', edge: x => 541 + 5 * Math.sin((x - 985) / 40) + 6 * (vnoise(x / 18, 2, 302) - 0.5) },
  { name: 'granite', x0: 1186, x1: 1604, h: 19, ramp: 'gold', edge: x => 561 + 6 * Math.sin((x - 1190) / 66) + 8 * (vnoise(x / 24, 3, 303) - 0.5) }
];
// Which tier a spot belongs to, and how far below the lip it is: under 0 is up on the level, 0 to hh
// is on the face.
export function tier(x, y) {
  for (const t of TIERS) if (x > t.x0 && x < t.x1) { const hh = t.h * smooth(t.x0, t.x0 + 64, x) * smooth(t.x1, t.x1 - 64, x); return { t, d: y - t.edge(x), hh }; }
  return null;
}

// How much of each country a spot has. The edges are wide and wander, so one thins into the next.
const wob = (x, y, s, a) => a * (fbm(x / 70, y / 60, s, 3) - 0.5);
export const fogAmt = (x, y) => smooth(185, 10, x + wob(x, y, 201, 60));
const forestEdge = y => 586 + 96 * (fbm(y / 110, 2.3, 3, 3) - 0.5) + 30 * (fbm(y / 24, 7.1, 5, 2) - 0.5) + 44 * smooth(640, 820, y);
export const forestAmt = (x, y) => smooth(forestEdge(y) + 40, forestEdge(y) - 24, x + 30 * (fbm(x / 30, y / 30, 8, 2) - 0.5)) * smooth(1.15, 1.6, lakeD(x, y)) * smooth(-6, -30, coast(x, y));
export const parkAmt = (x, y) => (1 - forestAmt(x, y)) * smooth(940, 850, x + wob(x, y, 202, 70)) * smooth(745, 680, y + wob(x, y, 203, 60));
export const larchAmt = (x, y) => smooth(1170, 1250, x + wob(x, y, 204, 50)) * smooth(1615, 1540, x + wob(x, y, 205, 50)) * smooth(740, 690, y + wob(x, y, 206, 50));
export const dryAmt = (x, y) => smooth(1520, 1650, x + wob(x, y, 207, 90));
export const eastAmt = (x, y) => smooth(1130, 1290, x + wob(x, y, 208, 70));
export const sageAmt = (x, y) => smooth(1725, 1815, x + wob(x, y, 209, 60));
export const burnAmt = (x, y) => smooth(1450, 1580, x + wob(x, y, 210, 100)) * smooth(1890, 1790, x) * smooth(880, 965, y + wob(x, y, 211, 70));
const MESAS = [[1856, 690, 50, 16], [1822, 768, 40, 14], [1880, 838, 44, 15], [1786, 704, 15, 6]];
export const mesa = (x, y) => MESAS.some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) < 1 + 0.25 * (vnoise(x / 9, y / 7, 141) - 0.5));

// The glacier out of the Spires' cirque: it crosses the foot of the mountain and ends in a blunt toe
// on the shelf above the headwall, beside the tents.
const GL = { x0: 1066, y0: 440, x1: 1076, y1: 508, w0: 42, w1: 20 };
export function glacier(x, y) {
  const dx = GL.x1 - GL.x0, dy = GL.y1 - GL.y0, t = clamp(((x - GL.x0) * dx + (y - GL.y0) * dy) / (dx * dx + dy * dy), 0, 1), px = GL.x0 + dx * t + 6 * Math.sin(t * 3.4), py = GL.y0 + dy * t;
  return { t, d: Math.hypot(x - px, y - py), w: lerp(GL.w0, GL.w1, Math.pow(t, 0.8)) + 5 * (vnoise(x / 8, y / 8, 9) - 0.5), side: x - px, len: Math.hypot(dx, dy) };
}

// Trails. scene: the stretch (from point, to point) that a side-on scene covers, so the map only
// shows him leave and come back.
export const TRAILS = {
  lake: { scene: [[7, 26, 'forest'], [26, 30, 'lakeside']], pts: [[980, 650], [930, 655], [880, 651], [830, 647], [770, 643], [725, 641], [700, 640], [668, 646], [630, 660], [590, 668], [540, 660], [490, 672], [440, 700], [390, 706], [340, 690], [300, 650], [270, 610], [262, 570], [290, 540], [330, 530], [380, 545], [420, 560], [460, 548], [496, 560], [526, 574], [548, 562], [572, 552], [600, 560], [640, 566], [676, 568], [712, 566], [752, 572], [792, 582], [822, 596], [838, 607], [818, 615], [838, 625], [856, 640], [880, 651]] },
  peak: { scene: [[4, 12, 'larch basin']], pts: [[980, 650], [1030, 657], [1090, 655], [1150, 652], [1210, 637], [1268, 618], [1306, 600], [1322, 584], [1346, 575], [1326, 567], [1350, 557], [1364, 541], [1378, 527]] },
  spires: { scene: [[1, 9, 'high traverse, then the moraine']], pts: [[980, 650], [1000, 622], [1020, 596], [1036, 575], [1030, 561], [1052, 553], [1034, 545], [1056, 536], [1076, 528], [1090, 524]] },
  track: { pts: [[1090, 524], [1084, 514], [1078, 506], [1074, 496], [1078, 486], [1070, 476], [1074, 466], [1068, 457]] }
};
// The river leaves the lake, drops over the bench in a waterfall, and runs out through the forest and
// a notch in the bluffs. Two streams: meltwater from the glacier's toe, and the cascade out of the
// upper basin, which meet and leave the map southward.
export const WATER = {
  river: { r: [2.2, 5.5], pts: [[664, 553], [676, 578], [688, 600], [690, 622], [700, 640], [707, 690], [692, 750], [652, 810], [592, 860], [522, 900], [452, 935], [402, 962], [368, 984], [338, 1004]] },
  melt: { r: [1, 1.9], pts: [[1078, 510], [1092, 528], [1102, 544], [1108, 562], [1124, 596], [1142, 630], [1151, 652], [1160, 700], [1152, 770], [1112, 860], [1062, 960], [1022, 1082]] },
  cascade: { r: [1.1, 2], pts: [[1438, 532], [1424, 548], [1420, 562], [1416, 584], [1400, 612], [1352, 668], [1284, 712], [1214, 732], [1158, 742]] }
};
export const path = pts => catmull(pts);
export { smooth, sq };
