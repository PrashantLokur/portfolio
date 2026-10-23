export type Pt = [number, number];

export type RoomType =
  | "living"
  | "dining"
  | "bedroom"
  | "kitchen"
  | "toilet"
  | "foyer"
  | "utility"
  | "wardrobe"
  | "study"
  | "corridor"
  | "other"
  | "balcony";

export const ROOM_TYPES: { type: RoomType; label: string; target: number }[] = [
  { type: "living", label: "Living", target: 150 },
  { type: "dining", label: "Dining", target: 150 },
  { type: "bedroom", label: "Bedroom", target: 100 },
  { type: "kitchen", label: "Kitchen", target: 200 },
  { type: "toilet", label: "Toilet / bath", target: 100 },
  { type: "foyer", label: "Foyer / lobby", target: 100 },
  { type: "utility", label: "Utility", target: 150 },
  { type: "wardrobe", label: "Wardrobe / dressing", target: 150 },
  { type: "study", label: "Study", target: 300 },
  { type: "corridor", label: "Corridor", target: 100 },
  { type: "other", label: "Other room", target: 100 },
  { type: "balcony", label: "Balcony (outdoor)", target: 0 },
];

export const roomTarget = (type: RoomType) =>
  ROOM_TYPES.find((t) => t.type === type)?.target ?? 100;

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  /** Vertices in metres, y pointing down the plan. */
  poly: Pt[];
  /** Open-plan with this room: they share one air node and no wall between them. */
  zone?: string;
  /** Overrides the default target illuminance (lx). */
  target?: number;
  /** Balconies only: a slab above shades the balcony and the openings behind it. */
  slab?: boolean;
  /** Light borrowed from the room this one opens to, as a share of that room's typical lux. */
  borrow?: { from: string; f: number };
}

export interface Wall {
  id: string;
  a: Pt;
  b: Pt;
  t: number;
}

export type Host = { k: "w"; id: string } | { k: "r"; id: string; i: number };

export type Glaze = "clear" | "tinted" | "frosted";

export interface Opening {
  id: string;
  /** window: any glazed opening to the outside, including balcony doors. door: interior door. */
  kind: "window" | "door";
  host: Host;
  /** Centre along the host, 0..1. */
  s: number;
  w: number;
  sill: number;
  head: number;
  glaze?: Glaze;
  /** Share of the opening that can pass air when fully open (sliders about 0.5, casements 0.9). */
  free?: number;
  /** Fixed grille or jali: the open/half/closed switch does not change it. */
  fixed?: boolean;
  /** Opens into a shaft or recess rather than onto a facade. */
  shelter?: boolean;
  /** Interior doors: a doorway with no leaf is always open and lets light through. */
  doorway?: boolean;
}

export interface Project {
  v: 1;
  name: string;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  /** Floor to underside of the slab above, m. */
  ceiling: number;
  /** Floor number, ground = 0. */
  floor: number;
  /** Compass bearing the top of the plan points to, degrees. */
  north: number;
  lat: number;
  lon: number;
  tz?: string;
  address?: string;
  /** Power-law exponent used to scale 10 m wind to the flat. */
  alpha: number;
}

export const GLAZE: Record<Glaze, { label: string; tau: number; diffuseOnly: boolean }> = {
  clear: { label: "Clear glass", tau: 0.6, diffuseOnly: false },
  tinted: { label: "Tinted glass", tau: 0.35, diffuseOnly: false },
  frosted: { label: "Frosted or jali", tau: 0.2, diffuseOnly: true },
};

export const emptyProject = (): Project => ({
  v: 1,
  name: "My flat",
  rooms: [],
  walls: [],
  openings: [],
  ceiling: 2.85,
  floor: 5,
  north: 0,
  lat: 12.9716,
  lon: 77.5946,
  alpha: 0.3,
});

let counter = 0;
export const uid = (p: string) =>
  `${p}${Date.now().toString(36).slice(-4)}${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
