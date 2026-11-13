// The one owner of every colour the 3D canvas paints (ui.md, Every colour
// value has one owner). CSS can't reach the canvas, so these live here, and
// the linter refuses a colour literal in any other web/src file. Each value
// is an sRGB hex number; three.js turns it into its linear working space.
// Grouped by what it paints. The values were tuned by eye in the prototype.

// The sky, the light and the fog, for each theme (looks.ts).
export const DAY = {
  skyTop: 0x4c9be4,
  skyMid: 0xd6e9f3,
  sunDisc: 0xfff8e2,
  fog: 0xd3e6f1,
  skyLight: 0xddebff,
  groundLight: 0xa9b87c,
  sunLight: 0xffe9c6,
} as const

export const DUSK = {
  skyTop: 0x141840,
  skyMid: 0xf0a27f,
  skyLow: 0xb5808a,
  sunDisc: 0xffd2a0,
  fog: 0xbf8b95,
  skyLight: 0x8c97e6,
  groundLight: 0x5a5074,
  sunLight: 0xff9463,
} as const

// What the air and the light turn toward in the rainforest and on the ice.
export const ATMOSPHERE = {
  // The fog under the canopy.
  canopyHaze: 0xb9d59a,
  // The light bounced off the forest floor.
  canopyGround: 0x8fb45a,
  // The light bounced off snow and ice.
  iceGround: 0xc7ddee,
} as const

// The clouds and the shafts of sunlight are tinted per theme.
export const CLOUD = { low: 0xd5e2ee, high: 0xffffff, day: 0xffffff, dusk: 0xf4b49c } as const
export const SHAFT = { day: 0xffffff, dusk: 0xff9a6a } as const
// A shaft is drawn additively: its top is this faint warm light, scaled per
// channel, and its foot is black, which adds nothing.
export const SHAFT_GLOW = { strength: 0.07, red: 1, green: 0.97, blue: 0.78 } as const

// The ground: meadow, forest floor, rock, snow, the lake and the trails.
export const GROUND = {
  grassA: 0x8fbf5e,
  grassB: 0xbfd97a,
  grassC: 0x79ad5a,
  forest: 0x4f7d49,
  tundra: 0xb1b56f,
  rockA: 0x9a9793,
  rockB: 0xbdb7ab,
  talus: 0xaba392,
  wall: 0xd2b088,
  snowA: 0xffffff,
  snowB: 0xe1edf8,
  sand: 0xe4dbb6,
  bedShallow: 0x8fe3d2,
  bedDeep: 0x1a5f80,
  dirtA: 0xd4b07c,
  dirtB: 0xc29c66,
  mossA: 0x557f36,
  mossB: 0x7fa347,
  loamA: 0x5b4636,
  loamB: 0x6a5240,
  moraineA: 0x5c5752,
  moraineB: 0x77706a,
  gold: 0xc9a46a,
} as const

// About Lake's surface, from the shallows to the deep.
export const WATER = { shallow: 0x63d2c6, deep: 0x1f6e94 } as const

// The ring of far ranges round the world.
export const FAR_RANGE = { a: 0x6e7688, b: 0x8c93a3 } as const

// The Stack's golden granite (stack.ts).
export const GRANITE = {
  a: 0xd8b67c,
  b: 0xc49a62,
  pale: 0xede0c2,
  grey: 0xa8a297,
  streak: 0x5f5448,
  rust: 0xb5713c,
  ledge: 0x8e8a62,
  moss: 0x6f8a4a,
  slab: 0xb9ae98,
} as const

// Sideproject Spires' snow, ice and rock (massif.ts).
export const GLACIER = {
  snowA: 0xffffff,
  snowB: 0xe9f1fa,
  crust: 0xd3e5f5,
  iceA: 0xa9d8f2,
  iceB: 0x2f7dc2,
  iceC: 0x174e8c,
  rockA: 0x474b5e,
  rockB: 0x666879,
  rockC: 0x75646a,
  tongue: 0xdce8f2,
  moraine: 0x7b7982,
  steep: 0xd6e8f8,
  screeA: 0x5c5752,
  screeB: 0x7a736c,
  seracLight: 0xffffff,
  seracBlue: 0xbfe2f8,
  spindrift: 0xffffff,
} as const

