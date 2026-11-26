// world.js — the archipelago: routes, islands, rings and the runway.
// Everything is placed along a course that runs towards +Z (metres).
// Islands sit left and right of the racing line; rings hang over the sea
// between them; every route ends at a runway island. Placement is seeded
// per route, so a route is the same race every time it is flown.

export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Island kinds: volcano (cone + smoke), hills (green humps),
// terraces (rice steps), town (houses + harbour), lighthouse (rock + tower).
const ISLAND_KINDS = ["volcano", "hills", "terraces", "town", "lighthouse"];

export const ROUTES = [
  {
    id: 1, name: "RAJAWALI RUN", sub: "Karang Bay → Pulau Elang",
    seed: 1207, rings: 8, par: 95, tod: "morning",
    sky: ["#7ec8e8", "#cfeef7", "#fdf3d8"], sea: ["#2e7ea6", "#175d80"],
    sun: [0.78, 0.16], fog: "rgba(214,240,248,0.55)",
  },
  {
    id: 2, name: "BROMO CROSSING", sub: "The volcano's shoulder",
    seed: 3411, rings: 10, par: 120, tod: "noon",
    sky: ["#5db4e8", "#bfe6f5", "#eef9ff"], sea: ["#2a86ad", "#14607f"],
    sun: [0.5, 0.08], fog: "rgba(205,238,250,0.4)",
  },
  {
    id: 3, name: "SENJA HARBOUR", sub: "Home by sunset, lights on",
    seed: 9021, rings: 9, par: 110, tod: "sunset",
    sky: ["#f7a45c", "#f9cf8e", "#ffe9c9"], sea: ["#3d6f96", "#274b6d"],
    sun: [0.2, 0.34], fog: "rgba(250,205,150,0.45)",
  },
];

// Build one route's world: islands, rings, runway, clouds.
export function buildWorld(route) {
  const rng = makeRng(route.seed);
  const islands = [];
  const rings = [];
  const clouds = [];

  // The racing line weaves: rings alternate left/right of centre.
  let z = 900;
  for (let i = 0; i < route.rings; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (60 + rng() * 150);
    const y = 130 + rng() * 170; // ring centre altitude, metres
    rings.push({ i, x, y, z, r: 42, state: i === 0 ? "next" : "upcoming" });
    z += 620 + rng() * 260;
  }
  const courseEnd = z + 500;

  // Islands flank the course from start to past the runway.
  let iz = 250;
  let kindIdx = Math.floor(rng() * ISLAND_KINDS.length);
  while (iz < courseEnd + 1400) {
    const side = rng() > 0.5 ? 1 : -1;
    const kind = ISLAND_KINDS[kindIdx % ISLAND_KINDS.length];
    kindIdx += 1 + Math.floor(rng() * 2);
    islands.push({
      kind,
      x: side * (330 + rng() * 420),
      z: iz,
      r: 190 + rng() * 190,
      h: kind === "volcano" ? 300 + rng() * 130 : 90 + rng() * 130,
      seed: Math.floor(rng() * 1e9),
    });
    iz += 480 + rng() * 420;
  }
  // One hero volcano close to the line, early, for the postcard view.
  islands.push({
    kind: "volcano", x: 350, z: 2100, r: 330, h: 430, seed: 777,
  });
  // A terraced island on the other side, mid-course.
  islands.push({
    kind: "terraces", x: -360, z: 3050, r: 300, h: 190, seed: 4242,
  });

  // The runway island: a flat strip on the centreline at the end.
  const runway = {
    x: 0, z: courseEnd + 350, len: 620, wid: 46, y: 12,
    name: "PULAU ELANG · RWY 09",
  };
  islands.push({
    kind: "runway", x: 0, z: courseEnd + 350, r: 430, h: 12, seed: 99,
  });

  // Clouds: soft clusters scattered over the whole course.
  for (let i = 0; i < 46; i++) {
    clouds.push({
      x: (rng() - 0.5) * 2400,
      y: 260 + rng() * 320,
      z: rng() * (courseEnd + 1600),
      s: 60 + rng() * 130,
      seed: Math.floor(rng() * 1e9),
    });
  }

  return { route, islands, rings, runway, clouds, courseEnd };
}

// Which ring the plane must fly next, and the flight plan summary.
export function nextRing(world, idx) {
  return world.rings[idx] || null;
}
