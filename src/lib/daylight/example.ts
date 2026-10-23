import type { Project } from "./types";

/**
 * A three-bedroom flat on the 15th floor in Bengaluru, traced as vectors (no drawing image is shipped).
 * Coordinates are metres from the top-left of the plan; the top of the plan points to a bearing of 39 degrees.
 */
export const EXAMPLE_PROJECT: Project = {
 v: 1,
 name: "Example flat",
 rooms: [
  {
   id: "ld",
   name: "Living / Dining",
   type: "living",
   poly: [[3.769, 3.103], [8.564, 3.103], [8.564, 5.551], [10.782, 5.551], [10.782, 6.692], [7.551, 6.692], [7.551, 9.936], [3.769, 9.936]]
  },
  {
   id: "foy",
   name: "Foyer",
   type: "foyer",
   poly: [[3.769, 0.436], [5.256, 0.436], [5.256, 3.103], [3.769, 3.103]],
   zone: "ld"
  },
  {
   id: "mbr",
   name: "Master bedroom",
   type: "bedroom",
   poly: [[10.859, 5.628], [14.436, 5.628], [14.436, 9.936], [10.859, 9.936]]
  },
  {
   id: "wr",
   name: "Wardrobe",
   type: "wardrobe",
   poly: [[12.897, 3.051], [14.436, 3.051], [14.436, 5.59], [12.897, 5.59]],
   borrow: { from: "mbr", f: 0.15 }
  },
  {
   id: "mt",
   name: "Master toilet",
   type: "toilet",
   poly: [[11.256, 3.051], [12.769, 3.051], [12.769, 5.551], [11.256, 5.551]],
   borrow: { from: "wr", f: 0.1 }
  },
  {
   id: "b2",
   name: "Bedroom 2",
   type: "bedroom",
   poly: [[0.333, 6.308], [3.641, 6.308], [3.641, 10.513], [0.333, 10.513]]
  },
  {
   id: "b3",
   name: "Bedroom 3",
   type: "bedroom",
   poly: [[7.577, 6.821], [10.731, 6.821], [10.731, 10.462], [7.577, 10.462]]
  },
  {
   id: "k",
   name: "Kitchen",
   type: "kitchen",
   poly: [[5.385, 0.513], [8.538, 0.513], [8.538, 2.974], [5.385, 2.974]],
   borrow: { from: "ld", f: 0.12 }
  },
  {
   id: "u",
   name: "Utility",
   type: "utility",
   poly: [[8.667, 0.513], [10.09, 0.513], [10.09, 2.974], [8.667, 2.974]]
  },
  {
   id: "ct",
   name: "Common toilet",
   type: "toilet",
   poly: [[8.641, 3.897], [11.077, 3.897], [11.077, 5.551], [8.641, 5.551]]
  },
  {
   id: "t2",
   name: "Toilet 2",
   type: "toilet",
   poly: [[1.231, 4.667], [3.641, 4.667], [3.641, 6.154], [1.231, 6.154]],
   borrow: { from: "b2", f: 0 }
  },
  {
   id: "bl",
   name: "Balcony (living)",
   type: "balcony",
   poly: [[3.744, 10.103], [7.462, 10.103], [7.462, 11.641], [3.744, 11.641]],
   slab: true
  },
  {
   id: "bm",
   name: "Balcony (master)",
   type: "balcony",
   poly: [[10.833, 10.103], [14.436, 10.103], [14.436, 11.641], [10.833, 11.641]],
   slab: true
  }
 ],
 walls: [
  {
   id: "w0",
   a: [3.692, 0.385],
   b: [3.692, 11.949],
   t: 0.167
  },
  {
   id: "w1",
   a: [3.692, 0.385],
   b: [5.308, 0.385],
   t: 0.167
  },
  {
   id: "w2",
   a: [5.308, 0.385],
   b: [10.128, 0.385],
   t: 0.205
  },
  {
   id: "w3",
   a: [5.308, 0.385],
   b: [5.308, 3.026],
   t: 0.167
  },
  {
   id: "w4",
   a: [5.308, 3.026],
   b: [6.026, 3.026],
   t: 0.115
  },
  {
   id: "w5",
   a: [6.885, 3.026],
   b: [8.564, 3.026],
   t: 0.115
  },
  {
   id: "w6",
   a: [8.564, 3.026],
   b: [11.141, 3.026],
   t: 0.115
  },
  {
   id: "w7",
   a: [8.59, 0.385],
   b: [8.59, 1.205],
   t: 0.103
  },
  {
   id: "w8",
   a: [8.59, 2],
   b: [8.59, 3.026],
   t: 0.103
  },
  {
   id: "w9",
   a: [10.128, 0.385],
   b: [10.128, 0.769],
   t: 0.103
  },
  {
   id: "w10",
   a: [10.128, 2.692],
   b: [10.128, 3.026],
   t: 0.103
  },
  {
   id: "w11",
   a: [8.564, 3.026],
   b: [8.564, 5.603],
   t: 0.115
  },
  {
   id: "w12",
   a: [11.141, 3.026],
   b: [11.141, 5.603],
   t: 0.179
  },
  {
   id: "w13",
   a: [8.564, 5.603],
   b: [11.141, 5.603],
   t: 0.115
  },
  {
   id: "w14",
   a: [8.564, 3.846],
   b: [9.372, 3.846],
   t: 0.064
  },
  {
   id: "w15",
   a: [9.885, 3.846],
   b: [11.141, 3.846],
   t: 0.064
  },
  {
   id: "w16",
   a: [11.141, 5.603],
   b: [12.821, 5.603],
   t: 0.115
  },
  {
   id: "w17",
   a: [12.821, 2.962],
   b: [12.821, 4],
   t: 0.103
  },
  {
   id: "w18",
   a: [12.821, 4.744],
   b: [12.821, 5.603],
   t: 0.103
  },
  {
   id: "w19",
   a: [11.141, 2.962],
   b: [12.09, 2.962],
   t: 0.115
  },
  {
   id: "w20",
   a: [12.692, 2.962],
   b: [13.013, 2.962],
   t: 0.115
  },
  {
   id: "w21",
   a: [13.577, 2.962],
   b: [14.487, 2.962],
   t: 0.115
  },
  {
   id: "w22",
   a: [14.487, 2.962],
   b: [14.487, 11.731],
   t: 0.179
  },
  {
   id: "w23",
   a: [10.782, 5.603],
   b: [10.782, 10.513],
   t: 0.154
  },
  {
   id: "w24",
   a: [7.5, 6.744],
   b: [7.5, 10.513],
   t: 0.154
  },
  {
   id: "w25",
   a: [7.5, 6.744],
   b: [10.782, 6.744],
   t: 0.115
  },
  {
   id: "w26",
   a: [10.782, 9.987],
   b: [11.628, 9.987],
   t: 0.154
  },
  {
   id: "w27",
   a: [13.654, 9.987],
   b: [14.487, 9.987],
   t: 0.154
  },
  {
   id: "w28",
   a: [3.692, 10],
   b: [4.359, 10],
   t: 0.154
  },
  {
   id: "w29",
   a: [6.654, 10],
   b: [7.5, 10],
   t: 0.154
  },
  {
   id: "w30",
   a: [0.256, 6.205],
   b: [3.692, 6.205],
   t: 0.115
  },
  {
   id: "w31",
   a: [0.256, 6.205],
   b: [0.256, 10.551],
   t: 0.167
  },
  {
   id: "w32",
   a: [0.256, 10.551],
   b: [1.115, 10.551],
   t: 0.154
  },
  {
   id: "w33",
   a: [2.846, 10.551],
   b: [3.692, 10.551],
   t: 0.154
  },
  {
   id: "w34",
   a: [7.5, 10.513],
   b: [8.244, 10.513],
   t: 0.154
  },
  {
   id: "w35",
   a: [9.923, 10.513],
   b: [10.782, 10.513],
   t: 0.154
  },
  {
   id: "w36",
   a: [0.192, 4.603],
   b: [3.692, 4.603],
   t: 0.231
  },
  {
   id: "w37",
   a: [1.154, 4.603],
   b: [1.154, 6.205],
   t: 0.103
  }
 ],
 openings: [
  {
   id: "wLiv",
   kind: "window",
   host: { k: "r", id: "ld", i: 6 },
   s: 0.541,
   w: 2.295,
   sill: 0,
   head: 2.1,
   glaze: "clear",
   free: 0.498
  },
  {
   id: "wMbr",
   kind: "window",
   host: { k: "r", id: "mbr", i: 2 },
   s: 0.502,
   w: 2.026,
   sill: 0,
   head: 2.1,
   glaze: "clear",
   free: 0.505
  },
  {
   id: "wB2",
   kind: "window",
   host: { k: "r", id: "b2", i: 2 },
   s: 0.502,
   w: 1.731,
   sill: 0.75,
   head: 2.1,
   glaze: "clear",
   free: 0.514
  },
  {
   id: "wB3",
   kind: "window",
   host: { k: "r", id: "b3", i: 2 },
   s: 0.522,
   w: 1.679,
   sill: 0.75,
   head: 2.1,
   glaze: "clear",
   free: 0.507
  },
  {
   id: "wMt",
   kind: "window",
   host: { k: "r", id: "mt", i: 0 },
   s: 0.75,
   w: 0.603,
   sill: 1.5,
   head: 2.1,
   glaze: "clear",
   free: 0.387
  },
  {
   id: "wWr",
   kind: "window",
   host: { k: "r", id: "wr", i: 0 },
   s: 0.258,
   w: 0.564,
   sill: 1.5,
   head: 2.1,
   glaze: "clear",
   free: 0.384
  },
  {
   id: "wUt",
   kind: "window",
   host: { k: "r", id: "u", i: 1 },
   s: 0.495,
   w: 1.923,
   sill: 0.3,
   head: 2.1,
   glaze: "frosted",
   free: 0.202,
   fixed: true
  },
  {
   id: "wCt",
   kind: "window",
   host: { k: "r", id: "ct", i: 0 },
   s: 0.405,
   w: 0.513,
   sill: 1.5,
   head: 2.1,
   glaze: "frosted",
   free: 0.975,
   fixed: true,
   shelter: true
  },
  {
   id: "dKit",
   kind: "door",
   host: { k: "r", id: "ld", i: 0 },
   s: 0.56,
   w: 0.859,
   sill: 0,
   head: 2.1,
   doorway: true
  },
  {
   id: "dKU",
   kind: "door",
   host: { k: "r", id: "k", i: 1 },
   s: 0.443,
   w: 0.795,
   sill: 0,
   head: 2.1
  },
  {
   id: "dMtWr",
   kind: "door",
   host: { k: "r", id: "mt", i: 1 },
   s: 0.528,
   w: 0.744,
   sill: 0,
   head: 2.1,
   doorway: true
  },
  {
   id: "dMbr",
   kind: "door",
   host: { k: "r", id: "ld", i: 3 },
   s: 0.551,
   w: 0.795,
   sill: 0,
   head: 2.1
  },
  {
   id: "dB2",
   kind: "door",
   host: { k: "r", id: "ld", i: 7 },
   s: 0.445,
   w: 0.795,
   sill: 0,
   head: 2.1
  },
  {
   id: "dB3",
   kind: "door",
   host: { k: "r", id: "ld", i: 4 },
   s: 0.885,
   w: 0.795,
   sill: 0,
   head: 2.1
  },
  {
   id: "dCt",
   kind: "door",
   host: { k: "r", id: "ld", i: 2 },
   s: 0.26,
   w: 0.795,
   sill: 0,
   head: 2.1
  },
  {
   id: "dWr",
   kind: "door",
   host: { k: "r", id: "wr", i: 2 },
   s: 0.5,
   w: 1.538,
   sill: 0,
   head: 2.1,
   doorway: true
  },
  {
   id: "dT2",
   kind: "door",
   host: { k: "r", id: "t2", i: 2 },
   s: 0.468,
   w: 0.795,
   sill: 0,
   head: 2.1
  }
 ],
 ceiling: 2.85,
 floor: 15,
 north: 39,
 lat: 12.8379592,
 lon: 77.6021967,
 tz: "Asia/Kolkata",
 address: "Bengaluru, India",
 alpha: 0.3
};