// The dashed climbing routes and the marks over each project's summit.
export const ROUTE_LINE = 0xe2452b
export const SUMMIT_MARK = 0xffc531

// The fir every forest is planted with, from its lowest tier up, and its trunk.
export const FIR = { tiers: [0x2b5a45, 0x346a4e, 0x3f7b57, 0x4c8c5f, 0x62a26c], trunk: 0x6a5140 } as const

// The rainforest (flora.ts).
export const RAINFOREST = {
  moss: [0x5f8230, 0x77993a, 0x4f7029, 0x8ba842, 0x456326, 0x6c8e33],
  barkA: 0x4a3b2b,
  barkB: 0x5e4a36,
  leaf: [0x8fc24a, 0xa9d455, 0x7db342, 0x9ccb50],
  drape: [0x7f9a3c, 0x95ad48, 0xa9bc58],
  needles: [0x24503a, 0x2e5f43, 0x3a7150, 0x4a8259, 0x5c9060],
  trunkA: 0x5a4636,
  trunkB: 0x6e5642,
  frond: [0x4e8f3a, 0x6faf45, 0x5c9d3e, 0x84bf50],
} as const

// Each plant is tinted per instance from a base hue, saturation and
// lightness (all 0..1), with a little hue and lightness spread.
export type Tint = { readonly hue: number; readonly saturation: number; readonly lightness: number }
export const PLANT_TINT = {
  conifer: { hue: 0.33, saturation: 0.1, lightness: 0.78 },
  rainforestGiant: { hue: 0.3, saturation: 0.1, lightness: 0.78 },
  rainforestFir: { hue: 0.27, saturation: 0.16, lightness: 0.74 },
  maple: { hue: 0.27, saturation: 0.05, lightness: 0.82 },
  shrub: { hue: 0.24, saturation: 0.5, lightness: 0.36 },
  fern: { hue: 0.3, saturation: 0.02, lightness: 0.8 },
  log: { hue: 0.25, saturation: 0.05, lightness: 0.82 },
} as const satisfies Record<string, Tint>
// What a tinted mesh is built in, so the tint alone sets its colour.
export const WHITE = 0xffffff

// Boulders are built grey and tinted per instance: a grey between `low` and
// `low + spread` (linear), or a stone colour scaled by a factor.
export const BOULDER = {
  pale: { low: 0.85, spread: 0.25 },
  moraine: { low: 0.5, spread: 0.2 },
  // Talus under the wall, between the wall's colour and gold, brightened.
  talusLift: 1.75,
  // Mossy rainforest boulders: the moss colour, a little darker or lighter.
  moss: GROUND.mossB,
  mossLow: 0.9,
  mossSpread: 0.3,
} as const

// Wildflowers in drifts: lupine, aster, paintbrush, arnica, bistort, phlox.
export const FLOWERS = [0x8c7fe0, 0xa294f0, 0xe0603f, 0xf0d25a, 0xfbf7ec, 0xefa3c2] as const

// The signs, the kiosk and the tents.
export const TIMBER = { post: 0x8a6238, board: 0xa77b4b, notice: 0xede3c8, roof: 0x5b4630 } as const
export const TENTS = { campA: 0xf2b233, campB: 0xe8552e, highA: 0xf2c230, highB: 0xff7a2e, highC: 0x3d8df0 } as const

// TJ's cats: a long-haired tortie and a long-haired Nebelung. A coat is a
// list of patches, picked at random per part.
export const TORTIE = { coat: [0x2b211c, 0x33261f, 0xc7772e, 0x2b211c, 0xe0a45a], eye: 0xd9b23a } as const
export const NEBELUNG = { coat: [0x8d97a3, 0x98a2ae, 0x858f9b], eye: 0x7fbf6a } as const

// The runner's kit at the Trailhead and About Lake.
export const RUNNER = {
  top: 0xff5a26,
  shorts: 0x1e2330,
  shoe: 0xf4f0e6,
  hat: 0xf4f0e6,
  skin: 0xc99673,
  vest: 0x1f2a38,
  bottle: 0xe8f1f5,
  watch: 0x1f2a38,
} as const
